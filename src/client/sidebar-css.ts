/**
 * Injected sidebar stylesheet: turns DIY preferences into CSS rules over the
 * shipped sidebar DOM without touching any component.
 *
 * ### Anchors
 *
 * DSH compiles `*.module.css` with the `[hash]_[local]` pattern (verified
 * against 0.2.0-rc.2: ui-sidebar's map holds `"panelRow": "hHd-Xa_panelRow"`),
 * so every generated class name *ends with* `_<local>` and attribute
 * substring selectors stay stable across rebuilds. `panelList` is unique in
 * the repository, so the nav selector can only match the sidebar's panel
 * navigation. Rules carry the expanded-root guard so the 56px collapsed rail
 * (which has its own 36×36 icon geometry and working shell tooltips) is left
 * alone; row-level display/order rules intentionally stay rail-wide so
 * hiding and ordering stay consistent there too.
 *
 * ### Degradation contract
 *
 * Every rule is anchored on those class names. If a future DSH build renames
 * them or changes the hash pattern, the selectors match nothing and the
 * plugin silently stops styling the sidebar — it cannot corrupt the UI.
 */
import type { DiyLayoutEntry } from './store.ts'
import type { DiyLayoutSnapshot } from './types.ts'

/** The sidebar's global-panel navigation (single `panelList` class on a nav). */
export const NAV_SELECTOR = 'nav[class*="_panelList"]'
/** Sidebar root while expanded (the collapsed root carries the `_collapsed` class). */
const ROOT_EXPANDED = 'div[class*="_root"]:not([class*="_collapsed"])'
/** One panel row button (`clsx(panelRow, panelActive)` → substring match). */
const ROW_SELECTOR = `${NAV_SELECTOR} > button[class*="_panelRow"]`
/** The row's label span (`clsx(panelTitle, wide)` → substring match). */
export const TITLE_SELECTOR = `[class*="_panelTitle"]`
/** The row's icon seat span. */
const GLYPH_SELECTOR = `[class*="_panelGlyph"]`

/** Snapshot of the state the CSS engine reads. */
export interface SidebarCssInput {
  readonly columns: DiyLayoutSnapshot['columns']
  readonly nameDisplay: DiyLayoutSnapshot['nameDisplay']
  readonly hidden: readonly string[]
  readonly order: readonly string[]
  readonly entries: readonly DiyLayoutEntry[]
}

/**
 * Compute the rows' natural DOM order. Mirrors ui-sidebar's projection
 * (`entriesOfSlot` survivors, stably sorted by `order`), which is what
 * produces the `panels.map` render order inside the nav.
 */
export function naturalRowOrder(entries: readonly DiyLayoutEntry[]): readonly string[] {
  return entries.map(entry => entry.id)
}

/**
 * Build the stylesheet text for the current state. Returns an empty string
 * when nothing diverges from the shipped defaults, so the style element can
 * stay empty.
 */
export function buildSidebarCss(input: SidebarCssInput): string {
  const rules: string[] = []
  const known = new Set(input.entries.map(entry => entry.id))
  if (known.size === 0) return ''

  const visible = input.order.filter(id => known.has(id) && !input.hidden.includes(id))
  const natural = naturalRowOrder(input.entries)
  const nthOf = (id: string): number => natural.indexOf(id) + 1

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

  // Row order: flex/grid `order` on the nav's children. `nth-child` keys on
  // the natural DOM position (CSS order never changes the DOM), so the rules
  // survive re-renders. Hidden rows are display:none below; ordering them is
  // unnecessary. Emit nothing when the permutation is the identity.
  const configured = visible.some((id, index) => natural.indexOf(id) !== index)
  if (configured) {
    visible.forEach((id, index) => {
      const nth = nthOf(id)
      if (nth < 1) return
      rules.push(`${NAV_SELECTOR} > button:nth-child(${nth}) { order: ${index}; }`)
    })
  }

  // Hidden rows: display:none removes them from layout, tab order, and the
  // accessibility tree in one move.
  for (const id of input.hidden) {
    const nth = nthOf(id)
    if (nth < 1) continue
    rules.push(`${NAV_SELECTOR} > button:nth-child(${nth}) { display: none; }`)
  }

  return rules.join('\n')
}
