import { useEffect, useSyncExternalStore } from 'react'
import { getCurrentUser, loadCurrentUser, subscribe } from './currentUserStore.js'

/**
 * Who is logged in: { checked, user }. `user` is null when nobody is, and `checked` is false until
 * the server has answered, so a component can wait rather than flash "logged out" for a moment.
 *
 * The first component to call this sets the one request going; every other one shares its answer and
 * re-renders when it arrives.
 * (useSyncExternalStore is React's built-in way to read data that lives outside React.)
 */
export function useCurrentUser() {
  const currentUser = useSyncExternalStore(subscribe, getCurrentUser)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  return currentUser
}
