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
* visibility, plus the runtime projection of the sidebar panel ledger.
*
* The whole state persists to localStorage under `dsh.diy-layout.v1`
* (client-store persistence — the same channel ui-sidebar-right and
* ui-conversation use), so settings survive reloads and app restarts.
* `entries` is derived data: it is overwritten from the live
* `sidebar.panellist` ledger on every sync, so a stale persisted copy is
* harmless.
*/
/** localStorage key (repo convention: `dsh.` + domain + version). */
const DIY_LAYOUT_STORE_KEY = "dsh.diy-layout.v1";
function createDiyLayoutStore() {
	return (0, _deepseek_ai_dsh_client_store.defineStore)({
		init: () => ({
			columns: "one",
			nameDisplay: "icon-name",
			order: [],
			hidden: [],
			entries: []
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
				const merged = [...draft.order];
				for (const entry of entries) if (!merged.includes(entry.id)) merged.push(entry.id);
				const entriesUnchanged = draft.entries.length === entries.length && draft.entries.every((entry, index) => entry.id === entries[index]?.id && entry.label === entries[index]?.label);
				const orderUnchanged = merged.length === draft.order.length && merged.every((id, index) => draft.order[index] === id);
				if (entriesUnchanged && orderUnchanged) return;
				if (!orderUnchanged) draft.order = merged;
				if (!entriesUnchanged) draft.entries = entries;
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
			reset: (draft) => {
				draft.order = draft.entries.map((entry) => entry.id);
				draft.hidden = [];
			}
		}
	});
}
//#endregion
//#region src/client/sidebar-css.ts
/** The sidebar's global-panel navigation (single `panelList` class on a nav). */
const NAV_SELECTOR = "nav[class*=\"_panelList\"]";
/** Sidebar root while expanded (the collapsed root carries the `_collapsed` class). */
const ROOT_EXPANDED = "div[class*=\"_root\"]:not([class*=\"_collapsed\"])";
/** One panel row button (`clsx(panelRow, panelActive)` → substring match). */
const ROW_SELECTOR = `${NAV_SELECTOR} > button[class*="_panelRow"]`;
/** The row's label span (`clsx(panelTitle, wide)` → substring match). */
const TITLE_SELECTOR = `[class*="_panelTitle"]`;
/** The row's icon seat span. */
const GLYPH_SELECTOR = `[class*="_panelGlyph"]`;
/**
* Compute the rows' natural DOM order. Mirrors ui-sidebar's projection
* (`entriesOfSlot` survivors, stably sorted by `order`), which is what
* produces the `panels.map` render order inside the nav.
*/
function naturalRowOrder(entries) {
	return entries.map((entry) => entry.id);
}
/**
* Build the stylesheet text for the current state. Returns an empty string
* when nothing diverges from the shipped defaults, so the style element can
* stay empty.
*/
function buildSidebarCss(input) {
	const rules = [];
	const known = new Set(input.entries.map((entry) => entry.id));
	if (known.size === 0) return "";
	const visible = input.order.filter((id) => known.has(id) && !input.hidden.includes(id));
	const natural = naturalRowOrder(input.entries);
	const nthOf = (id) => natural.indexOf(id) + 1;
	if (input.columns === "two") rules.push(`${ROOT_EXPANDED} ${NAV_SELECTOR} { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; }`, `${ROOT_EXPANDED} ${ROW_SELECTOR} { margin: 0; min-width: 0; }`);
	if (input.nameDisplay === "icon-only") rules.push(`${ROOT_EXPANDED} ${ROW_SELECTOR} ${TITLE_SELECTOR} { display: none; }`, `${ROOT_EXPANDED} ${ROW_SELECTOR} { justify-content: center; padding-inline: 0; }`, `${ROOT_EXPANDED} ${ROW_SELECTOR} ${GLYPH_SELECTOR} { min-width: 36px; }`);
	if (visible.some((id, index) => natural.indexOf(id) !== index)) visible.forEach((id, index) => {
		const nth = nthOf(id);
		if (nth < 1) return;
		rules.push(`${NAV_SELECTOR} > button:nth-child(${nth}) { order: ${index}; }`);
	});
	for (const id of input.hidden) {
		const nth = nthOf(id);
		if (nth < 1) continue;
		rules.push(`${NAV_SELECTOR} > button:nth-child(${nth}) { display: none; }`);
	}
	return rules.join("\n");
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
* panel-row hover/focus events at the document level and portals one bubble
* to document.body.
*
* Why not the ui-primitives `Tooltip`: that component must own its anchor
* element (it clones and wraps the child), while the anchor here — the
* panel-row button — is rendered by ui-sidebar's shell. The bubble instead
* copies the primitive's CSS values 1:1 (see styles.ts), so it stays
* visually identical and theme-following.
*
* Trigger contract matches the shell's own PanelRow tooltip: 500ms hover
* delay, immediate on keyboard focus, hidden on click. Rail rows (collapsed
* sidebar) have no label span and stay covered by the shell's tooltip — the
* overlay only covers rows whose label span the injected stylesheet hides.
*/
/** Hover delay, matching the shell's PanelRow `Tooltip delayMs={500}`. */
const DELAY_MS = 500;
/** Anchor-to-bubble gap, matching the primitive's default `gap = 8`. */
const GAP = 8;
/** Viewport inset kept clear around the bubble. */
const EDGE = 8;
/** A panel row the overlay should cover, or null. */
function coveredRow(target) {
	const candidate = target instanceof Element ? target.closest("button") : null;
	if (!(candidate instanceof HTMLButtonElement)) return null;
	if (candidate.closest("nav[class*=\"_panelList\"]") === null) return null;
	const title = candidate.querySelector(TITLE_SELECTOR);
	if (!(title instanceof HTMLElement)) return null;
	return window.getComputedStyle(title).display === "none" ? candidate : null;
}
/**
* Render the hover tooltip. Inert (renders null, mounts no listeners) unless
* the user picked icon-only display.
*/
function DiyTooltipOverlay({ useStore }) {
	const iconOnly = useStore((state) => state.nameDisplay === "icon-only");
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
			const row = coveredRow(event.target);
			if (row === anchor) return;
			if (row === null) {
				hide();
				return;
			}
			show(row, true);
		};
		const onOut = (event) => {
			if (anchor === null) return;
			if (event.relatedTarget === null || coveredRow(event.relatedTarget) !== anchor) hide();
		};
		const onFocusIn = (event) => {
			const row = coveredRow(event.target);
			if (row !== null) show(row, false);
			else hide();
		};
		const onPointerDown = (event) => {
			if (coveredRow(event.target) !== null) hide();
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
* persisted store: layout mode, name display, per-entry order + visibility,
* and a reset.
*/
/** The id list a row sits in: configured order restricted to known entries. */
function visibleIds(state) {
	const known = new Set(state.entries.map((entry) => entry.id));
	return state.order.filter((id) => known.has(id));
}
/**
* Render the settings page. `close` stays unused on purpose: configuring the
* sidebar never needs to leave settings.
*/
function DiyLayoutSettingsPage({ useStore, actions, t }) {
	const state = useStore((snapshot) => snapshot);
	const labels = new Map(state.entries.map((entry) => [entry.id, entry.label]));
	const rows = visibleIds(state);
	const firstVisible = rows.find((id) => !state.hidden.includes(id));
	const lastVisible = [...rows].reverse().find((id) => !state.hidden.includes(id));
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-diy-page",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-diy-intro",
				children: t("settings.intro")
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-diy-field",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-diy-field-label",
					id: "diy-layout-columns-label",
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
					id: "diy-layout-names-label",
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-diy-card",
					children: [rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-diy-entry",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-diy-entry-name",
							children: t("order.empty")
						})
					}), rows.map((id) => {
						const hidden = state.hidden.includes(id);
						const label = labels.get(id) ?? id;
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
											disabled: hidden || id === firstVisible,
											"aria-label": t("order.up"),
											onClick: () => {
												actions.moveEntry(id, -1);
											},
											children: "↑"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											variant: "ghost",
											disabled: hidden || id === lastVisible,
											"aria-label": t("order.down"),
											onClick: () => {
												actions.moveEntry(id, 1);
											},
											children: "↓"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
											checked: !hidden,
											label: hidden ? t("order.show", { name: label }) : t("order.hide", { name: label }),
											onChange: () => {
												actions.toggleEntry(id);
											}
										})
									]
								})
							]
						}, id);
					})]
				})]
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
	"columns.label": "布局模式",
	"columns.one": "单栏",
	"columns.two": "双栏",
	"names.label": "名称显示",
	"names.icon-name": "图标 + 名称",
	"names.icon-only": "仅图标（悬浮提示）",
	"order.heading": "插件排列与显示",
	"order.empty": "侧边栏暂无插件入口。",
	"order.up": "上移",
	"order.down": "下移",
	"order.show": "在侧边栏显示 {name}",
	"order.hide": "在侧边栏隐藏 {name}",
	"order.hiddenTag": "已隐藏",
	"reset.label": "恢复默认",
	"reset.hint": "清除排序与隐藏记录，恢复 Harness 默认排列。"
};
/** English dictionary, checked complete against the zh key set. */
const en = {
	"settings.section": "Sidebar DIY Layout",
	"settings.intro": "Customize how the sidebar plugin entries are arranged and displayed. Settings persist in this browser across restarts.",
	"columns.label": "Layout mode",
	"columns.one": "Single column",
	"columns.two": "Two columns",
	"names.label": "Plugin names",
	"names.icon-name": "Icon + name",
	"names.icon-only": "Icon only (hover tooltip)",
	"order.heading": "Plugin order and visibility",
	"order.empty": "The sidebar has no plugin entries yet.",
	"order.up": "Move up",
	"order.down": "Move down",
	"order.show": "Show {name} in the sidebar",
	"order.hide": "Hide {name} from the sidebar",
	"order.hiddenTag": "Hidden",
	"reset.label": "Reset to defaults",
	"reset.hint": "Clear ordering and hidden records, restoring the Harness default arrangement."
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
/** Snapshot the panellist ledger the same way ui-sidebar projects its rows. */
function projectEntries(ctx) {
	return ctx.slots.entriesOfSlot("sidebar.panellist").map(({ options }) => ({
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
				entries: snapshot.entries
			});
		};
		const unsubscribeStore = instance.subscribe(sync);
		const unsubscribeSlots = ctx.slots.subscribe("sidebar.panellist", sync);
		const unsubscribeLocale = ctx.locale.subscribe(sync);
		sync();
		return () => {
			unsubscribeStore();
			unsubscribeSlots();
			unsubscribeLocale();
			style.remove();
		};
	}, "diy-layout: sidebar stylesheet");
	ctx.effect(() => {
		const syncEntries = () => {
			instance.actions.setEntries(projectEntries(ctx));
		};
		const unsubscribeSlots = ctx.slots.subscribe("sidebar.panellist", syncEntries);
		const unsubscribeLocale = ctx.locale.subscribe(syncEntries);
		syncEntries();
		return () => {
			unsubscribeSlots();
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