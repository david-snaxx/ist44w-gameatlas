import { STARTER_DIALOGUES } from './starterDialogues.js'

/*
 * Where saved dialogues live until the backend exists (PLAN.md Phase 2): the browser's localStorage.
 * Same pattern as the blueprint and asset stores: read with useDialogues(), change only through these functions.
 * The dialogue shape is described at the top of dialogueGraph.js.
 */

const STORAGE_KEY = 'gameatlas.dialogues.v1'
const listeners = new Set()
let dialogues = load()

function load() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      return STARTER_DIALOGUES
    }
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return STARTER_DIALOGUES
    }
    return parsed
  } catch {
    return STARTER_DIALOGUES
  }
}

// Replaces the list, saves it, and tells every subscriber (so the pages re-render)
function commit(next) {
  dialogues = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be unavailable (e.g. a private window). Keep working in memory.
  }
  for (const listener of listeners) {
    listener()
  }
}

export function subscribe(listener) {
  listeners.add(listener)
  // useSyncExternalStore calls the returned function to stop listening
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

export function getDialogues() {
  return dialogues
}

/** Adds new dialogues and replaces existing ones (matched by `id`) in one change. */
export function saveDialogues(changedDialogues) {
  const next = []

  // Existing dialogues keep their place; a changed one is swapped in
  for (const dialogue of dialogues) {
    const changed = changedDialogues.find((candidate) => candidate.id === dialogue.id)
    if (changed) {
      next.push(changed)
    } else {
      next.push(dialogue)
    }
  }

  // Dialogues that didn't exist yet go at the end
  for (const dialogue of changedDialogues) {
    const alreadyExists = dialogues.some((existing) => existing.id === dialogue.id)
    if (!alreadyExists) {
      next.push(dialogue)
    }
  }

  commit(next)
}

export function deleteDialogue(id) {
  commit(dialogues.filter((dialogue) => dialogue.id !== id))
}

/** Replaces every dialogue at once (restoring a backup, resetting). */
export function replaceDialogues(nextDialogues) {
  commit(nextDialogues)
}

/** Keeps dialogues pointing at a blueprint whose ID was changed. */
export function retargetDialogueBlueprint(fromId, toId) {
  const next = []
  for (const dialogue of dialogues) {
    const updated = { ...dialogue }
    if (updated.speakerBlueprint === fromId) {
      updated.speakerBlueprint = toId
    }
    if (updated.itemBlueprint === fromId) {
      updated.itemBlueprint = toId
    }
    next.push(updated)
  }
  commit(next)
}
