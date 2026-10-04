/**
 * Injected sidebar stylesheet: turns DIY preferences into CSS rules over the
 * shipped sidebar DOM without touching any component. Two covered areas:
 *
 * - the global panel list (`sidebar.panellist` rows rendered by ui-sidebar's
 *   SidebarRoot), and
 * - the footer plugin row (`sidebar.footer.action` entries rendered above
 *   the settings/account area — chat-import, dsh-context, one-click-restart,
 *   …). Unlike panel rows, footer entries render their own self-contained
 *   buttons (inline styles, adaptive icon/text forms), so icon-only mode
 *   there works through generic overrides (font-size/gap/padding + hiding
 *   text-only spans) instead of shell-owned label spans.
 *
 * ### Anchors
 *
 * DSH compiles `*.module.css` with the `[hash]_[local]` pattern (verified
 * against 0.2.0-rc.2: ui-sidebar's map holds `"panelRow": "hHd-Xa_panelRow"`),
 * so every generated class name *ends with* `_<local>` and attribute
 * substring selectors stay stable across rebuilds. `panelList` and `footArea`
 * are unique repository-wide, so the nav and footer selectors can only match
 * the sidebar's own elements (`footerActions` also exists in
 * ui-user-questions, hence the `_footArea` ancestor scope). Layout rules
 * carry the expanded-root guard so the 56px collapsed rail (own 36×36 icon
 * geometry and working shell tooltips) is left alone; row-level
 * display/order rules intentionally stay rail-wide so hiding and ordering
 * stay consistent there too.
 *
 * ### Entry identity
 *
 * Ordering and hiding target each entry through `data-diy-entry="<id>"`
 * attributes stamped by tagging.ts (React-fiber based), not DOM positions:
 * footer entries share one slot outlet, and an entry whose component renders
 * nothing leaves no DOM node, so any `nth-child` math from the ledger would
 * misalign. `display:none` for hiding carries `!important` because footer
 * entries style their root element inline.
 *
 * ### Degradation contract
 *
 * Every rule is anchored on those class names and attributes. If a future
 * DSH build renames them, changes the hash pattern, or reshapes the
 * renderer's fibers, unanchored rules match nothing and untagged entries are
 * simply not reordered/hidden — the plugin silently stops styling instead of
 * corrupting the UI.
 */
import type { DiyLayoutEntry } from './store.ts'
import type { DiyLayoutSnapshot } from './types.ts'

/** The sidebar's global-panel navigation (single `panelList` class on a nav). */
export const NAV_SELECTOR = 'nav[class*="_panelList"]'
/** The sidebar's footer plugin row, scoped by its unique `footArea` parent. */
export const FOOTER_ROW_SELECTOR = 'div[class*="_footArea"] div[class*="_footerActions"]'
/**
 * Footer entries render through one list outlet: the renderer wraps every
 * slot render in a `div[data-slot="<key>"]` anchor (`display: contents`), so
 * the layout items are the anchor's children, not the row's. Verified against
 * 0.2.0-rc.2; the attribute value is the literal slot key.
 */
export const FOOTER_SLOT_SELECTOR = `${FOOTER_ROW_SELECTOR} > div[data-slot="sidebar.footer.action"]`
/** Sidebar root while expanded (the collapsed root carries the `_collapsed` class). */
const ROOT_EXPANDED = 'div[class*="_root"]:not([class*="_collapsed"])'
/** One panel row button (`clsx(panelRow, panelActive)` → substring match). */
const ROW_SELECTOR = `${NAV_SELECTOR} > button[class*="_panelRow"]`
/** The row's label span (`clsx(panelTitle, wide)` → substring match). */
export const TITLE_SELECTOR = `[class*="_panelTitle"]`
/** The row's icon seat span. */
const GLYPH_SELECTOR = `[class*="_panelGlyph"]`
/** One footer entry root (each registrant renders its own button). */
const FOOTER_ITEM_SELECTOR = `${FOOTER_SLOT_SELECTOR} > *`

/** Snapshot of the state the CSS engine reads. */
export interface SidebarCssInput {
  readonly columns: DiyLayoutSnapshot['columns']
  readonly nameDisplay: DiyLayoutSnapshot['nameDisplay']
  readonly hidden: readonly string[]
  readonly order: readonly string[]
  readonly entries: readonly DiyLayoutEntry[]
  readonly footerLayout: DiyLayoutSnapshot['footerLayout']
  readonly footerNameDisplay: DiyLayoutSnapshot['footerNameDisplay']
  readonly footerHidden: readonly string[]
  readonly footerOrder: readonly string[]
  readonly footerEntries: readonly DiyLayoutEntry[]
}

