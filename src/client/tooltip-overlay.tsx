/**
 * Icon-only hover tooltip. Registered into the additive `shell.overlay` list
 * slot; the component itself renders nothing into the sidebar — it watches
 * plugin-entry hover/focus events at the document level and portals one
 * bubble to document.body.
 *
 * Why not the ui-primitives `Tooltip`: that component must own its anchor
 * element (it clones and wraps the child), while the anchors here — the
 * panel-row buttons and the footer plugin buttons — are rendered by the
 * shell and by third-party plugins. The bubble instead copies the
 * primitive's CSS values 1:1 (see styles.ts), so it stays visually
 * identical and theme-following.
 *
 * Coverage:
 * - Panel rows (global panel list): the shell's own tooltip is disabled
 *   while expanded, so the overlay covers rows whose label span the
 *   injected stylesheet hides.
 * - Footer plugin entries (chat-import, one-click-restart, …): covered when
 *   the injected icon-only rules are active on them (computed font-size 0),
 *   unless the entry carries its own `title` attribute — those get a native
 *   tooltip by the plugin's own design and are skipped to avoid doubles.
 * - Collapsed rail rows keep their shipped tooltips (shell for panel rows,
 *   plugins' own mechanisms for footer entries).
 *
 * Trigger contract matches the shell's PanelRow tooltip: 500ms hover delay,
 * immediate on keyboard focus, hidden on click.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PropsStore } from '@deepseek-ai/dsh-client-store'
import { FOOTER_ROW_SELECTOR, NAV_SELECTOR, TITLE_SELECTOR } from './sidebar-css.ts'
import type { DiyLayoutStoreHandle } from './store.ts'

/** Hover delay, matching the shell's PanelRow `Tooltip delayMs={500}`. */
const DELAY_MS = 500
/** Anchor-to-bubble gap, matching the primitive's default `gap = 8`. */
const GAP = 8
/** Viewport inset kept clear around the bubble. */
const EDGE = 8

type Tip = {
  readonly label: string
  readonly anchor: DOMRect
  readonly side: 'right' | 'left'
  /** Absolute viewport Y of the bubble's anchor point (its vertical center). */
  readonly top: number
}

type OverlayProps = PropsStore<DiyLayoutStoreHandle>

/** A panel row the overlay should cover, or null. */
function coveredPanelRow(target: EventTarget | null): HTMLButtonElement | null {
  const candidate = target instanceof Element ? target.closest('button') : null
  if (!(candidate instanceof HTMLButtonElement)) return null
  if (candidate.closest(NAV_SELECTOR) === null) return null
  // The shell renders the label span only while the sidebar is expanded; the
  // injected stylesheet hides it in icon-only mode. Both conditions together
  // mean: rail rows fall through to the shell's own tooltip.
  const title = candidate.querySelector(TITLE_SELECTOR)
  if (!(title instanceof HTMLElement)) return null
  return window.getComputedStyle(title).display === 'none' ? candidate : null
}

/**
 * A footer plugin entry the overlay should cover, or null. Active only while
 * the injected icon-only rules are actually applied to it (font-size 0);
 * entries that ship their own `title` tooltip keep theirs.
 */
function coveredFooterButton(target: EventTarget | null): HTMLButtonElement | null {
  const candidate = target instanceof Element ? target.closest('button') : null
  if (!(candidate instanceof HTMLButtonElement)) return null
  if (candidate.closest(FOOTER_ROW_SELECTOR) === null) return null
  if (candidate.getAttribute('title') !== null) return null
  const label = candidate.getAttribute('aria-label')
  if (label === null || label === '') return null
  return window.getComputedStyle(candidate).fontSize === '0px' ? candidate : null
}

/** Any covered plugin entry (panel row or footer button), or null. */
function coveredEntry(target: EventTarget | null): HTMLButtonElement | null {
  return coveredPanelRow(target) ?? coveredFooterButton(target)
}

/**
 * Render the hover tooltip. Inert (renders null, mounts no listeners) unless
 * an icon-only display is configured for at least one area.
 */
export function DiyTooltipOverlay({ useStore }: OverlayProps) {
  const iconOnly = useStore(state => state.nameDisplay === 'icon-only' || state.footerNameDisplay === 'icon-only')
  const [tip, setTip] = useState<Tip | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!iconOnly) return
    let timer: number | undefined
    let anchor: HTMLButtonElement | null = null

    const clear = (): void => {
      window.clearTimeout(timer)
      timer = undefined
    }
    const hide = (): void => {
      clear()
      anchor = null
      setTip(null)
    }
    const show = (button: HTMLButtonElement, delay: boolean): void => {
      clear()
      anchor = button
      const present = (): void => {
        const label = button.getAttribute('aria-label')
        if (label === null || label === '') { hide(); return }
        const rect = button.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) { hide(); return }
        setTip({ label, anchor: rect, side: 'right', top: rect.top + rect.height / 2 })
      }
      if (delay) timer = window.setTimeout(present, DELAY_MS)
      else present()
    }
    const onOver = (event: PointerEvent): void => {
      const entry = coveredEntry(event.target)
      if (entry === anchor) return
      if (entry === null) { hide(); return }
      show(entry, true)
    }
    const onOut = (event: PointerEvent): void => {
      // Leaving the window (relatedTarget null) or moving to a non-covered
      // target both end the hover; the next pointerover re-arms otherwise.
      if (anchor === null) return
      if (event.relatedTarget === null || coveredEntry(event.relatedTarget) !== anchor) hide()
    }
    const onFocusIn = (event: FocusEvent): void => {
      const entry = coveredEntry(event.target)
      if (entry !== null) show(entry, false)
      else hide()
    }
    // Clicks activate the entry; the primitive hides its bubble there too.
    const onPointerDown = (event: PointerEvent): void => {
      if (coveredEntry(event.target) !== null) hide()
    }
    // Geometry changes strand the bubble away from its anchor.
    const onGeometry = (): void => { if (anchor !== null) hide() }

    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('pointerout', onOut, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('scroll', onGeometry, true)
    window.addEventListener('resize', onGeometry)
    return () => {
      clear()
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('pointerout', onOut, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('scroll', onGeometry, true)
      window.removeEventListener('resize', onGeometry)
    }
  }, [iconOnly])

  // One measured correction pass after mount: flip the side when the bubble
  // would clip the right edge, then clamp it into the viewport vertically.
  useLayoutEffect(() => {
    if (tip === null) return
    const bubble = bubbleRef.current
    if (bubble === null) return
    const box = bubble.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) return
    if (tip.side === 'right' && tip.anchor.right + GAP + box.width > window.innerWidth - EDGE) {
      setTip({ ...tip, side: 'left' })
      return
    }
    const half = box.height / 2
    const clamped = Math.min(Math.max(tip.top, EDGE + half), window.innerHeight - EDGE - half)
    if (clamped !== tip.top) setTip({ ...tip, top: clamped })
  }, [tip])

  if (!iconOnly || tip === null) return null
  const left = tip.side === 'right' ? tip.anchor.right + GAP : tip.anchor.left - GAP
  return createPortal(
    <div
      ref={bubbleRef}
      className="dsh-diy-bubble"
      data-side={tip.side}
      role="tooltip"
      style={{ left, top: tip.top }}
    >
      {tip.label}
    </div>,
    document.body,
  )
}
