import { createContext, useContext } from 'react'

/*
 * What every node on the canvas needs from the editor page, without passing it through React Flow:
 * { speakerOptions, itemOptions, problemsByNode }
 *   speakerOptions/itemOptions: Select options for the chosen blueprints' assets (null when no blueprint is chosen)
 *   problemsByNode: { [nodeId]: [{ id, message }] }
 *
 * A context is a value a component makes available to everything inside it, however deep.
 * The editor page provides it; each node reads it with useDialogueEditor().
 */
export const DialogueEditorContext = createContext(null)

export function useDialogueEditor() {
  return useContext(DialogueEditorContext)
}
