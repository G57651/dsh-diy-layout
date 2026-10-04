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
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

/** Sidebar panel-list arrangement. */
export type LayoutColumns = 'one' | 'two'

/** Whether panel rows show icon + name, or the icon alone (hover tooltip). */
export type NameDisplay = 'icon-name' | 'icon-only'

/**
 * Footer plugin-row arrangement. The row's native form is a horizontal flex
 * line (`default`); `one`/`two` restack it into one or two columns.
 */
export type FooterLayout = 'default' | 'one' | 'two'

/**
 * Footer name display. `default` keeps each entry's own adaptive form (the
 * shipped plugins decide icon vs icon+text themselves); `icon-only` forces
 * compact icon buttons and shows the name through the plugin's hover tooltip.
 */
export type FooterNameDisplay = 'default' | 'icon-only'

/** One projected slot entry, in the ledger's natural render order. */
export interface DiyLayoutEntry {
  /** List id of the slot entry (per-entry identity in the ledger). */
  readonly id: string
  /** Resolved, localized row label; also the button's aria-label where present. */
  readonly label: string
}

type DiyLayoutState = {
  columns: LayoutColumns
  nameDisplay: NameDisplay
  /**
   * Every known panel-list entry id in the user's desired display order. New
   * entries (plugins installed later) append in their natural order at first
   * sight.
   */
  order: readonly string[]
  /** Panel-list entry ids the user hid from the sidebar. */
  hidden: readonly string[]
  /** Live natural-order projection; runtime-refreshed, not user data. */
  entries: readonly DiyLayoutEntry[]

  footerLayout: FooterLayout
  footerNameDisplay: FooterNameDisplay
  footerOrder: readonly string[]
  footerHidden: readonly string[]
  footerEntries: readonly DiyLayoutEntry[]
}

type DiyLayoutActions = {
  setColumns: (draft: DiyLayoutState, columns: LayoutColumns) => void
  setNameDisplay: (draft: DiyLayoutState, nameDisplay: NameDisplay) => void
  /** Merge one fresh ledger projection: append newcomers, keep references stable. */
  setEntries: (draft: DiyLayoutState, entries: readonly DiyLayoutEntry[]) => void
  /** Swap the entry with its visible neighbour in the requested direction. */
  moveEntry: (draft: DiyLayoutState, id: string, direction: -1 | 1) => void
  /** Show or hide one entry. */
  toggleEntry: (draft: DiyLayoutState, id: string) => void

  setFooterLayout: (draft: DiyLayoutState, footerLayout: FooterLayout) => void
  setFooterNameDisplay: (draft: DiyLayoutState, footerNameDisplay: FooterNameDisplay) => void
  setFooterEntries: (draft: DiyLayoutState, entries: readonly DiyLayoutEntry[]) => void
  moveFooterEntry: (draft: DiyLayoutState, id: string, direction: -1 | 1) => void
  toggleFooterEntry: (draft: DiyLayoutState, id: string) => void

  /** Drop ordering and hiding records for both areas. */
  reset: (draft: DiyLayoutState) => void
}

/** localStorage key (repo convention: `dsh.` + domain + version). */
export const DIY_LAYOUT_STORE_KEY = 'dsh.diy-layout.v2'

/**
 * Annotation twin of the actions literal below (repo store convention: the
 * export needs a declared return type; drift fails assignability here).
 */
export type DiyLayoutStoreHandle = EngineStoreHandle<DiyLayoutState, DiyLayoutActions>

/**
 * Merge one ledger projection into a configured order: keep every configured
 * id (never prune — at boot the ledger starts empty and fills plugin by
 * plugin, so pruning absent ids would erase the user's arrangement before
 * the rows exist), append newcomers in natural order, and keep the
 * references stable so repeated ledger events do not churn subscribers.
 */
function mergeEntries(
  configured: readonly string[],
  projected: readonly DiyLayoutEntry[],
): { order: readonly string[], changed: boolean } {
  const merged = [...configured]
  for (const entry of projected) {
    if (!merged.includes(entry.id)) merged.push(entry.id)
  }
  const changed = merged.length !== configured.length
    || merged.some((id, index) => configured[index] !== id)
  return { order: merged, changed }
}

export function createDiyLayoutStore(): DiyLayoutStoreHandle {
  return defineStore({
    init: (): DiyLayoutState => ({
      columns: 'one',
      nameDisplay: 'icon-name',
      order: [],
      hidden: [],
      entries: [],
      footerLayout: 'default',
      footerNameDisplay: 'default',
      footerOrder: [],
      footerHidden: [],
      footerEntries: [],
    }),
    persist: DIY_LAYOUT_STORE_KEY,
    actions: {
      setColumns: (draft, columns) => { draft.columns = columns },

      setNameDisplay: (draft, nameDisplay) => { draft.nameDisplay = nameDisplay },

      setEntries: (draft, entries) => {
        const entriesChanged = draft.entries.length !== entries.length
          || draft.entries.some((entry, index) => entry.id !== entries[index]?.id || entry.label !== entries[index]?.label)
        const { order, changed } = mergeEntries(draft.order, entries)
        if (!entriesChanged && !changed) return
        if (entriesChanged) draft.entries = entries
        if (changed) draft.order = order
      },

      moveEntry: (draft, id, direction) => {
        // Swapping happens among visible rows only: hidden rows sit out of order.
        const visible = draft.order.filter(candidate => !draft.hidden.includes(candidate))
        const from = visible.indexOf(id)
        const to = from + direction
        if (from < 0 || to < 0 || to >= visible.length) return
        const neighbour = visible[to]
        const order = [...draft.order]
        order[order.indexOf(id)] = neighbour
        order[order.indexOf(neighbour)] = id
        draft.order = order
      },

      toggleEntry: (draft, id) => {
        if (draft.hidden.includes(id)) {
          draft.hidden = draft.hidden.filter(hidden => hidden !== id)
        } else {
          draft.hidden = [...draft.hidden, id]
        }
      },

      setFooterLayout: (draft, footerLayout) => { draft.footerLayout = footerLayout },

      setFooterNameDisplay: (draft, footerNameDisplay) => { draft.footerNameDisplay = footerNameDisplay },

      setFooterEntries: (draft, entries) => {
        const entriesChanged = draft.footerEntries.length !== entries.length
          || draft.footerEntries.some((entry, index) => entry.id !== entries[index]?.id || entry.label !== entries[index]?.label)
        const { order, changed } = mergeEntries(draft.footerOrder, entries)
        if (!entriesChanged && !changed) return
        if (entriesChanged) draft.footerEntries = entries
        if (changed) draft.footerOrder = order
      },

      moveFooterEntry: (draft, id, direction) => {
        const visible = draft.footerOrder.filter(candidate => !draft.footerHidden.includes(candidate))
        const from = visible.indexOf(id)
        const to = from + direction
        if (from < 0 || to < 0 || to >= visible.length) return
        const neighbour = visible[to]
        const order = [...draft.footerOrder]
        order[order.indexOf(id)] = neighbour
        order[order.indexOf(neighbour)] = id
        draft.footerOrder = order
      },

      toggleFooterEntry: (draft, id) => {
        if (draft.footerHidden.includes(id)) {
          draft.footerHidden = draft.footerHidden.filter(hidden => hidden !== id)
        } else {
          draft.footerHidden = [...draft.footerHidden, id]
        }
      },

      reset: (draft) => {
        draft.order = draft.entries.map(entry => entry.id)
        draft.hidden = []
        draft.footerOrder = draft.footerEntries.map(entry => entry.id)
        draft.footerHidden = []
      },
    },
  })
}
