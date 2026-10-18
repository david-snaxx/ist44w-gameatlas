import { useEffect, useSyncExternalStore } from 'react'
import { useCurrentProject } from '../api/useCurrentProject.js'
import { getDialogueCache, loadDialogues, subscribe } from './dialogueStore.js'

// Shared objects, so a page that renders again gets the same ones back
const NO_DIALOGUES = []
const LOADING = { status: 'loading', dialogues: NO_DIALOGUES, error: null }

/** The current project's dialogues; empty while loading and when nobody is logged in. */
export function useDialogues() {
  return useDialogueCache().dialogues
}

/**
 * One dialogue by its ID (`key`): { status, dialogue, error }. `status` is 'loading', 'found', 'missing' (also for a
 * new dialogue, which has no ID yet) or 'failed' (`error` says why).
 */
export function useDialogue(key) {
  const cache = useDialogueCache()

  if (cache.status !== 'ready') {
    return { status: cache.status, dialogue: null, error: cache.error }
  }
  const dialogue = cache.dialogues.find((candidate) => candidate.key === key)
  if (!dialogue) {
    return { status: 'missing', dialogue: null, error: null }
  }
  return { status: 'found', dialogue: dialogue, error: null }
}

/** The current project's dialogues as this page should see them: { status, dialogues, error }. Starts the load. */
function useDialogueCache() {
  const currentProject = useCurrentProject()
  const cache = useSyncExternalStore(subscribe, getDialogueCache)

  let projectId = null
  if (currentProject.project) {
    projectId = currentProject.project.id
  }

  // Runs again when the project changes
  useEffect(() => {
    if (currentProject.checked) {
      loadDialogues(projectId)
    }
  }, [currentProject.checked, projectId])

  if (!currentProject.checked) {
    return LOADING
  }
  if (projectId === null) {
    let error = currentProject.error
    if (!error) {
      error = 'Log in to see your dialogues.'
    }
    return { status: 'failed', dialogues: NO_DIALOGUES, error: error }
  }
  // The store can briefly still hold another project's dialogues
  if (cache.projectId !== projectId) {
    return LOADING
  }
  return cache
}
