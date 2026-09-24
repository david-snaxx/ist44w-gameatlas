import { X } from 'lucide-react'
import { useState } from 'react'
import Button from '../Button/Button.jsx'
import { ToastContext } from './useToast.js'

let nextToastId = 1

/** Shows short messages in the bottom-right corner. Wraps the whole app so every page can use useToast(). */
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function dismiss(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function show({ status = 'info', message, action }) {
    const id = nextToastId++
    setToasts((current) => [...current, { id, status, message, action }])
    // Errors stay until the user closes them; everything else disappears after 4 seconds
    if (status !== 'error') setTimeout(() => dismiss(id), 4000)
  }

  return (
    // React 19 lets a context object be used directly as its provider
    <ToastContext value={{ show }}>
      {children}
      <div className="toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className={`glass toast toast-${toast.status}`}>
            <p className="toast-message">{toast.message}</p>
            {toast.action && (
              <Button
                variant="ghost"
                onClick={() => {
                  toast.action.onClick()
                  dismiss(toast.id)
                }}
              >
                {toast.action.label}
              </Button>
            )}
            <Button variant="ghost" icon={X} title="Dismiss" onClick={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export default ToastProvider
