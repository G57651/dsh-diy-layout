/**
 * Plugin-owned styles, injected once at apply time as a
 * `<style data-plugin="dsh-diy-layout">` element (repo convention for
 * plugin-lifecycle stylesheets). Two concerns:
 *
 * 1. The settings page layout (classes prefixed `dsh-diy-` to stay collision
 *    free; colors, radii, and motion come from the theme's semantic alias
 *    tokens, so light/dark follow the app automatically).
 * 2. The overlay tooltip bubble — values copied 1:1 from ui-primitives'
 *    Tooltip.module.css so the bubble is visually indistinguishable from the
 *    shipped one (the primitive itself cannot be reused: it must own its
 *    anchor element, and the anchor here is the shell's rendered button).
 */

export const BUBBLE_Z_INDEX = 1100

export const PLUGIN_STYLES = `
.dsh-diy-page { display: flex; flex-direction: column; gap: 20px; max-width: 560px; }
.dsh-diy-intro { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.dsh-diy-field { display: flex; flex-direction: column; gap: 8px; }
.dsh-diy-field-label { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 500; line-height: 22px; }
.dsh-diy-card {
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
  display: flex; flex-direction: column;
}
.dsh-diy-entry {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
}
.dsh-diy-entry + .dsh-diy-entry { border-top: 0.5px solid var(--dsw-alias-border-l2); }
.dsh-diy-entry-name {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px;
}
.dsh-diy-entry-hidden .dsh-diy-entry-name {
  color: var(--dsw-alias-label-tertiary); text-decoration: line-through;
}
.dsh-diy-hidden-tag {
  flex: none; padding: 1px 6px; border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px;
}
.dsh-diy-entry-actions { flex: none; display: flex; align-items: center; gap: 2px; }
.dsh-diy-entry-actions > :disabled { opacity: 0.35; }
.dsh-diy-reset { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.dsh-diy-reset-hint { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }

.dsh-diy-bubble {
  display: inline-flex; align-items: center; gap: 8px;
  position: fixed; z-index: ${BUBBLE_Z_INDEX};
  width: max-content; max-width: 50vw;
  padding: 3px 7px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-tooltip-bg);
  color: var(--dsw-static-neutral-bluish-00);
  font-size: 13px; line-height: 20px;
  white-space: pre-line;
  overflow-wrap: break-word;
  pointer-events: none;
  animation: dsh-diy-tooltip-in 150ms var(--ds-ease-in-out);
}
.dsh-diy-bubble[data-side='right'] { transform: translateY(-50%); }
.dsh-diy-bubble[data-side='left'] { transform: translateY(-50%) translateX(-100%); }
@keyframes dsh-diy-tooltip-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .dsh-diy-bubble { animation: none; }
}
`
