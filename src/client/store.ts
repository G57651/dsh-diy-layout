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
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

/** Sidebar panel-list arrangement. */
export type LayoutColumns = 'one' | 'two'

/** Whether panel rows show icon + name, or the icon alone (hover tooltip). */
export type NameDisplay = 'icon-name' | 'icon-only'

/** One projected sidebar panel entry, in the ledger's natural row order. */
export interface DiyLayoutEntry {
  /** List id of the `sidebar.panellist` entry (matches its main panel key). */
  readonly id: string
  /** Resolved, localized row label; also the button's aria-label. */
  readonly label: string
}

type DiyLayoutState = {
  columns: LayoutColumns
  nameDisplay: NameDisplay
  /**
   * Every known entry id in the user's desired display order. New entries
   * (plugins installed later) append in their natural order at first sight.
   */
  order: readonly string[]
  /** Entry ids the user hid from the sidebar. */
  hidden: readonly string[]
  /** Live natural-order projection; runtime-refreshed, not user data. */
  entries: readonly DiyLayoutEntry[]
}

type DiyLayoutActions = {
  setColumns: (draft: DiyLayoutState, columns: LayoutColumns) => void
  setNameDisplay: (draft: DiyLayoutState, nameDisplay: NameDisplay) => void
  /** Merge one fresh ledger projection: re-order, append newcomers, prune gone ids. */
  setEntries: (draft: DiyLayoutState, entries: readonly DiyLayoutEntry[]) => void
  /** Swap the entry with its visible neighbour in the requested direction. */
  moveEntry: (draft: DiyLayoutState, id: string, direction: -1 | 1) => void
  /** Show or hide one entry. */
  toggleEntry: (draft: DiyLayoutState, id: string) => void
  /** Drop ordering and hiding records; the natural ledger order shows again. */
  reset: (draft: DiyLayoutState) => void
}

/** localStorage key (repo convention: `dsh.` + domain + version). */
export const DIY_LAYOUT_STORE_KEY = 'dsh.diy-layout.v1'

/**
 * Annotation twin of the actions literal below (repo store convention: the
 * export needs a declared return type; drift fails assignability here).
 */
export type DiyLayoutStoreHandle = EngineStoreHandle<DiyLayoutState, DiyLayoutActions>

export function createDiyLayoutStore(): DiyLayoutStoreHandle {
  return defineStore({
    init: (): DiyLayoutState => ({
      columns: 'one',
      nameDisplay: 'icon-name',
      order: [],
      hidden: [],
      entries: [],
    }),
    persist: DIY_LAYOUT_STORE_KEY,
    actions: {
      setColumns: (draft, columns) => { draft.columns = columns },

      setNameDisplay: (draft, nameDisplay) => { draft.nameDisplay = nameDisplay },

      setEntries: (draft, entries) => {
        // Never prune configured ids here: at boot the panel ledger starts
        // empty and fills plugin by plugin, so pruning ids absent from the
        // current projection would erase the user's arrangement before the
        // rows exist. Stale ids are inert — the CSS engine and the settings
        // list both filter by the live projection — and `reset` clears them.
        const merged = [...draft.order]
        for (const entry of entries) {
          if (!merged.includes(entry.id)) merged.push(entry.id)
        }
        const entriesUnchanged = draft.entries.length === entries.length
          && draft.entries.every((entry, index) => entry.id === entries[index]?.id && entry.label === entries[index]?.label)
        const orderUnchanged = merged.length === draft.order.length
          && merged.every((id, index) => draft.order[index] === id)
        if (entriesUnchanged && orderUnchanged) return
        // Keep the references stable when nothing changed, so repeated ledger
        // events (each plugin registration) do not churn subscribers.
        if (!orderUnchanged) draft.order = merged
        if (!entriesUnchanged) draft.entries = entries
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

      reset: (draft) => {
        draft.order = draft.entries.map(entry => entry.id)
        draft.hidden = []
      },
    },
  })
}
