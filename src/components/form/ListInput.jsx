import { Plus, X } from 'lucide-react'
import { defaultValue } from '../../schema/fieldTypes.js'
import Button from '../Button/Button.jsx'
import FieldInput from './FieldInput.jsx'

/** Any number of values of the list's item type, each with a remove button and its own error. */
function ListInput({ field, path, items, onChange, errors, referenceOptions }) {
  const list = Array.isArray(items) ? items : []
  const itemField = { ...field.itemType, key: 'item' }

  return (
    <div className="list-input">
      {list.map((item, index) => {
        const itemPath = `${path}.${index}`
        return (
          // Items have no stable ID, so the index is the key (fine: items can't be reordered)
          <div key={index}>
            <div className="row">
              <FieldInput
                field={itemField}
                path={itemPath}
                value={item}
                onChange={(next) => onChange(list.map((current, i) => (i === index ? next : current)))}
                referenceOptions={referenceOptions}
              />
              <Button
                variant="ghost"
                icon={X}
                title="Remove item"
                onClick={() => onChange(list.filter((_, i) => i !== index))}
              />
            </div>
            {errors[itemPath] && <p className="field-error">{errors[itemPath]}</p>}
          </div>
        )
      })}
      <Button variant="ghost" icon={Plus} onClick={() => onChange([...list, defaultValue(itemField)])}>
        Add item
      </Button>
    </div>
  )
}

export default ListInput
