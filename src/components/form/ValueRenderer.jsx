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
  return (
    <div>
      {fields
        .filter((field) => field.key)
        .map((field) => {
          const value = data?.[field.key]

          if (field.type === 'object') {
            return (
              <div key={field.key} className="value-group">
                <p className="form-group-label">{field.label}</p>
                <div className="form-group">
                  {field.fields?.length ? (
                    <ValueRenderer fields={field.fields} data={value ?? {}} resolveLink={resolveLink} />
                  ) : (
                    <span className="muted">No properties</span>
                  )}
                </div>
              </div>
            )
          }

          return (
            <div key={field.key} className="value-row">
              <span className="muted">{field.label}</span>
              <div className="value">
                <Value field={field} value={value} resolveLink={resolveLink} />
              </div>
            </div>
          )
        })}
    </div>
  )
}

/** One value, formatted for its property type. */
function Value({ field, value, resolveLink }) {
  const isEmpty = value === undefined || value === null || value === ''
  if (isEmpty && field.type !== 'bool' && field.type !== 'list') {
    return <span className="muted">Not set</span>
  }

  switch (field.type) {
    case 'bool':
      return value ? 'Yes' : 'No'
    case 'vector2':
    case 'vector3':
      return VECTOR_AXES[field.type].map((axis) => `${axis.toUpperCase()} ${value?.[axis] ?? 0}`).join(', ')
    case 'reference': {
      const link = resolveLink(field.targetSchema, value)
      return link ? (
        <Link to={link.to}>{link.label}</Link>
      ) : (
        <span className="field-error">Linked asset “{value}” no longer exists</span>
      )
    }
    case 'list': {
      const items = Array.isArray(value) ? value : []
      if (items.length === 0) return <span className="muted">None</span>
      // List items have no IDs of their own, so their position is the key
      return items.map((item, index) => (
        <span key={index}>
          {index > 0 && ', '}
          <Value field={{ ...field.itemType, key: 'item' }} value={item} resolveLink={resolveLink} />
        </span>
      ))
    }
    default:
      return String(value)
  }
}

export default ValueRenderer
