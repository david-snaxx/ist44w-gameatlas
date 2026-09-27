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
