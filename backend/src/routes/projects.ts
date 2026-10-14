import express from 'express';
import type { Request, Response } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { db } from '../db.ts';
import { findProject, openProject, withTransaction } from '../projectAccess.ts';
import type { Asset } from '../types/asset.ts';
import type { Blueprint } from '../types/blueprint.ts';
import type { Dialogue } from '../types/dialogue.ts';
import type { ProjectContents } from '../types/project.ts';
import { findAssets } from './assets.ts';
import { cleanBlueprint, findBlueprints } from './blueprints.ts';
import { asText, findDialogues } from './dialogues.ts';
import { checkContents } from '../../../frontend/src/data/backupFile.js';

// region Express Routing
export const projectsRouter = express.Router();
projectsRouter.get('/', getProjectRoot);
projectsRouter.get('/:id', getProject);
projectsRouter.post('/', postProject);
projectsRouter.put('/:id', putProject);
projectsRouter.put('/:id/contents', putProjectContents);
projectsRouter.delete('/:id', deleteProject);
// endregion

// region Endpoints
/**
 * GET /projects
 * Every project the logged-in user is a member of.
 */
async function getProjectRoot(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    // JSON_CONTAINS asks MySQL whether the user's ID is in the project's member list
    const selectQuery = `SELECT ${PROJECT_COLUMNS} FROM projects
                         WHERE JSON_CONTAINS(member_user_ids, ?)`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [JSON.stringify(userId)]);
    response.json(rows);
}

/**
 * GET /projects/:id
 */
async function getProject(request: Request<{ id: string }>, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const project = await findProject(request.params.id);
    if (!project || !project.memberUserIds.includes(userId)) {
        return response.status(404).json({ message: 'Project not found' });
    }
    response.json(project);
}

/**
 * POST /projects
 * Starts an empty project with the logged-in user as its first member.
 */
