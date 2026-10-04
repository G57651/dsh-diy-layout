/**
 * Test-only fixture (NOT part of the shipped plugin): four extra sidebar
 * panel entries + matching main pages, written exactly like the official
 * decoration template. Used by the isolated web test to exercise the DIY
 * Layout rules against "many plugins" and third-party-style entries.
 */
window.__ModuleLoader__.load({
  id: 'dsh-diy-fixture-panels',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const icon = (letter, color) => () => h('svg', {
      viewBox: '0 0 64 64', width: 16, height: 16, 'aria-hidden': true,
      style: { display: 'block' },
    },
    h('circle', { cx: 32, cy: 32, r: 24, fill: color }),
    h('text', { x: 32, y: 42, textAnchor: 'middle', fontSize: 30, fill: '#fff' }, letter))

    const page = (name) => () => h('div', { style: { padding: 24 } }, h('h2', null, name))

    const panels = [
      ['alpha', 1, 'A', '#7c5cff'],
      ['bravo', 2, 'B', '#2f9e6e'],
      ['charlie', 3, 'C', '#d97a1f'],
      ['delta', 4, 'D', '#b8336a'],
    ]

    // Footer entries mimicking the real registrants' shapes: full-width
    // adaptive buttons with icon + text (one carrying a native `title`, the
    // way chat-import keeps its label accessible in icon mode).
    const footerButton = ({ id, order, label, color, titled }) => () => {
      const [wide, setWide] = React.useState(true)
      React.useEffect(() => {
        const observer = new ResizeObserver((entries) => {
          setWide(entries[0].contentRect.width > 120)
        })
        observer.observe(document.querySelector('div[class*="_footerActions"]') ?? document.body)
        return () => observer.disconnect()
      }, [])
      return h('button', {
        type: 'button',
        'data-fixture': id,
        'aria-label': label,
        title: titled ? label : undefined,
        onClick: () => {},
        style: {
          boxSizing: 'border-box', display: 'flex', alignItems: 'center',
          justifyContent: wide ? 'flex-start' : 'center', gap: wide ? 8 : 0,
          width: wide ? '100%' : 36, height: wide ? 42 : 36,
          padding: wide ? '0 10px 0 8px' : 0, border: 'none',
          borderRadius: wide ? 12 : '50%', background: 'transparent',
          color: 'var(--dsw-alias-label-primary)', fontFamily: 'inherit',
          fontSize: 14, cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap',
        },
      },
      h('span', { style: { flex: 'none', width: 16, height: 16, borderRadius: '50%', background: color, display: 'inline-block' } },
        h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true }, h('circle', { cx: 8, cy: 8, r: 7, fill: color }))),
      wide && h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, label))
    }

    const footerPanels = [
      ['fixture-import', 0, 'Fixture Import', '#3b82f6', false],
      ['fixture-overview', 10, 'Fixture Overview', '#f59e0b', false],
      ['fixture-restart', 50, 'Fixture Restart', '#10b981', true],
    ]

    return {
      inject: ['slots'],
      apply(ctx) {
        for (const [id, order, letter, color] of panels) {
          ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: id }, page(id)))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            { name: 'sidebar.panellist', id, order, label: `Fixture ${letter}` }, icon(letter, color)))
        }
        for (const [id, order, label, color, titled] of footerPanels) {
          ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
            { name: 'sidebar.footer.action', id, order }, footerButton({ id, order, label, color, titled })))
        }
      },
    }
  },
})
