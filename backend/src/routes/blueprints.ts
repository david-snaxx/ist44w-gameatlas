import express from 'express';
import type { Request, Response } from 'express';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { db } from '../db.ts';
import {
    addToProjectList,
    isDuplicateKey,
    openProject,
    removeFromProjectList,
    withTransaction,
} from '../projectAccess.ts';
import type { Blueprint } from '../types/blueprint.ts';
import { validateFieldDefinition, BLUEPRINT_ID_PATTERN } from '../../../frontend/src/schema/validation.js';

/*
 * Blueprints live inside a project, and their `id` (snake_case, e.g. "item") is only unique within one.
 * So every route here needs a project: GET and DELETE read `?projectId=…`, POST and PUT take it in the body.
 * The row also has an internal UUID, which is what projects.blueprint_ids holds; the API never shows it.
 */

// region Express Routing
export const blueprintsRouter = express.Router();
blueprintsRouter.get('/', getBlueprintRoot);
blueprintsRouter.get('/:id', getBlueprint);
blueprintsRouter.post('/', postBlueprint);
blueprintsRouter.put('/:id', putBlueprint);
blueprintsRouter.delete('/:id', deleteBlueprint);
// endregion

// region Endpoints
/**
 * GET /blueprints?projectId=…
 * Every blueprint in the project.
 */
async function getBlueprintRoot(request: Request, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const selectQuery = `SELECT ${BLUEPRINT_COLUMNS} FROM blueprints WHERE project_id = ? ORDER BY name`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [project.id]);
    response.json(rows);
}

/**
 * GET /blueprints/:id?projectId=…
 * `:id` is the snake_case ID, e.g. /blueprints/item.
 */
async function getBlueprint(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const blueprint = await findBlueprint(project.id, request.params.id);
    if (!blueprint) {
        return response.status(404).json({ message: 'Blueprint not found' });
    }
    response.json(blueprint);
}

/**
 * POST /blueprints
 * Body: { projectId, id, name, description?, fields }. A new blueprint always starts at version 1.
 */
async function postBlueprint(request: Request, response: Response) {
    const { projectId, id, name, description, fields } = request.body ?? {};
    const access = await openProject(request, projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const takenIds = await findBlueprintIds(project.id, null);
    const problems = validateBlueprintBody({ id: id, name: name, description: description, fields: fields }, takenIds);
    if (problems.length > 0) {
        return response.status(400).json({ errors: problems });
    }

    const rowId = randomUUID();
    const now = new Date();
    const insertQuery = `INSERT INTO blueprints (id, project_id, schema_key, name, description, kind, version, fields, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 'form', 1, ?, ?, ?)`;

    try {
        // The row and the project's list of blueprints are one change, so they share a transaction
        await withTransaction(async (connection) => {
            await connection.query(insertQuery, [
                rowId,
                project.id,
                id,
                name.trim(),
                trimmedDescription(description),
                JSON.stringify(fields),
                now,
                now,
            ]);
            await addToProjectList(connection, project.id, 'blueprint_ids', rowId);
        });
    } catch (error) {
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'Another blueprint in this project already uses this ID' });
        }
        throw error;
    }

    response.status(201).json(await findBlueprint(project.id, id));
}

/**
 * PUT /blueprints/:id
 * Body: { projectId, name, description?, fields }. The ID can't change here, and the version goes up by one.
 */
async function putBlueprint(request: Request<{ id: string }>, response: Response) {
    const { projectId, name, description, fields } = request.body ?? {};
    const access = await openProject(request, projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const takenIds = await findBlueprintIds(project.id, request.params.id);
    const problems = validateBlueprintBody(
        { id: request.params.id, name: name, description: description, fields: fields },
        takenIds,
    );
    if (problems.length > 0) {
        return response.status(400).json({ errors: problems });
    }

    const existing = await findBlueprint(project.id, request.params.id);
    if (!existing) {
        return response.status(404).json({ message: 'Blueprint not found' });
    }

    const updateQuery = `UPDATE blueprints SET name = ?, description = ?, fields = ?, version = version + 1, updated_at = ?
                         WHERE project_id = ? AND schema_key = ?`;
    await db.query(updateQuery, [
        name.trim(),
        trimmedDescription(description),
        JSON.stringify(fields),
        new Date(),
        project.id,
        request.params.id,
    ]);

    response.json(await findBlueprint(project.id, request.params.id));
}

/**
 * DELETE /blueprints/:id?projectId=…
 * Deletes the blueprint and every asset made from it (PLAN.md §5.6 rule 2).
 */
async function deleteBlueprint(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const rowId = await findBlueprintRowId(project.id, request.params.id);
    if (!rowId) {
        return response.status(404).json({ message: 'Blueprint not found' });
    }

    await withTransaction(async (connection) => {
        const assetIds = await findAssetIdsOfBlueprint(connection, rowId);
        for (const assetId of assetIds) {
            await removeFromProjectList(connection, project.id, 'asset_ids', assetId);
        }
        // The assets' own rows go with the blueprint through their foreign key
        await connection.query(`DELETE FROM blueprints WHERE id = ?`, [rowId]);
        await removeFromProjectList(connection, project.id, 'blueprint_ids', rowId);
    });

    response.status(204).end();
}
// endregion

// region Helpers
/**
 * SQL columns that make up a {@link Blueprint}. `schema_key` is what the API calls `id`; the row's own
 * UUID stays inside the database.
 */
const BLUEPRINT_COLUMNS = 'schema_key AS id, name, description, kind, version, fields';

const MAX_BLUEPRINT_NAME_LENGTH = 120;

/**
 * Returns a single blueprint by its snake_case ID within a project, or undefined when there is none.
 */
async function findBlueprint(projectId: string, id: string): Promise<Blueprint | undefined> {
    const selectQuery = `SELECT ${BLUEPRINT_COLUMNS} FROM blueprints WHERE project_id = ? AND schema_key = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, id]);
    return rows[0] as Blueprint | undefined;
}

/**
 * The snake_case IDs already used by blueprints in this project, so a new one can be checked before
 * the UNIQUE index has to refuse it. `exceptId` leaves out the blueprint being updated.
 */
async function findBlueprintIds(projectId: string, exceptId: string | null): Promise<string[]> {
    const selectQuery = `SELECT schema_key AS id FROM blueprints WHERE project_id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);

    const ids: string[] = [];
    for (const row of rows) {
        if (row.id !== exceptId) {
            ids.push(row.id);
        }
    }
    return ids;
}

