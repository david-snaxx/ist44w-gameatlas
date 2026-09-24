import { FIELD_TYPES, TYPE_SETTINGS, VECTOR_AXES } from './fieldTypes.js'

export const BLUEPRINT_ID_PATTERN = /^[a-z][a-z0-9_]*$/
export const PROPERTY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

const isEmpty = (value) => value === undefined || value === null || value === ''
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

// ---------- Asset values: what people type into a form ----------

/**
 * Returns an error message for one property value, or null if it's fine.
 * referenceKeys (optional): { [blueprintId]: [asset keys] }. When given, links must point to an existing asset.
 */
function validateValue(field, value, referenceKeys) {
  switch (field.type) {
    case 'string':
    case 'text':
      if (isEmpty(value)) return field.required ? 'Enter a value' : null
      if (field.maxLength && value.length > field.maxLength) return `Use ${field.maxLength} characters or fewer`
      return null
    case 'int':
    case 'float': {
      if (isEmpty(value)) return field.required ? 'Enter a number' : null
      const number = Number(value)
      if (!Number.isFinite(number)) return 'Enter a number'
      if (field.type === 'int' && !Number.isInteger(number)) return 'Use a whole number'
      if (isNumber(field.min) && number < field.min) return `Must be ${field.min} or more`
      if (isNumber(field.max) && number > field.max) return `Must be ${field.max} or less`
      return null
    }
    case 'enum':
      if (isEmpty(value)) return field.required ? 'Choose an option' : null
      return (field.options ?? []).includes(value) ? null : 'Choose one of the listed options'
    case 'reference':
      if (isEmpty(value)) return field.required ? 'Choose an asset' : null
      if (referenceKeys && !(referenceKeys[field.targetSchema] ?? []).includes(value)) {
        return 'That asset no longer exists'
      }
      return null
    case 'vector2':
    case 'vector3': {
      const axes = VECTOR_AXES[field.type]
      const invalid = axes.some((axis) => isEmpty(value?.[axis]) || !Number.isFinite(Number(value[axis])))
      return invalid ? 'Enter a number for every axis' : null
    }
    default:
      return null
  }
}

/**
 * Validates a whole form. Returns { [path]: message }.
 * Paths join keys with dots; list items use their index, e.g. "stats.strength" or "tags.2".
 * referenceKeys: see validateValue.
 */
export function validateValues(fields, values = {}, prefix = '', referenceKeys) {
  const errors = {}
  for (const field of fields) {
    if (!field.key) continue
    const path = prefix ? `${prefix}.${field.key}` : field.key
    const value = values[field.key]

    if (field.type === 'object') {
      Object.assign(errors, validateValues(field.fields ?? [], value ?? {}, path, referenceKeys))
    } else if (field.type === 'list') {
      const items = Array.isArray(value) ? value : []
      if (field.required && items.length === 0) errors[path] = 'Add at least one item'
      items.forEach((item, index) => {
        // Every item in a list needs a value
        const message = validateValue({ ...field.itemType, required: true }, item, referenceKeys)
        if (message) errors[`${path}.${index}`] = message
      })
    } else {
      const message = validateValue(field, value, referenceKeys)
      if (message) errors[path] = message
    }
  }
  return errors
}

// ---------- Blueprint definitions: what the builder edits ----------

/**
 * Checks one property's own settings. Returns { [setting]: message }.
 * A list's item settings are reported as "itemType.<setting>".
 *
 * siblings: the properties at the same level (IDs must be unique among them)
 * blueprintIds: every blueprint a link could point to
 * isItemType: true when checking a list's item type (it has no label or ID)
 * checkChildren: false while a new group is being created (its properties are added afterwards)
 */
