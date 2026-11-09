import { ownValue } from '../utils/ownValue.js'
import { FIELD_TYPES, TYPE_SETTINGS, VECTOR_AXES } from './fieldTypes.js'

export const BLUEPRINT_ID_PATTERN = /^[a-z][a-z0-9_]*$/
export const PROPERTY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/
export const MAX_BLUEPRINT_ID_LENGTH = 64
export const MAX_BLUEPRINT_NAME_LENGTH = 120
/** The most properties a blueprint can have, counting the ones inside groups. */
export const MAX_BLUEPRINT_PROPERTIES = 1000
/** How deep groups can go: a group at the top is level 1, a group inside it level 2, and so on. */
export const MAX_GROUP_DEPTH = 10

function isEmpty(value) {
  return value === undefined || value === null || value === ''
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

// ---------- Asset values: what people type into a form ----------

/**
 * Returns an error message for one property value, or null if it's fine.
 * referenceKeys (optional): { [blueprintId]: [asset keys] }. When given, links must point to an existing asset.
 */
function validateValue(field, value, referenceKeys) {
  switch (field.type) {
    case 'string':
    case 'text':
      if (isEmpty(value)) {
        if (field.required) return 'Enter a value'
        return null
      }
      if (field.maxLength && value.length > field.maxLength) {
        return `Use ${field.maxLength} characters or fewer`
      }
      return null

    case 'int':
    case 'float': {
      if (isEmpty(value)) {
        if (field.required) return 'Enter a number'
        return null
      }
      const number = Number(value)
      if (!Number.isFinite(number)) return 'Enter a number'
      if (field.type === 'int' && !Number.isInteger(number)) return 'Use a whole number'
      if (isNumber(field.min) && number < field.min) return `Must be ${field.min} or more`
      if (isNumber(field.max) && number > field.max) return `Must be ${field.max} or less`
      return null
    }

    case 'enum': {
      if (isEmpty(value)) {
        if (field.required) return 'Choose an option'
        return null
      }
      const options = field.options ?? []
      if (!options.includes(value)) return 'Choose one of the listed options'
      return null
    }

    case 'reference':
      if (isEmpty(value)) {
        if (field.required) return 'Choose an asset'
        return null
      }
      if (referenceKeys) {
        const existingKeys = ownValue(referenceKeys, field.targetSchema) ?? []
        if (!existingKeys.includes(value)) return 'That asset no longer exists'
      }
      return null

    case 'vector2':
    case 'vector3':
      for (const axis of VECTOR_AXES[field.type]) {
        const axisValue = value?.[axis]
        if (isEmpty(axisValue) || !Number.isFinite(Number(axisValue))) {
          return 'Enter a number for every axis'
        }
      }
      return null

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
    if (!field.key) {
      continue
    }

    let path = field.key
    if (prefix) {
      path = `${prefix}.${field.key}`
    }
    const value = ownValue(values, field.key)

    if (field.type === 'object') {
      const groupErrors = validateValues(field.fields ?? [], value ?? {}, path, referenceKeys)
      // Copies the group's errors into `errors`
      Object.assign(errors, groupErrors)
    } else if (field.type === 'list') {
      let items = []
      if (Array.isArray(value)) {
        items = value
      }
      if (field.required && items.length === 0) {
        errors[path] = 'Add at least one item'
      }
      // Every item in a list needs a value, so check each one as a required property.
      // `{ ...field.itemType, required: true }` is a copy of the item type with `required` set.
      const itemField = { ...field.itemType, required: true }
      for (let index = 0; index < items.length; index++) {
        const message = validateValue(itemField, items[index], referenceKeys)
        if (message) {
          errors[`${path}.${index}`] = message
        }
      }
    } else {
      const message = validateValue(field, value, referenceKeys)
      if (message) {
        errors[path] = message
      }
    }
  }

  return errors
}

/**
 * Keeps only the errors for inputs the user has changed, so a new form doesn't open covered in red.
 * An error also counts when it's inside a group or list the user changed ("stats" covers "stats.strength").
 */
export function onlyTouchedErrors(errors, touchedPaths) {
  const shown = {}
  for (const path of Object.keys(errors)) {
    for (const touched of touchedPaths) {
      if (path === touched || path.startsWith(`${touched}.`)) {
        shown[path] = errors[path]
        break
      }
    }
  }
  return shown
}

// ---------- Blueprint definitions: what the builder edits ----------

// True if another property in `siblings` already uses this property's ID
function isKeyTaken(field, siblings) {
  for (const sibling of siblings) {
    if (sibling.uid !== field.uid && sibling.key === field.key) {
      return true
    }
  }
  return false
}

function hasBlankText(texts) {
  for (const text of texts) {
    if (!text.trim()) {
      return true
    }
  }
  return false
}

function hasRepeats(values) {
  const seen = []
  for (const value of values) {
    if (seen.includes(value)) {
      return true
    }
    seen.push(value)
  }
  return false
}

/**
 * Checks one property's own settings. Returns { [setting]: message }.
 * A list's item settings are reported as "itemType.<setting>".
 *
 * options (all optional):
 *   siblings: the properties at the same level (IDs must be unique among them)
 *   blueprintIds: every blueprint a link could point to
 *   isItemType: true when checking a list's item type (it has no label or ID)
 *   checkChildren: false while a new group is being created (its properties are added afterwards)
 */
export function validateFieldDefinition(field, options = {}) {
  const siblings = options.siblings ?? []
  const blueprintIds = options.blueprintIds ?? []
  const isItemType = options.isItemType ?? false
  const checkChildren = options.checkChildren ?? true

  const errors = {}

  if (!isItemType) {
    if (!field.label?.trim()) {
      errors.label = 'Enter a label'
    }
    if (!field.key) {
      errors.key = 'Enter an ID'
    } else if (!PROPERTY_KEY_PATTERN.test(field.key)) {
      errors.key = 'Start with a letter, then use letters, numbers or underscores'
    } else if (isKeyTaken(field, siblings)) {
      errors.key = 'Another property at this level already uses this ID'
    }
  }

  if (!ownValue(FIELD_TYPES, field.type)) {
    errors.type = 'Choose a type'
    return errors
  }

  switch (field.type) {
    case 'string':
    case 'text':
      if (field.maxLength !== undefined) {
        const isWholeNumber = Number.isInteger(field.maxLength)
        if (!isWholeNumber || field.maxLength < 1) {
          errors.maxLength = 'Use a whole number of 1 or more'
        }
      }
      break

    case 'int':
    case 'float':
      for (const setting of ['min', 'max']) {
        const value = field[setting]
        if (value === undefined) {
          continue
        }
        if (!isNumber(value)) {
          errors[setting] = 'Enter a number'
        } else if (field.type === 'int' && !Number.isInteger(value)) {
          errors[setting] = 'Use a whole number'
        }
      }
      // Only compare the two limits when both are valid numbers
      if (!errors.min && !errors.max && isNumber(field.min) && isNumber(field.max)) {
        if (field.min > field.max) {
          errors.max = 'Must be at least the minimum'
        }
      }
      break

    case 'enum': {
      const enumOptions = field.options ?? []
      if (enumOptions.length === 0) {
        errors.options = 'Add at least one option'
      } else if (hasBlankText(enumOptions)) {
        errors.options = "Options can't be empty"
      } else if (hasRepeats(enumOptions)) {
        errors.options = 'Each option must be different'
      }
      break
    }

    case 'reference':
      if (!field.targetSchema) {
        errors.targetSchema = 'Choose a blueprint'
      } else if (!blueprintIds.includes(field.targetSchema)) {
        errors.targetSchema = 'That blueprint no longer exists'
      }
      break

    case 'list': {
      const itemErrors = validateFieldDefinition(field.itemType ?? {}, { isItemType: true, blueprintIds: blueprintIds })
      for (const setting of Object.keys(itemErrors)) {
        errors[`itemType.${setting}`] = itemErrors[setting]
      }
      break
    }

    case 'object':
      if (checkChildren && !field.fields?.length) {
        errors.fields = 'Add at least one property to this group'
      }
      break
  }

  // A default value has to follow the property's own rules (but only once those rules are valid)
  const hasDefaultSetting = TYPE_SETTINGS[field.type].includes('default')
  const settingsValid = !errors.options && !errors.min && !errors.max && !errors.maxLength
  if (!isItemType && hasDefaultSetting && !isEmpty(field.default) && settingsValid) {
    const optionalField = { ...field, required: false }
    const message = validateValue(optionalField, field.default)
    if (message) {
      errors.default = message
    }
  }

  return errors
}

/**
 * Checks a whole blueprint draft. Returns an object keyed by property `uid`
 * (each holding that property's errors), plus `blueprint` for the name, ID and "no properties" errors.
 *
 * options (all optional):
 *   otherIds: IDs of the other saved blueprints (a blueprint's ID must be unique)
 *   blueprintIds: every blueprint a link could point to, including this one
 */
export function validateBlueprint(draft, options = {}) {
  const otherIds = options.otherIds ?? []
  const blueprintIds = options.blueprintIds ?? []

  const errors = {}

  const general = validateBlueprintDetails(draft, otherIds)
  if (draft.fields.length === 0) {
    general.fields = 'Add at least one property'
  }
  const sizeProblem = checkBlueprintSize(draft.fields)
  if (sizeProblem) {
    general.fields = sizeProblem
  }
  if (Object.keys(general).length > 0) {
    errors.blueprint = general
  }

  // checkFieldsInto() goes through every level, so a blueprint that's too big stops at the size problem
  if (!sizeProblem) {
    checkFieldsInto(errors, draft.fields, blueprintIds)
  }
  return errors
}

/**
 * Checks that a blueprint's properties (a draft's or a saved one's) number at most MAX_BLUEPRINT_PROPERTIES and that
 * groups go at most MAX_GROUP_DEPTH levels deep. Returns a message or null. Run it before anything that goes through
 * every level of a blueprint from outside the app: it stops at the first limit it passes and uses no recursion, so
 * even one nested thousands of levels deep can't overflow the stack.
 */
export function checkBlueprintSize(fields) {
  // A to-do list of property lists still to look at, each with how deep its group is (0 for the top)
  const toVisit = [{ fields: fields, depth: 0 }]
  let count = 0
  while (toVisit.length > 0) {
    const level = toVisit.pop()
    if (!Array.isArray(level.fields)) {
      continue
    }

    for (const field of level.fields) {
      count++
      if (count > MAX_BLUEPRINT_PROPERTIES) {
        return `Use ${MAX_BLUEPRINT_PROPERTIES} properties or fewer, counting the ones inside groups`
      }
      const isGroup = Boolean(field) && field.type === 'object'
      if (isGroup) {
        const depth = level.depth + 1
        if (depth > MAX_GROUP_DEPTH) {
          return `Groups can only go ${MAX_GROUP_DEPTH} levels deep`
        }
        toVisit.push({ fields: field.fields, depth: depth })
      }
    }
  }
  return null
}

// Checks every property (including those inside groups) and stores each one's errors under its uid
function checkFieldsInto(errors, fields, blueprintIds) {
  for (const field of fields) {
    const fieldErrors = validateFieldDefinition(field, { siblings: fields, blueprintIds: blueprintIds })
    if (Object.keys(fieldErrors).length > 0) {
      errors[field.uid] = fieldErrors
    }
    if (field.type === 'object') {
      checkFieldsInto(errors, field.fields ?? [], blueprintIds)
    }
  }
}

/**
 * Checks how a blueprint, asset or dialogue ID is written: required, lowercase snake_case, at most MAX_ID_LENGTH
 * characters. Returns a message or null. Whether it's taken is up to the caller.
 */
export function validateIdFormat(id) {
  if (!id) {
    return 'Enter an ID'
  }
  if (!BLUEPRINT_ID_PATTERN.test(id)) {
    return 'Start with a lowercase letter, then use lowercase letters, numbers or underscores'
  }
  if (id.length > MAX_BLUEPRINT_ID_LENGTH) {
    return `Use ${MAX_BLUEPRINT_ID_LENGTH} characters or fewer`
  }
  return null
}

/** Checks a blueprint or dialogue name: required, and at most MAX_NAME_LENGTH characters. Returns a message or null. */
export function validateName(name) {
  if (!name.trim()) {
    return 'Enter a name'
  }
  if (name.trim().length > MAX_BLUEPRINT_NAME_LENGTH) {
    return `Use ${MAX_BLUEPRINT_NAME_LENGTH} characters or fewer`
  }
  return null
}

/**
 * Checks a blueprint's name and ID. Returns { name?, id? } with a message for each problem.
 * otherIds: the IDs of the other saved blueprints (a blueprint's ID must be unique)
 */
export function validateBlueprintDetails(details, otherIds) {
  const errors = {}

  const nameError = validateName(details.name)
  if (nameError) {
    errors.name = nameError
  }

  const idError = validateIdFormat(details.id)
  if (idError) {
    errors.id = idError
  } else if (otherIds.includes(details.id)) {
    errors.id = 'Another blueprint already uses this ID'
  }

  return errors
}

/** Checks an asset's ID: written like every ID (validateIdFormat), and unique among its blueprint's assets. */
export function validateAssetKey(key, blueprintAssets, currentAssetId) {
  const formatError = validateIdFormat(key)
  if (formatError) {
    return formatError
  }
  for (const asset of blueprintAssets) {
    if (asset.key === key && asset.id !== currentAssetId) {
      return 'Another asset of this blueprint already uses this ID'
    }
  }
  return null
}

/** The total number of problems in the result of validateBlueprint. */
export function countProblems(errors) {
  let total = 0
  for (const group of Object.values(errors)) {
    total += Object.keys(group).length
  }
  return total
}
