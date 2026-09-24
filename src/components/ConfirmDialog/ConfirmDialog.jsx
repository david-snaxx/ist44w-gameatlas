import { Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import Button from '../Button/Button.jsx'

/**
 * Modal confirmation for destructive actions only. Render it only while it should be open:
 *   {confirmDelete && <ConfirmDialog ... />}
 *
 * It uses the browser's own <dialog> element, which dims the page behind it and closes on Esc
 * (Esc calls onCancel).
 */
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  const dialogRef = useRef(null)

  // A <dialog> starts hidden; showModal() opens it once it's on the page
  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog ref={dialogRef} className="glass dialog" onCancel={onCancel}>
      <h2>{title}</h2>
      <p className="dialog-message">{message}</p>
      <div className="dialog-actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" icon={Trash2} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
