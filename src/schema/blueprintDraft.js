import { uniqueKey } from '../utils/uniqueKey.js'
import { FIELD_TYPES, supportsRequired, TYPE_SETTINGS } from './fieldTypes.js'

/*
 * A blueprint has two shapes:
 * - a *definition*: the clean JSON that gets saved and exported (PLAN.md §5.2)
 * - a *draft*: the same data while editing, where every property also has a `uid`
 *   so React can track it even while its ID is empty or being renamed.
 */

export const EMPTY_BLUEPRINT = { id: '', name: '', description: '', kind: 'form', version: 1, fields: [] }

let nextUid = 1
const newUid = () => `property-${nextUid++}`

// ---------- Creating properties ----------

export function createField(type, base = {}) {
  const field = {
    uid: base.uid ?? newUid(),
    key: base.key ?? '',
    label: base.label ?? '',
    type,
    required: base.required ?? false,
    help: base.help ?? '',
  }
  if (type === 'enum') field.options = []
  if (type === 'list') field.itemType = { type: 'string' }
  if (type === 'object') field.fields = base.fields ?? []
  return field
}

export function createItemType(type) {
  return type === 'enum' ? { type, options: [] } : { type }
}

// ---------- Definition <-> draft ----------

export function toDraft(definition) {
  return {
    id: definition.id ?? '',
    name: definition.name ?? '',
    description: definition.description ?? '',
    kind: 'form',
    version: definition.version ?? 1,
    fields: withUids(definition.fields ?? []),
  }
}

function withUids(fields) {
  return fields.map((field) => {
    const draftField = {
      ...field,
      uid: newUid(),
      key: typeof field.key === 'string' ? field.key : '',
      label: typeof field.label === 'string' ? field.label : '',
      required: Boolean(field.required),
      help: typeof field.help === 'string' ? field.help : '',
    }
    if (field.type === 'enum') draftField.options = Array.isArray(field.options) ? field.options.map(String) : []
    if (field.type === 'list') draftField.itemType = field.itemType ?? { type: 'string' }
    if (field.type === 'object') draftField.fields = withUids(field.fields ?? [])
    return draftField
  })
}

/** The clean definition for saving and exporting: no uids, no empty or irrelevant settings. */
export function toDefinition(draft) {
  const definition = { id: draft.id, name: draft.name }
  if (draft.description.trim()) definition.description = draft.description.trim()
  definition.kind = 'form'
  definition.version = draft.version
  definition.fields = draft.fields.map((field) => cleanField(field))
  return definition
}

function cleanField(field, isItemType = false) {
  const clean = isItemType ? { type: field.type } : { key: field.key, label: field.label, type: field.type }
  if (!isItemType) {
    if (field.required && supportsRequired(field.type)) clean.required = true
    if (field.help?.trim()) clean.help = field.help.trim()
  }
  for (const setting of TYPE_SETTINGS[field.type] ?? []) {
    const value = field[setting]
    if (value === undefined || value === null || value === '') continue
    if (setting === 'default' && (isItemType || (field.type === 'bool' && value === false))) continue
    if (setting === 'itemType') clean.itemType = cleanField(value, true)
    else if (setting === 'fields') clean.fields = value.map((child) => cleanField(child))
    else clean[setting] = value
  }
  return clean
}

// ---------- Editing the property tree (all return new arrays; nothing is changed in place) ----------

/** Finds a property anywhere in the tree. Returns { field, siblings } or null. */
export function findField(fields, uid) {
  for (const field of fields) {
    if (field.uid === uid) return { field, siblings: fields }
    if (field.type === 'object') {
      const found = findField(field.fields, uid)
      if (found) return found
    }
  }
  return null
}

export function replaceField(fields, uid, nextField) {
  return fields.map((field) => {
    if (field.uid === uid) return nextField
    if (field.type === 'object') return { ...field, fields: replaceField(field.fields, uid, nextField) }
    return field
  })
}

export function removeField(fields, uid) {
  return fields
    .filter((field) => field.uid !== uid)
    .map((field) => (field.type === 'object' ? { ...field, fields: removeField(field.fields, uid) } : field))
}

/** Adds a property at the end of the top level (parentUid null) or of a group. */
export function addField(fields, parentUid, newField) {
  if (!parentUid) return [...fields, newField]
  return fields.map((field) => {
    if (field.uid === parentUid) return { ...field, fields: [...field.fields, newField] }
    if (field.type === 'object') return { ...field, fields: addField(field.fields, parentUid, newField) }
    return field
  })
}

