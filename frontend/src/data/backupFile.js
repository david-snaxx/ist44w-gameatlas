import { findField, toDraft } from '../schema/blueprintDraft.js'
import { FIELD_TYPES } from '../schema/fieldTypes.js'
import { validateAssetKey, validateBlueprint, validateIdFormat } from '../schema/validation.js'
import { plural } from '../utils/plural.js'
import { validateDialogueDetails } from './dialogueGraph.js'

/*
 * A backup is one JSON file with everything GameAtlas stores, exactly as it's stored (dialogue layouts included):
 *   { app: "GameAtlas", type: "backup", formatVersion, createdAt, blueprints, assets, dialogues }
 * It's for restoring GameAtlas itself, not for game engines (those use the per-asset and per-dialogue files).
 *
 * This file is plain logic with no stores, so the backend imports it too: checkContents() is what
 * PUT /api/projects/:id/contents runs before it replaces a project's contents. Changing the stores is in backup.js.
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

// ---------- Checking a whole set before it replaces a project's contents ----------

/**
 * Checks a whole set { blueprints, assets, dialogues } against itself, before it replaces everything in a project.
 * Nothing that's already saved is looked at. Returns a message about the first problem found, or null when the
 * set can be saved.
 *
 * Only the structure is checked. Problems the editors already show, and let people fix later, are allowed:
 * links to blueprints or assets that aren't in the set, asset values that break their property's rules,
 * and unfinished dialogue trees.
 */
export function checkContents(contents) {
  if (!isObject(contents)) {
    return 'Send an object: { blueprints, assets, dialogues }'
  }
  const hasLists =
    Array.isArray(contents.blueprints) && Array.isArray(contents.assets) && Array.isArray(contents.dialogues)
  if (!hasLists) {
    return 'blueprints, assets and dialogues must each be a list'
  }

  const blueprintProblem = checkBlueprints(contents.blueprints)
  if (blueprintProblem) {
    return blueprintProblem
  }
  const assetProblem = checkAssets(contents.assets, contents.blueprints)
  if (assetProblem) {
    return assetProblem
  }
  return checkDialogues(contents.dialogues)
}

// Blueprints need a valid name and ID, an ID no other blueprint in the set uses, and valid properties
function checkBlueprints(blueprints) {
  // The checks below can only read blueprints that have the right shape, so those come first
  for (let index = 0; index < blueprints.length; index++) {
    const blueprint = blueprints[index]
    if (!isReadableBlueprint(blueprint)) {
      return `${itemName('Blueprint', blueprint?.id, index)} is damaged`
    }
  }

  // A link may point at a blueprint that isn't in the set: the builder shows that as "That blueprint no longer
  // exists" and lets people fix it later. So every blueprint a link names counts as one that exists.
  const linkableIds = []
  for (const blueprint of blueprints) {
    linkableIds.push(blueprint.id)
    collectLinkTargets(blueprint.fields, linkableIds)
  }

  // Each blueprint is checked against the ones before it, so the second use of an ID is the one reported
  const earlierIds = []
  for (let index = 0; index < blueprints.length; index++) {
    const blueprint = blueprints[index]
    // validateBlueprint() reads drafts, whose `uid`s also let it spot repeated property IDs
    const draft = toDraft(blueprint)
    const errors = validateBlueprint(draft, { otherIds: earlierIds, blueprintIds: linkableIds })
    const problem = firstBlueprintProblem(draft, errors)
    if (problem) {
      return `${itemName('Blueprint', blueprint.id, index)}: ${problem}`
    }
    earlierIds.push(blueprint.id)
  }
  return null
}

// Assets need a valid ID that no other asset of the same blueprint uses, and their blueprint must be in the set
function checkAssets(assets, blueprints) {
  const blueprintIds = []
  for (const blueprint of blueprints) {
    blueprintIds.push(blueprint.id)
  }

  // The assets checked so far, as validateAssetKey() reads them: [{ key }]. They have no `id`,
  // so every one with the same ID counts as a clash.
  const earlierAssets = []
  for (let index = 0; index < assets.length; index++) {
    const asset = assets[index]
    if (!isReadableAsset(asset)) {
      return `${itemName('Asset', asset?.key, index)} is damaged`
    }

    const name = `${itemName('Asset', asset.key, index)} (${asset.schemaId})`
    if (!blueprintIds.includes(asset.schemaId)) {
      return `${name}: its blueprint isn't part of this set`
    }

    const sameBlueprint = earlierAssets.filter((earlier) => earlier.schemaId === asset.schemaId)
    const keyError = validateAssetKey(asset.key, sameBlueprint, null)
    if (keyError) {
      return `${name}: ${keyError}`
    }
    earlierAssets.push({ key: asset.key, schemaId: asset.schemaId })
  }
  return null
}

// Dialogues need a valid name and ID, and an ID no other dialogue in the set uses
function checkDialogues(dialogues) {
  const earlierKeys = []
  for (let index = 0; index < dialogues.length; index++) {
    const dialogue = dialogues[index]
    if (!isReadableDialogue(dialogue)) {
      return `${itemName('Dialogue', dialogue?.key, index)} is damaged`
    }

    const name = itemName('Dialogue', dialogue.key, index)
    const errors = validateDialogueDetails({ name: dialogue.name, key: dialogue.key }, earlierKeys)
    if (errors.name) {
      return `${name}: ${errors.name}`
    }
    if (errors.key) {
      return `${name}: ${errors.key}`
    }
    earlierKeys.push(dialogue.key)
  }
  return null
}

