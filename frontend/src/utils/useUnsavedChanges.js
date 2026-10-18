import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

/**
 * Stops the user leaving an editor with unsaved changes: `useBlocker` catches navigation inside the app, and
 * `beforeunload` catches closing or reloading the tab. Returns the blocker (for <UnsavedChangesDialog />) and
 * `allowLeaving()`, to call just before navigating on purpose (after a save under a new ID, or a delete).
 */
export function useUnsavedChanges(isDirty) {
  // A ref is a value that survives re-renders without causing one when it changes
  const allowedRef = useRef(false)

  // react-router calls this before every in-app navigation; returning true stops it
  function shouldBlock({ currentLocation, nextLocation }) {
    if (!isDirty || allowedRef.current) {
      return false
    }
    return currentLocation.key !== nextLocation.key
  }
  const blocker = useBlocker(shouldBlock)

  // While there are unsaved changes, ask the browser to warn before the tab closes or reloads
  useEffect(() => {
    if (!isDirty) {
      return
    }

    function warnBeforeUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)

    // React runs the returned function when isDirty changes or the editor closes
    return function stopWarning() {
      window.removeEventListener('beforeunload', warnBeforeUnload)
    }
  }, [isDirty])

  function allowLeaving() {
    allowedRef.current = true
  }

  return { blocker, allowLeaving }
}
