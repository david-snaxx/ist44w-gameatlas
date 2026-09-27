import { uniqueKey } from '../utils/uniqueKey.js'
import { FIELD_TYPES, supportsRequired, TYPE_SETTINGS } from './fieldTypes.js'

/*
 * A blueprint has two shapes:
 * - a *definition*: the clean JSON that gets saved and exported (PLAN.md §5.2)
 * - a *draft*: the same data while editing, where every property also has a `uid`
 *   so React can track it even while its ID is empty or being renamed.
 *
 * The editing functions below never change the arrays they're given. They return new arrays,
 * because React only notices a change when it gets a new array or object.
 */

export const EMPTY_BLUEPRINT = { id: '', name: '', description: '', kind: 'form', version: 1, fields: [] }

let nextUid = 1

function newUid() {
  const uid = `property-${nextUid}`
  nextUid++
  return uid
}

// The value if it's a string, otherwise ''
function textOrEmpty(value) {
  if (typeof value === 'string') {
    return value
  }
  return ''
}

// ---------- Creating properties ----------

export function createField(type, base = {}) {
  const field = {
    uid: base.uid ?? newUid(),
    key: base.key ?? '',
    label: base.label ?? '',
    type: type,
    required: base.required ?? false,
    help: base.help ?? '',
  }
  if (type === 'enum') {
    field.options = []
  }
  if (type === 'list') {
    field.itemType = { type: 'string' }
  }
  if (type === 'object') {
    field.fields = base.fields ?? []
  }
  return field
}

