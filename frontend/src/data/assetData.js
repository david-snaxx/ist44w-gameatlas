import { toSnakeCase } from '../schema/blueprintDraft.js'
import { defaultValue, VECTOR_AXES } from '../schema/fieldTypes.js'
import { validateValues } from '../schema/validation.js'
import { uniqueKey } from '../utils/uniqueKey.js'

/*
 * An asset's `data` holds typed values, exactly as they're saved and exported (numbers are numbers,
 * empty optional values are null). While editing, the form holds *form values* instead, where numbers
 * are strings so half-typed input like "-" is allowed. These functions convert between the two.
 */

// ---------- data <-> form values ----------

// One saved value -> the value the form shows
function toFormValue(field, value) {
  if (value === undefined) {
    return defaultValue(field)
  }

  switch (field.type) {
    case 'int':
    case 'float':
    case 'string':
    case 'text':
    case 'enum':
    case 'reference':
      if (value === null) {
        return ''
      }
      return String(value)

    case 'bool':
      return Boolean(value)

    case 'vector2':
    case 'vector3': {
      const vector = {}
      for (const axis of VECTOR_AXES[field.type]) {
        vector[axis] = value?.[axis] ?? 0
      }
      return vector
    }

    case 'list': {
      if (!Array.isArray(value)) {
        return []
      }
      const itemField = field.itemType ?? { type: 'string' }
      const items = []
      for (const item of value) {
        items.push(toFormValue(itemField, item))
      }
      return items
    }

    case 'object':
      return toFormValues(field.fields ?? [], value)

    default:
      return value
  }
}

/** Saved data -> form values. Properties missing from the data (e.g. added later) get their defaults. */
export function toFormValues(fields, data) {
  const source = data ?? {}
  const values = {}
  for (const field of fields) {
    if (field.key) {
      values[field.key] = toFormValue(field, source[field.key])
    }
  }
  return values
}

// One form value -> the value that gets saved
function toDataValue(field, value) {
  switch (field.type) {
    case 'int':
    case 'float':
      if (value === '' || value === undefined || value === null) {
        return null
      }
      return Number(value)

    case 'string':
    case 'text':
      return value ?? ''

    case 'enum':
    case 'reference':
      // An empty choice is saved as null
      if (!value) {
        return null
      }
      return value

    case 'bool':
      return Boolean(value)

    case 'vector2':
    case 'vector3': {
      const vector = {}
      for (const axis of VECTOR_AXES[field.type]) {
        vector[axis] = Number(value?.[axis] ?? 0)
      }
      return vector
    }

    case 'list': {
      if (!Array.isArray(value)) {
        return []
      }
      const itemField = field.itemType ?? { type: 'string' }
      const items = []
      for (const item of value) {
        items.push(toDataValue(itemField, item))
      }
      return items
    }

    case 'object':
      return toData(field.fields ?? [], value ?? {})

    default:
      return value ?? null
  }
}

/** Form values -> saved data. Only the blueprint's current properties are kept. */
export function toData(fields, values = {}) {
  const data = {}
  for (const field of fields) {
    if (field.key) {
      data[field.key] = toDataValue(field, values[field.key])
    }
  }
  return data
}

// ---------- Addresses ----------

/** The read-only view of an asset in a project. Add "/edit" for its editor. */
export function assetPath(projectId, schemaId, key) {
  return `/projects/${projectId}/blueprints/${schemaId}/assets/${key}`
}

/** { [blueprintId]: [asset keys] }, which link validation uses to spot links to assets that no longer exist. */
export function referenceKeysFor(blueprints, assets) {
  const keysByBlueprint = {}
  for (const blueprint of blueprints) {
    const keys = []
    for (const asset of assets) {
      if (asset.schemaId === blueprint.id) {
        keys.push(asset.key)
      }
    }
    keysByBlueprint[blueprint.id] = keys
  }
  return keysByBlueprint
}

// ---------- Names and labels ----------

/** The property used as an asset's display name: "name" if it's text, otherwise the first text property. */
export function labelFieldKey(blueprint) {
  const fields = blueprint.fields ?? []

  for (const field of fields) {
    if (field.key === 'name' && field.type === 'string') {
      return field.key
    }
  }
  for (const field of fields) {
    if (field.type === 'string') {
      return field.key ?? null
    }
  }
  return null
}

/** An asset's display name, falling back to its ID. */
export function assetLabel(asset, blueprint) {
  const key = labelFieldKey(blueprint)
  if (!key) {
    return asset.key
  }

  const value = asset.data?.[key]
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return asset.key
}

