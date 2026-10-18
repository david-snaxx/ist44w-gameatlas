import express from 'express';
import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { db } from '../db.ts';
import { addToProjectList, isDuplicateKey, openProject, removeFromProjectList, withTransaction } from '../projectAccess.ts';
import type { Dialogue, DialogueProblem } from '../types/dialogue.ts';
import type { Blueprint } from '../types/blueprint.ts';
import {
    dialogueCheckContext,
    validateDialogueDetails,
    validateDialogueGraph,
} from '../../../frontend/src/data/dialogueGraph.js';

/*
 * A dialogue's `id` is its row's UUID, and its snake_case `key` is unique within its project. Unfinished trees can
 * be saved, so only the name and key are refused; the tree's problems come back as `problems` on GET.
 */

// region Express Routing
export const dialoguesRouter = express.Router();
dialoguesRouter.get('/', getDialogueRoot);
dialoguesRouter.get('/:id', getDialogue);
dialoguesRouter.post('/', postDialogue);
dialoguesRouter.put('/:id', putDialogue);
dialoguesRouter.delete('/:id', deleteDialogue);
// endregion

// region Endpoints
/**
 * GET /dialogues?projectId=…
 * Every dialogue in the project.
 */
async function getDialogueRoot(request: Request, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    response.json(await findDialogues(project.id));
}

/**
 * GET /dialogues/:id?projectId=…
 * The dialogue, plus what's still wrong with its tree (`problems`).
 */
async function getDialogue(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const dialogue = await findDialogue(project.id, request.params.id);
    if (!dialogue) {
        return response.status(404).json({ message: 'Dialogue not found' });
    }

    const problems = await checkGraph(project.id, dialogue);
    response.json({ ...dialogue, problems: problems });
}

/**
 * POST /dialogues
 * Body: { projectId, key, name, description?, speakerBlueprint?, itemBlueprint?, nodes, edges }.
 */
async function postDialogue(request: Request, response: Response) {
    const body = request.body ?? {};
    const access = await openProject(request, body.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const siblings = await findDialogueKeys(project.id, null);
    const detailErrors = validateDetailsFrom(body, siblings);
    if (detailErrors.length > 0) {
        return response.status(400).json({ errors: detailErrors });
    }
    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
        return response.status(400).json({ message: 'nodes and edges must be lists' });
    }

    const id = randomUUID();
    const now = new Date();
    const insertQuery = `INSERT INTO dialogues (id, project_id, dialogue_key, name, description, speaker_blueprint,
                                                item_blueprint, nodes, edges, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        await withTransaction(async (connection) => {
            await connection.query(insertQuery, [
                id,
                project.id,
                body.key,
                body.name.trim(),
                asText(body.description),
                asText(body.speakerBlueprint),
                asText(body.itemBlueprint),
                JSON.stringify(body.nodes),
                JSON.stringify(body.edges),
                now,
                now,
            ]);
            await addToProjectList(connection, project.id, 'dialogue_ids', id);
        });
    } catch (error) {
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'Another dialogue in this project already uses this ID' });
        }
        throw error;
    }

    response.status(201).json(await findDialogue(project.id, id));
}

/**
 * PUT /dialogues/:id
 * Body: the same as POST.
 */
async function putDialogue(request: Request<{ id: string }>, response: Response) {
    const body = request.body ?? {};
    const access = await openProject(request, body.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const existing = await findDialogue(project.id, request.params.id);
    if (!existing) {
        return response.status(404).json({ message: 'Dialogue not found' });
    }

    const siblings = await findDialogueKeys(project.id, request.params.id);
    const detailErrors = validateDetailsFrom(body, siblings);
    if (detailErrors.length > 0) {
        return response.status(400).json({ errors: detailErrors });
    }
    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
        return response.status(400).json({ message: 'nodes and edges must be lists' });
    }

    const updateQuery = `UPDATE dialogues SET dialogue_key = ?, name = ?, description = ?, speaker_blueprint = ?,
                                              item_blueprint = ?, nodes = ?, edges = ?, updated_at = ?
                         WHERE id = ?`;
    try {
        await db.query(updateQuery, [
            body.key,
            body.name.trim(),
            asText(body.description),
            asText(body.speakerBlueprint),
            asText(body.itemBlueprint),
            JSON.stringify(body.nodes),
            JSON.stringify(body.edges),
            new Date(),
            request.params.id,
        ]);
    } catch (error) {
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'Another dialogue in this project already uses this ID' });
        }
        throw error;
    }

    response.json(await findDialogue(project.id, request.params.id));
}

/**
 * DELETE /dialogues/:id?projectId=…
 */
async function deleteDialogue(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const dialogue = await findDialogue(project.id, request.params.id);
    if (!dialogue) {
        return response.status(404).json({ message: 'Dialogue not found' });
    }

    await withTransaction(async (connection) => {
        await connection.query(`DELETE FROM dialogues WHERE id = ?`, [dialogue.id]);
        await removeFromProjectList(connection, project.id, 'dialogue_ids', dialogue.id);
    });

    response.status(204).end();
}
// endregion

// region Helpers
/** SQL columns of a {@link Dialogue}. `key` needs backticks because it's a MySQL keyword. */
const DIALOGUE_COLUMNS = `id, dialogue_key AS \`key\`, name, description, speaker_blueprint AS speakerBlueprint,
                          item_blueprint AS itemBlueprint, nodes, edges, created_at AS createdAt,
                          updated_at AS updatedAt`;

/** Every dialogue in a project, sorted by name. */
export async function findDialogues(projectId: string): Promise<Dialogue[]> {
    const selectQuery = `SELECT ${DIALOGUE_COLUMNS} FROM dialogues WHERE project_id = ? ORDER BY name`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);
    return rows as Dialogue[];
}

