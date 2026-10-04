/** Shared client types that would otherwise pull store internals into prop faces. */
import type { DiyLayoutEntry, FooterLayout, FooterNameDisplay, LayoutColumns, NameDisplay } from './store.ts'

/** Read-only store state face consumed by components and the CSS engine. */
export interface DiyLayoutSnapshot {
  readonly columns: LayoutColumns
  readonly nameDisplay: NameDisplay
  readonly order: readonly string[]
  readonly hidden: readonly string[]
  readonly entries: readonly DiyLayoutEntry[]
  readonly footerLayout: FooterLayout
  readonly footerNameDisplay: FooterNameDisplay
  readonly footerOrder: readonly string[]
  readonly footerHidden: readonly string[]
  readonly footerEntries: readonly DiyLayoutEntry[]
}
