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

    return {
      inject: ['slots'],
      apply(ctx) {
        for (const [id, order, letter, color] of panels) {
          ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: id }, page(id)))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            { name: 'sidebar.panellist', id, order, label: `Fixture ${letter}` }, icon(letter, color)))
        }
      },
    }
  },
})
