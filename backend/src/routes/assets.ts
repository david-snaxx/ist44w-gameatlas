import express from 'express';
import type { Request, Response } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { db } from '../db.ts';
import {
    addToProjectList,
    isDuplicateKey,
    lockProject,
    openProject,
    removeFromProjectList,
    withTransaction,
} from '../projectAccess.ts';
import type { Asset } from '../types/asset.ts';
import type { Blueprint, Field } from '../types/blueprint.ts';
import { VECTOR_AXES } from '../../../frontend/src/schema/fieldTypes.js';
import { validateAssetKey, validateValues } from '../../../frontend/src/schema/validation.js';
import { referenceKeysFor, replaceReferences, toFormValues } from '../../../frontend/src/data/assetData.js';
import { renameAssetInDialogue } from '../../../frontend/src/data/dialogueGraph.js';

/* An asset's `id` is its row's UUID; `projectId` still says which project the caller means. */

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

    let blueprintId: string | null = null;
    if (typeof request.query.blueprintId === 'string' && request.query.blueprintId !== '') {
        blueprintId = request.query.blueprintId;
    }
    response.json(await findAssets(project.id, blueprintId));
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

    let isCreated = false;
    try {
        isCreated = await withTransaction(async (connection) => {
            // First, so a second create in this project waits here, then meets the UNIQUE key (see lockProject())
            const projectExists = await lockProject(connection, project.id);
            if (!projectExists) {
                return false;
            }
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
            return true;
        });
    } catch (error) {
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'Another asset of this blueprint already uses this ID' });
        }
        throw error;
    }

    if (!isCreated) {
        return response.status(404).json({ message: 'Project not found' });
    }

    response.status(201).json(await findAsset(project.id, id));
}

/**
 * PUT /assets/:id
 * Body: { projectId, key, data, updatedAt }. `updatedAt` is the asset's as the client loaded it: when the saved one
 * is newer, someone else saved in between, and this save answers 409 instead of undoing their change. Stamps the
 * asset with the blueprint's current version. A different `key` renames it, and every link to it follows in the
 * same transaction.
 */
