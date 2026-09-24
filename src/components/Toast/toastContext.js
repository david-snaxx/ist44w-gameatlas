import { createContext } from 'react'

// Holds { show, dismiss }. Provided by ToastProvider, read with useToast().
export const ToastContext = createContext(null)
