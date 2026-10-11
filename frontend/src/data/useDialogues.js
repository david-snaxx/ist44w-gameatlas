import { useSyncExternalStore } from 'react'
import { getDialogues, subscribe } from './dialogueStore.js'

/** All saved dialogues. The component re-renders whenever one is saved or deleted. */
export function useDialogues() {
  return useSyncExternalStore(subscribe, getDialogues)
}