async function putAsset(request: Request<{ id: string }>, response: Response) {
    const { projectId, key, data, updatedAt } = request.body ?? {};
    const access = await openProject(request, projectId);
    if (!access.project) {
        return response.status(access.status).json({ message: access.message });
    }
    const project = access.project;

    const existing = await findAsset(project.id, request.params.id);
    if (!existing) {
        return response.status(404).json({ message: 'Asset not found' });
    }

    if (typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt))) {
        return response.status(400).json({ message: "updatedAt must be the asset's updatedAt from when it was loaded" });
    }

    const blueprint = await findBlueprintRow(project.id, existing.schemaId);
    if (!blueprint) {
        return response.status(409).json({ message: "This asset's blueprint no longer exists" });
    }

    const isRenamed = typeof key === 'string' && key !== existing.key;

    // Links from the asset to itself follow the new ID
    let newData = data;
    if (isRenamed && isPlainObject(data)) {
        newData = replaceReferences(blueprint.fields, data, blueprint.id, existing.key, key);
    }

    const problems = await validateAssetBody(project.id, blueprint, key, newData, existing.id);
    if (problems.length > 0) {
        return response.status(400).json({ errors: problems });
    }

    // Always later than the saved time, even within one millisecond, so the copy this replaces can never match again
    let newUpdatedAt = new Date();
    const savedTime = new Date(existing.updatedAt).getTime();
    if (newUpdatedAt.getTime() <= savedTime) {
        newUpdatedAt = new Date(savedTime + 1);
    }

    // `AND updated_at = ?` makes the write itself the check: of two saves made from the same copy at once, MySQL
    // lets only the first match, because the second waits for the first's lock and then sees its new time
    const updateQuery = `UPDATE assets SET asset_key = ?, schema_version = ?, data = ?, updated_at = ?
                         WHERE id = ? AND updated_at = ?`;
    let isSaved = false;
    try {
        isSaved = await withTransaction(async (connection) => {
            const [result] = await connection.query<ResultSetHeader>(updateQuery, [
                key,
                blueprint.version,
                JSON.stringify(newData),
                newUpdatedAt,
                existing.id,
                new Date(updatedAt),
            ]);
            if (result.affectedRows === 0) {
                return false;
            }
            if (isRenamed) {
                await renameLinksToAsset(connection, project.id, existing.id, blueprint.id, existing.key, key);
            }
            return true;
        });
    } catch (error) {
        if (isDuplicateKey(error)) {
            return response.status(409).json({ message: 'Another asset of this blueprint already uses this ID' });
        }
        throw error;
    }

    if (!isSaved) {
        return response.status(409).json({ message: OUT_OF_DATE_MESSAGE });
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
/** The 409 answer to a save made from a copy that someone else has saved over since it was loaded. */
const OUT_OF_DATE_MESSAGE =
    "Someone else saved this asset after you opened it, so your changes weren't saved. Reload the page to see theirs.";

/**
 * SQL columns of an {@link Asset}. `schemaId` comes from the joined blueprints table, and `key` needs backticks
 * because it's a MySQL keyword.
 */
const ASSET_COLUMNS = `a.id, a.asset_key AS \`key\`, b.schema_key AS schemaId, a.schema_version AS schemaVersion,
                       a.data, a.created_at AS createdAt, a.updated_at AS updatedAt`;

/** One thing wrong with an asset a client sent, as the API answers it in `errors`. */
interface AssetProblem {
    /** Where in `data` it is, like validateValues() writes it: "stats.strength", "tags.0", or "key" / "data". */
    path: string;
    message: string;
}

/** A blueprint as the asset routes need it: its row UUID plus what validation uses. */
interface BlueprintRow {
    rowId: string;
    id: string;
    version: number;
    fields: Blueprint['fields'];
}

/** Every asset in a project sorted by ID, or only one blueprint's when `blueprintId` is given. */
export async function findAssets(projectId: string, blueprintId: string | null): Promise<Asset[]> {
    let selectQuery = `SELECT ${ASSET_COLUMNS} FROM assets a JOIN blueprints b ON b.id = a.blueprint_id
                       WHERE a.project_id = ?`;
    const values: string[] = [projectId];
    if (blueprintId !== null) {
        selectQuery = `${selectQuery} AND b.schema_key = ?`;
        values.push(blueprintId);
    }
    selectQuery = `${selectQuery} ORDER BY a.asset_key`;

    const [rows] = await db.query<RowDataPacket[]>(selectQuery, values);
    return rows as Asset[];
}

/** One asset by its UUID, or undefined when the project has none. */
async function findAsset(projectId: string, id: string): Promise<Asset | undefined> {
    const selectQuery = `SELECT ${ASSET_COLUMNS} FROM assets a JOIN blueprints b ON b.id = a.blueprint_id
                         WHERE a.project_id = ? AND a.id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId, id]);
    return rows[0] as Asset | undefined;
}

/** One blueprint by its snake_case ID, as the asset routes need it. */
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
 * Checks an asset sent by a client with the frontend's own validators. Returns [{ path, message }], empty when
 * nothing is wrong. `currentAssetId` is the asset being updated, or null for a new one.
 */
async function validateAssetBody(
    projectId: string,
    blueprint: BlueprintRow,
    key: unknown,
    data: unknown,
    currentAssetId: string | null,
): Promise<AssetProblem[]> {
    const problems: AssetProblem[] = [];

    if (!isPlainObject(data)) {
        problems.push({ path: 'data', message: 'data must be an object' });
        return problems;
    }

    const siblings = await findAssetsOfBlueprint(projectId, blueprint.id);
    const keyError = validateAssetKey(key, siblings, currentAssetId);
    if (keyError) {
        problems.push({ path: 'key', message: keyError });
    }

    // validateValues() only reads the blueprint's own properties, so anything else would be saved unchecked
    findUnknownKeys(blueprint.fields, data, '', problems);

    // What links may point at: every asset in the project, with the one being updated under its new ID
    const blueprints = await findBlueprintsForLinks(projectId);
    const savedAssets = await findAssetsForLinks(projectId);
    const assets: { schemaId: string; key: string }[] = [];
    for (const asset of savedAssets) {
        if (asset.id === currentAssetId && typeof key === 'string') {
            assets.push({ schemaId: asset.schemaId, key: key });
        } else {
            assets.push(asset);
        }
    }
    const referenceKeys = referenceKeysFor(blueprints, assets);

    // validateValues() expects form values (numbers as text)
    const values = toFormValues(blueprint.fields, data);
    // Plain JavaScript, so name its shape: path -> message
    const valueErrors: Record<string, string> = validateValues(blueprint.fields, values, '', referenceKeys);
    for (const path of Object.keys(valueErrors)) {
        problems.push({ path: path, message: valueErrors[path] });
    }

    return problems;
}

/**
 * Adds a problem for every key in `data` that isn't one of `fields`' IDs, looking inside groups and vectors too
 * (the only values that are objects), so nothing the blueprint doesn't describe is saved. `prefix` is the path of
 * the group being checked, ending in a dot ('' at the top). A value of the wrong type is validateValues()'s job.
 */
function findUnknownKeys(fields: Field[], data: Record<string, unknown>, prefix: string, problems: AssetProblem[]) {
    // A Map, not a plain object: looking up a key like "constructor" on {} finds its built-in function
    const fieldsByKey = new Map<string, Field>();
    for (const field of fields) {
        fieldsByKey.set(field.key, field);
    }

    for (const key of Object.keys(data)) {
        const path = prefix + key;
        const field = fieldsByKey.get(key);
        if (!field) {
            problems.push({ path: path, message: `"${key}" isn't a property of this blueprint` });
            continue;
        }

        const value = data[key];
        if (field.type === 'object' && isPlainObject(value)) {
            findUnknownKeys(field.fields ?? [], value, `${path}.`, problems);
        }
        if ((field.type === 'vector2' || field.type === 'vector3') && isPlainObject(value)) {
            findUnknownAxes(field.type, value, path, problems);
        }
        if (field.type === 'list' && Array.isArray(value)) {
            const itemType = field.itemType?.type;
            if (itemType === 'vector2' || itemType === 'vector3') {
                for (let index = 0; index < value.length; index++) {
                    const item = value[index];
                    if (isPlainObject(item)) {
                        findUnknownAxes(itemType, item, `${path}.${index}`, problems);
                    }
                }
            }
        }
    }
}

