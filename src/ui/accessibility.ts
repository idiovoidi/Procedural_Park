/**
 * Accessibility plumbing for the DOM panels (M7)
 * Every modal panel shares the `modal-overlay` class, so one observer gives them all a dialog
 * role and a label, moves focus into a panel when it opens and back out when it closes, and lets
 * Escape close the topmost one. Live regions (toast, pen inspector) announce changes politely.
 */

const OVERLAY = '.modal-overlay'

const isOpen = (el: HTMLElement): boolean => el.style.display !== 'none' && el.style.display !== ''

/** Label a panel from its heading, so a screen reader announces "Market, dialog". */
function describe(overlay: HTMLElement): void {
  if (overlay.getAttribute('role')) return
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  const heading = overlay.querySelector('h2, h3')
  // Drop leading emoji so a screen reader says "Market", not "money bag Market"
  const label = heading?.textContent?.replace(/^[^\p{L}\p{N}]+/u, '').trim()
  if (label) overlay.setAttribute('aria-label', label)
  const close = overlay.querySelector('.close-btn')
  if (close && !close.getAttribute('aria-label')) close.setAttribute('aria-label', 'Close')
}

export function installAccessibility(root: Document = document): () => void {
  const returnFocus = new WeakMap<HTMLElement, HTMLElement | null>()
  const wasOpen = new WeakMap<HTMLElement, boolean>()

  const check = (overlay: HTMLElement) => {
    describe(overlay)
    const open = isOpen(overlay)
    if (open === (wasOpen.get(overlay) ?? false)) return
    wasOpen.set(overlay, open)
    if (open) {
      returnFocus.set(overlay, root.activeElement as HTMLElement | null)
      const target = overlay.querySelector<HTMLElement>('button, select, input, [tabindex]')
      target?.focus({ preventScroll: true })
    } else {
      const back = returnFocus.get(overlay)
      if (back && root.contains(back)) back.focus({ preventScroll: true })
    }
  }

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes' && r.target instanceof HTMLElement && r.target.matches(OVERLAY)) {
        check(r.target)
      }
      if (r.type === 'childList') {
        for (const node of r.addedNodes) {
          if (node instanceof HTMLElement && node.matches(OVERLAY)) check(node)
        }
      }
    }
  })
  observer.observe(root.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style'],
  })
  for (const overlay of root.querySelectorAll<HTMLElement>(OVERLAY)) check(overlay)

  // Escape closes the topmost open panel (capture phase: before the game's own Escape binding).
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    const open = [...root.querySelectorAll<HTMLElement>(OVERLAY)].filter(isOpen)
    const top = open.at(-1)
    if (!top) return
    const close = top.querySelector<HTMLElement>('.close-btn')
    if (!close) return
    e.preventDefault()
    e.stopImmediatePropagation()
    close.click()
  }
  root.addEventListener('keydown', onKey, true)

  // Live regions: announce toasts and the pen inspector without stealing focus.
  const live = (selector: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const el = root.querySelector(selector)
    if (el && !el.getAttribute('aria-live')) {
      el.setAttribute('role', 'status')
      el.setAttribute('aria-live', politeness)
    }
  }
  live('#toast')
  live('#pen-inspector')
  const canvas = root.querySelector('canvas')
  if (canvas && !canvas.getAttribute('aria-label')) {
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'The park: a 3D view. Use the toolbar buttons to act.')
  }

  return () => {
    observer.disconnect()
    root.removeEventListener('keydown', onKey, true)
  }
}