/**
 * Escape an entry id for literal use inside a double-quoted CSS attribute
 * selector value.
 */
function attrValue(id: string): string {
  return id.replace(/[\\"]/g, '\\$&')
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
function placementRules(
  itemSelector: (id: string) => string,
  order: readonly string[],
  hidden: readonly string[],
  entries: readonly DiyLayoutEntry[],
): string[] {
  const rules: string[] = []
  const known = new Set(entries.map(entry => entry.id))
  if (known.size === 0) return rules
  const natural = entries.map(entry => entry.id)
  const visible = order.filter(id => known.has(id) && !hidden.includes(id))
  const configured = visible.some((id, index) => natural.indexOf(id) !== index)
  if (configured) {
    visible.forEach((id, index) => {
      rules.push(`${itemSelector(id)} { order: ${index}; }`)
    })
  }
  for (const id of hidden) {
    if (!known.has(id)) continue
    rules.push(`${itemSelector(id)} { display: none !important; }`)
  }
  return rules
}

/** Panel-list (global panels) rules for the current state. */
function panelListRules(input: SidebarCssInput): string[] {
  const rules: string[] = []
  if (input.entries.length === 0) return rules
  const itemSelector = (id: string): string => `${NAV_SELECTOR} > button[data-diy-entry="${attrValue(id)}"]`

  // Two-column panel list. Expanded state only: the collapsed rail stays a
  // single 56px column of 36×36 icon buttons.
  if (input.columns === 'two') {
    rules.push(
      `${ROOT_EXPANDED} ${NAV_SELECTOR} { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; }`,
      // Full-bleed rows inside their grid cell; the shipped 0 2px margins and
      // the flex column's implicit stretching would misalign the columns.
      `${ROOT_EXPANDED} ${ROW_SELECTOR} { margin: 0; min-width: 0; }`,
    )
  }

  // Icon-only rows: hide the label span and centre the glyph. The span stays
  // mounted (it is what the overlay tooltip checks), and display:none keeps
  // it out of the layout entirely.
  if (input.nameDisplay === 'icon-only') {
    rules.push(
      `${ROOT_EXPANDED} ${ROW_SELECTOR} ${TITLE_SELECTOR} { display: none; }`,
      `${ROOT_EXPANDED} ${ROW_SELECTOR} { justify-content: center; padding-inline: 0; }`,
      `${ROOT_EXPANDED} ${ROW_SELECTOR} ${GLYPH_SELECTOR} { min-width: 36px; }`,
    )
  }

  rules.push(...placementRules(itemSelector, input.order, input.hidden, input.entries))
  return rules
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
function footerRowRules(input: SidebarCssInput): string[] {
  const rules: string[] = []
  if (input.footerEntries.length === 0) return rules
  const itemSelector = (id: string): string => `${FOOTER_SLOT_SELECTOR} > [data-diy-entry="${attrValue(id)}"]`

  if (input.footerLayout === 'one') {
    rules.push(
      `${ROOT_EXPANDED} ${FOOTER_ROW_SELECTOR} { flex-direction: column; align-items: stretch; }`,
    )
  } else if (input.footerLayout === 'two') {
    rules.push(
      `${ROOT_EXPANDED} ${FOOTER_ROW_SELECTOR} { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; align-items: stretch; }`,
    )
  }

  if (input.footerNameDisplay === 'icon-only') {
    rules.push(
      // Neutralise the wide-form inline styles (width/height/padding/gap and
      // the left-aligned text layout) on every entry root, whatever plugin
      // shipped it, then drop the text spans. `:has()` keeps spans that wrap
      // an icon svg and is baseline in the browsers the client supports.
      `${ROOT_EXPANDED} ${FOOTER_ITEM_SELECTOR} { font-size: 0 !important; gap: 0 !important; justify-content: center !important; padding: 0 !important; width: 36px !important; height: 36px !important; margin: 0 auto !important; border-radius: 50% !important; min-width: 0 !important; }`,
      // Text-only spans hide; spans wrapping an icon svg stay.
      `${ROOT_EXPANDED} ${FOOTER_ITEM_SELECTOR} > span:not(:has(svg)) { display: none !important; }`,
    )
  }

  rules.push(...placementRules(itemSelector, input.footerOrder, input.footerHidden, input.footerEntries))
  return rules
}

/**
 * Build the stylesheet text for the current state. Returns an empty string
 * when nothing diverges from the shipped defaults, so the style element can
 * stay empty.
 */
export function buildSidebarCss(input: SidebarCssInput): string {
  return [...panelListRules(input), ...footerRowRules(input)].join('\n')
}
