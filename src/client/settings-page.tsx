/**
 * DIY Layout settings page, registered into the `settings.section` list slot
 * (one full page in the settings navigation, like the built-in Plugins
 * section). Everything renders from ui-primitives controls over the plugin's
 * persisted store: layout mode, name display, per-entry order + visibility,
 * and a reset.
 */
import { Button, SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PropsStore } from '@deepseek-ai/dsh-client-store'
import type { DiyLayoutStoreHandle } from './store.ts'
import type { DiyLayoutKey } from './locales.ts'
import type { DiyLayoutSnapshot } from './types.ts'

type PageProps =
  & PropsRuntime<'settings.section'>
  & PropsStore<DiyLayoutStoreHandle>
  & PropsLocale<'diyLayout'>

/** The id list a row sits in: configured order restricted to known entries. */
function visibleIds(state: DiyLayoutSnapshot): string[] {
  const known = new Set(state.entries.map(entry => entry.id))
  return state.order.filter(id => known.has(id))
}

/**
 * Render the settings page. `close` stays unused on purpose: configuring the
 * sidebar never needs to leave settings.
 */
export function DiyLayoutSettingsPage({ useStore, actions, t }: PageProps) {
  const state = useStore((snapshot: DiyLayoutSnapshot) => snapshot)
  const labels = new Map(state.entries.map(entry => [entry.id, entry.label]))
  const rows = visibleIds(state)
  const firstVisible = rows.find(id => !state.hidden.includes(id))
  const lastVisible = [...rows].reverse().find(id => !state.hidden.includes(id))

  return (
    <div className="dsh-diy-page">
      <p className="dsh-diy-intro">{t('settings.intro')}</p>

      <div className="dsh-diy-field">
        <span className="dsh-diy-field-label" id="diy-layout-columns-label">{t('columns.label')}</span>
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
        <span className="dsh-diy-field-label" id="diy-layout-names-label">{t('names.label')}</span>
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
        <div className="dsh-diy-card">
          {rows.length === 0 && <div className="dsh-diy-entry"><span className="dsh-diy-entry-name">{t('order.empty')}</span></div>}
          {rows.map((id) => {
            const hidden = state.hidden.includes(id)
            const label = labels.get(id) ?? id
            return (
              <div key={id} className={hidden ? 'dsh-diy-entry dsh-diy-entry-hidden' : 'dsh-diy-entry'}>
                <span className="dsh-diy-entry-name">{label}</span>
                {hidden && <span className="dsh-diy-hidden-tag">{t('order.hiddenTag')}</span>}
                <span className="dsh-diy-entry-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={hidden || id === firstVisible}
                    aria-label={t('order.up')}
                    onClick={() => { actions.moveEntry(id, -1) }}
                  >↑</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={hidden || id === lastVisible}
                    aria-label={t('order.down')}
                    onClick={() => { actions.moveEntry(id, 1) }}
                  >↓</Button>
                  <Switch
                    checked={!hidden}
                    label={hidden ? t('order.show', { name: label }) : t('order.hide', { name: label })}
                    onChange={() => { actions.toggleEntry(id) }}
                  />
                </span>
              </div>
            )
          })}
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

/** The namespace key union the page's `t` resolves against. */
export type { DiyLayoutKey }
