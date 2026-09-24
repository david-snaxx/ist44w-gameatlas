import { ArrowDown, ArrowUp, CircleAlert, Copy, Plus, Trash2 } from 'lucide-react'
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
    <ul className={styles.list}>
      {fields.map((field, index) => {
        const name = field.label || 'Untitled property'
        const problemCount = Object.keys(errors[field.uid] ?? {}).length

        return (
          <li key={field.uid}>
            <div className={cx(styles.row, problemCount > 0 && styles.rowInvalid)}>
              <button type="button" className={styles.main} onClick={() => onEdit(field.uid)}>
                <span className={cx(styles.label, !field.label && styles.untitled)}>
                  {name}
                  {field.required && supportsRequired(field.type) && (
                    <>
                      <span className={styles.required} aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </>
                  )}
                </span>
                <span className={styles.key}>{field.key}</span>
                {problemCount > 0 && (
                  <span className={styles.problems}>
                    <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
                    {plural(problemCount, 'problem')}
                  </span>
                )}
              </button>
              <Badge>{describeType(field, blueprintNames)}</Badge>
              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  icon={ArrowUp}
                  aria-label={`Move ${name} up`}
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => onMove(field.uid, -1)}
                />
                <Button
                  variant="ghost"
                  icon={ArrowDown}
                  aria-label={`Move ${name} down`}
                  title="Move down"
                  disabled={index === fields.length - 1}
                  onClick={() => onMove(field.uid, 1)}
                />
                <Button
                  variant="ghost"
                  icon={Copy}
                  aria-label={`Duplicate ${name}`}
                  title="Duplicate"
                  onClick={() => onDuplicate(field.uid)}
                />
                <Button
                  variant="ghost"
                  icon={Trash2}
                  aria-label={`Remove ${name}`}
                  title="Remove"
                  onClick={() => onRemove(field.uid)}
                />
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
          </li>
        )
      })}
    </ul>
  )
}

export default PropertyList
