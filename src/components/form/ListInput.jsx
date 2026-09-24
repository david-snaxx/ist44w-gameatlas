import { CircleAlert, Plus, X } from 'lucide-react'
import { defaultValue } from '../../schema/fieldTypes.js'
import Button from '../Button/Button.jsx'
import FieldInput from './FieldInput.jsx'

/** Any number of values of the list's item type, each with a remove button. */
function ListInput({ field, items, onChange, inputProps, errors = {}, path, referenceOptions, blueprintNames }) {
  const list = Array.isArray(items) ? items : []
  const itemField = { ...field.itemType, key: 'item' }

  return (
    <div
      role="group"
      className="list-input"
      aria-labelledby={`${inputProps.id}-label`}
      aria-describedby={inputProps['aria-describedby']}
    >
      {list.map((item, index) => {
        const itemId = `${inputProps.id}-${index}`
        const error = errors[`${path}.${index}`]
        return (
          // Items have no stable ID, so the index is the key (fine: items can't be reordered)
          <div key={index} className="list-input-item">
            <div className="list-input-control">
              <FieldInput
                field={itemField}
                value={item}
                onChange={(next) => onChange(list.map((current, i) => (i === index ? next : current)))}
                inputProps={{
                  id: itemId,
                  invalid: Boolean(error),
                  'aria-label': `Item ${index + 1}`,
                  'aria-describedby': error ? `${itemId}-message` : undefined,
                }}
                referenceOptions={referenceOptions}
                blueprintNames={blueprintNames}
              />
              {error && (
                <p id={`${itemId}-message`} className="field-error">
                  <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              icon={X}
              aria-label={`Remove item ${index + 1}`}
              title="Remove item"
              onClick={() => onChange(list.filter((_, i) => i !== index))}
            />
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
