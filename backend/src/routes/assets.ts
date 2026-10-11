import express from 'express';
import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { db } from '../db.ts';
import { addToProjectList, isDuplicateKey, openProject, removeFromProjectList, withTransaction } from '../projectAccess.ts';
import type { Asset } from '../types/asset.ts';
import type { Blueprint } from '../types/blueprint.ts';
import { validateAssetKey, validateValues } from '../../../frontend/src/schema/validation.js';
import { referenceKeysFor, toFormValues } from '../../../frontend/src/data/assetData.js';

/*
 * Assets live inside a project and are made from one blueprint. Their `id` is the row's UUID, so
 * /assets/:id needs no project of its own; `?projectId=…` (GET, DELETE) and `projectId` in the body
 * (POST, PUT) say which project the caller means, and the row has to belong to it.
 */

// region Express Routing
export const assetsRouter = express.Router();
assetsRouter.get('/', getAssetRoot);
assetsRouter.get('/:id', getAsset);
assetsRouter.post('/', postAsset);
assetsRouter.put('/:id', putAsset);
assetsRouter.delete('/:id', deleteAsset);
// endregion

// region Endpoints
/**
 * GET /assets?projectId=…&blueprintId=item
 * Every asset in the project, or only one blueprint's when `blueprintId` is given.
 */
async function getAssetRoot(request: Request, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const blueprintId = request.query.blueprintId;
    let selectQuery = `SELECT ${ASSET_COLUMNS} FROM assets a JOIN blueprints b ON b.id = a.blueprint_id
                       WHERE a.project_id = ?`;
    const values: string[] = [project.id];
    if (typeof blueprintId === 'string' && blueprintId !== '') {
        selectQuery = `${selectQuery} AND b.schema_key = ?`;
        values.push(blueprintId);
    }
    selectQuery = `${selectQuery} ORDER BY a.asset_key`;

    const [rows] = await db.query<RowDataPacket[]>(selectQuery, values);
    response.json(rows);
}

/**
 * GET /assets/:id?projectId=…
 */
async function getAsset(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const asset = await findAsset(project.id, request.params.id);
    if (!asset) {
        return response.status(404).json({ message: 'Asset not found' });
    }
    response.json(asset);
}

/**
 * POST /assets
 * Body: { projectId, key, schemaId, data }. `schemaId` is the blueprint's snake_case ID.
 */
async function postAsset(request: Request, response: Response) {
    const { projectId, key, schemaId, data } = request.body ?? {};
    const access = await openProject(request, projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const blueprint = await findBlueprintRow(project.id, schemaId);
    if (!blueprint) {
        return response.status(400).json({ message: 'No blueprint in this project has that schemaId' });
    }

    const problems = await validateAssetBody(project.id, blueprint, key, data, null);
    if (problems.length > 0) {
        return response.status(400).json({ errors: problems });
    }

    const id = randomUUID();
    const now = new Date();
    const insertQuery = `INSERT INTO assets (id, project_id, blueprint_id, asset_key, schema_version, data, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        // The row and the project's list of assets are one change, so they share a transaction
        await withTransaction(async (connection) => {
            await connection.query(insertQuery, [
                id,
                project.id,
                blueprint.rowId,
                key,
                blueprint.version,
                JSON.stringify(data),
                now,
                now,
            ]);
            await addToProjectList(connection, project.id, 'asset_ids', id);
        });
    } catch (error) {
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'Another asset of this blueprint already uses this ID' });
        }
        throw error;
    }

    response.status(201).json(await findAsset(project.id, id));
}

/**
 * PUT /assets/:id
 * Body: { projectId, key, data }. Saving re-stamps the asset with the blueprint's current version.
 */
async function putAsset(request: Request<{ id: string }>, response: Response) {
    const { projectId, key, data } = request.body ?? {};
    const access = await openProject(request, projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const existing = await findAsset(project.id, request.params.id);
    if (!existing) {
        return response.status(404).json({ message: 'Asset not found' });
    }

    const blueprint = await findBlueprintRow(project.id, existing.schemaId);
    if (!blueprint) {
        return response.status(409).json({ message: "This asset's blueprint no longer exists" });
    }

    const problems = await validateAssetBody(project.id, blueprint, key, data, request.params.id);
    if (problems.length > 0) {
        return response.status(400).json({ errors: problems });
    }

    const updateQuery = `UPDATE assets SET asset_key = ?, schema_version = ?, data = ?, updated_at = ? WHERE id = ?`;
    try {
        await db.query(updateQuery, [key, blueprint.version, JSON.stringify(data), new Date(), request.params.id]);
    } catch (error) {
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'Another asset of this blueprint already uses this ID' });
        }
        throw error;
    }

    response.json(await findAsset(project.id, request.params.id));
}

/**
 * DELETE /assets/:id?projectId=…
 */
async function deleteAsset(request: Request<{ id: string }>, response: Response) {
    const access = await openProject(request, request.query.projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const asset = await findAsset(project.id, request.params.id);
    if (!asset) {
        return response.status(404).json({ message: 'Asset not found' });
    }

    await withTransaction(async (connection) => {
        await connection.query(`DELETE FROM assets WHERE id = ?`, [asset.id]);
        await removeFromProjectList(connection, project.id, 'asset_ids', asset.id);
    });

    response.status(204).end();
}
// endregion

// region Helpers
/**
 * SQL columns that make up an {@link Asset}. `schemaId` is the blueprint's snake_case ID, which is why
 * every read joins the blueprints table. `key` is a MySQL keyword, so it needs backticks.
 */
const ASSET_COLUMNS = `a.id, a.asset_key AS \`key\`, b.schema_key AS schemaId, a.schema_version AS schemaVersion,
                       a.data, a.created_at AS createdAt, a.updated_at AS updatedAt`;

/** A blueprint as the asset routes need it: its row UUID for the foreign key, plus what validation uses. */
interface BlueprintRow {
    rowId: string;
    id: string;
    version: number;
    fields: Blueprint['fields'];
}

/**
 * Returns a single asset by its UUID, or undefined when there is none in this project.
 */
async function findAsset(projectId: string, id: string): Promise<Asset | undefined> {
    const selectQuery = `SELECT ${ASSET_COLUMNS} FROM assets a JOIN blueprints b ON b.id = a.blueprint_id
                         WHERE a.project_id = ? AND a.id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, id]);
    return rows[0] as Asset | undefined;
}

/** Returns the blueprint an asset is made from, by its snake_case ID within the project. */
async function findBlueprintRow(projectId: string, schemaId: unknown): Promise<BlueprintRow | undefined> {
    if (typeof schemaId !== 'string' || schemaId === '') {
        return undefined;
    }
    const selectQuery = `SELECT id AS rowId, schema_key AS id, version, fields FROM blueprints
                         WHERE project_id = ? AND schema_key = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, schemaId]);
    return rows[0] as BlueprintRow | undefined;
}