// How a message names an item: by its ID when it has one, otherwise by its place in the list ("Asset 3")
function itemName(kind, id, index) {
  if (typeof id === 'string' && id !== '') {
    return `${kind} "${id}"`
  }
  return `${kind} ${index + 1}`
}

// The first problem validateBlueprint() found, as one message, or null when it found none
function firstBlueprintProblem(draft, errors) {
  const groups = Object.keys(errors)
  if (groups.length === 0) {
    return null
  }

  // A group is either `blueprint` (its name, ID and "no properties") or one property's errors under its uid
  const group = groups[0]
  const setting = Object.keys(errors[group])[0]
  const message = errors[group][setting]
  if (group === 'blueprint') {
    return message
  }

  const found = findField(draft.fields, group)
  return `${propertyName(found.field)} (${setting}): ${message}`
}

// How a message names a property: by its ID, or by its label while it has no ID
function propertyName(field) {
  if (field.key) {
    return `property "${field.key}"`
  }
  if (field.label) {
    return `property "${field.label}"`
  }
  return 'a property'
}

// Adds the blueprint ID each link property names (at any depth, list items too) to `targets`
function collectLinkTargets(fields, targets) {
  for (const field of fields) {
    if (field.type === 'reference' && typeof field.targetSchema === 'string') {
      targets.push(field.targetSchema)
    }
    const itemType = field.itemType
    if (field.type === 'list' && isObject(itemType) && typeof itemType.targetSchema === 'string') {
      targets.push(itemType.targetSchema)
    }
    if (field.type === 'object' && Array.isArray(field.fields)) {
      collectLinkTargets(field.fields, targets)
    }
  }
}

// ---------- Shape checks: can the checks above read an item at all? ----------

// True for undefined, null or a string: an optional text setting
function isOptionalText(value) {
  return value === undefined || value === null || typeof value === 'string'
}

// True for a blueprint version (or an asset's schemaVersion): a whole number of 1 or more
function isVersion(value) {
  return Number.isInteger(value) && value >= 1
}

function isKnownType(type) {
  return Object.keys(FIELD_TYPES).includes(type)
}

function isReadableBlueprint(blueprint) {
  if (!isObject(blueprint)) {
    return false
  }
  if (typeof blueprint.id !== 'string' || typeof blueprint.name !== 'string') {
    return false
  }
  if (!isOptionalText(blueprint.description) || !isVersion(blueprint.version)) {
    return false
  }
  return hasReadableFields(blueprint.fields)
}

// True if `fields` is a list of properties of known types, with readable groups and list items at any depth
function hasReadableFields(fields) {
  if (!Array.isArray(fields)) {
    return false
  }
  for (const field of fields) {
    if (!isObject(field) || !isKnownType(field.type)) {
      return false
    }
    if (field.type === 'object' && !hasReadableFields(field.fields ?? [])) {
      return false
    }
    if (field.type === 'list' && !isReadableItemType(field.itemType)) {
      return false
    }
  }
  return true
}

// A list's item type: missing (the builder reads that as short text), or a known type other than a list or group
function isReadableItemType(itemType) {
  if (itemType === undefined || itemType === null) {
    return true
  }
  if (!isObject(itemType) || !isKnownType(itemType.type)) {
    return false
  }
  if (itemType.type === 'list' || itemType.type === 'object') {
    return false
  }
  if (itemType.options === undefined) {
    return true
  }
  // A choice list's options are checked as text, so each one has to be text
  if (!Array.isArray(itemType.options)) {
    return false
  }
  for (const option of itemType.options) {
    if (typeof option !== 'string') {
      return false
    }
  }
  return true
}

function isReadableAsset(asset) {
  if (!isObject(asset)) {
    return false
  }
  if (typeof asset.key !== 'string' || typeof asset.schemaId !== 'string') {
    return false
  }
  return isVersion(asset.schemaVersion) && isObject(asset.data)
}

function isReadableDialogue(dialogue) {
  if (!isObject(dialogue)) {
    return false
  }
  if (typeof dialogue.key !== 'string' || typeof dialogue.name !== 'string') {
    return false
  }
  if (!isOptionalText(dialogue.description)) {
    return false
  }
  if (!isOptionalBlueprintId(dialogue.speakerBlueprint) || !isOptionalBlueprintId(dialogue.itemBlueprint)) {
    return false
  }
  return Array.isArray(dialogue.nodes) && Array.isArray(dialogue.edges)
}

// A dialogue's speaker or item blueprint: none (missing or ''), or written like a blueprint ID.
// It doesn't have to be in the set: the dialogue editor shows a missing blueprint as a problem to fix.
function isOptionalBlueprintId(value) {
  if (value === undefined || value === null || value === '') {
    return true
  }
  return typeof value === 'string' && validateIdFormat(value) === null
}