/** "stats.strength" -> "Stats › Strength", "tags.2" -> "Tags › item 3". For validation summaries. */
export function labelForPath(fields, path) {
  const parts = path.split('.')
  const labels = []
  let level = fields

  for (let index = 0; index < parts.length; index++) {
    const field = level?.find((candidate) => candidate.key === parts[index])
    if (!field) {
      break
    }
    labels.push(field.label || field.key)

    if (field.type === 'object') {
      // Keep going into the group's own properties
      level = field.fields
      continue
    }
    // A list item's path ends in its index, which is shown counting from 1
    const hasItemIndex = index + 1 < parts.length
    if (field.type === 'list' && hasItemIndex) {
      labels.push(`item ${Number(parts[index + 1]) + 1}`)
    }
    break
  }

  const text = labels.join(' › ')
  if (!text) {
    return path
  }
  return text
}

/** How many problems a saved asset has against its blueprint as it is now (0 means it can be exported). */
export function countAssetProblems(asset, blueprint, referenceKeys) {
  const values = toFormValues(blueprint.fields, asset.data)
  const errors = validateValues(blueprint.fields, values, '', referenceKeys)
  return Object.keys(errors).length
}

// ---------- Duplicating ----------

/**
 * Navigation state that opens the asset editor pre-filled with a copy of `asset`.
 * The copy's name gets " (copy)" and its ID follows that name (until the user edits the ID).
 * Nothing is saved until the user saves.
 */
export function duplicateAssetState(asset, blueprint, blueprintAssets) {
  const labelKey = labelFieldKey(blueprint)

  let currentName = ''
  if (labelKey && typeof asset.data?.[labelKey] === 'string') {
    currentName = asset.data[labelKey].trim()
  }

  let data = asset.data
  let baseKey = ''
  if (currentName) {
    const copyName = `${currentName} (copy)`
    // A copy of the data with the name property replaced
    data = { ...asset.data, [labelKey]: copyName }
    baseKey = toSnakeCase(copyName)
  }
  if (!baseKey) {
    baseKey = `${asset.key}_copy`
  }

  const takenKeys = []
  for (const other of blueprintAssets) {
    takenKeys.push(other.key)
  }

  return {
    imported: { key: uniqueKey(baseKey, takenKeys), data: data },
    origin: 'duplicate',
    originName: assetLabel(asset, blueprint),
    followName: Boolean(currentName),
  }
}

// ---------- Links between assets ----------

/** Returns a copy of `data` where links to asset `fromKey` of blueprint `targetSchema` point to `toKey` instead. */
export function replaceReferences(fields, data, targetSchema, fromKey, toKey) {
  const result = {}
  for (const key of Object.keys(data ?? {})) {
    const value = data[key]
    const field = fields.find((candidate) => candidate.key === key)
    if (field) {
      result[key] = replaceReferenceIn(field, value, targetSchema, fromKey, toKey)
    } else {
      result[key] = value
    }
  }
  return result
}

// The same as replaceReferences, for one value of the given property
function replaceReferenceIn(field, value, targetSchema, fromKey, toKey) {
  if (field.type === 'reference') {
    if (field.targetSchema === targetSchema && value === fromKey) {
      return toKey
    }
    return value
  }

  if (field.type === 'list' && Array.isArray(value)) {
    const itemField = field.itemType ?? {}
    const items = []
    for (const item of value) {
      items.push(replaceReferenceIn(itemField, item, targetSchema, fromKey, toKey))
    }
    return items
  }

  if (field.type === 'object' && value && typeof value === 'object') {
    return replaceReferences(field.fields ?? [], value, targetSchema, fromKey, toKey)
  }

  return value
}

/** True if `data` links to asset `key` of blueprint `targetSchema` anywhere. */
export function linksTo(fields, data, targetSchema, key) {
  // Swap every link to the asset for a placeholder: if anything changed, there was a link
  const withPlaceholder = replaceReferences(fields, data, targetSchema, key, ' ')
  return JSON.stringify(withPlaceholder) !== JSON.stringify(data ?? {})
}

// ---------- Files ----------

/**
 * The engine-facing shape of one asset. Values stay nested under `data`, so a property
 * named "id" can never clash with the asset's own ID.
 */
export function toExport(asset) {
  return { id: asset.key, blueprint: asset.schemaId, blueprintVersion: asset.schemaVersion, data: asset.data }
}

/** Reads an asset file for `blueprint`. Returns { imported: { key, data } } or { error }. */
export function parseAssetFile(text, blueprint) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: "This file couldn't be read as an asset." }
  }

  const isObject = Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed)
  if (!isObject) {
    return { error: "This file isn't a GameAtlas asset." }
  }

  // A downloaded asset file looks like { id, blueprint, blueprintVersion, data }
  const data = parsed.data
  const isExportFile = Boolean(data) && typeof data === 'object' && !Array.isArray(data)
  if (isExportFile && typeof parsed.blueprint === 'string' && parsed.blueprint !== blueprint.id) {
    return { error: `This asset belongs to the "${parsed.blueprint}" blueprint, not ${blueprint.name}.` }
  }

  if (!isExportFile) {
    // Also accept a plain object of values without the export wrapper
    return { imported: { key: '', data: parsed } }
  }

  let key = ''
  if (typeof parsed.id === 'string') {
    key = parsed.id
  }
  return { imported: { key: key, data: data } }
}
