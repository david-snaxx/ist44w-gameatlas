import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { cx } from '../../utils/cx.js'
import { ToastContext } from './toastContext.js'

const ICONS = {
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
  info: Info,
}

const AUTO_DISMISS_MS = 4000

let nextToastId = 1

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    ({ status = 'info', message, action }) => {
      const id = nextToastId++
      setToasts((current) => [...current, { id, status, message, action }])
      if (status !== 'error') setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext value={value}>
      {children}
      <div className="toasts">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.status]
          return (
            <div
              key={toast.id}
              role={toast.status === 'error' ? 'alert' : 'status'}
              className={cx('glass', 'toast', `toast-${toast.status}`)}
            >
              <Icon size={16} strokeWidth={1.75} className="toast-icon" aria-hidden="true" />
              <p className="toast-message">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    toast.action.onClick()
                    dismiss(toast.id)
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss"
                title="Dismiss"
                onClick={() => dismiss(toast.id)}
              >
                <X size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext>
  )
}

export default ToastProvider
