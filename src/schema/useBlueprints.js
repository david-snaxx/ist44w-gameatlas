import { useSyncExternalStore } from 'react'
import { getBlueprints, subscribe } from './blueprintStore.js'

/**
 * All saved blueprints. The component re-renders whenever one is saved or deleted.
 * (useSyncExternalStore is React's built-in way to read data that lives outside React.)
 */
export function useBlueprints() {
  return useSyncExternalStore(subscribe, getBlueprints)
}
