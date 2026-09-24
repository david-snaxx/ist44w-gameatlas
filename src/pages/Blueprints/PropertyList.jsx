import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import { describeType, supportsRequired } from '../../schema/fieldTypes.js'
import { cx } from '../../utils/cx.js'
import { plural } from '../../utils/plural.js'
import styles from './PropertyList.module.css'

/**
 * The blueprint's properties as an editable list. Clicking a row opens it for editing.
 * Groups show their nested properties indented underneath (this component renders itself for them).
 */
function PropertyList({ fields, errors, blueprintNames, onEdit, onAdd, onMove, onDuplicate, onRemove }) {
  return (
    <div className={styles.list}>
      {fields.map((field, index) => {
        const name = field.label || 'Untitled property'
        const problemCount = Object.keys(errors[field.uid] ?? {}).length

        return (
          <div key={field.uid}>
            <div className={cx(styles.property, problemCount > 0 && styles.invalid)}>
              <div className={styles.main} onClick={() => onEdit(field.uid)}>
                <span className={cx(!field.label && 'muted')}>
                  {name}
                  {field.required && supportsRequired(field.type) && ' *'}
                </span>
                <span className={styles.key}>{field.key}</span>
                {problemCount > 0 && <span className="field-error">{plural(problemCount, 'problem')}</span>}
              </div>
              <Badge>{describeType(field, blueprintNames)}</Badge>
              <div className="row">
                <Button
                  variant="ghost"
                  icon={ArrowUp}
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => onMove(field.uid, -1)}
                />
                <Button
                  variant="ghost"
                  icon={ArrowDown}
                  title="Move down"
                  disabled={index === fields.length - 1}
                  onClick={() => onMove(field.uid, 1)}
                />
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
      })}
    </div>
  )
}

export default PropertyList