/** Moves a property up (-1) or down (+1) among its siblings. */
export function moveField(fields, uid, direction) {
  const index = fields.findIndex((field) => field.uid === uid)
  if (index !== -1) {
    const target = index + direction
    if (target < 0 || target >= fields.length) return fields
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  }
  return fields.map((field) =>
    field.type === 'object' ? { ...field, fields: moveField(field.fields, uid, direction) } : field,
  )
}

/** Inserts a copy (with new uids) right after the original. */
export function duplicateField(fields, uid) {
  const index = fields.findIndex((field) => field.uid === uid)
  if (index !== -1) {
    const original = fields[index]
    const copy = {
      ...cloneWithNewUids(original),
      key: original.key ? `${original.key}Copy` : '',
      label: original.label ? `${original.label} (copy)` : '',
    }
    return [...fields.slice(0, index + 1), copy, ...fields.slice(index + 1)]
  }
  return fields.map((field) =>
    field.type === 'object' ? { ...field, fields: duplicateField(field.fields, uid) } : field,
  )
}

function cloneWithNewUids(field) {
  const clone = { ...field, uid: newUid() }
  if (field.options) clone.options = [...field.options]
  if (field.itemType) clone.itemType = { ...field.itemType }
  if (field.type === 'object') clone.fields = field.fields.map(cloneWithNewUids)
  return clone
}

// ---------- Reading definitions ----------

export function countProperties(fields = []) {
  return fields.reduce((total, field) => total + 1 + (field.type === 'object' ? countProperties(field.fields) : 0), 0)
}

/** True if any property (at any depth) links to the given blueprint. */
export function usesBlueprint(fields = [], blueprintId) {
  return fields.some(
    (field) =>
      (field.type === 'reference' && field.targetSchema === blueprintId) ||
      (field.type === 'list' && field.itemType?.type === 'reference' && field.itemType.targetSchema === blueprintId) ||
      (field.type === 'object' && usesBlueprint(field.fields, blueprintId)),
  )
}

// ---------- Text helpers ----------

function words(text) {
  return (
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[A-Za-z0-9]+/g) ?? []
  )
}

/** "Weight (kg)" -> "weightKg". Used to suggest property IDs. */
export function toCamelCase(text) {
  return words(text)
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('')
    .replace(/^[0-9]+/, '')
}

/** "Quest Reward" -> "quest_reward". Used to suggest blueprint IDs. */
export function toSnakeCase(text) {
  return words(text)
    .map((word) => word.toLowerCase())
    .join('_')
    .replace(/^[0-9_]+/, '')
}

// ---------- Duplicating ----------

/**
 * Navigation state that opens the blueprint builder pre-filled with a copy of `definition`.
 * Nothing is saved until the user saves. The copy's ID follows its name until edited.
 */
export function duplicateBlueprintState(definition, existingIds) {
  const name = `${definition.name} (copy)`
  const id = uniqueKey(toSnakeCase(name) || `${definition.id}_copy`, existingIds)
  return {
    imported: { ...definition, name, id, version: 1 },
    origin: 'duplicate',
    originName: definition.name,
  }
}

// ---------- Importing ----------

/** Reads a blueprint file's text. Returns { imported } or { error } (a message for the user). */
export function parseBlueprintFile(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { error: "This file couldn't be read as a blueprint." }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.fields)) {
    return { error: "This file isn't a GameAtlas blueprint." }
  }
  const unknownType = findUnknownType(data.fields)
  if (unknownType !== null) {
    return { error: `This blueprint uses a property type GameAtlas doesn't know: "${unknownType}".` }
  }
  return {
    imported: {
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      description: typeof data.description === 'string' ? data.description : '',
      version: 1,
      fields: data.fields,
    },
  }
}

function findUnknownType(fields) {
  for (const field of fields) {
    if (!field || !FIELD_TYPES[field.type]) return String(field?.type)
    if (field.type === 'list' && field.itemType && !FIELD_TYPES[field.itemType.type]) {
      return String(field.itemType.type)
    }
    if (field.type === 'object') {
      const nested = findUnknownType(Array.isArray(field.fields) ? field.fields : [])
      if (nested !== null) return nested
    }
  }
  return null
}
