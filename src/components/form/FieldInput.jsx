import { VECTOR_AXES } from '../../schema/fieldTypes.js'
import Checkbox from './Checkbox.jsx'
import ListInput from './ListInput.jsx'
import NumberInput from './NumberInput.jsx'
import Select from './Select.jsx'
import TextArea from './TextArea.jsx'
import TextInput from './TextInput.jsx'
import VectorInput from './VectorInput.jsx'

/**
 * The input for one property, chosen by its type (the field-type registry's UI half).
 *
 * path: where the value lives, e.g. "name", "stats.strength" or "tags.2". The input's id is
 *   "field-" + path, which is how the validation summary finds it to jump to it.
 * errors: every error in the form, by path (a list shows its items' errors)
 * referenceOptions: { [blueprintId]: [{ value, label, hint }] }, the assets a link can point to
 */
function FieldInput({ field, path, value, onChange, errors, referenceOptions = {} }) {
  const id = `field-${path}`

  switch (field.type) {
    case 'string':
      return <TextInput id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    case 'text':
      return <TextArea id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    case 'int':
    case 'float':
      return <NumberInput id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    case 'bool':
      return <Checkbox checked={Boolean(value)} onChange={onChange} />
    case 'enum':
      return (
        <Select
          id={id}
          placeholder="Choose an option…"
          options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
          value={value ?? ''}
          onChange={onChange}
        />
      )
    case 'vector2':
    case 'vector3':
      return <VectorInput id={id} axes={VECTOR_AXES[field.type]} value={value} onChange={onChange} />
    case 'reference': {
      const options = referenceOptions[field.targetSchema] ?? []
      return (
        <Select
          id={id}
          options={options}
          value={value ?? ''}
          onChange={onChange}
          disabled={options.length === 0}
          placeholder={options.length > 0 ? 'Choose an asset…' : 'No assets to link to yet'}
        />
      )
    }
    case 'list':
      return (
        <ListInput
          field={field}
          path={path}
          items={value}
          onChange={onChange}
          errors={errors}
          referenceOptions={referenceOptions}
        />
      )
    default:
      return null
  }
}

export default FieldInput
