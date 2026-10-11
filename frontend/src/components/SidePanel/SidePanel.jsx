import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import Button from '../Button/Button.jsx'

/**
 * Slide-out panel from the right for creating/editing small things. Render it only while it
 * should be open. Clicking outside it closes it. footer: usually Cancel + Save buttons.
 */
function SidePanel({ title, onClose, footer, children }) {
  // Rendered into document.body: a scrolling section would clip it, and glass ancestors trap position: fixed
  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="glass drawer">
        <header className="drawer-head">
          <h2>{title}</h2>
          <Button variant="ghost" icon={X} title="Close" onClick={onClose} />
        </header>
        <div className="drawer-body">{children}</div>
        <footer className="drawer-foot">{footer}</footer>
      </aside>
    </>,
    document.body,
  )
}

export default SidePanel
