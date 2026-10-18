import {sendRequest} from './request.js'

/*
 * Calls to backend/src/routes/dialogues.ts.
 * Each answers { data } or { error }.
 */

/**
 * Gets all of a {@link Project}'s {@link Dialogue}s.
 * @param projectId The Project to get all Dialogues from.
 */
export async function listDialogues(projectId) {
    const path = `/api/dialogues?projectId=${encodeURIComponent(projectId)}`
    return sendRequest('GET', path)
}

/**
 * Posts a new {@link Dialogue} in the database.
 * An unfinished tree can be saved: only the name and key are checked.
 * @param projectId The {@link Project} this Dialogue belongs to.
 * @param dialogue Takes the form { key, name, description, speakerBlueprint, itemBlueprint, nodes, edges } where:
 * - key: the Dialogue identifier
 * - name: the chosen name of the Dialogue
 * - description: the description of the Dialogue, or '' when there is none
 * - speakerBlueprint: the {@link Blueprint} id whose {@link Asset}s can speak lines, or '' for narration only
 * - itemBlueprint: the {@link Blueprint} id whose {@link Asset}s can be given as items, or '' when there is none
 * - nodes: the list of {@link DialogueNode}s that make up the conversation
 * - edges: the list of {@link DialogueEdge}s that connect the nodes
 */
export async function createDialogue(projectId, dialogue) {
    const path = '/api/dialogues'
    return sendRequest('POST', path, dialogueBody(projectId, dialogue))
}

/**
 * Updates an existing {@link Dialogue} in the database.
 * An unfinished tree can be saved: only the name and key are checked.
 * @param projectId The {@link Project} this Dialogue belongs to.
 * @param dialogueId The Dialogue to update.
 * @param dialogue Takes the form { key, name, description, speakerBlueprint, itemBlueprint, nodes, edges } where:
 * - key: the Dialogue identifier
 * - name: the chosen name of the Dialogue
 * - description: the description of the Dialogue, or '' when there is none
 * - speakerBlueprint: the {@link Blueprint} id whose {@link Asset}s can speak lines, or '' for narration only
 * - itemBlueprint: the {@link Blueprint} id whose {@link Asset}s can be given as items, or '' when there is none
 * - nodes: the list of {@link DialogueNode}s that make up the conversation
 * - edges: the list of {@link DialogueEdge}s that connect the nodes
 */
export async function updateDialogue(projectId, dialogueId, dialogue) {
    const path = `/api/dialogues/${dialogueId}`
    return sendRequest('PUT', path, dialogueBody(projectId, dialogue))
}

/**
 * Deletes a {@link Dialogue} from the database.
 * @param projectId The {@link Project} this Dialogue belongs to.
 * @param dialogueId The Dialogue to delete.
 */
export async function deleteDialogue(projectId, dialogueId) {
    const path = `/api/dialogues/${dialogueId}?projectId=${encodeURIComponent(projectId)}`
    return sendRequest('DELETE', path)
}

/**
 * The body the server expects for a POST or PUT for a {@link Dialogue} object.
 * @param projectId The {@link Project} the Dialogue belongs to.
 * @param dialogue The Dialogue to send, in the form createDialogue() describes.
 */
function dialogueBody(projectId, dialogue) {
    return {
        projectId: projectId,
        key: dialogue.key,
        name: dialogue.name,
        description: dialogue.description,
        speakerBlueprint: dialogue.speakerBlueprint,
        itemBlueprint: dialogue.itemBlueprint,
        nodes: dialogue.nodes,
        edges: dialogue.edges,
    }
}
