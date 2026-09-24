import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import Toggle from '../../components/form/Toggle.jsx'
import { createField, toCamelCase } from '../../schema/blueprintDraft.js'
import { FIELD_TYPES, PROPERTY_TYPE_OPTIONS, supportsRequired } from '../../schema/fieldTypes.js'
import TypeSettings from './TypeSettings.jsx'

/**
 * The side panel's content for adding or editing one property.
 *
 * editor: { field, keyTouched, touched, showErrors } (owned by the builder page)
 * setEditor: the page's state setter; updates use the functional form so they never read stale state
 * errors: the property's validation errors
 */
function PropertyEditor({ editor, setEditor, errors, blueprintOptions }) {
  const { field } = editor

  // Show a setting's error once the user has touched it, or after they tried to apply
  const errorFor = (name) => (editor.showErrors || editor.touched[name] ? errors[name] : undefined)

  function change(name, changes, extra = {}) {
    setEditor((current) => ({
      ...current,
      ...extra,
      field: { ...current.field, ...changes },
      touched: { ...current.touched, [name]: true },
    }))
  }

  function changeLabel(label) {
    // The ID follows the label until the user edits the ID themselves
    change('label', editor.keyTouched ? { label } : { label, key: toCamelCase(label) })
  }

  function changeType(type) {
    setEditor((current) => {
      const { uid, key, label, required, help, fields } = current.field
      // Settings don't carry over between types; a group keeps its nested properties
      const nextField = createField(type, { uid, key, label, required, help, fields })
      return { ...current, field: nextField }
    })
  }

  const hasTypeSettings = field.type !== 'vector2' && field.type !== 'vector3'

  return (
    <>
      <PropertyRow
        id="property-label"
        label="Label"
        required
        layout="stacked"
        error={errorFor('label')}
        help="Shown next to the input on asset forms."
      >
        {(inputProps) => (
          <TextInput
            {...inputProps}
            autoFocus
            placeholder="e.g. Damage"
            value={field.label}
            onChange={(event) => changeLabel(event.target.value)}
          />
        )}
      </PropertyRow>

      <PropertyRow
        id="property-key"
        label="ID"
        required
        layout="stacked"
        error={errorFor('key')}
        help="The name used in exported files. It follows the label until you change it."
      >
        {(inputProps) => (
          <TextInput
            {...inputProps}
            mono
            placeholder="damage"
            value={field.key}
            onChange={(event) => change('key', { key: event.target.value }, { keyTouched: true })}
          />
        )}
      </PropertyRow>

      <PropertyRow id="property-type" label="Type" layout="stacked" help={FIELD_TYPES[field.type].description}>
        {(inputProps) => (
          <Select {...inputProps} options={PROPERTY_TYPE_OPTIONS} value={field.type} onChange={changeType} />
        )}
      </PropertyRow>

      {supportsRequired(field.type) && (
        <PropertyRow
          id="property-required"
          label="Required"
          layout="stacked"
          help="Assets can't be saved until this has a value."
        >
          {(inputProps) => (
            <Toggle
              {...inputProps}
              checked={field.required}
              onChange={(required) => change('required', { required })}
            />
          )}
        </PropertyRow>
      )}

      <PropertyRow id="property-help" label="Help text" layout="stacked" help="Optional hint shown under the input.">
        {(inputProps) => (
          <TextInput {...inputProps} value={field.help} onChange={(event) => change('help', { help: event.target.value })} />
        )}
      </PropertyRow>

      {hasTypeSettings && (
        <>
          <h3 className="settings-heading">{FIELD_TYPES[field.type].label} settings</h3>
          <TypeSettings
            target={field}
            onChange={change}
            errorFor={errorFor}
            idPrefix="property"
            blueprintOptions={blueprintOptions}
          />
        </>
      )}
    </>
  )
}

export default PropertyEditor