async function postProject(request: Request, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const { name } = request.body ?? {};
    const nameError = validateName(name);
    if (nameError) {
        return response.status(400).json({ message: nameError });
    }

    const id = randomUUID();
    const insertQuery = `INSERT INTO projects (id, name, created_at, member_user_ids, blueprint_ids, asset_ids, dialogue_ids)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const emptyList = JSON.stringify([]);

    // The project and the member's own list of projects are one change, so they share a transaction
    await withTransaction(async (connection) => {
        await connection.query(insertQuery, [
            id,
            name.trim(),
            new Date(),
            JSON.stringify([userId]),
            emptyList,
            emptyList,
            emptyList,
        ]);
        await addProjectToUser(connection, userId, id);
    });

    response.status(201).json(await findProject(id));
}

/**
 * PUT /projects/:id
 * Renames a project. Its member and content lists are managed by the routes that change them.
 */
async function putProject(request: Request<{ id: string }>, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const { name } = request.body ?? {};
    const nameError = validateName(name);
    if (nameError) {
        return response.status(400).json({ message: nameError });
    }

    const project = await findProject(request.params.id);
    if (!project || !project.memberUserIds.includes(userId)) {
        return response.status(404).json({ message: 'Project not found' });
    }

    const updateQuery = `UPDATE projects SET name = ? WHERE id = ?`;
    await db.query(updateQuery, [name.trim(), request.params.id]);
    response.json(await findProject(request.params.id));
}

/**
 * PUT /projects/:id/contents
 * Body: { blueprints, assets, dialogues }, each in its saved shape, the way a backup file holds them.
 * Replaces everything in the project at once: for restoring a backup, resetting to the examples, deleting
 * everything, and filling a new project. app.ts lets this route's body be bigger than the others'.
 *
 * The set is checked against itself first, with the frontend's own checkContents(). One problem refuses the
 * whole request and nothing is written, so a project is never left half-replaced.
 */
async function putProjectContents(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.params.id);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const problem = checkContents(request.body);
    if (problem) {
        return response.status(400).json({ message: problem });
    }
    const contents = request.body as ProjectContents;

    // Deleting the old rows, adding the new ones and rebuilding the project's ID lists are one change
    const now = new Date();
    await withTransaction(async (connection) => {
        await deleteContents(connection, project.id);
        const blueprintRowIds = await insertBlueprints(connection, project.id, contents.blueprints, now);
        const assetIds = await insertAssets(connection, project.id, contents.assets, blueprintRowIds, now);
        const dialogueIds = await insertDialogues(connection, project.id, contents.dialogues, now);

        const updateQuery = `UPDATE projects SET blueprint_ids = ?, asset_ids = ?, dialogue_ids = ? WHERE id = ?`;
        await connection.query(updateQuery, [
            JSON.stringify(Array.from(blueprintRowIds.values())),
            JSON.stringify(assetIds),
            JSON.stringify(dialogueIds),
            project.id,
        ]);
    });

    // The answer is what the GET routes now give, with the new UUIDs
    const saved: ProjectContents = {
        blueprints: await findBlueprints(project.id),
        assets: await findAssets(project.id, null),
        dialogues: await findDialogues(project.id),
    };
    response.json(saved);
}

/**
 * DELETE /projects/:id
 * Deletes the project and everything in it. The blueprint, asset and dialogue rows go with it through
 * their foreign keys, so only the members' own project lists need tidying up here.
 */
async function deleteProject(request: Request<{ id: string }>, response: Response) {
    const userId = request.session.userId;
    if (!userId) {
        return response.status(401).json({ message: 'Log in first' });
    }

    const project = await findProject(request.params.id);
    if (!project || !project.memberUserIds.includes(userId)) {
        return response.status(404).json({ message: 'Project not found' });
    }

    await withTransaction(async (connection) => {
        for (const memberId of project.memberUserIds) {
            await removeProjectFromUser(connection, memberId, project.id);
        }
        const deleteQuery = `DELETE FROM projects WHERE id = ?`;
        await connection.query<ResultSetHeader>(deleteQuery, [project.id]);
    });

    response.status(204).end();
}
// endregion

// region Helpers
/** SQL columns that make up a project. */
const PROJECT_COLUMNS = `id, name, created_at AS createdAt, member_user_ids AS memberUserIds,
                         blueprint_ids AS blueprintIds, asset_ids AS assetIds, dialogue_ids AS dialogueIds`;

const MAX_PROJECT_NAME_LENGTH = 120;

/**
 * Returns a string message describing project name errors, or null if no errors exist.
 */
function validateName(name: unknown): string | null {
    if (typeof name !== 'string') {
        return 'name must be a string';
    }
    const trimmed = name.trim();
    if (trimmed === '') {
        return "name can't be blank";
    }
    if (trimmed.length > MAX_PROJECT_NAME_LENGTH) {
        return `name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer`;
    }
    return null;
}

/** Adds the project to a user's own list of projects. Runs in the caller's transaction. */
async function addProjectToUser(connection: PoolConnection, userId: string, projectId: string): Promise<void> {
    const updateQuery = `UPDATE users SET project_ids = JSON_ARRAY_APPEND(project_ids, '$', ?) WHERE id = ?`;
    await connection.query(updateQuery, [projectId, userId]);
}

/** Takes the project back out of a user's list. Runs in the caller's transaction. */
async function removeProjectFromUser(connection: PoolConnection, userId: string, projectId: string): Promise<void> {
    const selectQuery = `SELECT project_ids AS projectIds FROM users WHERE id = ?`;
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [userId]);
    const row = rows[0];
    if (!row) {
        return;
    }

    const kept: string[] = [];
    for (const current of row.projectIds as string[]) {
        if (current !== projectId) {
            kept.push(current);
        }
    }

    const updateQuery = `UPDATE users SET project_ids = ? WHERE id = ?`;
    await connection.query(updateQuery, [JSON.stringify(kept), userId]);
}

/** Deletes every blueprint, asset and dialogue in a project. Runs in the caller's transaction. */
async function deleteContents(connection: PoolConnection, projectId: string): Promise<void> {
    // Assets first, since they point at their blueprints
    await connection.query(`DELETE FROM assets WHERE project_id = ?`, [projectId]);
    await connection.query(`DELETE FROM blueprints WHERE project_id = ?`, [projectId]);
    await connection.query(`DELETE FROM dialogues WHERE project_id = ?`, [projectId]);
}

/**
 * Saves each blueprint as a new row with a fresh UUID, keeping its version. A blueprint's saved shape has no
 * timestamps, so its row starts at `now`. Returns each new row UUID by the blueprint's snake_case ID, in the
 * order they were saved: the assets need them for their foreign key, and the project for its list.
 * Runs in the caller's transaction.
 */
async function insertBlueprints(
    connection: PoolConnection,
    projectId: string,
    blueprints: Blueprint[],
    now: Date,
): Promise<Map<string, string>> {
    const insertQuery = `INSERT INTO blueprints (id, project_id, schema_key, name, description, kind, version, fields, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 'form', ?, ?, ?, ?)`;
    const rowIds = new Map<string, string>();

    for (const sent of blueprints) {
        // The same clean shape the blueprint routes save: no editor-only `uid`s, no settings a type doesn't use
        const blueprint = cleanBlueprint({
            id: sent.id,
            name: sent.name.trim(),
            description: sent.description,
            version: sent.version,
            fields: sent.fields,
        });
        const rowId = randomUUID();
        await connection.query(insertQuery, [
            rowId,
            projectId,
            blueprint.id,
            blueprint.name,
            blueprint.description ?? null, // a clean blueprint has no description when it's empty
            blueprint.version,
            JSON.stringify(blueprint.fields),
            now,
            now,
        ]);
        rowIds.set(blueprint.id, rowId);
    }
    return rowIds;
}

/**
 * Saves each asset as a new row with a fresh UUID, under its blueprint's new row. Keeps its schemaVersion and
 * timestamps; a missing timestamp becomes `now`. Returns the new UUIDs. Runs in the caller's transaction.
 */
async function insertAssets(
    connection: PoolConnection,
    projectId: string,
    assets: Asset[],
    blueprintRowIds: Map<string, string>,
    now: Date,
): Promise<string[]> {
    const insertQuery = `INSERT INTO assets (id, project_id, blueprint_id, asset_key, schema_version, data, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const ids: string[] = [];

    for (const asset of assets) {
        const id = randomUUID();
        await connection.query(insertQuery, [
            id,
            projectId,
            blueprintRowIds.get(asset.schemaId), // checkContents() made sure the blueprint is in the set
            asset.key,
            asset.schemaVersion,
            JSON.stringify(asset.data),
            timestampOr(asset.createdAt, now),
            timestampOr(asset.updatedAt, now),
        ]);
        ids.push(id);
    }
    return ids;
}

/**
 * Saves each dialogue as a new row with a fresh UUID, the way the dialogue routes save one. Keeps its timestamps;
 * a missing timestamp becomes `now`. Returns the new UUIDs. Runs in the caller's transaction.
 */
async function insertDialogues(
    connection: PoolConnection,
    projectId: string,
    dialogues: Dialogue[],
    now: Date,
): Promise<string[]> {
    const insertQuery = `INSERT INTO dialogues (id, project_id, dialogue_key, name, description, speaker_blueprint,
                                                item_blueprint, nodes, edges, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const ids: string[] = [];

    for (const dialogue of dialogues) {
        const id = randomUUID();
        await connection.query(insertQuery, [
            id,
            projectId,
            dialogue.key,
            dialogue.name.trim(),
            asText(dialogue.description),
            asText(dialogue.speakerBlueprint),
            asText(dialogue.itemBlueprint),
            JSON.stringify(dialogue.nodes),
            JSON.stringify(dialogue.edges),
            timestampOr(dialogue.createdAt, now),
            timestampOr(dialogue.updatedAt, now),
        ]);
        ids.push(id);
    }
    return ids;
}

/** The time a saved timestamp (ISO 8601 text) names, or `fallback` when it's missing or isn't a date. */
function timestampOr(value: unknown, fallback: Date): Date {
    if (typeof value !== 'string') {
        return fallback;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return fallback;
    }
    return date;
}
// endregion
