import { defaultValue } from '../../schema/fieldTypes.js'
import FieldInput from './FieldInput.jsx'
import PropertyRow from './PropertyRow.jsx'

/**
 * Builds a form from a blueprint's properties. Nothing in here knows about any particular blueprint.
 *
 * fields: the blueprint's properties (definition or draft)
 * values: { [key]: value }; missing values fall back to each property's default
 * onChange(nextValues, changedPath): called with the whole updated values object
 * errors: { [path]: message }, where a path looks like "name", "stats.strength" or "tags.2"
 * referenceOptions: { [blueprintId]: [{ value, label, hint }] }, the assets a link can point to
 * blueprintNames: { [blueprintId]: name }, for link placeholders
 */
function FormRenderer({
  fields,
  values = {},
  onChange,
  errors = {},
  idPrefix = 'form',
  pathPrefix = '',
  referenceOptions,
  blueprintNames,
}) {
  return (
    <div className="form">
      {fields.map((field) => {
        const path = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
        const id = `${idPrefix}-${path.replaceAll('.', '-') || field.uid}`
        const value = values[field.key]
        const setValue = (next, changedPath = path) => onChange({ ...values, [field.key]: next }, changedPath)
        // Drafts have a uid; saved definitions only have unique keys
        const reactKey = field.uid ?? field.key

        if (field.type === 'object') {
          return (
            <div key={reactKey} role="group" aria-labelledby={`${id}-label`} className="form-group">
              <p id={`${id}-label`} className="form-group-label">
                {field.label || 'Untitled group'}
              </p>
              {field.help && <p className="form-group-help">{field.help}</p>}
              {field.fields?.length ? (
                <FormRenderer
                  fields={field.fields}
                  values={value ?? {}}
                  onChange={setValue}
                  errors={errors}
                  idPrefix={idPrefix}
                  pathPrefix={path}
                  referenceOptions={referenceOptions}
                  blueprintNames={blueprintNames}
                />
              ) : (
                <p className="form-group-help">This group has no properties yet.</p>
              )}
            </div>
          )
        }

        return (
          <PropertyRow
            key={reactKey}
            id={id}
            label={field.label || 'Untitled property'}
            required={field.required}
            help={field.help}
            error={errors[path]}
          >
            {(inputProps) => (
              <FieldInput
                field={field}
                value={value ?? defaultValue(field)}
                onChange={(next) => setValue(next)}
                inputProps={inputProps}
                errors={errors}
                path={path}
                referenceOptions={referenceOptions}
                blueprintNames={blueprintNames}
              />
            )}
          </PropertyRow>
        )
      })}
    </div>
  )
}

export default FormRenderer
