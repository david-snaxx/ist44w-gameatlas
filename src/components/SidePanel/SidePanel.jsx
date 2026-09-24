import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../utils/cx.js'
import Button from '../Button/Button.jsx'

/**
 * Slide-out panel from the right for creating/editing small things.
 * Closes on Esc and when clicking outside. footer: usually Cancel + Save buttons.
 */
function SidePanel({ open, title, onClose, footer, children }) {
  const panelRef = useRef(null)
  const titleId = useId()

  // Keep the latest onClose without re-running the effect below on every render
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement
    panelRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  // Rendered into document.body: a scrolling section would clip it, and glass ancestors trap position: fixed
  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx('glass', 'drawer')}
      >
        <header className="drawer-head">
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" icon={X} aria-label="Close" title="Close" onClick={onClose} />
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </>,
    document.body,
  )
}

export default SidePanel
