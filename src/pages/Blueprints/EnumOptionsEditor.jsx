import { Plus, X } from 'lucide-react'
import Button from '../../components/Button/Button.jsx'
import TextInput from '../../components/form/TextInput.jsx'

/** Edits the options of a choice list. */
function EnumOptionsEditor({ options, onChange }) {
  return (
    <div className="list-input">
      {options.map((option, index) => (
        // Options are plain strings that can repeat while typing, so the index is the key
        <div key={index} className="row">
          <TextInput
            placeholder="option_value"
            value={option}
            onChange={(event) => onChange(options.map((current, i) => (i === index ? event.target.value : current)))}
          />
          <Button
            variant="ghost"
            icon={X}
            title="Remove option"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <Button variant="ghost" icon={Plus} onClick={() => onChange([...options, ''])}>
        Add option
      </Button>
    </div>
  )
}

export default EnumOptionsEditor
