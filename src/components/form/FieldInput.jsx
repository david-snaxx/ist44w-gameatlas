import ListInput from './ListInput.jsx'
import NumberInput from './NumberInput.jsx'
import Select from './Select.jsx'
import TextArea from './TextArea.jsx'
import TextInput from './TextInput.jsx'
import Toggle from './Toggle.jsx'
import VectorInput from './VectorInput.jsx'

/**
 * The input for one property, chosen by its type (the field-type registry's UI half).
 * inputProps come from PropertyRow: id, invalid, required and aria-describedby.
 */
function FieldInput({ field, value, onChange, inputProps, errors, path, referenceOptions = {}, blueprintNames = {} }) {
  switch (field.type) {
    case 'string':
      return <TextInput {...inputProps} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    case 'text':
      return <TextArea {...inputProps} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    case 'int':
    case 'float':
      return (
        <NumberInput
          {...inputProps}
          integer={field.type === 'int'}
          min={field.min}
          max={field.max}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case 'bool':
      return <Toggle {...inputProps} checked={Boolean(value)} onChange={onChange} />
    case 'enum':
      return (
        <Select
          {...inputProps}
          placeholder="Choose an option…"
          options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
          value={value ?? ''}
          onChange={onChange}
        />
      )
    case 'vector2':
    case 'vector3':
      return (
        <VectorInput
          {...inputProps}
          // List items are labelled with aria-label instead of a visible label element
          aria-labelledby={inputProps['aria-label'] ? undefined : `${inputProps.id}-label`}
          dimensions={field.type === 'vector2' ? 2 : 3}
          value={value}
          onChange={onChange}
        />
      )
    case 'reference': {
      const options = referenceOptions[field.targetSchema] ?? []
      const target = blueprintNames[field.targetSchema] ?? 'linked'
      return (
        <Select
          {...inputProps}
          searchable
          options={options}
          value={value ?? ''}
          onChange={onChange}
          disabled={options.length === 0}
          placeholder={options.length > 0 ? `Choose ${target}…` : `No ${target} assets yet`}
        />
      )
    }
    case 'list':
      return (
        <ListInput
          field={field}
          items={value}
          onChange={onChange}
          inputProps={inputProps}
          errors={errors}
          path={path}
          referenceOptions={referenceOptions}
          blueprintNames={blueprintNames}
        />
      )
    default:
      return null
  }
}

export default FieldInput