/**
 * Checks an asset sent by a client. Returns one entry per problem, in the shape the form shows inline:
 * [{ path, message }] (PLAN.md §6). An empty list means there's nothing wrong.
 *
 * The values go through the frontend's own validateValues(), so the browser and the server agree about
 * what a valid asset is. `currentAssetId` is the asset being updated, or null when creating one, so its
 * own ID doesn't count as a clash.
 */
async function validateAssetBody(
    projectId: string,
    blueprint: BlueprintRow,
    key: unknown,
    data: unknown,
    currentAssetId: string | null,
) {
    const problems: { path: string; message: string }[] = [];

    if (!isPlainObject(data)) {
        problems.push({ path: 'data', message: 'data must be an object' });
        return problems;
    }

    const siblings = await findAssetsOfBlueprint(projectId, blueprint.id);
    const keyError = validateAssetKey(key, siblings, currentAssetId);
    if (keyError) {
        problems.push({ path: 'key', message: keyError });
    }

    // What links in this asset are allowed to point at: every blueprint's assets in this project
    const blueprints = await findBlueprintsForLinks(projectId);
    const assets = await findAssetsForLinks(projectId);
    const referenceKeys = referenceKeysFor(blueprints, assets);

    // validateValues() expects form values (numbers as text), which is what toFormValues() makes from saved data
    const values = toFormValues(blueprint.fields, data);
    // The validators are plain JavaScript, so name the shape TypeScript should see: path -> message
    const valueErrors: Record<string, string> = validateValues(blueprint.fields, values, '', referenceKeys);
    for (const path of Object.keys(valueErrors)) {
        problems.push({ path: path, message: valueErrors[path] });
    }

    return problems;
}

/** Every asset of one blueprint, as validateAssetKey() wants them: [{ id, key }]. */
async function findAssetsOfBlueprint(projectId: string, schemaId: string) {
    const selectQuery = `SELECT a.id, a.asset_key AS \`key\` FROM assets a JOIN blueprints b ON b.id = a.blueprint_id
                         WHERE a.project_id = ? AND b.schema_key = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, schemaId]);
    return rows as { id: string; key: string }[];
}

/** Every blueprint in the project, as referenceKeysFor() wants them: [{ id, fields }]. */
async function findBlueprintsForLinks(projectId: string) {
    const selectQuery = `SELECT schema_key AS id, fields FROM blueprints WHERE project_id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);
    return rows as { id: string; fields: Blueprint['fields'] }[];
}

/** Every asset in the project, as referenceKeysFor() wants them: [{ schemaId, key }]. */
async function findAssetsForLinks(projectId: string) {
    const selectQuery = `SELECT b.schema_key AS schemaId, a.asset_key AS \`key\` FROM assets a
                         JOIN blueprints b ON b.id = a.blueprint_id WHERE a.project_id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);
    return rows as { schemaId: string; key: string }[];
}

/** True for a plain object like { … } (not null, not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
// endregion
