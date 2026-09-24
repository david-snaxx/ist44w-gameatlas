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
    if (stored === null) return STARTER_DIALOGUES
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : STARTER_DIALOGUES
  } catch {
    return STARTER_DIALOGUES
  }
}

function commit(next) {
  dialogues = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be unavailable (e.g. a private window). Keep working in memory.
  }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getDialogues() {
  return dialogues
}

/** Adds new dialogues and replaces existing ones (matched by `id`) in one change. */
export function saveDialogues(changedDialogues) {
  const changedById = new Map(changedDialogues.map((dialogue) => [dialogue.id, dialogue]))
  const existingIds = new Set(dialogues.map((dialogue) => dialogue.id))
  commit([
    ...dialogues.map((dialogue) => changedById.get(dialogue.id) ?? dialogue),
    ...changedDialogues.filter((dialogue) => !existingIds.has(dialogue.id)),
  ])
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
  commit(
    dialogues.map((dialogue) => ({
      ...dialogue,
      speakerBlueprint: dialogue.speakerBlueprint === fromId ? toId : dialogue.speakerBlueprint,
      itemBlueprint: dialogue.itemBlueprint === fromId ? toId : dialogue.itemBlueprint,
    })),
  )
}
