import { Plus, X } from 'lucide-react'
import Button from '../../components/Button/Button.jsx'
import TextInput from '../../components/form/TextInput.jsx'

/** Edits the options of a choice list: one text box per option, each with a remove button. */
function EnumOptionsEditor({ options, onChange }) {
  function changeOption(index, text) {
    const nextOptions = [...options]
    nextOptions[index] = text
    onChange(nextOptions)
  }

  function removeOption(index) {
    const nextOptions = [...options]
    nextOptions.splice(index, 1) // removes 1 option at this position
    onChange(nextOptions)
  }

  function addOption() {
    onChange([...options, ''])
  }

  const rows = []
  for (let index = 0; index < options.length; index++) {
    rows.push(
      // Options are plain strings that can repeat while typing, so the index is the key
      <div key={index} className="row">
        <TextInput
          placeholder="option_value"
          value={options[index]}
          onChange={(event) => changeOption(index, event.target.value)}
        />
        <Button variant="ghost" icon={X} title="Remove option" onClick={() => removeOption(index)} />
      </div>,
    )
  }

  return (
    <div className="list-input">
      {rows}
      <Button variant="ghost" icon={Plus} onClick={addOption}>
        Add option
      </Button>
    </div>
  )
}

export default EnumOptionsEditor
