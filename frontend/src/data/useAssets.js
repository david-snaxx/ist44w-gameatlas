import { useSyncExternalStore } from 'react'
import { getAssets, subscribe } from './assetStore.js'

/** All saved assets (of every blueprint). The component re-renders whenever assets change. */
export function useAssets() {
  return useSyncExternalStore(subscribe, getAssets)
}
