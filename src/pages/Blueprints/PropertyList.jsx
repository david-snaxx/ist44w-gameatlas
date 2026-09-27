import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import { describeType, supportsRequired } from '../../schema/fieldTypes.js'
import { plural } from '../../utils/plural.js'
import styles from './PropertyList.module.css'

/**
 * The blueprint's properties as an editable list. Clicking a row opens it for editing.
 * Groups show their nested properties indented underneath (PropertyItem renders a PropertyList for them).
 *
 * errors: validateBlueprint's result, where each property's errors are stored under its uid
 * onEdit(uid), onAdd(parentUid), onMove(uid, -1 or +1), onDuplicate(uid), onRemove(uid)
 */
function PropertyList({ fields, errors, blueprintNames, onEdit, onAdd, onMove, onDuplicate, onRemove }) {
  const items = []
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index]
    items.push(
      <PropertyItem
        key={field.uid}
        field={field}
        isFirst={index === 0}
        isLast={index === fields.length - 1}
        errors={errors}
        blueprintNames={blueprintNames}
        onEdit={onEdit}
        onAdd={onAdd}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />,
    )
  }
  return <div className={styles.list}>{items}</div>
}

/** One property's row, and for a group, its own properties underneath. */
function PropertyItem({ field, isFirst, isLast, errors, blueprintNames, onEdit, onAdd, onMove, onDuplicate, onRemove }) {
  const name = field.label || 'Untitled property'
  const problemCount = Object.keys(errors[field.uid] ?? {}).length

  let rowClass = styles.property
  if (problemCount > 0) {
    rowClass = `${styles.property} ${styles.invalid}`
  }

  let labelClass = ''
  if (!field.label) {
    labelClass = 'muted'
  }

  let labelText = name
  if (field.required && supportsRequired(field.type)) {
    labelText = `${name} *`
  }

  return (
    <div>
      <div className={rowClass}>
        <div className={styles.main} onClick={() => onEdit(field.uid)}>
          <span className={labelClass}>{labelText}</span>
          <span className={styles.key}>{field.key}</span>
          {problemCount > 0 && <span className="field-error">{plural(problemCount, 'problem')}</span>}
        </div>
        <Badge>{describeType(field, blueprintNames)}</Badge>
        <div className="row">
          <Button variant="ghost" icon={ArrowUp} title="Move up" disabled={isFirst} onClick={() => onMove(field.uid, -1)} />
          <Button variant="ghost" icon={ArrowDown} title="Move down" disabled={isLast} onClick={() => onMove(field.uid, 1)} />
          <Button variant="ghost" icon={Copy} title="Duplicate" onClick={() => onDuplicate(field.uid)} />
          <Button variant="ghost" icon={Trash2} title="Remove" onClick={() => onRemove(field.uid)} />
        </div>
      </div>

      {field.type === 'object' && (
        <div className={styles.children}>
          {field.fields.length > 0 && (
            <PropertyList
              fields={field.fields}
              errors={errors}
              blueprintNames={blueprintNames}
              onEdit={onEdit}
              onAdd={onAdd}
              onMove={onMove}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
            />
          )}
          <Button variant="ghost" icon={Plus} onClick={() => onAdd(field.uid)}>
            Add property to {name}
          </Button>
        </div>
      )}
    </div>
  )
}

export default PropertyList
