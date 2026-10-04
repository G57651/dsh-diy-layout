window.__ModuleLoader__.load({ id: "dsh-diy-layout", factory: (require) => {
var exports = { exports: {} }.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
let react = require("react");
let react_dom = require("react-dom");
let react_jsx_runtime = require("react/jsx-runtime");
let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
//#region src/client/store.ts
/**
* DIY Layout preferences: layout mode, name display, per-entry order and
* visibility — for BOTH plugin areas of the sidebar:
*
* - the global panel list (`sidebar.panellist`, under New Session), and
* - the footer plugin row (`sidebar.footer.action`, above the settings /
*   account area at the bottom).
*
* The whole state persists to localStorage under `dsh.diy-layout.v2`
* (client-store persistence — the same channel ui-sidebar-right and
* ui-conversation use), so settings survive reloads and app restarts.
* `entries` / `footerEntries` are derived data: they are overwritten from the
* live slot ledgers on every sync, so a stale persisted copy is harmless.
*
* v2 adds the footer area (v1 only covered the panel list); the key was
* bumped so a v1 value cannot half-apply against the extended shape.
*/
/** localStorage key (repo convention: `dsh.` + domain + version). */
const DIY_LAYOUT_STORE_KEY = "dsh.diy-layout.v2";
/**
* Merge one ledger projection into a configured order: keep every configured
* id (never prune — at boot the ledger starts empty and fills plugin by
* plugin, so pruning absent ids would erase the user's arrangement before
* the rows exist), append newcomers in natural order, and keep the
* references stable so repeated ledger events do not churn subscribers.
*/
function mergeEntries(configured, projected) {
	const merged = [...configured];
	for (const entry of projected) if (!merged.includes(entry.id)) merged.push(entry.id);
	return {
		order: merged,
		changed: merged.length !== configured.length || merged.some((id, index) => configured[index] !== id)
	};
}
function createDiyLayoutStore() {
	return (0, _deepseek_ai_dsh_client_store.defineStore)({
		init: () => ({
			columns: "one",
			nameDisplay: "icon-name",
			order: [],
			hidden: [],
			entries: [],
			footerLayout: "default",
			footerNameDisplay: "default",
			footerOrder: [],
			footerHidden: [],
			footerEntries: []
		}),
		persist: DIY_LAYOUT_STORE_KEY,
		actions: {
			setColumns: (draft, columns) => {
				draft.columns = columns;
			},
			setNameDisplay: (draft, nameDisplay) => {
				draft.nameDisplay = nameDisplay;
			},
			setEntries: (draft, entries) => {
				const entriesChanged = draft.entries.length !== entries.length || draft.entries.some((entry, index) => entry.id !== entries[index]?.id || entry.label !== entries[index]?.label);
				const { order, changed } = mergeEntries(draft.order, entries);
				if (!entriesChanged && !changed) return;
				if (entriesChanged) draft.entries = entries;
				if (changed) draft.order = order;
			},
			moveEntry: (draft, id, direction) => {
				const visible = draft.order.filter((candidate) => !draft.hidden.includes(candidate));
				const from = visible.indexOf(id);
				const to = from + direction;
				if (from < 0 || to < 0 || to >= visible.length) return;
				const neighbour = visible[to];
				const order = [...draft.order];
				order[order.indexOf(id)] = neighbour;
				order[order.indexOf(neighbour)] = id;
				draft.order = order;
			},
			toggleEntry: (draft, id) => {
				if (draft.hidden.includes(id)) draft.hidden = draft.hidden.filter((hidden) => hidden !== id);
				else draft.hidden = [...draft.hidden, id];
			},
			setFooterLayout: (draft, footerLayout) => {
				draft.footerLayout = footerLayout;
			},
			setFooterNameDisplay: (draft, footerNameDisplay) => {
				draft.footerNameDisplay = footerNameDisplay;
			},
			setFooterEntries: (draft, entries) => {
				const entriesChanged = draft.footerEntries.length !== entries.length || draft.footerEntries.some((entry, index) => entry.id !== entries[index]?.id || entry.label !== entries[index]?.label);
				const { order, changed } = mergeEntries(draft.footerOrder, entries);
				if (!entriesChanged && !changed) return;
				if (entriesChanged) draft.footerEntries = entries;
				if (changed) draft.footerOrder = order;
			},
			moveFooterEntry: (draft, id, direction) => {
				const visible = draft.footerOrder.filter((candidate) => !draft.footerHidden.includes(candidate));
				const from = visible.indexOf(id);
				const to = from + direction;
				if (from < 0 || to < 0 || to >= visible.length) return;
				const neighbour = visible[to];
				const order = [...draft.footerOrder];
				order[order.indexOf(id)] = neighbour;
				order[order.indexOf(neighbour)] = id;
				draft.footerOrder = order;
			},
			toggleFooterEntry: (draft, id) => {
				if (draft.footerHidden.includes(id)) draft.footerHidden = draft.footerHidden.filter((hidden) => hidden !== id);
				else draft.footerHidden = [...draft.footerHidden, id];
			},
			reset: (draft) => {
				draft.order = draft.entries.map((entry) => entry.id);
				draft.hidden = [];
				draft.footerOrder = draft.footerEntries.map((entry) => entry.id);
				draft.footerHidden = [];
			}
		}
	});
}
//#endregion
//#region src/client/sidebar-css.ts
/** The sidebar's global-panel navigation (single `panelList` class on a nav). */
const NAV_SELECTOR = "nav[class*=\"_panelList\"]";
/** The sidebar's footer plugin row, scoped by its unique `footArea` parent. */
const FOOTER_ROW_SELECTOR = "div[class*=\"_footArea\"] div[class*=\"_footerActions\"]";
/**
* Footer entries render through one list outlet: the renderer wraps every
* slot render in a `div[data-slot="<key>"]` anchor (`display: contents`), so
* the layout items are the anchor's children, not the row's. Verified against
* 0.2.0-rc.2; the attribute value is the literal slot key.
*/
const FOOTER_SLOT_SELECTOR = `${FOOTER_ROW_SELECTOR} > div[data-slot="sidebar.footer.action"]`;
/** Sidebar root while expanded (the collapsed root carries the `_collapsed` class). */
const ROOT_EXPANDED = "div[class*=\"_root\"]:not([class*=\"_collapsed\"])";
/** One panel row button (`clsx(panelRow, panelActive)` → substring match). */
const ROW_SELECTOR = `${NAV_SELECTOR} > button[class*="_panelRow"]`;
/** The row's label span (`clsx(panelTitle, wide)` → substring match). */
const TITLE_SELECTOR = `[class*="_panelTitle"]`;
/** The row's icon seat span. */
const GLYPH_SELECTOR = `[class*="_panelGlyph"]`;
/** One footer entry root (each registrant renders its own button). */
const FOOTER_ITEM_SELECTOR = `${FOOTER_SLOT_SELECTOR} > *`;
/**
* Escape an entry id for literal use inside a double-quoted CSS attribute
* selector value.
*/
function attrValue(id) {
	return id.replace(/[\\"]/g, "\\$&");
}
/**
* Ordering + hiding rules for one area, keyed by the `data-diy-entry`
* attribute tagging.ts stamps onto each rendered entry root. `order` sorts
* flex/grid items without touching the DOM (visual order changes, tab order
* keeps the ledger sequence); hidden entries get `display:none !important`
* (footer entries style their roots inline, which beats a bare rule) and
* leave layout, tab order, and the accessibility tree. Identity permutations
* emit nothing.
*/
function placementRules(itemSelector, order, hidden, entries) {
	const rules = [];
	const known = new Set(entries.map((entry) => entry.id));
	if (known.size === 0) return rules;
	const natural = entries.map((entry) => entry.id);
	const visible = order.filter((id) => known.has(id) && !hidden.includes(id));
	if (visible.some((id, index) => natural.indexOf(id) !== index)) visible.forEach((id, index) => {
		rules.push(`${itemSelector(id)} { order: ${index}; }`);
	});
	for (const id of hidden) {
		if (!known.has(id)) continue;
		rules.push(`${itemSelector(id)} { display: none !important; }`);
	}
	return rules;
}
/** Panel-list (global panels) rules for the current state. */
function panelListRules(input) {
	const rules = [];
	if (input.entries.length === 0) return rules;
	const itemSelector = (id) => `${NAV_SELECTOR} > button[data-diy-entry="${attrValue(id)}"]`;
	if (input.columns === "two") rules.push(`${ROOT_EXPANDED} ${NAV_SELECTOR} { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; }`, `${ROOT_EXPANDED} ${ROW_SELECTOR} { margin: 0; min-width: 0; }`);
	if (input.nameDisplay === "icon-only") rules.push(`${ROOT_EXPANDED} ${ROW_SELECTOR} ${TITLE_SELECTOR} { display: none; }`, `${ROOT_EXPANDED} ${ROW_SELECTOR} { justify-content: center; padding-inline: 0; }`, `${ROOT_EXPANDED} ${ROW_SELECTOR} ${GLYPH_SELECTOR} { min-width: 36px; }`);
	rules.push(...placementRules(itemSelector, input.order, input.hidden, input.entries));
	return rules;
}
/**
* Footer plugin-row rules. Footer entries are self-contained buttons with
* inline styles (each plugin ships its own adaptive icon/text logic), so:
* - `one` / `two` restack the row via the container only — the entries keep
*   their wide (icon+text) form and reflow into the new track;
* - `icon-only` needs per-button overrides; inline styles require
*   `!important`, and text-only spans hide while icon spans (any wrapper
*   containing an svg) stay. Compact 36×36 round buttons match the shapes
*   the shipped plugins use for their own icon forms.
*/
function footerRowRules(input) {
	const rules = [];
	if (input.footerEntries.length === 0) return rules;
	const itemSelector = (id) => `${FOOTER_SLOT_SELECTOR} > [data-diy-entry="${attrValue(id)}"]`;
	if (input.footerLayout === "one") rules.push(`${ROOT_EXPANDED} ${FOOTER_ROW_SELECTOR} { flex-direction: column; align-items: stretch; }`);
	else if (input.footerLayout === "two") rules.push(`${ROOT_EXPANDED} ${FOOTER_ROW_SELECTOR} { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; align-items: stretch; }`);
	if (input.footerNameDisplay === "icon-only") rules.push(`${ROOT_EXPANDED} ${FOOTER_ITEM_SELECTOR} { font-size: 0 !important; gap: 0 !important; justify-content: center !important; padding: 0 !important; width: 36px !important; height: 36px !important; margin: 0 auto !important; border-radius: 50% !important; min-width: 0 !important; }`, `${ROOT_EXPANDED} ${FOOTER_ITEM_SELECTOR} > span:not(:has(svg)) { display: none !important; }`);
	rules.push(...placementRules(itemSelector, input.footerOrder, input.footerHidden, input.footerEntries));
	return rules;
}
/**
* Build the stylesheet text for the current state. Returns an empty string
* when nothing diverges from the shipped defaults, so the style element can
* stay empty.
*/
function buildSidebarCss(input) {
	return [...panelListRules(input), ...footerRowRules(input)].join("\n");
}
//#endregion
//#region src/client/tagging.ts
/**
* Entry tagging: stamps every rendered slot entry's DOM root with
* `data-diy-entry="<entry id>"` so the injected stylesheet can target
* entries by identity instead of DOM position.
*
* Why: the footer plugin row renders all entries through one shared slot
* outlet, and an entry whose component renders nothing (e.g. a conditional
* panel like the built-in cordis-panel) leaves no DOM node — every
* `nth-child` computed from the ledger projection would be off from there
* on. The renderer also keys its internal React elements with synthetic
* keys, so identity must come from the framework: each entry is mounted
* under a `RootEntry` fiber whose props carry `entry.options.id`. Walking a
* node's React fiber for that shape is the one robust node → id mapping.
*
* Failure mode: if the renderer internals ever change shape, nodes stay
* untagged and the order/hide rules simply stop matching — the same silent
* degradation contract as the CSS anchors.
*/
const FIBER_KEY_PREFIX = "__reactFiber$";
/** Resolve the slot entry id a rendered node belongs to, via its React fiber. */
function entryIdOfNode(node) {
	const fiberKey = Object.keys(node).find((key) => key.startsWith(FIBER_KEY_PREFIX));
	if (fiberKey === void 0) return null;
	let fiber = node[fiberKey];
	while (fiber) {
		const id = (fiber.pendingProps?.entry ?? fiber.memoizedProps?.entry)?.options?.id;
		if (typeof id === "string" && id !== "") return id;
		fiber = fiber.return;
	}
	return null;
}
function setId(element, id) {
	if (element.dataset.diyEntry === id) return;
	if (id === null) delete element.dataset.diyEntry;
	else element.dataset.diyEntry = id;
}
/** One idempotent tagging pass over both covered areas. */
function tagPass() {
	tagPassInner();
}
function tagPassInner() {
	const nav = document.querySelector(NAV_SELECTOR);
	if (nav !== null) for (const row of nav.children) {
		if (!(row instanceof HTMLElement)) continue;
		const rendered = row.querySelector(`div[data-slot="sidebar.panellist"]`)?.firstElementChild;
		setId(row, rendered === null || rendered === void 0 ? null : entryIdOfNode(rendered));
	}
	const footer = document.querySelector(FOOTER_SLOT_SELECTOR);
	if (footer !== null) for (const child of footer.children) {
		if (!(child instanceof HTMLElement)) continue;
		setId(child, entryIdOfNode(child));
	}
}
/**
* Start tagging. Returns a disposer that stops observing and strips the
* tags (plugin lifecycle: the injected stylesheet's entry rules die with it).
*/
function startEntryTagging() {
	tagPass();
	const observer = new MutationObserver(tagPass);
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
	return () => {
		observer.disconnect();
		for (const el of document.querySelectorAll("[data-diy-entry]")) el.removeAttribute("data-diy-entry");
	};
}
const PLUGIN_STYLES = `
.dsh-diy-page { display: flex; flex-direction: column; gap: 20px; max-width: 560px; }
.dsh-diy-intro { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.dsh-diy-field { display: flex; flex-direction: column; gap: 8px; }
.dsh-diy-field-label { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 500; line-height: 22px; }
.dsh-diy-card {
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
  display: flex; flex-direction: column;
}
.dsh-diy-entry {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
}
.dsh-diy-entry + .dsh-diy-entry { border-top: 0.5px solid var(--dsw-alias-border-l2); }
.dsh-diy-entry-name {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px;
}
.dsh-diy-entry-hidden .dsh-diy-entry-name {
  color: var(--dsw-alias-label-tertiary); text-decoration: line-through;
}
.dsh-diy-hidden-tag {
  flex: none; padding: 1px 6px; border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px;
}
.dsh-diy-entry-actions { flex: none; display: flex; align-items: center; gap: 2px; }
.dsh-diy-entry-actions > :disabled { opacity: 0.35; }
.dsh-diy-reset { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.dsh-diy-reset-hint { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }

.dsh-diy-bubble {
  display: inline-flex; align-items: center; gap: 8px;
  position: fixed; z-index: 1100;
  width: max-content; max-width: 50vw;
  padding: 3px 7px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-tooltip-bg);
  color: var(--dsw-static-neutral-bluish-00);
  font-size: 13px; line-height: 20px;
  white-space: pre-line;
  overflow-wrap: break-word;
  pointer-events: none;
  animation: dsh-diy-tooltip-in 150ms var(--ds-ease-in-out);
}
.dsh-diy-bubble[data-side='right'] { transform: translateY(-50%); }
.dsh-diy-bubble[data-side='left'] { transform: translateY(-50%) translateX(-100%); }
@keyframes dsh-diy-tooltip-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .dsh-diy-bubble { animation: none; }
}
`;
//#endregion
//#region src/client/tooltip-overlay.tsx
/**
* Icon-only hover tooltip. Registered into the additive `shell.overlay` list
* slot; the component itself renders nothing into the sidebar — it watches
* plugin-entry hover/focus events at the document level and portals one
* bubble to document.body.
*
* Why not the ui-primitives `Tooltip`: that component must own its anchor
* element (it clones and wraps the child), while the anchors here — the
* panel-row buttons and the footer plugin buttons — are rendered by the
* shell and by third-party plugins. The bubble instead copies the
* primitive's CSS values 1:1 (see styles.ts), so it stays visually
* identical and theme-following.
*
* Coverage:
* - Panel rows (global panel list): the shell's own tooltip is disabled
*   while expanded, so the overlay covers rows whose label span the
*   injected stylesheet hides.
* - Footer plugin entries (chat-import, one-click-restart, …): covered when
*   the injected icon-only rules are active on them (computed font-size 0),
*   unless the entry carries its own `title` attribute — those get a native
*   tooltip by the plugin's own design and are skipped to avoid doubles.
* - Collapsed rail rows keep their shipped tooltips (shell for panel rows,
*   plugins' own mechanisms for footer entries).
*
* Trigger contract matches the shell's PanelRow tooltip: 500ms hover delay,
* immediate on keyboard focus, hidden on click.
*/
/** Hover delay, matching the shell's PanelRow `Tooltip delayMs={500}`. */
const DELAY_MS = 500;
/** Anchor-to-bubble gap, matching the primitive's default `gap = 8`. */
const GAP = 8;
/** Viewport inset kept clear around the bubble. */
const EDGE = 8;
/** A panel row the overlay should cover, or null. */
function coveredPanelRow(target) {
	const candidate = target instanceof Element ? target.closest("button") : null;
	if (!(candidate instanceof HTMLButtonElement)) return null;
	if (candidate.closest("nav[class*=\"_panelList\"]") === null) return null;
	const title = candidate.querySelector(TITLE_SELECTOR);
	if (!(title instanceof HTMLElement)) return null;
	return window.getComputedStyle(title).display === "none" ? candidate : null;
}
/**
* A footer plugin entry the overlay should cover, or null. Active only while
* the injected icon-only rules are actually applied to it (font-size 0);
* entries that ship their own `title` tooltip keep theirs.
*/
function coveredFooterButton(target) {
	const candidate = target instanceof Element ? target.closest("button") : null;
	if (!(candidate instanceof HTMLButtonElement)) return null;
	if (candidate.closest("div[class*=\"_footArea\"] div[class*=\"_footerActions\"]") === null) return null;
	if (candidate.getAttribute("title") !== null) return null;
	const label = candidate.getAttribute("aria-label");
	if (label === null || label === "") return null;
	return window.getComputedStyle(candidate).fontSize === "0px" ? candidate : null;
}
/** Any covered plugin entry (panel row or footer button), or null. */
function coveredEntry(target) {
	return coveredPanelRow(target) ?? coveredFooterButton(target);
}
/**
* Render the hover tooltip. Inert (renders null, mounts no listeners) unless
* an icon-only display is configured for at least one area.
*/
function DiyTooltipOverlay({ useStore }) {
	const iconOnly = useStore((state) => state.nameDisplay === "icon-only" || state.footerNameDisplay === "icon-only");
	const [tip, setTip] = (0, react.useState)(null);
	const bubbleRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		if (!iconOnly) return;
		let timer;
		let anchor = null;
		const clear = () => {
			window.clearTimeout(timer);
			timer = void 0;
		};
		const hide = () => {
			clear();
			anchor = null;
			setTip(null);
		};
		const show = (button, delay) => {
			clear();
			anchor = button;
			const present = () => {
				const label = button.getAttribute("aria-label");
				if (label === null || label === "") {
					hide();
					return;
				}
				const rect = button.getBoundingClientRect();
				if (rect.width === 0 && rect.height === 0) {
					hide();
					return;
				}
				setTip({
					label,
					anchor: rect,
					side: "right",
					top: rect.top + rect.height / 2
				});
			};
			if (delay) timer = window.setTimeout(present, DELAY_MS);
			else present();
		};
		const onOver = (event) => {
			const entry = coveredEntry(event.target);
			if (entry === anchor) return;
			if (entry === null) {
				hide();
				return;
			}
			show(entry, true);
		};
		const onOut = (event) => {
			if (anchor === null) return;
			if (event.relatedTarget === null || coveredEntry(event.relatedTarget) !== anchor) hide();
		};
		const onFocusIn = (event) => {
			const entry = coveredEntry(event.target);
			if (entry !== null) show(entry, false);
			else hide();
		};
		const onPointerDown = (event) => {
			if (coveredEntry(event.target) !== null) hide();
		};
		const onGeometry = () => {
			if (anchor !== null) hide();
		};
		document.addEventListener("pointerover", onOver, true);
		document.addEventListener("pointerout", onOut, true);
		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("focusin", onFocusIn, true);
		document.addEventListener("scroll", onGeometry, true);
		window.addEventListener("resize", onGeometry);
		return () => {
			clear();
			document.removeEventListener("pointerover", onOver, true);
			document.removeEventListener("pointerout", onOut, true);
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("focusin", onFocusIn, true);
			document.removeEventListener("scroll", onGeometry, true);
			window.removeEventListener("resize", onGeometry);
		};
	}, [iconOnly]);
	(0, react.useLayoutEffect)(() => {
		if (tip === null) return;
		const bubble = bubbleRef.current;
		if (bubble === null) return;
		const box = bubble.getBoundingClientRect();
		if (box.width === 0 && box.height === 0) return;
		if (tip.side === "right" && tip.anchor.right + GAP + box.width > window.innerWidth - EDGE) {
			setTip({
				...tip,
				side: "left"
			});
			return;
		}
		const half = box.height / 2;
		const clamped = Math.min(Math.max(tip.top, EDGE + half), window.innerHeight - EDGE - half);
		if (clamped !== tip.top) setTip({
			...tip,
			top: clamped
		});
	}, [tip]);
	if (!iconOnly || tip === null) return null;
	const left = tip.side === "right" ? tip.anchor.right + GAP : tip.anchor.left - GAP;
	return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		ref: bubbleRef,
		className: "dsh-diy-bubble",
		"data-side": tip.side,
		role: "tooltip",
		style: {
			left,
			top: tip.top
		},
		children: tip.label
	}), document.body);
}
//#endregion
//#region src/client/settings-page.tsx
/**
* DIY Layout settings page, registered into the `settings.section` list slot
* (one full page in the settings navigation, like the built-in Plugins
* section). Everything renders from ui-primitives controls over the plugin's
* persisted store. Two covered areas:
* - the global panel list (upper sidebar), and
* - the footer plugin row above the account/settings area.
*/
/** The id list a row sits in: configured order restricted to known entries. */
function visibleIds(order, entries) {
	const known = new Set(entries.map((entry) => entry.id));
	return order.filter((id) => known.has(id));
}
/** One reorderable, hideable entry row. */
function EntryRow({ id, label, hidden, first, last, onMove, onToggle, t }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: hidden ? "dsh-diy-entry dsh-diy-entry-hidden" : "dsh-diy-entry",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-diy-entry-name",
				children: label
			}),
			hidden && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-diy-hidden-tag",
				children: t("order.hiddenTag")
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dsh-diy-entry-actions",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						disabled: hidden || first,
						"aria-label": t("order.up"),
						onClick: () => {
							onMove(id, -1);
						},
						children: "↑"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						disabled: hidden || last,
						"aria-label": t("order.down"),
						onClick: () => {
							onMove(id, 1);
						},
						children: "↓"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
						checked: !hidden,
						label: hidden ? t("order.show", { name: label }) : t("order.hide", { name: label }),
						onChange: () => {
							onToggle(id);
						}
					})
				]
			})
		]
	});
}
/** The reorder/hide card for one area's entry projection. */
function EntryList({ entries, order, hidden, emptyText, onMove, onToggle, t }) {
	const labels = new Map(entries.map((entry) => [entry.id, entry.label]));
	const rows = visibleIds(order, entries);
	const visibleRows = rows.filter((id) => !hidden.includes(id));
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-diy-card",
		children: [rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "dsh-diy-entry",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-diy-entry-name",
				children: emptyText
			})
		}), rows.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EntryRow, {
			id,
			label: labels.get(id) ?? id,
			hidden: hidden.includes(id),
			first: id === visibleRows[0],
			last: id === visibleRows[visibleRows.length - 1],
			onMove,
			onToggle,
			t
		}, id))]
	});
}
/**
* Render the settings page. `close` stays unused on purpose: configuring the
* sidebar never needs to leave settings.
*/
function DiyLayoutSettingsPage({ useStore, actions, t }) {
	const state = useStore((snapshot) => snapshot);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-diy-page",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-diy-intro",
				children: t("settings.intro")
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-diy-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-diy-field-label",
						children: t("panelArea.heading")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-diy-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-diy-field-label",
							children: t("columns.label")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: "diy-layout-columns",
							label: t("columns.label"),
							value: state.columns,
							onChange: (next) => {
								actions.setColumns(next);
							},
							options: [{
								value: "one",
								label: t("columns.one")
							}, {
								value: "two",
								label: t("columns.two")
							}]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-diy-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-diy-field-label",
							children: t("names.label")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: "diy-layout-names",
							label: t("names.label"),
							value: state.nameDisplay,
							onChange: (next) => {
								actions.setNameDisplay(next);
							},
							options: [{
								value: "icon-name",
								label: t("names.icon-name")
							}, {
								value: "icon-only",
								label: t("names.icon-only")
							}]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-diy-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-diy-field-label",
							children: t("order.heading")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EntryList, {
							entries: state.entries,
							order: state.order,
							hidden: state.hidden,
							emptyText: t("order.empty"),
							onMove: (id, direction) => {
								actions.moveEntry(id, direction);
							},
							onToggle: (id) => {
								actions.toggleEntry(id);
							},
							t
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-diy-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-diy-field-label",
						children: t("footerArea.heading")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-diy-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-diy-field-label",
							children: t("footer.layout.label")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: "diy-layout-footer-layout",
							label: t("footer.layout.label"),
							value: state.footerLayout,
							onChange: (next) => {
								actions.setFooterLayout(next);
							},
							options: [
								{
									value: "default",
									label: t("footer.layout.default")
								},
								{
									value: "one",
									label: t("footer.layout.one")
								},
								{
									value: "two",
									label: t("footer.layout.two")
								}
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-diy-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-diy-field-label",
								children: t("footer.names.label")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
								id: "diy-layout-footer-names",
								label: t("footer.names.label"),
								value: state.footerNameDisplay,
								onChange: (next) => {
									actions.setFooterNameDisplay(next);
								},
								options: [{
									value: "default",
									label: t("footer.names.default")
								}, {
									value: "icon-only",
									label: t("footer.names.icon-only")
								}]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-diy-reset-hint",
								children: t("footer.names.hint")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-diy-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-diy-field-label",
							children: t("order.heading")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EntryList, {
							entries: state.footerEntries,
							order: state.footerOrder,
							hidden: state.footerHidden,
							emptyText: t("order.empty"),
							onMove: (id, direction) => {
								actions.moveFooterEntry(id, direction);
							},
							onToggle: (id) => {
								actions.toggleFooterEntry(id);
							},
							t
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-diy-reset",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					onClick: () => {
						actions.reset();
					},
					children: t("reset.label")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-diy-reset-hint",
					children: t("reset.hint")
				})]
			})
		]
	});
}
//#endregion
//#region src/client/locales.ts
/** `diyLayout` namespace dictionaries for the settings page and overlay tooltip. */
/** Simplified Chinese dictionary (the key-set source of truth). */
const zh = {
	"settings.section": "侧边栏 DIY 布局",
	"settings.intro": "自定义主页侧边栏插件入口的排列与展示方式。设置保存在本浏览器，重启后仍然生效。",
	"panelArea.heading": "全局面板（侧边栏上部）",
	"footerArea.heading": "底部插件区（账号/设置上方）",
	"columns.label": "布局模式",
	"columns.one": "单栏",
	"columns.two": "双栏",
	"names.label": "名称显示",
	"names.icon-name": "图标 + 名称",
	"names.icon-only": "仅图标（悬浮提示）",
	"footer.layout.label": "排列方式",
	"footer.layout.default": "默认横向",
	"footer.layout.one": "单列",
	"footer.layout.two": "双列",
	"footer.names.label": "名称显示",
	"footer.names.default": "跟随插件",
	"footer.names.icon-only": "仅图标（悬浮提示）",
	"footer.names.hint": "部分插件自带悬浮提示，仅图标模式下以其自身提示为准。",
	"order.heading": "插件排列与显示",
	"order.empty": "此区域暂无插件入口。",
	"order.up": "上移",
	"order.down": "下移",
	"order.show": "在侧边栏显示 {name}",
	"order.hide": "在侧边栏隐藏 {name}",
	"order.hiddenTag": "已隐藏",
	"reset.label": "恢复默认",
	"reset.hint": "清除两个区域的排序与隐藏记录，恢复 Harness 默认排列。"
};
/** English dictionary, checked complete against the zh key set. */
const en = {
	"settings.section": "Sidebar DIY Layout",
	"settings.intro": "Customize how the sidebar plugin entries are arranged and displayed. Settings persist in this browser across restarts.",
	"panelArea.heading": "Global panels (upper sidebar)",
	"footerArea.heading": "Footer plugins (above account/settings)",
	"columns.label": "Layout mode",
	"columns.one": "Single column",
	"columns.two": "Two columns",
	"names.label": "Plugin names",
	"names.icon-name": "Icon + name",
	"names.icon-only": "Icon only (hover tooltip)",
	"footer.layout.label": "Arrangement",
	"footer.layout.default": "Default row",
	"footer.layout.one": "One column",
	"footer.layout.two": "Two columns",
	"footer.names.label": "Plugin names",
	"footer.names.default": "Per plugin",
	"footer.names.icon-only": "Icon only (hover tooltip)",
	"footer.names.hint": "Some entries ship their own tooltip; in icon-only mode theirs wins.",
	"order.heading": "Plugin order and visibility",
	"order.empty": "This area has no plugin entries yet.",
	"order.up": "Move up",
	"order.down": "Move down",
	"order.show": "Show {name} in the sidebar",
	"order.hide": "Hide {name} from the sidebar",
	"order.hiddenTag": "Hidden",
	"reset.label": "Reset to defaults",
	"reset.hint": "Clear ordering and hidden records for both areas, restoring the Harness default arrangement."
};
//#endregion
//#region src/client/index.tsx
/** Services this plugin needs: slot registry and locale. */
const inject = ["slots", "locale"];
/** Dictionary namespace owned by this plugin. */
const NS = "diyLayout";
/** Resolve a stored slot label (string or localized thunk) with a safe fallback. */
function resolveLabel(label, fallback) {
	try {
		const resolved = typeof label === "function" ? label() : label;
		if (typeof resolved === "string" && resolved !== "") return resolved;
	} catch {}
	return String(fallback ?? "");
}
/** Snapshot a slot ledger the same way the shell projects its rows. */
function projectEntries(ctx, key) {
	return ctx.slots.entriesOfSlot(key).map(({ options }) => ({
		id: String(options.id ?? ""),
		label: resolveLabel(options.label, options.id),
		order: typeof options.order === "number" ? options.order : 0
	})).filter((entry) => entry.id !== "").sort((left, right) => left.order - right.order);
}
/**
* Apply: wire dictionaries, the persisted preference store, the sidebar
* stylesheet, and the two slot registrations.
* @param ctx - the browser plugin context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "diy-layout: dictionaries");
	const t = ctx.locale.bind(NS);
	const handle = createDiyLayoutStore();
	const instance = handle.create();
	const store = {
		...handle,
		create: () => instance
	};
	ctx.effect(() => {
		const style = document.createElement("style");
		style.dataset.plugin = "dsh-diy-layout";
		style.textContent = PLUGIN_STYLES;
		document.head.appendChild(style);
		return () => {
			style.remove();
		};
	}, "diy-layout: static styles");
	ctx.effect(startEntryTagging, "diy-layout: entry tagging");
	ctx.effect(() => {
		const style = document.createElement("style");
		style.dataset.plugin = "dsh-diy-layout";
		style.dataset.pluginCss = "dsh-diy-layout/sidebar";
		document.head.appendChild(style);
		const sync = () => {
			const snapshot = instance.getSnapshot();
			style.textContent = buildSidebarCss({
				columns: snapshot.columns,
				nameDisplay: snapshot.nameDisplay,
				hidden: snapshot.hidden,
				order: snapshot.order,
				entries: snapshot.entries,
				footerLayout: snapshot.footerLayout,
				footerNameDisplay: snapshot.footerNameDisplay,
				footerHidden: snapshot.footerHidden,
				footerOrder: snapshot.footerOrder,
				footerEntries: snapshot.footerEntries
			});
		};
		const unsubscribeStore = instance.subscribe(sync);
		const unsubscribePanels = ctx.slots.subscribe("sidebar.panellist", sync);
		const unsubscribeFooter = ctx.slots.subscribe("sidebar.footer.action", sync);
		const unsubscribeLocale = ctx.locale.subscribe(sync);
		sync();
		return () => {
			unsubscribeStore();
			unsubscribePanels();
			unsubscribeFooter();
			unsubscribeLocale();
			style.remove();
		};
	}, "diy-layout: sidebar stylesheet");
	ctx.effect(() => {
		const syncEntries = () => {
			instance.actions.setEntries(projectEntries(ctx, "sidebar.panellist"));
		};
		const syncFooterEntries = () => {
			instance.actions.setFooterEntries(projectEntries(ctx, "sidebar.footer.action"));
		};
		const unsubscribePanels = ctx.slots.subscribe("sidebar.panellist", syncEntries);
		const unsubscribeFooter = ctx.slots.subscribe("sidebar.footer.action", syncFooterEntries);
		const unsubscribeLocale = ctx.locale.subscribe(() => {
			syncEntries();
			syncFooterEntries();
		});
		syncEntries();
		syncFooterEntries();
		return () => {
			unsubscribePanels();
			unsubscribeFooter();
			unsubscribeLocale();
		};
	}, "diy-layout: ledger projection");
	ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		name: "shell.overlay",
		id: "diy-layout-tooltip",
		store
	}, DiyTooltipOverlay));
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "diy-layout",
		order: 16,
		label: () => t("settings.section"),
		locale: NS,
		store
	}, DiyLayoutSettingsPage));
}
//#endregion
exports.NS = NS;
exports.apply = apply;
exports.inject = inject;

return exports; } });