import { Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import Button from '../Button/Button.jsx'

/**
 * Modal confirmation, mostly for destructive actions. Render it only while it should be open:
 *   {confirmDelete && <ConfirmDialog ... />}
 *
 * It uses the browser's own <dialog> element, which dims the page behind it and closes on Esc
 * (Esc calls onCancel). Optional: `children` go under the message (e.g. a field to fill in, where Enter confirms),
 * `confirmVariant` and `confirmIcon` change the confirm button from a red delete one, and `confirmDisabled` turns it
 * off while a request is on its way.
 */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  confirmIcon = Trash2,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  const dialogRef = useRef(null)

  // A <dialog> starts hidden; showModal() opens it once it's on the page
  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  // A form, so pressing Enter in a field inside confirms too
  function handleSubmit(event) {
    // Without this the browser reloads the page when the form is submitted
    event.preventDefault()
    onConfirm()
  }

  return (
    <dialog ref={dialogRef} className="glass dialog" onCancel={onCancel}>
      <form onSubmit={handleSubmit}>
        <h2>{title}</h2>
        <p className="dialog-message">{message}</p>
        {children && <div className="dialog-fields">{children}</div>}
        <div className="dialog-actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant={confirmVariant} icon={confirmIcon} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export default ConfirmDialog
