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
 * referenceOptions: { [blueprintId]: [{ value, label, hint }] }, the assets a link can point to
 * pathPrefix: only used when a group renders its own properties
 */
function FormRenderer({ fields, values, onChange, errors, referenceOptions, pathPrefix = '' }) {
  return (
    <div className="form">
      {fields.map((field) => {
        const path = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
        const value = values[field.key]
        const setValue = (next, changedPath = path) => onChange({ ...values, [field.key]: next }, changedPath)
        // Drafts have a uid; saved definitions only have unique keys
        const reactKey = field.uid ?? field.key

        if (field.type === 'object') {
          return (
            <div key={reactKey} className="form-group">
              <p className="form-group-label">{field.label || 'Untitled group'}</p>
              {field.help && <p className="prop-help">{field.help}</p>}
              {field.fields?.length ? (
                <FormRenderer
                  fields={field.fields}
                  values={value ?? {}}
                  onChange={setValue}
                  errors={errors}
                  referenceOptions={referenceOptions}
                  pathPrefix={path}
                />
              ) : (
                <p className="prop-help">This group has no properties yet.</p>
              )}
            </div>
          )
        }

        return (
          <PropertyRow
            key={reactKey}
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
      })}
    </div>
  )
}

export default FormRenderer
