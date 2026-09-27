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

// True for a plain object like { … } (not null, not an array)
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function createBackup(data, createdAt) {
  return {
    app: 'GameAtlas',
    type: 'backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: createdAt,
    blueprints: data.blueprints,
    assets: data.assets,
    dialogues: data.dialogues,
  }
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
  if (!Array.isArray(file.blueprints) || !Array.isArray(file.assets) || !Array.isArray(file.dialogues)) {
    return { error: 'This backup is incomplete.' }
  }
  if (isDamaged(file)) {
    return { error: "This backup is damaged and can't be restored." }
  }

  let createdAt = null
  if (typeof file.createdAt === 'string') {
    createdAt = file.createdAt
  }

  return {
    backup: {
      createdAt: createdAt,
      blueprints: file.blueprints,
      assets: file.assets,
      dialogues: file.dialogues,
    },
  }
}

// True if any blueprint, asset or dialogue in the file is missing the fields GameAtlas needs
function isDamaged(file) {
  for (const blueprint of file.blueprints) {
    const looksValid = isObject(blueprint) && typeof blueprint.id === 'string' && Array.isArray(blueprint.fields)
    if (!looksValid) {
      return true
    }
  }

  for (const asset of file.assets) {
    const looksValid =
      isObject(asset) &&
      typeof asset.id === 'string' &&
      typeof asset.key === 'string' &&
      typeof asset.schemaId === 'string' &&
      isObject(asset.data)
    if (!looksValid) {
      return true
    }
  }

  for (const dialogue of file.dialogues) {
    const looksValid =
      isObject(dialogue) &&
      typeof dialogue.id === 'string' &&
      typeof dialogue.key === 'string' &&
      Array.isArray(dialogue.nodes) &&
      Array.isArray(dialogue.edges)
    if (!looksValid) {
      return true
    }
  }

  return false
}

/** "2 blueprints, 7 assets and 1 dialogue" */
export function describeContents(data) {
  const blueprints = plural(data.blueprints.length, 'blueprint')
  const assets = plural(data.assets.length, 'asset')
  const dialogues = plural(data.dialogues.length, 'dialogue')
  return `${blueprints}, ${assets} and ${dialogues}`
}

/** Replaces everything with the given data: { blueprints, assets, dialogues }. */
export function restoreData(data) {
  replaceBlueprints(data.blueprints)
  replaceAssets(data.assets)
  replaceDialogues(data.dialogues)
}

export function resetToExampleData() {
  restoreData({ blueprints: STARTER_BLUEPRINTS, assets: STARTER_ASSETS, dialogues: STARTER_DIALOGUES })
}

export function deleteAllData() {
  restoreData({ blueprints: [], assets: [], dialogues: [] })
}
