import { Trash2 } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { cx } from '../../utils/cx.js'
import Button from '../Button/Button.jsx'

/**
 * Modal confirmation for destructive actions only. Uses the native <dialog> element,
 * which handles focus trapping and Esc for us.
 */
function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cx('glass', 'dialog')}
      onCancel={(event) => {
        event.preventDefault() // let React state close it
        onCancel()
      }}
    >
      <h2 id={titleId}>{title}</h2>
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
