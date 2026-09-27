import { Plus, X } from 'lucide-react'
import { defaultValue } from '../../schema/fieldTypes.js'
import Button from '../Button/Button.jsx'
import FieldInput from './FieldInput.jsx'

/** Any number of values of the list's item type, each with a remove button and its own error. */
function ListInput({ field, path, items, onChange, errors, referenceOptions }) {
  let list = []
  if (Array.isArray(items)) {
    list = items
  }
  // Items are edited like a property of the list's item type
  const itemField = { ...field.itemType, key: 'item' }

  function changeItem(index, nextItem) {
    const nextList = [...list]
    nextList[index] = nextItem
    onChange(nextList)
  }

  function removeItem(index) {
    const nextList = [...list]
    nextList.splice(index, 1) // removes 1 item at this position
    onChange(nextList)
  }

  function addItem() {
    onChange([...list, defaultValue(itemField)])
  }

  const rows = []
  for (let index = 0; index < list.length; index++) {
    rows.push(
      // Items have no stable ID, so the index is the key (fine: items can't be reordered)
      <ListItem
        key={index}
        index={index}
        itemField={itemField}
        path={`${path}.${index}`}
        value={list[index]}
        errors={errors}
        referenceOptions={referenceOptions}
        onChange={changeItem}
        onRemove={removeItem}
      />,
    )
  }

  return (
    <div className="list-input">
      {rows}
      <Button variant="ghost" icon={Plus} onClick={addItem}>
        Add item
      </Button>
    </div>
  )
}

/** One item: its input and a remove button, with the item's error (if any) underneath. */
function ListItem({ index, itemField, path, value, errors, referenceOptions, onChange, onRemove }) {
  const error = errors[path]

  function handleChange(nextValue) {
    onChange(index, nextValue)
  }

  return (
    <div>
      <div className="row">
        <FieldInput
          field={itemField}
          path={path}
          value={value}
          onChange={handleChange}
          referenceOptions={referenceOptions}
        />
        <Button variant="ghost" icon={X} title="Remove item" onClick={() => onRemove(index)} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

export default ListInput
