/**
 * DIY Layout, browser half. Contributes three additive registrations and one
 * injected stylesheet — no shipped entry is shadowed, no DOM is rewritten:
 *
 * 1. `settings.section` — the plugin's configuration page.
 * 2. `shell.overlay` — the icon-only hover tooltip (portal bubble).
 * 3. A `<style data-plugin>` element restyled from the persisted preference
 *    store, the `sidebar.panellist` ledger, and the locale, so single/two
 *    columns, icon-only rows, ordering, and hiding follow the sidebar live.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// SlotMap augmentations for the keys this plugin registers into (type-only:
// erased at runtime, the services arrive through cordis injection).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { createDiyLayoutStore } from './store.ts'
import { buildSidebarCss } from './sidebar-css.ts'
import { PLUGIN_STYLES } from './styles.ts'
import { DiyTooltipOverlay } from './tooltip-overlay.tsx'
import { DiyLayoutSettingsPage } from './settings-page.tsx'
import { en, zh, type DiyLayoutKey } from './locales.ts'

/** Services this plugin needs: slot registry and locale. */
export const inject = ['slots', 'locale']

/** Dictionary namespace owned by this plugin. */
export const NS = 'diyLayout'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** DIY Layout settings page copy. */
    'diyLayout': DiyLayoutKey
  }
}

/** Resolve a stored slot label (string or localized thunk) with a safe fallback. */
function resolveLabel(label: unknown, fallback: unknown): string {
  try {
    const resolved = typeof label === 'function' ? (label as () => string)() : label
    if (typeof resolved === 'string' && resolved !== '') return resolved
  } catch {
    // A registrant's label thunk may legitimately depend on its locale being
    // ready; fall through to the id.
  }
  return String(fallback ?? '')
}

/** Snapshot the panellist ledger the same way ui-sidebar projects its rows. */
function projectEntries(ctx: ClientContext): { id: string, label: string, order: number }[] {
  return ctx.slots.entriesOfSlot('sidebar.panellist')
    .map(({ options }) => ({
      id: String(options.id ?? ''),
      label: resolveLabel(options.label, options.id),
      order: typeof options.order === 'number' ? options.order : 0,
    }))
    .filter(entry => entry.id !== '')
    .sort((left, right) => left.order - right.order)
}

/**
 * Apply: wire dictionaries, the persisted preference store, the sidebar
 * stylesheet, and the two slot registrations.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'diy-layout: dictionaries')
  const t = ctx.locale.bind(NS)

  // Shared store instance, singletonized at apply time (the ui-layout store
  // precedent): components receive `useStore`/`actions` through the
  // registrations' store seat, apply-side subscribers use the instance.
  const handle = createDiyLayoutStore()
  const instance = handle.create()
  const store: typeof handle = { ...handle, create: () => instance }

  // Page + bubble styles: one static sheet with the plugin's lifecycle.
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-diy-layout'
    style.textContent = PLUGIN_STYLES
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'diy-layout: static styles')

  // Sidebar rules: regenerated from store + ledger + locale, so column mode,
  // icon-only rows, ordering, and hiding all follow live changes — including
  // plugins installed or localized later.
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-diy-layout'
    style.dataset.pluginCss = 'dsh-diy-layout/sidebar'
    document.head.appendChild(style)
    const sync = (): void => {
      const snapshot = instance.getSnapshot()
      style.textContent = buildSidebarCss({
        columns: snapshot.columns,
        nameDisplay: snapshot.nameDisplay,
        hidden: snapshot.hidden,
        order: snapshot.order,
        entries: snapshot.entries,
      })
    }
    const unsubscribeStore = instance.subscribe(sync)
    const unsubscribeSlots = ctx.slots.subscribe('sidebar.panellist', sync)
    const unsubscribeLocale = ctx.locale.subscribe(sync)
    sync()
    return () => {
      unsubscribeStore()
      unsubscribeSlots()
      unsubscribeLocale()
      style.remove()
    }
  }, 'diy-layout: sidebar stylesheet')

  // Ledger → store projection: the settings page rows and the CSS engine's
  // natural row order both read from here. Locale changes re-resolve labels.
  ctx.effect(() => {
    const syncEntries = (): void => {
      instance.actions.setEntries(projectEntries(ctx))
    }
    const unsubscribeSlots = ctx.slots.subscribe('sidebar.panellist', syncEntries)
    const unsubscribeLocale = ctx.locale.subscribe(syncEntries)
    syncEntries()
    return () => {
      unsubscribeSlots()
      unsubscribeLocale()
    }
  }, 'diy-layout: ledger projection')

  // Icon-only hover tooltip on the additive frame-wide overlay.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'diy-layout-tooltip',
    store,
  }, DiyTooltipOverlay))

  // Configuration page in the settings navigation.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'diy-layout',
    order: 16,
    label: () => t('settings.section'),
    locale: NS,
    store,
  }, DiyLayoutSettingsPage))
}
