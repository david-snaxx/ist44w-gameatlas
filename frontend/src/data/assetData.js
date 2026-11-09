import { toSnakeCase } from '../schema/blueprintDraft.js'
import { defaultValue, describeType, VECTOR_AXES } from '../schema/fieldTypes.js'
import { validateValues } from '../schema/validation.js'
import { ownValue } from '../utils/ownValue.js'
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
      values[field.key] = toFormValue(field, ownValue(source, field.key))
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
      data[field.key] = toDataValue(field, ownValue(values, field.key))
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

  const value = ownValue(asset.data, key)
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

/** A saved asset's problems against a blueprint, as messages by property path ({ "stats.strength": "…" }). */
export function findAssetProblems(asset, blueprint, referenceKeys) {
  const values = toFormValues(blueprint.fields, asset.data)
  return validateValues(blueprint.fields, values, '', referenceKeys)
}

/** How many problems a saved asset has against its blueprint as it is now (0 means it can be exported). */
export function countAssetProblems(asset, blueprint, referenceKeys) {
  return Object.keys(findAssetProblems(asset, blueprint, referenceKeys)).length
}

// ---------- What a blueprint change does to its assets ----------

/**
 * What saving `nextBlueprint` in place of `previousBlueprint` (null for a new one) does to that blueprint's assets,
 * worked out with the same conversions and checks the editors use, before anything is saved. Assets keep their saved
 * data and are read through the new blueprint, so a value is really gone once the asset is next saved. Returns
 * { assetCount, affectedCount, lostValues, changedValues, newProblems }; each list holds { id, name, details }.
 */
export function describeBlueprintChanges(previousBlueprint, nextBlueprint, blueprints, assets) {
  const report = { assetCount: 0, affectedCount: 0, lostValues: [], changedValues: [], newProblems: [] }
  if (!previousBlueprint) {
    return report
  }

  const blueprintAssets = assets.filter((asset) => asset.schemaId === previousBlueprint.id)
  report.assetCount = blueprintAssets.length

  const referenceKeys = referenceKeysFor(blueprints, assets)
  // A renamed blueprint takes its assets along, so links to them (its own included) are checked under the new ID
  referenceKeys[nextBlueprint.id] = referenceKeys[previousBlueprint.id]

  const previousFields = fieldsByPath(previousBlueprint.fields, '')
  const nextFields = fieldsByPath(nextBlueprint.fields, '')
  const affectedIds = new Set()

  for (const asset of blueprintAssets) {
    const name = assetLabel(asset, previousBlueprint)
    // The asset as it will be the next time it's saved under the new blueprint
    const nextData = toData(nextBlueprint.fields, toFormValues(nextBlueprint.fields, asset.data))

    const lost = describeLostValues(asset.data, previousFields, nextFields, previousBlueprint.fields)
    if (lost.length > 0) {
      report.lostValues.push({ id: asset.id, name: name, details: lost })
      affectedIds.add(asset.id)
    }

    const changed = describeChangedValues(asset.data, nextData, previousFields, nextFields, nextBlueprint.fields)
    if (changed.length > 0) {
      report.changedValues.push({ id: asset.id, name: name, details: changed })
      affectedIds.add(asset.id)
    }

    const before = findAssetProblems(asset, previousBlueprint, referenceKeys)
    const after = findAssetProblems(asset, nextBlueprint, referenceKeys)
    const problems = []
    for (const path of Object.keys(after)) {
      if (!ownValue(before, path)) {
        problems.push(`${labelForPath(nextBlueprint.fields, path)}: ${after[path]}`)
      }
    }
    if (problems.length > 0) {
      report.newProblems.push({ id: asset.id, name: name, details: problems })
      affectedIds.add(asset.id)
    }
  }

  report.affectedCount = affectedIds.size
  return report
}

// Every property in a blueprint's tree by its path ("stats.strength"): { [path]: field }. Parents come before children.
function fieldsByPath(fields, prefix) {
  const found = {}
  for (const field of fields ?? []) {
    if (!field.key) {
      continue
    }
    let path = field.key
    if (prefix) {
      path = `${prefix}.${field.key}`
    }
    found[path] = field

    if (field.type === 'object') {
      const children = fieldsByPath(field.fields, path)
      for (const childPath of Object.keys(children)) {
        found[childPath] = children[childPath]
      }
    }
  }
  return found
}

// Filled-in values whose property is gone from the new blueprint, as "Label: value". A removed group is one line.
function describeLostValues(data, previousFields, nextFields, previousTopFields) {
  const details = []
  const reportedPaths = []

  for (const path of Object.keys(previousFields)) {
    if (ownValue(nextFields, path)) {
      continue
    }
    const insideReported = reportedPaths.some((reported) => path.startsWith(`${reported}.`))
    if (insideReported) {
      continue
    }
    const value = valueAtPath(data, path)
    if (isFilledIn(previousFields[path], value)) {
      details.push(`${labelForPath(previousTopFields, path)}: ${shortJson(value)}`)
      reportedPaths.push(path)
    }
  }
  return details
}

// Filled-in values whose property changes type, as "Label: old type → new type (old value → new value)"
function describeChangedValues(data, nextData, previousFields, nextFields, nextTopFields) {
  const details = []

  for (const path of Object.keys(previousFields)) {
    const previousField = previousFields[path]
    const nextField = ownValue(nextFields, path)
    if (!nextField) {
      continue
    }
    // describeType() names list item types and link targets too ("List of whole number", "Link to entity")
    const previousType = describeType(previousField)
    const nextType = describeType(nextField)
    if (previousType === nextType) {
      continue
    }

    const value = valueAtPath(data, path)
    if (isFilledIn(previousField, value)) {
      const label = labelForPath(nextTopFields, path)
      const nextValue = valueAtPath(nextData, path)
      details.push(`${label}: ${previousType} → ${nextType} (${shortJson(value)} → ${shortJson(nextValue)})`)
    }
  }
  return details
}

// The value at a property path in saved data ("stats.strength" -> data.stats.strength), or undefined
function valueAtPath(data, path) {
  let value = data
  for (const part of path.split('.')) {
    if (value === null || typeof value !== 'object') {
      return undefined
    }
    value = ownValue(value, part)
  }
  return value
}

// Whether a saved value holds something other than what the property saves as when left empty
function isFilledIn(field, value) {
  if (value === undefined) {
    return false
  }
  const emptyValue = toData([field], {})[field.key]
  return JSON.stringify(value) !== JSON.stringify(emptyValue)
}

// A value as short JSON for a report line, cut off after 40 characters
function shortJson(value) {
  const text = JSON.stringify(value) ?? 'nothing'
  if (text.length > 40) {
    return `${text.slice(0, 40)}…`
  }
  return text
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