export function createItemType(type) {
  if (type === 'enum') {
    return { type: type, options: [] }
  }
  return { type: type }
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

// Copies the properties, giving each a new uid and making sure the text settings are strings
function withUids(fields) {
  const draftFields = []

  for (const field of fields) {
    // `...field` copies every setting of the saved property; the lines after it add or replace some
    const draftField = {
      ...field,
      uid: newUid(),
      key: textOrEmpty(field.key),
      label: textOrEmpty(field.label),
      required: Boolean(field.required),
      help: textOrEmpty(field.help),
    }

    if (field.type === 'enum') {
      draftField.options = []
      if (Array.isArray(field.options)) {
        for (const option of field.options) {
          draftField.options.push(String(option))
        }
      }
    }
    if (field.type === 'list') {
      draftField.itemType = field.itemType ?? { type: 'string' }
    }
    if (field.type === 'object') {
      draftField.fields = withUids(field.fields ?? [])
    }

    draftFields.push(draftField)
  }

  return draftFields
}

/** The clean definition for saving and exporting: no uids, no empty or irrelevant settings. */
export function toDefinition(draft) {
  const definition = { id: draft.id, name: draft.name }
  if (draft.description.trim()) {
    definition.description = draft.description.trim()
  }
  definition.kind = 'form'
  definition.version = draft.version

  definition.fields = []
  for (const field of draft.fields) {
    definition.fields.push(cleanField(field, false))
  }
  return definition
}

// One property without its uid or any setting that is empty or doesn't apply to its type
function cleanField(field, isItemType) {
  let clean
  if (isItemType) {
    // A list's item type has no ID, label, "required" or help of its own
    clean = { type: field.type }
  } else {
    clean = { key: field.key, label: field.label, type: field.type }
    if (field.required && supportsRequired(field.type)) {
      clean.required = true
    }
    if (field.help?.trim()) {
      clean.help = field.help.trim()
    }
  }

  const settings = TYPE_SETTINGS[field.type] ?? []
  for (const setting of settings) {
    const value = field[setting]

    if (value === undefined || value === null || value === '') {
      continue
    }
    if (setting === 'default' && isItemType) {
      continue
    }
    // "Off" is already what an on/off property starts as, so it isn't saved
    if (setting === 'default' && field.type === 'bool' && value === false) {
      continue
    }

    if (setting === 'itemType') {
      clean.itemType = cleanField(value, true)
    } else if (setting === 'fields') {
      clean.fields = []
      for (const child of value) {
        clean.fields.push(cleanField(child, false))
      }
    } else {
      clean[setting] = value
    }
  }

  return clean
}

// ---------- Editing the property tree ----------

/** Finds a property anywhere in the tree. Returns { field, siblings } or null. */
export function findField(fields, uid) {
  for (const field of fields) {
    if (field.uid === uid) {
      return { field: field, siblings: fields }
    }
    if (field.type === 'object') {
      const found = findField(field.fields, uid)
      if (found) {
        return found
      }
    }
  }
  return null
}

/** Puts `nextField` in place of the property with this uid (at any depth). */
export function replaceField(fields, uid, nextField) {
  const result = []
  for (const field of fields) {
    if (field.uid === uid) {
      result.push(nextField)
    } else if (field.type === 'object') {
      result.push({ ...field, fields: replaceField(field.fields, uid, nextField) })
    } else {
      result.push(field)
    }
  }
  return result
}

/** Removes the property with this uid (at any depth). */
export function removeField(fields, uid) {
  const result = []
  for (const field of fields) {
    if (field.uid === uid) {
      continue
    }
    if (field.type === 'object') {
      result.push({ ...field, fields: removeField(field.fields, uid) })
    } else {
      result.push(field)
    }
  }
  return result
}

/** Adds a property at the end of the top level (parentUid null) or of a group. */
export function addField(fields, parentUid, newField) {
  if (!parentUid) {
    return [...fields, newField]
  }

  const result = []
  for (const field of fields) {
    if (field.uid === parentUid) {
      result.push({ ...field, fields: [...field.fields, newField] })
    } else if (field.type === 'object') {
      result.push({ ...field, fields: addField(field.fields, parentUid, newField) })
    } else {
      result.push(field)
    }
  }
  return result
}

/** Moves a property up (-1) or down (+1) among its siblings. */
export function moveField(fields, uid, direction) {
  const index = fields.findIndex((field) => field.uid === uid)

  if (index !== -1) {
    const target = index + direction
    // Already first or last: nothing to do
    if (target < 0 || target >= fields.length) {
      return fields
    }
    const result = [...fields]
    const moving = result[index]
    result[index] = result[target]
    result[target] = moving
    return result
  }

  // Not at this level: look inside the groups
  const result = []
  for (const field of fields) {
    if (field.type === 'object') {
      result.push({ ...field, fields: moveField(field.fields, uid, direction) })
    } else {
      result.push(field)
    }
  }
  return result
}

/** Inserts a copy (with new uids) right after the original. */
export function duplicateField(fields, uid) {
  const index = fields.findIndex((field) => field.uid === uid)

  if (index !== -1) {
    const original = fields[index]
    const copy = cloneWithNewUids(original)
    copy.key = ''
    if (original.key) {
      copy.key = `${original.key}Copy`
    }
    copy.label = ''
    if (original.label) {
      copy.label = `${original.label} (copy)`
    }

    const result = []
    for (const field of fields) {
      result.push(field)
      if (field === original) {
        result.push(copy)
      }
    }
    return result
  }

  // Not at this level: look inside the groups
  const result = []
  for (const field of fields) {
    if (field.type === 'object') {
      result.push({ ...field, fields: duplicateField(field.fields, uid) })
    } else {
      result.push(field)
    }
  }
  return result
}

// A deep copy of a property where it (and every property inside it) gets a new uid
function cloneWithNewUids(field) {
  const clone = { ...field, uid: newUid() }
  if (field.options) {
    clone.options = [...field.options]
  }
  if (field.itemType) {
    clone.itemType = { ...field.itemType }
  }
  if (field.type === 'object') {
    clone.fields = []
    for (const child of field.fields) {
      clone.fields.push(cloneWithNewUids(child))
    }
  }
  return clone
}

// ---------- Reading definitions ----------

/** How many properties there are, counting the ones inside groups. */
export function countProperties(fields = []) {
  let total = 0
  for (const field of fields) {
    total++
    if (field.type === 'object') {
      total += countProperties(field.fields)
    }
  }
  return total
}

/** True if any property (at any depth) links to the given blueprint. */
export function usesBlueprint(fields = [], blueprintId) {
  for (const field of fields) {
    if (field.type === 'reference' && field.targetSchema === blueprintId) {
      return true
    }
    if (field.type === 'list') {
      const itemType = field.itemType
      if (itemType?.type === 'reference' && itemType.targetSchema === blueprintId) {
        return true
      }
    }
    if (field.type === 'object' && usesBlueprint(field.fields, blueprintId)) {
      return true
    }
  }
  return false
}

// ---------- Text helpers ----------

// The words in a piece of text, with accents removed: "Café crème!" -> ["Cafe", "creme"]
function words(text) {
  // Split letters from their accents ("é" becomes "e" plus an accent mark), then drop the accent marks
  const withoutAccents = text.normalize('NFKD').replace(/[̀-ͯ]/g, '')
  const found = withoutAccents.match(/[A-Za-z0-9]+/g)
  if (found === null) {
    return []
  }
  return found
}

/** "Weight (kg)" -> "weightKg". Used to suggest property IDs. */
export function toCamelCase(text) {
  let result = ''
  const textWords = words(text)
  for (let index = 0; index < textWords.length; index++) {
    const word = textWords[index]
    if (index === 0) {
      result += word.toLowerCase()
    } else {
      result += word[0].toUpperCase() + word.slice(1).toLowerCase()
    }
  }
  // An ID can't start with a digit
  return result.replace(/^[0-9]+/, '')
}

/** "Quest Reward" -> "quest_reward". Used to suggest blueprint IDs. */
export function toSnakeCase(text) {
  const lowerWords = []
  for (const word of words(text)) {
    lowerWords.push(word.toLowerCase())
  }
  // An ID can't start with a digit or an underscore
  return lowerWords.join('_').replace(/^[0-9_]+/, '')
}

// ---------- Duplicating ----------

/**
 * Navigation state that opens the blueprint builder pre-filled with a copy of `definition`.
 * Nothing is saved until the user saves. The copy's ID follows its name until edited.
 */
export function duplicateBlueprintState(definition, existingIds) {
  const name = `${definition.name} (copy)`

  let baseId = toSnakeCase(name)
  if (!baseId) {
    baseId = `${definition.id}_copy`
  }
  const id = uniqueKey(baseId, existingIds)

  return {
    imported: { ...definition, name: name, id: id, version: 1 },
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

  const isObject = Boolean(data) && typeof data === 'object' && !Array.isArray(data)
  if (!isObject || !Array.isArray(data.fields)) {
    return { error: "This file isn't a GameAtlas blueprint." }
  }

  const unknownType = findUnknownType(data.fields)
  if (unknownType !== null) {
    return { error: `This blueprint uses a property type GameAtlas doesn't know: "${unknownType}".` }
  }

  return {
    imported: {
      id: textOrEmpty(data.id),
      name: textOrEmpty(data.name),
      description: textOrEmpty(data.description),
      version: 1,
      fields: data.fields,
    },
  }
}

// The first property type (at any depth) that GameAtlas doesn't know, or null if they're all known
function findUnknownType(fields) {
  for (const field of fields) {
    if (!field || !FIELD_TYPES[field.type]) {
      return String(field?.type)
    }
    if (field.type === 'list' && field.itemType && !FIELD_TYPES[field.itemType.type]) {
      return String(field.itemType.type)
    }
    if (field.type === 'object') {
      let children = []
      if (Array.isArray(field.fields)) {
        children = field.fields
      }
      const nested = findUnknownType(children)
      if (nested !== null) {
        return nested
      }
    }
  }
  return null
}
