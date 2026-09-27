import { defaultValue } from '../../schema/fieldTypes.js'
import FieldInput from './FieldInput.jsx'
import PropertyRow from './PropertyRow.jsx'

/**
 * Builds a form from a blueprint's properties. Nothing in here knows about any particular blueprint.
 *
 * fields: the blueprint's properties (definition or draft)
 * values: { [key]: value }; missing values fall back to each property's default
 * onChange(nextValues, changedPath): called with the whole updated values object
 * errors: { [path]: message }, where a path looks like "name", "stats.strength" or "tags.2".
 *   Each input's id is "field-" + its path.
 * referenceOptions: { [blueprintId]: [{ value, label }] }, the assets a link can point to
 * pathPrefix: only used when a group renders its own properties
 */
function FormRenderer({ fields, values, onChange, errors, referenceOptions, pathPrefix = '' }) {
  return (
    <div className="form">
      {fields.map((field) => (
        // Drafts have a uid; saved definitions only have unique keys
        <FormField
          key={field.uid ?? field.key}
          field={field}
          values={values}
          onChange={onChange}
          errors={errors}
          referenceOptions={referenceOptions}
          pathPrefix={pathPrefix}
        />
      ))}
    </div>
  )
}

/** One property of the form: a labelled input, or for a group, its own indented form. */
function FormField({ field, values, onChange, errors, referenceOptions, pathPrefix }) {
  let path = field.key
  if (pathPrefix) {
    path = `${pathPrefix}.${field.key}`
  }
  const value = values[field.key]

  // Reports a new value for this property as a whole new values object.
  // changedPath is the path of what the user actually edited (deeper than `path` inside a group).
  function setValue(nextValue, changedPath = path) {
    const nextValues = { ...values, [field.key]: nextValue }
    onChange(nextValues, changedPath)
  }

  if (field.type === 'object') {
    return (
      <GroupField
        field={field}
        path={path}
        value={value}
        onChange={setValue}
        errors={errors}
        referenceOptions={referenceOptions}
      />
    )
  }

  return (
    <PropertyRow
      label={field.label || 'Untitled property'}
      required={field.required}
      help={field.help}
      error={errors[path]}
    >
      <FieldInput
        field={field}
        path={path}
        value={value ?? defaultValue(field)}
        onChange={setValue}
        errors={errors}
        referenceOptions={referenceOptions}
      />
    </PropertyRow>
  )
}

/** A group (object property): its label and help, then its own properties indented behind a line. */
function GroupField({ field, path, value, onChange, errors, referenceOptions }) {
  let content = <p className="prop-help">This group has no properties yet.</p>
  if (field.fields?.length) {
    content = (
      <FormRenderer
        fields={field.fields}
        values={value ?? {}}
        onChange={onChange}
        errors={errors}
        referenceOptions={referenceOptions}
        pathPrefix={path}
      />
    )
  }

  return (
    <div className="form-group">
      <p className="form-group-label">{field.label || 'Untitled group'}</p>
      {field.help && <p className="prop-help">{field.help}</p>}
      {content}
    </div>
  )
}

export default FormRenderer
