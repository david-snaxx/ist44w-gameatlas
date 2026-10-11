import { X } from 'lucide-react'
import { useState } from 'react'
import Button from '../Button/Button.jsx'
import { ToastContext } from './useToast.js'

let nextToastId = 1

/** Shows short messages in the bottom-right corner. Wraps the whole app so every page can use useToast(). */
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function dismiss(id) {
    // The "current =>" form gives the newest list, even when a timer calls this seconds later
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function show({ status = 'info', message, action }) {
    const id = nextToastId
    nextToastId++
    const toast = { id: id, status: status, message: message, action: action }
    setToasts((current) => [...current, toast])

    // Errors stay until the user closes them; everything else disappears after 4 seconds
    if (status !== 'error') {
      setTimeout(() => dismiss(id), 4000)
    }
  }

  return (
    // React 19 lets a context object be used directly as its provider
    <ToastContext value={{ show }}>
      {children}
      <div className="toasts">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  )
}

/** One message, with its action button (e.g. Undo) if it has one, and a close button. */
function ToastMessage({ toast, onDismiss }) {
  function handleAction() {
    toast.action.onClick()
    onDismiss(toast.id)
  }

  return (
    <div className={`glass toast toast-${toast.status}`}>
      <p className="toast-message">{toast.message}</p>
      {toast.action && (
        <Button variant="ghost" onClick={handleAction}>
          {toast.action.label}
        </Button>
      )}
      <Button variant="ghost" icon={X} title="Dismiss" onClick={() => onDismiss(toast.id)} />
    </div>
  )
}

export default ToastProvider
