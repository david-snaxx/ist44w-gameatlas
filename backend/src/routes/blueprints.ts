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
import { validateBlueprintDetails, validateFieldDefinition } from '../../../frontend/src/schema/validation.js';
import { toDefinition, toDraft } from '../../../frontend/src/schema/blueprintDraft.js';

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

    const blueprints: Blueprint[] = [];
    for (const row of rows) {
        blueprints.push(cleanBlueprint(row));
    }
    response.json(blueprints);
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

    // Only the clean shape is saved: no editor-only `uid`s, no settings a property's type doesn't use
    const blueprint = cleanBlueprint({ id: id, name: name.trim(), description: description, version: 1, fields: fields });

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
                blueprint.id,
                blueprint.name,
                blueprint.description ?? null, // a clean blueprint has no description when it's empty
                JSON.stringify(blueprint.fields),
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

    response.status(201).json(await findBlueprint(project.id, blueprint.id));
}

/**
 * PUT /blueprints/:id
 * Body: { projectId, name, description?, fields }. The ID can't change here. The version goes up by one when
 * something changed, the same as in the builder.
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

    // The blueprint as this save would leave it, in the same clean shape findBlueprint() gives back
    const updated = cleanBlueprint({
        id: existing.id,
        name: name.trim(),
        description: description,
        version: existing.version,
        fields: fields,
    });

    // Nothing changed (a double-clicked or retried save): keep the version, so its assets don't turn "Outdated"
    if (JSON.stringify(updated) === JSON.stringify(existing)) {
        return response.json(existing);
    }

    const updateQuery = `UPDATE blueprints SET name = ?, description = ?, fields = ?, version = version + 1, updated_at = ?
                         WHERE project_id = ? AND schema_key = ?`;
    await db.query(updateQuery, [
        updated.name,
        updated.description ?? null, // a clean blueprint has no description when it's empty
        JSON.stringify(updated.fields),
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
 * UUID stays inside the database. Rows go through {@link cleanBlueprint} before they're sent.
 */
const BLUEPRINT_COLUMNS = 'schema_key AS id, name, description, kind, version, fields';

function cleanBlueprint(blueprint: object): Blueprint {
    return toDefinition(toDraft(blueprint)) as Blueprint;
}

/**
 * Returns a single blueprint by its snake_case ID within a project, or undefined when there is none.
 */
async function findBlueprint(projectId: string, id: string): Promise<Blueprint | undefined> {
    const selectQuery = `SELECT ${BLUEPRINT_COLUMNS} FROM blueprints WHERE project_id = ? AND schema_key = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, id]);
    if (rows.length === 0) {
        return undefined;
    }
    return cleanBlueprint(rows[0]);
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

/**
 * Checks a blueprint sent by a client. Returns one entry per problem. An empty list means there's nothing wrong.
 */
function validateBlueprintBody(
    body: { id: unknown; name: unknown; description: unknown; fields: unknown },
    takenIds: string[],
) {
    const problems: { path: string; message: string }[] = [];

    if (typeof body.id !== 'string' || typeof body.name !== 'string') {
        problems.push({ path: 'id', message: 'id and name must be strings' });
        return problems;
    }

    const detailErrors: Record<string, string> = validateBlueprintDetails({ id: body.id, name: body.name }, takenIds);
    for (const path of Object.keys(detailErrors)) {
        problems.push({ path: path, message: detailErrors[path] });
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
    if (body.id !== '') {
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
    // validateFieldDefinition() can't spot a repeated property ID here: it tells properties apart by the
    // builder's `uid`s, which saved blueprints don't have. So this level's repeats are found up front.
    const repeatedKeys = findRepeatedKeys(fields);

    for (let index = 0; index < fields.length; index++) {
        const field = fields[index];
        const fieldPath = `${pathPrefix}.${index}`;

        // validateFieldDefinition is plain JavaScript: setting name -> message
        const fieldErrors: Record<string, string> = validateFieldDefinition(field, {
            siblings: fields,
            blueprintIds: blueprintIds,
        });
        for (const settingName of Object.keys(fieldErrors)) {
            problems.push({ path: `${fieldPath}.${settingName}`, message: fieldErrors[settingName] });
        }

        // Every property sharing the ID gets the message, like in the builder. Skipped when the ID already has an error.
        const key = (field as { key?: unknown }).key;
        if (!fieldErrors.key && typeof key === 'string' && repeatedKeys.includes(key)) {
            problems.push({ path: `${fieldPath}.key`, message: 'Another property at this level already uses this ID' });
        }

        const group = field as { type?: string; fields?: unknown };
        if (group.type === 'object' && Array.isArray(group.fields)) {
            collectFieldProblems(problems, group.fields, `${fieldPath}.fields`, blueprintIds);
        }
    }
}

/** The property IDs used more than once among `fields`. Only this level: a group's own properties are checked separately. */
function findRepeatedKeys(fields: unknown[]): string[] {
    const seen: string[] = [];
    const repeated: string[] = [];
    for (const field of fields) {
        const key = (field as { key?: unknown }).key;
        if (typeof key !== 'string') {
            continue;
        }
        if (seen.includes(key) && !repeated.includes(key)) {
            repeated.push(key);
        }
        seen.push(key);
    }
    return repeated;
}
// endregion
