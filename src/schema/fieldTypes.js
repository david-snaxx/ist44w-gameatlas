// Every property type a blueprint can use. `label` and `description` are what users see (STYLE-GUIDELINES §11).
export const FIELD_TYPES = {
  string: { label: 'Short text', description: 'Names, titles and other single lines of text.' },
  text: { label: 'Long text', description: 'Descriptions, dialogue and notes.' },
  int: { label: 'Whole number', description: 'Counts, levels, damage.' },
  float: { label: 'Decimal number', description: 'Weights, speeds, percentages.' },
  bool: { label: 'On / off', description: 'A yes-or-no setting.' },
  enum: { label: 'Choice list', description: 'One option from a fixed list.' },
  vector2: { label: 'Vector 2', description: 'An X and Y pair, like a 2D position.' },
  vector3: { label: 'Vector 3', description: 'X, Y and Z, like a 3D offset.' },
  reference: { label: 'Link to asset', description: 'Points to an asset made from another blueprint.' },
  list: { label: 'List', description: 'Any number of values of one type.' },
  object: { label: 'Group', description: 'A set of nested properties, like a class inside a class.' },
}

export const PROPERTY_TYPE_OPTIONS = Object.entries(FIELD_TYPES).map(([value, type]) => ({ value, label: type.label }))

// A list can hold any type except another list or a group
export const LIST_ITEM_TYPE_OPTIONS = PROPERTY_TYPE_OPTIONS.filter(
  (option) => option.value !== 'list' && option.value !== 'object',
)

// The extra settings each type has. Anything not listed is dropped when a blueprint is saved.
export const TYPE_SETTINGS = {
  string: ['maxLength', 'default'],
  text: ['maxLength', 'default'],
  int: ['min', 'max', 'default'],
  float: ['min', 'max', 'default'],
  bool: ['default'],
  enum: ['options', 'default'],
  vector2: [],
  vector3: [],
  reference: ['targetSchema'],
  list: ['itemType'],
  object: ['fields'],
}

export const VECTOR_AXES = { vector2: ['x', 'y'], vector3: ['x', 'y', 'z'] }

// "Required" means nothing for types that always have a value
export function supportsRequired(type) {
  return !['bool', 'vector2', 'vector3', 'object'].includes(type)
}

/**
 * The starting value of a property in an empty form.
 * Numbers are kept as strings while editing, so half-typed input like "-" is allowed.
 */
export function defaultValue(field) {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'enum':
      return field.default ?? ''
    case 'int':
    case 'float':
      return field.default === undefined ? '' : String(field.default)
    case 'bool':
      return field.default ?? false
    case 'vector2':
    case 'vector3':
      return Object.fromEntries(VECTOR_AXES[field.type].map((axis) => [axis, 0]))
    case 'list':
      return []
    case 'object':
      return defaultValues(field.fields ?? [])
    default:
      return ''
  }
}

function defaultValues(fields) {
  return Object.fromEntries(fields.filter((field) => field.key).map((field) => [field.key, defaultValue(field)]))
}

// Short, readable type name for lists and badges, e.g. "List of whole number" or "Link to Entity"
export function describeType(field, blueprintNames = {}) {
  if (field.type === 'list') {
    const itemType = FIELD_TYPES[field.itemType?.type]
    return itemType ? `List of ${itemType.label.toLowerCase()}` : 'List'
  }
  if (field.type === 'reference' && field.targetSchema) {
    return `Link to ${blueprintNames[field.targetSchema] ?? field.targetSchema}`
  }
  return FIELD_TYPES[field.type]?.label ?? field.type
}