/** One dialogue by its UUID, or undefined when the project has none. */
async function findDialogue(projectId: string, id: string): Promise<Dialogue | undefined> {
    const selectQuery = `SELECT ${DIALOGUE_COLUMNS} FROM dialogues WHERE project_id = ? AND id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, id]);
    return rows[0] as Dialogue | undefined;
}

/** The keys of the project's dialogues, leaving out `exceptId` (the one being updated). */
async function findDialogueKeys(projectId: string, exceptId: string | null): Promise<string[]> {
    const selectQuery = `SELECT id, dialogue_key AS \`key\` FROM dialogues WHERE project_id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);

    const keys: string[] = [];
    for (const row of rows) {
        if (row.id !== exceptId) {
            keys.push(row.key);
        }
    }
    return keys;
}

/** Checks the name and key with the frontend's own validateDialogueDetails(). Returns [{ path, message }]. */
function validateDetailsFrom(body: { name?: unknown; key?: unknown }, otherKeys: string[]) {
    const problems: { path: string; message: string }[] = [];

    if (typeof body.name !== 'string' || typeof body.key !== 'string') {
        problems.push({ path: 'name', message: 'name and key must be strings' });
        return problems;
    }

    // validateDialogueDetails is plain JavaScript: field name -> message
    const errors: Record<string, string> = validateDialogueDetails({ name: body.name, key: body.key }, otherKeys);
    for (const path of Object.keys(errors)) {
        problems.push({ path: path, message: errors[path] });
    }
    return problems;
}

/** What's still wrong with a dialogue's tree, checked against the project's blueprints and assets. */
async function checkGraph(projectId: string, dialogue: Dialogue): Promise<DialogueProblem[]> {
    const blueprints = await findBlueprintsForLinks(projectId);
    const assets = await findAssetsForLinks(projectId);
    const context = dialogueCheckContext(blueprints, assets);
    return validateDialogueGraph(dialogue, context);
}

/** Every blueprint in the project, as dialogueCheckContext() wants them: [{ id, fields }]. */
async function findBlueprintsForLinks(projectId: string) {
    const selectQuery = `SELECT schema_key AS id, fields FROM blueprints WHERE project_id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);
    return rows as { id: string; fields: Blueprint['fields'] }[];
}

/** Every asset in the project, as dialogueCheckContext() wants them: [{ schemaId, key }]. */
async function findAssetsForLinks(projectId: string) {
    const selectQuery = `SELECT b.schema_key AS schemaId, a.asset_key AS \`key\` FROM assets a
                         JOIN blueprints b ON b.id = a.blueprint_id WHERE a.project_id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);
    return rows as { schemaId: string; key: string }[];
}

/** The value trimmed, or '' when it isn't text: a dialogue's optional text columns are never null. */
export function asText(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
}
// endregion
