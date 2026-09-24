import { CircleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { VECTOR_AXES } from '../../schema/fieldTypes.js'
import Badge from '../Badge/Badge.jsx'

/**
 * Shows saved values read-only, laid out by the blueprint's properties: the viewing counterpart of FormRenderer.
 *
 * fields: the blueprint's properties
 * data: the asset's saved data (typed values: numbers are numbers)
 * resolveLink(blueprintId, assetKey): { label, to } for a linked asset, or null if it no longer exists
 */
function ValueRenderer({ fields, data, resolveLink }) {
  return (
    <dl className="values">
      {fields
        .filter((field) => field.key)
        .map((field) => {
          const value = data?.[field.key]

          if (field.type === 'object') {
            return (
              <div key={field.key} className="value-group">
                <dt className="value-group-label">{field.label}</dt>
                <dd className="value-group-body">
                  {field.fields?.length ? (
                    <ValueRenderer fields={field.fields} data={value ?? {}} resolveLink={resolveLink} />
                  ) : (
                    <span className="value-empty">No properties</span>
                  )}
                </dd>
              </div>
            )
          }

          return (
            <div key={field.key} className="value-row">
              <dt className="value-label">{field.label}</dt>
              <dd className="value">
                <Value field={field} value={value} resolveLink={resolveLink} />
              </dd>
            </div>
          )
        })}
    </dl>
  )
}

/** One value, formatted for its property type. */
function Value({ field, value, resolveLink }) {
  const isEmpty = value === undefined || value === null || value === ''
  if (isEmpty && field.type !== 'bool' && field.type !== 'list') {
    return <span className="value-empty">Not set</span>
  }

  switch (field.type) {
    case 'string':
      return <span>{value}</span>
    case 'text':
      return <p className="value-text">{value}</p>
    case 'int':
    case 'float':
      return <span className="mono">{value}</span>
    case 'bool':
      return <span>{value ? 'Yes' : 'No'}</span>
    case 'enum':
      return <Badge>{value}</Badge>
    case 'vector2':
    case 'vector3':
      return (
        <span className="chips">
          {VECTOR_AXES[field.type].map((axis) => (
            <span key={axis} className="chip mono">
              <span className="mono-xs">{axis.toUpperCase()}</span>
              {value?.[axis] ?? 0}
            </span>
          ))}
        </span>
      )
    case 'reference': {
      const link = resolveLink(field.targetSchema, value)
      return link ? (
        <Link to={link.to} className="value-link">
          {link.label}
          <span className="mono-xs">{value}</span>
        </Link>
      ) : (
        <span className="value-missing">
          <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
          Linked asset no longer exists <span className="mono">{value}</span>
        </span>
      )
    }
    case 'list': {
      const items = Array.isArray(value) ? value : []
      if (items.length === 0) return <span className="value-empty">None</span>
      return (
        <ul className="chips">
          {items.map((item, index) => (
            // List items have no IDs of their own, so their position is the key
            <li key={index} className="chip">
              <Value field={{ ...field.itemType, key: 'item' }} value={item} resolveLink={resolveLink} />
            </li>
          ))}
        </ul>
      )
    }
    default:
      return <span className="mono">{JSON.stringify(value)}</span>
  }
}

export default ValueRenderer