/** Adds a problem for every key in a vector value other than its axes (x and y, plus z for a vector3). */
function findUnknownAxes(
    type: 'vector2' | 'vector3',
    vector: Record<string, unknown>,
    path: string,
    problems: AssetProblem[],
) {
    const axes: string[] = VECTOR_AXES[type];
    for (const key of Object.keys(vector)) {
        if (!axes.includes(key)) {
            problems.push({ path: path, message: `"${key}" isn't an axis of this vector` });
        }
    }
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

/** Every asset in the project, as referenceKeysFor() wants them: [{ id, schemaId, key }]. */
async function findAssetsForLinks(projectId: string) {
    const selectQuery = `SELECT a.id, b.schema_key AS schemaId, a.asset_key AS \`key\` FROM assets a
                         JOIN blueprints b ON b.id = a.blueprint_id WHERE a.project_id = ?`;
    const [rows] = await db.query<RowDataPacket[]>(selectQuery, [projectId]);
    return rows as { id: string; schemaId: string; key: string }[];
}

/**
 * Points every link to asset `fromKey` of blueprint `blueprintId` at `toKey`: in the project's other assets and in
 * its dialogues' speakers and given items. Only changed rows are written, unvalidated, keeping their updatedAt and
 * schemaVersion. Runs in the caller's transaction, after the rename itself.
 */
async function renameLinksToAsset(
    connection: PoolConnection,
    projectId: string,
    assetId: string,
    blueprintId: string,
    fromKey: string,
    toKey: string,
): Promise<void> {
    // Each asset's own blueprint properties say where its links are
    const assetQuery = `SELECT a.id, a.data, b.fields FROM assets a JOIN blueprints b ON b.id = a.blueprint_id
                        WHERE a.project_id = ? AND a.id <> ?`;
    const [assetRows] = await connection.query<RowDataPacket[]>(assetQuery, [projectId, assetId]);
    for (const row of assetRows) {
        const renamedData = replaceReferences(row.fields, row.data, blueprintId, fromKey, toKey);
        if (JSON.stringify(renamedData) !== JSON.stringify(row.data)) {
            await connection.query(`UPDATE assets SET data = ? WHERE id = ?`, [JSON.stringify(renamedData), row.id]);
        }
    }

    // renameAssetInDialogue() returns null when the dialogue doesn't use the asset
    const dialogueQuery = `SELECT id, speaker_blueprint AS speakerBlueprint, item_blueprint AS itemBlueprint, nodes
                           FROM dialogues WHERE project_id = ?`;
    const [dialogueRows] = await connection.query<RowDataPacket[]>(dialogueQuery, [projectId]);
    for (const row of dialogueRows) {
        const renamed = renameAssetInDialogue(row, blueprintId, fromKey, toKey);
        if (renamed) {
            await connection.query(`UPDATE dialogues SET nodes = ? WHERE id = ?`, [
                JSON.stringify(renamed.nodes),
                row.id,
            ]);
        }
    }
}

/** True for a plain object like { … } (not null, not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
// endregion
