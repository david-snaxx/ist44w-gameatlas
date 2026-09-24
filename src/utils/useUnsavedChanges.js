import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

/**
 * Stops the user leaving an editor with unsaved changes, in two ways: react-router's
 * `useBlocker` catches navigation inside the app, and `beforeunload` catches closing or
 * reloading the tab (the browser shows its own warning there).
 *
 * Returns the blocker (pass it to <UnsavedChangesDialog />) and `allowLeaving()`, which
 * the page calls just before navigating on purpose — after saving under a new ID, or
 * after deleting — so the guard doesn't ask about changes that no longer matter.
 */
export function useUnsavedChanges(isDirty) {
  const allowedRef = useRef(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !allowedRef.current && currentLocation.key !== nextLocation.key,
  )

  useEffect(() => {
    if (!isDirty) return
    function warnBeforeUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  return {
    blocker,
    allowLeaving: () => {
      allowedRef.current = true
    },
  }
}