/** The row's internal UUID, which the project's lists and the assets' foreign key use. */
async function findBlueprintRowId(projectId: string, id: string): Promise<string | undefined> {
    const selectQuery = `SELECT id FROM blueprints WHERE project_id = ? AND schema_key = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, id]);
    return rows[0]?.id;
}

/** The UUIDs of every asset made from a blueprint, so they can leave the project's asset list too. */
async function findAssetIdsOfBlueprint(connection: PoolConnection, blueprintRowId: string): Promise<string[]> {
    const selectQuery = `SELECT id FROM assets WHERE blueprint_id = ?`;
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [blueprintRowId]);

    const ids: string[] = [];
    for (const row of rows) {
        ids.push(row.id);
    }
    return ids;
}

/** '' and whitespace both mean "no description", which is stored as NULL. */
function trimmedDescription(description: unknown): string | null {
    if (typeof description !== 'string' || description.trim() === '') {
        return null;
    }
    return description.trim();
}

/**
 * Checks a blueprint sent by a client. Returns one entry per problem, in the shape the form shows inline:
 * [{ path, message }] (PLAN.md §6). An empty list means there's nothing wrong.
 *
 * Each property goes through validateFieldDefinition() from the frontend, so the browser and the server
 * agree about what a valid property is.
 */
function validateBlueprintBody(
    body: { id: unknown; name: unknown; description: unknown; fields: unknown },
    takenIds: string[],
) {
    const problems: { path: string; message: string }[] = [];

    if (typeof body.id !== 'string' || !BLUEPRINT_ID_PATTERN.test(body.id)) {
        problems.push({
            path: 'id',
            message: 'Start with a lowercase letter, then use lowercase letters, numbers or underscores',
        });
    } else if (takenIds.includes(body.id)) {
        // The UNIQUE index would refuse this too, but saying it here puts the error on the ID box
        problems.push({ path: 'id', message: 'Another blueprint in this project already uses this ID' });
    }
    if (typeof body.name !== 'string' || body.name.trim() === '') {
        problems.push({ path: 'name', message: 'Enter a name' });
    } else if (body.name.trim().length > MAX_BLUEPRINT_NAME_LENGTH) {
        problems.push({ path: 'name', message: `Use ${MAX_BLUEPRINT_NAME_LENGTH} characters or fewer` });
    }
    if (body.description !== undefined && typeof body.description !== 'string') {
        problems.push({ path: 'description', message: 'description must be a string' });
    }

    if (!Array.isArray(body.fields)) {
        problems.push({ path: 'fields', message: 'fields must be a list' });
        return problems;
    }
    if (body.fields.length === 0) {
        problems.push({ path: 'fields', message: 'Add at least one property' });
        return problems;
    }

    // A link property may point at any other blueprint in the project, or at this one (the builder offers the same)
    const linkTargetIds = [...takenIds];
    if (typeof body.id === 'string' && body.id !== '') {
        linkTargetIds.push(body.id);
    }

    collectFieldProblems(problems, body.fields, 'fields', linkTargetIds);
    return problems;
}

/**
 * Checks every property, and the properties inside any group, adding what's wrong to `problems`.
 * A path says where the problem is, e.g. "fields.2.key" or "fields.2.fields.0.label".
 * `blueprintIds` are the blueprints a link property may point at; any other target is refused.
 */
function collectFieldProblems(
    problems: { path: string; message: string }[],
    fields: unknown[],
    pathPrefix: string,
    blueprintIds: string[],
): void {
    for (let index = 0; index < fields.length; index++) {
        const field = fields[index];
        const fieldPath = `${pathPrefix}.${index}`;

        // validateFieldDefinition is plain JavaScript: setting name -> message
        const fieldErrors: Record<string, string> = validateFieldDefinition(field, {
            siblings: field,
            blueprintIds: blueprintIds,
        });
        for (const settingName of Object.keys(fieldErrors)) {
            problems.push({ path: `${fieldPath}.${settingName}`, message: fieldErrors[settingName] });
        }

        const group = field as { type?: string; fields?: unknown };
        if (group.type === 'object' && Array.isArray(group.fields)) {
            collectFieldProblems(problems, group.fields, `${fieldPath}.fields`, blueprintIds);
        }
    }
}
// endregion
