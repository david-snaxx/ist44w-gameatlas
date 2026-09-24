import { createContext, useContext } from 'react'

/*
 * What every node on the canvas needs from the editor page, without passing it through React Flow:
 * { speakerOptions, itemOptions, problemsByNode }
 *   speakerOptions/itemOptions: Select options for the chosen blueprints' assets (null when no blueprint is chosen)
 *   problemsByNode: { [nodeId]: [{ id, message }] }
 */
export const DialogueEditorContext = createContext(null)

export function useDialogueEditor() {
  const value = useContext(DialogueEditorContext)
  if (!value) throw new Error('useDialogueEditor must be used inside <DialogueEditorContext>')
  return value
}
