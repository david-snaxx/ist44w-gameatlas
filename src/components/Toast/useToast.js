import { useContext } from 'react'
import { ToastContext } from './toastContext.js'

/**
 * const toast = useToast()
 * toast.show({ status: 'success', message: 'Asset saved', action: { label: 'Undo', onClick } })
 * status: 'success' | 'warning' | 'error' | 'info'. Errors stay until dismissed.
 */
export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>')
  return toast
}
