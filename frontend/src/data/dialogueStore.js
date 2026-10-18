import * as dialoguesApi from '../api/dialogues.js'
import { renameAssetInDialogue } from './dialogueGraph.js'

/*
 * The current project's dialogues, loaded from the server once per page load and kept in memory. Read them with
 * useDialogues() and change them only through the functions below, which wait for the server's answer. The
 * dialogue shape is described at the top of dialogueGraph.js.
 */

const listeners = new Set()

/**
 * What's in memory. `projectId` is null when there's no project (nobody is logged in), and `status` is 'loading',
 * 'ready' or 'failed' (`error` says why).
 */
let cache = { projectId: null, status: 'loading', dialogues: [], error: null }

/** The project whose list is on its way, so pages asking at once share one request. */
let loadingFor = null

/** Replaces what's in memory and notifies every subscriber, so the pages re-render. */
function commit(next) {
  cache = next
  for (const listener of listeners) {
    listener()
  }
}

/** Replaces just the list. */
function commitDialogues(nextDialogues) {
  commit({ projectId: cache.projectId, status: cache.status, dialogues: nextDialogues, error: cache.error })
}

export function subscribe(listener) {
  listeners.add(listener)
  // useSyncExternalStore calls the returned function to stop listening
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

// Each returns the same object until something changes, which is what useSyncExternalStore needs
export function getDialogues() {
  return cache.dialogues
}

export function getDialogueCache() {
  return cache
}

/** Loads a project's dialogues, once per page load and again for a different project. null empties the list. */
export function loadDialogues(projectId) {
  if (projectId === null) {
    loadingFor = null
    if (cache.projectId !== null) {
      commit({ projectId: null, status: 'ready', dialogues: [], error: null })
    }
    return
  }

  if (loadingFor === projectId) {
    return
  }
  if (cache.projectId === projectId && cache.status === 'ready') {
    return
  }
  loadingFor = projectId
  // Don't keep showing another project's dialogues meanwhile
  if (cache.projectId !== projectId) {
    commit({ projectId: projectId, status: 'loading', dialogues: [], error: null })
  }
  load(projectId)
}

/** Fetches the project's list into memory, unless another project was asked for meanwhile. */
async function load(projectId) {
  const result = await dialoguesApi.listDialogues(projectId)
  if (loadingFor !== projectId) {
    return
  }
  loadingFor = null

  if (result.error) {
    commit({ projectId: projectId, status: 'failed', dialogues: [], error: result.error })
    return
  }
  commit({ projectId: projectId, status: 'ready', dialogues: result.data, error: null })
}

/**
 * Saves a dialogue (no `id` for a new one) and waits for the server, whose answer replaces it in the list. An
 * unfinished tree can be saved. Answers { data } or { error }.
 */
export async function saveDialogue(dialogue) {
  const projectId = cache.projectId
  if (projectId === null) {
    return { error: 'Log in to save dialogues.' }
  }

  let result
  if (dialogue.id) {
    result = await dialoguesApi.updateDialogue(projectId, dialogue.id, dialogue)
  } else {
    result = await dialoguesApi.createDialogue(projectId, dialogue)
  }
  // Ignore a refusal, or an answer for a project that's no longer current
  if (result.error || cache.projectId !== projectId) {
    return result
  }
  commitDialogues(withDialogue(cache.dialogues, result.data))
  return result
}

/** Deletes a dialogue and waits for the server; only then does it leave the list. Answers { data } or { error }. */
export async function deleteDialogue(id) {
  const projectId = cache.projectId
  if (projectId === null) {
    return { error: 'Log in to delete dialogues.' }
  }

  const result = await dialoguesApi.deleteDialogue(projectId, id)
  if (result.error || cache.projectId !== projectId) {
    return result
  }
  commitDialogues(cache.dialogues.filter((dialogue) => dialogue.id !== id))
  return result
}

/** Puts a project's whole list in memory at once: the server's answer after replacing the whole project. */
export function replaceDialogues(projectId, nextDialogues) {
  loadingFor = null
  commit({ projectId: projectId, status: 'ready', dialogues: nextDialogues, error: null })
}

/** Points dialogues in memory at a renamed blueprint's new ID, matching what the server already did. */
export function retargetDialogueBlueprint(fromId, toId) {
  const next = []
  for (const dialogue of cache.dialogues) {
    const updated = { ...dialogue }
    if (updated.speakerBlueprint === fromId) {
      updated.speakerBlueprint = toId
    }
    if (updated.itemBlueprint === fromId) {
      updated.itemBlueprint = toId
    }
    next.push(updated)
  }
  commitDialogues(next)
}

/** Moves speakers and given items in memory from an asset's old ID to its new one, matching what the server did. */
export function moveAssetLinks(blueprintId, fromKey, toKey) {
  const next = []
  for (const dialogue of cache.dialogues) {
    // null when the dialogue doesn't use the asset
    const renamed = renameAssetInDialogue(dialogue, blueprintId, fromKey, toKey)
    if (renamed) {
      next.push(renamed)
    } else {
      next.push(dialogue)
    }
  }
  commitDialogues(next)
}

/** A copy of the list with `saved` in place of the dialogue with the same id, or added at the end. */
function withDialogue(dialogues, saved) {
  const next = []
  let found = false
  for (const dialogue of dialogues) {
    if (dialogue.id === saved.id) {
      next.push(saved)
      found = true
    } else {
      next.push(dialogue)
    }
  }
  if (!found) {
    next.push(saved)
  }
  return next
}
