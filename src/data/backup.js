import { replaceBlueprints } from '../schema/blueprintStore.js'
import { STARTER_BLUEPRINTS } from '../schema/starterBlueprints.js'
import { plural } from '../utils/plural.js'
import { replaceAssets } from './assetStore.js'
import { replaceDialogues } from './dialogueStore.js'
import { STARTER_ASSETS } from './starterAssets.js'
import { STARTER_DIALOGUES } from './starterDialogues.js'

/*
 * A backup is one JSON file with everything GameAtlas stores, exactly as it's stored (dialogue layouts included):
 *   { app: "GameAtlas", type: "backup", formatVersion, createdAt, blueprints, assets, dialogues }
 * It's for restoring GameAtlas itself, not for game engines (those use the per-asset and per-dialogue files).
 */

const BACKUP_FORMAT_VERSION = 1

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export function createBackup({ blueprints, assets, dialogues }, createdAt) {
  return { app: 'GameAtlas', type: 'backup', formatVersion: BACKUP_FORMAT_VERSION, createdAt, blueprints, assets, dialogues }
}

/** Reads a backup file. Returns { backup: { createdAt, blueprints, assets, dialogues } } or { error }. */
export function parseBackupFile(fileText) {
  let file
  try {
    file = JSON.parse(fileText)
  } catch {
    return { error: "This file couldn't be read as a backup." }
  }
  if (!isObject(file) || file.app !== 'GameAtlas' || file.type !== 'backup') {
    return { error: "This file isn't a GameAtlas backup." }
  }
  if (typeof file.formatVersion !== 'number' || file.formatVersion > BACKUP_FORMAT_VERSION) {
    return { error: 'This backup was made by a newer version of GameAtlas.' }
  }
  if (!['blueprints', 'assets', 'dialogues'].every((name) => Array.isArray(file[name]))) {
    return { error: 'This backup is incomplete.' }
  }

  const looksValid =
    file.blueprints.every((blueprint) => isObject(blueprint) && typeof blueprint.id === 'string' && Array.isArray(blueprint.fields)) &&
    file.assets.every(
      (asset) =>
        isObject(asset) &&
        typeof asset.id === 'string' &&
        typeof asset.key === 'string' &&
        typeof asset.schemaId === 'string' &&
        isObject(asset.data),
    ) &&
    file.dialogues.every(
      (dialogue) =>
        isObject(dialogue) &&
        typeof dialogue.id === 'string' &&
        typeof dialogue.key === 'string' &&
        Array.isArray(dialogue.nodes) &&
        Array.isArray(dialogue.edges),
    )
  if (!looksValid) return { error: "This backup is damaged and can't be restored." }

  return {
    backup: {
      createdAt: typeof file.createdAt === 'string' ? file.createdAt : null,
      blueprints: file.blueprints,
      assets: file.assets,
      dialogues: file.dialogues,
    },
  }
}

/** "2 blueprints, 7 assets and 1 dialogue" */
export function describeContents({ blueprints, assets, dialogues }) {
  return `${plural(blueprints.length, 'blueprint')}, ${plural(assets.length, 'asset')} and ${plural(dialogues.length, 'dialogue')}`
}

/** Replaces everything with the given data. */
export function restoreData({ blueprints, assets, dialogues }) {
  replaceBlueprints(blueprints)
  replaceAssets(assets)
  replaceDialogues(dialogues)
}

export function resetToExampleData() {
  restoreData({ blueprints: STARTER_BLUEPRINTS, assets: STARTER_ASSETS, dialogues: STARTER_DIALOGUES })
}

export function deleteAllData() {
  restoreData({ blueprints: [], assets: [], dialogues: [] })
}
