import { Plus, X } from 'lucide-react'
import Button from '../../components/Button/Button.jsx'
import TextInput from '../../components/form/TextInput.jsx'

/** Edits the options of a choice list. The label (via `id`) points at the first option. */
function EnumOptionsEditor({ id, invalid, options, onChange, 'aria-describedby': describedBy }) {
  return (
    <div className="option-list">
      {options.map((option, index) => (
        // Options are plain strings that can repeat while typing, so the index is the key
        <div key={index} className="option-row">
          <TextInput
            id={index === 0 ? id : undefined}
            mono
            aria-label={`Option ${index + 1}`}
            aria-describedby={describedBy}
            invalid={invalid}
            placeholder="option_value"
            value={option}
            onChange={(event) => onChange(options.map((current, i) => (i === index ? event.target.value : current)))}
          />
          <Button
            variant="ghost"
            icon={X}
            aria-label={`Remove option ${index + 1}`}
            title="Remove option"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <Button
        variant="ghost"
        icon={Plus}
        id={options.length === 0 ? id : undefined}
        onClick={() => onChange([...options, ''])}
      >
        Add option
      </Button>
    </div>
  )
}

export default EnumOptionsEditor
