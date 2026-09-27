import Checkbox from '../../components/form/Checkbox.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import { createField, toCamelCase } from '../../schema/blueprintDraft.js'
import { FIELD_TYPES, PROPERTY_TYPE_OPTIONS, supportsRequired } from '../../schema/fieldTypes.js'
import TypeSettings from './TypeSettings.jsx'

/**
 * The side panel's content for adding or editing one property.
 *
 * editor: { field, keyTouched, touched, showErrors } (owned by the builder page)
 * setEditor: the page's state setter for `editor`
 * errors: the property's validation errors
 */
function PropertyEditor({ editor, setEditor, errors, blueprintOptions }) {
  const field = editor.field

  // Show a setting's error once the user has touched it, or after they tried to apply
  function errorFor(settingName) {
    if (editor.showErrors || editor.touched[settingName]) {
      return errors[settingName]
    }
    return undefined
  }

  // Merges `changes` into the property (e.g. { label: 'Damage' }) and marks the setting as touched
  function change(settingName, changes) {
    setEditor(editorWithChanges(editor, settingName, changes))
  }

  function changeLabel(label) {
    const changes = { label: label }
    // The ID follows the label until the user edits the ID themselves
    if (!editor.keyTouched) {
      changes.key = toCamelCase(label)
    }
    change('label', changes)
  }

  function changeKey(key) {
    const nextEditor = editorWithChanges(editor, 'key', { key: key })
    nextEditor.keyTouched = true
    setEditor(nextEditor)
  }

  function changeType(type) {
    // Settings don't carry over between types; a group keeps its nested properties
    const nextField = createField(type, {
      uid: field.uid,
      key: field.key,
      label: field.label,
      required: field.required,
      help: field.help,
      fields: field.fields,
    })
    setEditor({ ...editor, field: nextField })
  }

  // Vectors have no settings of their own
  const hasTypeSettings = field.type !== 'vector2' && field.type !== 'vector3'

  return (
    <>
      <PropertyRow label="Label" required error={errorFor('label')} help="Shown next to the input on asset forms.">
        <TextInput
          autoFocus
          placeholder="e.g. Damage"
          value={field.label}
          onChange={(event) => changeLabel(event.target.value)}
        />
      </PropertyRow>

      <PropertyRow
        label="ID"
        required
        error={errorFor('key')}
        help="The name used in exported files. It follows the label until you change it."
      >
        <TextInput placeholder="damage" value={field.key} onChange={(event) => changeKey(event.target.value)} />
      </PropertyRow>

      <PropertyRow label="Type" help={FIELD_TYPES[field.type].description}>
        <Select options={PROPERTY_TYPE_OPTIONS} value={field.type} onChange={changeType} />
      </PropertyRow>

      {supportsRequired(field.type) && (
        <PropertyRow label="Required" help="Assets can't be saved until this has a value.">
          <Checkbox checked={field.required} onChange={(required) => change('required', { required: required })} />
        </PropertyRow>
      )}

      <PropertyRow label="Help text" help="Optional hint shown under the input.">
        <TextInput value={field.help} onChange={(event) => change('help', { help: event.target.value })} />
      </PropertyRow>

      {hasTypeSettings && (
        <>
          <h3 className="settings-heading">{FIELD_TYPES[field.type].label} settings</h3>
          <TypeSettings target={field} onChange={change} errorFor={errorFor} blueprintOptions={blueprintOptions} />
        </>
      )}
    </>
  )
}

// A copy of the editor state with `changes` merged into its property and the setting marked as touched
function editorWithChanges(editor, settingName, changes) {
  const nextField = { ...editor.field, ...changes }
  const nextTouched = { ...editor.touched, [settingName]: true }
  return { ...editor, field: nextField, touched: nextTouched }
}

export default PropertyEditor
