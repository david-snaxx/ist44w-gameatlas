import { Link } from 'react-router'
import { VECTOR_AXES } from '../../schema/fieldTypes.js'

/**
 * Shows saved values read-only, laid out by the blueprint's properties: the viewing counterpart of FormRenderer.
 *
 * fields: the blueprint's properties
 * data: the asset's saved data (typed values: numbers are numbers)
 * resolveLink(blueprintId, assetKey): { label, to } for a linked asset, or null if it no longer exists
 */
function ValueRenderer({ fields, data, resolveLink }) {
  const rows = []
  for (const field of fields) {
    // A property without an ID has nothing saved under it
    if (!field.key) {
      continue
    }
    const value = data?.[field.key]
    rows.push(<ValueField key={field.key} field={field} value={value} resolveLink={resolveLink} />)
  }
  return <div>{rows}</div>
}

/** One property: its label and value, or for a group, its own indented list of values. */
function ValueField({ field, value, resolveLink }) {
  if (field.type === 'object') {
    let content = <span className="muted">No properties</span>
    if (field.fields?.length) {
      content = <ValueRenderer fields={field.fields} data={value ?? {}} resolveLink={resolveLink} />
    }
    return (
      <div className="value-group">
        <p className="form-group-label">{field.label}</p>
        <div className="form-group">{content}</div>
      </div>
    )
  }

  return (
    <div className="value-row">
      <span className="muted">{field.label}</span>
      <div className="value">
        <Value field={field} value={value} resolveLink={resolveLink} />
      </div>
    </div>
  )
}

/** One value, formatted for its property type. */
function Value({ field, value, resolveLink }) {
  const isEmpty = value === undefined || value === null || value === ''
  // On/off and lists always show something, even when empty
  if (isEmpty && field.type !== 'bool' && field.type !== 'list') {
    return <span className="muted">Not set</span>
  }

  switch (field.type) {
    case 'bool':
      if (value) {
        return 'Yes'
      }
      return 'No'

    case 'vector2':
    case 'vector3':
      return formatVector(field.type, value)

    case 'reference': {
      const link = resolveLink(field.targetSchema, value)
      if (!link) {
        return <span className="field-error">Linked asset “{value}” no longer exists</span>
      }
      return <Link to={link.to}>{link.label}</Link>
    }

    case 'list':
      return <ListValue field={field} value={value} resolveLink={resolveLink} />

    default:
      return String(value)
  }
}

// { x: 1, y: 2 } -> "X 1, Y 2" (a missing axis shows as 0)
function formatVector(type, value) {
  const parts = []
  for (const axis of VECTOR_AXES[type]) {
    const axisValue = value?.[axis] ?? 0
    parts.push(`${axis.toUpperCase()} ${axisValue}`)
  }
  return parts.join(', ')
}

/** A list's items, separated by commas. */
function ListValue({ field, value, resolveLink }) {
  let items = []
  if (Array.isArray(value)) {
    items = value
  }
  if (items.length === 0) {
    return <span className="muted">None</span>
  }

  // Each item is shown like a property of the list's item type
  const itemField = { ...field.itemType, key: 'item' }
  const shown = []
  for (let index = 0; index < items.length; index++) {
    let separator = ', '
    if (index === 0) {
      separator = ''
    }
    shown.push(
      // List items have no IDs of their own, so their position is the key
      <span key={index}>
        {separator}
        <Value field={itemField} value={items[index]} resolveLink={resolveLink} />
      </span>,
    )
  }
  return shown
}

export default ValueRenderer
