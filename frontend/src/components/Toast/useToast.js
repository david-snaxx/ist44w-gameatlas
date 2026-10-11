import { createContext, useContext } from 'react'

// Holds { show }. Provided by ToastProvider around the whole app.
export const ToastContext = createContext(null)

/**
 * const toast = useToast()
 * toast.show({ status: 'success', message: 'Asset saved', action: { label: 'Undo', onClick } })
 * status: 'success' | 'warning' | 'error' | 'info'. Errors stay until dismissed.
 */
export function useToast() {
  return useContext(ToastContext)
}
