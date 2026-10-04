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
import { FOOTER_SLOT_SELECTOR, NAV_SELECTOR } from './sidebar-css.ts'

const FIBER_KEY_PREFIX = '__reactFiber$'

type Fiber = {
  return?: Fiber
  pendingProps?: { entry?: { options?: { id?: unknown } } }
  memoizedProps?: { entry?: { options?: { id?: unknown } } }
}

/** Resolve the slot entry id a rendered node belongs to, via its React fiber. */
function entryIdOfNode(node: Element): string | null {
  const fiberKey = Object.keys(node).find(key => key.startsWith(FIBER_KEY_PREFIX))
  if (fiberKey === undefined) return null
  let fiber = (node as unknown as Record<string, unknown>)[fiberKey] as Fiber | undefined
  while (fiber) {
    const entry = fiber.pendingProps?.entry ?? fiber.memoizedProps?.entry
    const id = entry?.options?.id
    if (typeof id === 'string' && id !== '') return id
    fiber = fiber.return
  }
  return null
}

function setId(element: HTMLElement, id: string | null): void {
  // Only write on change: rewriting the same attribute would re-trigger the
  // MutationObserver on every pass.
  if (element.dataset.diyEntry === id) return
  if (id === null) delete element.dataset.diyEntry
  else element.dataset.diyEntry = id
}

/** One idempotent tagging pass over both covered areas. */
function tagPass(): void {
  tagPassInner()
}

function tagPassInner(): void {
  // Panel list: the shell renders one row button per entry; the entry's own
  // render sits in the row's glyph slot anchor.
  const nav = document.querySelector(NAV_SELECTOR)
  if (nav !== null) {
    for (const row of nav.children) {
      if (!(row instanceof HTMLElement)) continue
      const anchor = row.querySelector(`div[data-slot="sidebar.panellist"]`)
      const rendered = anchor?.firstElementChild
      setId(row, rendered === null || rendered === undefined ? null : entryIdOfNode(rendered))
    }
  }
  // Footer row: every entry root is a direct child of the shared anchor.
  const footer = document.querySelector(FOOTER_SLOT_SELECTOR)
  if (footer !== null) {
    for (const child of footer.children) {
      if (!(child instanceof HTMLElement)) continue
      setId(child, entryIdOfNode(child))
    }
  }
}

/**
 * Start tagging. Returns a disposer that stops observing and strips the
 * tags (plugin lifecycle: the injected stylesheet's entry rules die with it).
 */
export function startEntryTagging(): () => void {
  tagPass()
  // Synchronous pass per mutation batch: the walk is cheap (two containers,
  // a handful of children, writes only on change), and deferring through
  // requestAnimationFrame would starve in rendering-throttled contexts
  // (backgrounded windows, screencast-driven views).
  const observer = new MutationObserver(tagPass)
  // Document-wide childList: entries mount with the shell and remount on
  // collapse/expand; the pass itself only touches the two containers'
  // children, so the observation cost stays flat regardless of chat traffic.
  observer.observe(document.body, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    for (const el of document.querySelectorAll('[data-diy-entry]')) {
      el.removeAttribute('data-diy-entry')
    }
  }
}