export function validateFieldDefinition(
  field,
  { siblings = [], blueprintIds = [], isItemType = false, checkChildren = true } = {},
) {
  const errors = {}

  if (!isItemType) {
    if (!field.label?.trim()) errors.label = 'Enter a label'
    if (!field.key) errors.key = 'Enter an ID'
    else if (!PROPERTY_KEY_PATTERN.test(field.key)) {
      errors.key = 'Start with a letter, then use letters, numbers or underscores'
    } else if (siblings.some((sibling) => sibling.uid !== field.uid && sibling.key === field.key)) {
      errors.key = 'Another property at this level already uses this ID'
    }
  }

  if (!FIELD_TYPES[field.type]) {
    errors.type = 'Choose a type'
    return errors
  }

  switch (field.type) {
    case 'string':
    case 'text':
      if (field.maxLength !== undefined && (!Number.isInteger(field.maxLength) || field.maxLength < 1)) {
        errors.maxLength = 'Use a whole number of 1 or more'
      }
      break
    case 'int':
    case 'float':
      for (const setting of ['min', 'max']) {
        const value = field[setting]
        if (value === undefined) continue
        if (!isNumber(value)) errors[setting] = 'Enter a number'
        else if (field.type === 'int' && !Number.isInteger(value)) errors[setting] = 'Use a whole number'
      }
      if (!errors.min && !errors.max && isNumber(field.min) && isNumber(field.max) && field.min > field.max) {
        errors.max = 'Must be at least the minimum'
      }
      break
    case 'enum': {
      const options = field.options ?? []
      if (options.length === 0) errors.options = 'Add at least one option'
      else if (options.some((option) => !option.trim())) errors.options = "Options can't be empty"
      else if (new Set(options).size !== options.length) errors.options = 'Each option must be different'
      break
    }
    case 'reference':
      if (!field.targetSchema) errors.targetSchema = 'Choose a blueprint'
      else if (!blueprintIds.includes(field.targetSchema)) errors.targetSchema = 'That blueprint no longer exists'
      break
    case 'list': {
      const itemErrors = validateFieldDefinition(field.itemType ?? {}, { isItemType: true, blueprintIds })
      for (const [setting, message] of Object.entries(itemErrors)) errors[`itemType.${setting}`] = message
      break
    }
    case 'object':
      if (checkChildren && !field.fields?.length) errors.fields = 'Add at least one property to this group'
      break
  }

  // A default value has to follow the property's own rules
  const settingsValid = !errors.options && !errors.min && !errors.max && !errors.maxLength
  if (!isItemType && TYPE_SETTINGS[field.type].includes('default') && !isEmpty(field.default) && settingsValid) {
    const message = validateValue({ ...field, required: false }, field.default)
    if (message) errors.default = message
  }

  return errors
}

/**
 * Checks a whole blueprint draft. Returns an object keyed by property `uid`
 * (each holding that property's errors), plus `blueprint` for the name, ID and "no properties" errors.
 *
 * otherIds: IDs of the other saved blueprints (a blueprint's ID must be unique)
 * blueprintIds: every blueprint a link could point to, including this one
 */
export function validateBlueprint(draft, { otherIds = [], blueprintIds = [] } = {}) {
  const errors = {}

  const general = {}
  if (!draft.name.trim()) general.name = 'Enter a name'
  if (!draft.id) general.id = 'Enter an ID'
  else if (!BLUEPRINT_ID_PATTERN.test(draft.id)) {
    general.id = 'Start with a lowercase letter, then use lowercase letters, numbers or underscores'
  } else if (otherIds.includes(draft.id)) {
    general.id = 'Another blueprint already uses this ID'
  }
  if (draft.fields.length === 0) general.fields = 'Add at least one property'
  if (Object.keys(general).length > 0) errors.blueprint = general

  function checkFields(fields) {
    for (const field of fields) {
      const fieldErrors = validateFieldDefinition(field, { siblings: fields, blueprintIds })
      if (Object.keys(fieldErrors).length > 0) errors[field.uid] = fieldErrors
      if (field.type === 'object') checkFields(field.fields ?? [])
    }
  }
  checkFields(draft.fields)

  return errors
}

/** Checks an asset's ID: required, lowercase snake_case, and unique among its blueprint's assets. */
export function validateAssetKey(key, blueprintAssets, currentAssetId) {
  if (!key) return 'Enter an ID'
  if (!BLUEPRINT_ID_PATTERN.test(key)) {
    return 'Start with a lowercase letter, then use lowercase letters, numbers or underscores'
  }
  if (blueprintAssets.some((asset) => asset.key === key && asset.id !== currentAssetId)) {
    return 'Another asset of this blueprint already uses this ID'
  }
  return null
}

export function countProblems(errors) {
  return Object.values(errors).reduce((total, group) => total + Object.keys(group).length, 0)
}
