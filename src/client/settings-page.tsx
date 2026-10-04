/**
 * DIY Layout settings page, registered into the `settings.section` list slot
 * (one full page in the settings navigation, like the built-in Plugins
 * section). Everything renders from ui-primitives controls over the plugin's
 * persisted store. Two covered areas:
 * - the global panel list (upper sidebar), and
 * - the footer plugin row above the account/settings area.
 */
import { Button, SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PropsStore } from '@deepseek-ai/dsh-client-store'
import type { DiyLayoutStoreHandle } from './store.ts'
import type { DiyLayoutSnapshot } from './types.ts'

type PageProps =
  & PropsRuntime<'settings.section'>
  & PropsStore<DiyLayoutStoreHandle>
  & PropsLocale<'diyLayout'>

/** The id list a row sits in: configured order restricted to known entries. */
function visibleIds(order: readonly string[], entries: DiyLayoutSnapshot['entries']): string[] {
  const known = new Set(entries.map(entry => entry.id))
  return order.filter(id => known.has(id))
}

/** One reorderable, hideable entry row. */
function EntryRow({ id, label, hidden, first, last, onMove, onToggle, t }: {
  id: string
  label: string
  hidden: boolean
  first: boolean
  last: boolean
  onMove: (id: string, direction: -1 | 1) => void
  onToggle: (id: string) => void
  t: PageProps['t']
}) {
  return (
    <div className={hidden ? 'dsh-diy-entry dsh-diy-entry-hidden' : 'dsh-diy-entry'}>
      <span className="dsh-diy-entry-name">{label}</span>
      {hidden && <span className="dsh-diy-hidden-tag">{t('order.hiddenTag')}</span>}
      <span className="dsh-diy-entry-actions">
        <Button
          size="sm"
          variant="ghost"
          disabled={hidden || first}
          aria-label={t('order.up')}
          onClick={() => { onMove(id, -1) }}
        >↑</Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={hidden || last}
          aria-label={t('order.down')}
          onClick={() => { onMove(id, 1) }}
        >↓</Button>
        <Switch
          checked={!hidden}
          label={hidden ? t('order.show', { name: label }) : t('order.hide', { name: label })}
          onChange={() => { onToggle(id) }}
        />
      </span>
    </div>
  )
}

/** The reorder/hide card for one area's entry projection. */
function EntryList({ entries, order, hidden, emptyText, onMove, onToggle, t }: {
  entries: DiyLayoutSnapshot['entries']
  order: readonly string[]
  hidden: readonly string[]
  emptyText: string
  onMove: (id: string, direction: -1 | 1) => void
  onToggle: (id: string) => void
  t: PageProps['t']
}) {
  const labels = new Map(entries.map(entry => [entry.id, entry.label]))
  const rows = visibleIds(order, entries)
  const visibleRows = rows.filter(id => !hidden.includes(id))
  return (
    <div className="dsh-diy-card">
      {rows.length === 0 && <div className="dsh-diy-entry"><span className="dsh-diy-entry-name">{emptyText}</span></div>}
      {rows.map((id) => (
        <EntryRow
          key={id}
          id={id}
          label={labels.get(id) ?? id}
          hidden={hidden.includes(id)}
          first={id === visibleRows[0]}
          last={id === visibleRows[visibleRows.length - 1]}
          onMove={onMove}
          onToggle={onToggle}
          t={t}
        />
      ))}
    </div>
  )
}

/**
 * Render the settings page. `close` stays unused on purpose: configuring the
 * sidebar never needs to leave settings.
 */
export function DiyLayoutSettingsPage({ useStore, actions, t }: PageProps) {
  const state = useStore((snapshot: DiyLayoutSnapshot) => snapshot)

  return (
    <div className="dsh-diy-page">
      <p className="dsh-diy-intro">{t('settings.intro')}</p>

      <div className="dsh-diy-field">
        <span className="dsh-diy-field-label">{t('panelArea.heading')}</span>
        <div className="dsh-diy-field">
          <span className="dsh-diy-field-label">{t('columns.label')}</span>
          <SegmentedControl
            id="diy-layout-columns"
            label={t('columns.label')}
            value={state.columns}
            onChange={(next) => { actions.setColumns(next) }}
            options={[
              { value: 'one', label: t('columns.one') },
              { value: 'two', label: t('columns.two') },
            ]}
          />
        </div>
        <div className="dsh-diy-field">
          <span className="dsh-diy-field-label">{t('names.label')}</span>
          <SegmentedControl
            id="diy-layout-names"
            label={t('names.label')}
            value={state.nameDisplay}
            onChange={(next) => { actions.setNameDisplay(next) }}
            options={[
              { value: 'icon-name', label: t('names.icon-name') },
              { value: 'icon-only', label: t('names.icon-only') },
            ]}
          />
        </div>
        <div className="dsh-diy-field">
          <span className="dsh-diy-field-label">{t('order.heading')}</span>
          <EntryList
            entries={state.entries}
            order={state.order}
            hidden={state.hidden}
            emptyText={t('order.empty')}
            onMove={(id, direction) => { actions.moveEntry(id, direction) }}
            onToggle={(id) => { actions.toggleEntry(id) }}
            t={t}
          />
        </div>
      </div>

      <div className="dsh-diy-field">
        <span className="dsh-diy-field-label">{t('footerArea.heading')}</span>
        <div className="dsh-diy-field">
          <span className="dsh-diy-field-label">{t('footer.layout.label')}</span>
          <SegmentedControl
            id="diy-layout-footer-layout"
            label={t('footer.layout.label')}
            value={state.footerLayout}
            onChange={(next) => { actions.setFooterLayout(next) }}
            options={[
              { value: 'default', label: t('footer.layout.default') },
              { value: 'one', label: t('footer.layout.one') },
              { value: 'two', label: t('footer.layout.two') },
            ]}
          />
        </div>
        <div className="dsh-diy-field">
          <span className="dsh-diy-field-label">{t('footer.names.label')}</span>
          <SegmentedControl
            id="diy-layout-footer-names"
            label={t('footer.names.label')}
            value={state.footerNameDisplay}
            onChange={(next) => { actions.setFooterNameDisplay(next) }}
            options={[
              { value: 'default', label: t('footer.names.default') },
              { value: 'icon-only', label: t('footer.names.icon-only') },
            ]}
          />
          <p className="dsh-diy-reset-hint">{t('footer.names.hint')}</p>
        </div>
        <div className="dsh-diy-field">
          <span className="dsh-diy-field-label">{t('order.heading')}</span>
          <EntryList
            entries={state.footerEntries}
            order={state.footerOrder}
            hidden={state.footerHidden}
            emptyText={t('order.empty')}
            onMove={(id, direction) => { actions.moveFooterEntry(id, direction) }}
            onToggle={(id) => { actions.toggleFooterEntry(id) }}
            t={t}
          />
        </div>
      </div>

      <div className="dsh-diy-reset">
        <Button
          size="sm"
          variant="outline"
          onClick={() => { actions.reset() }}
        >{t('reset.label')}</Button>
        <p className="dsh-diy-reset-hint">{t('reset.hint')}</p>
      </div>
    </div>
  )
}
