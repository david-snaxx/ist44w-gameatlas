import { CircleAlert } from 'lucide-react'
import { cx } from '../../utils/cx.js'

/**
 * One labelled property in a form: label on the left, input on the right.
 * layout="stacked" puts the label above the input (for narrow places like side panels and graph nodes).
 *
 * children can be a function. It receives the props the input needs to be linked to its
 * label, help text and error message:
 *   <PropertyRow id="name" label="Name" error={error}>
 *     {(inputProps) => <TextInput {...inputProps} value={name} onChange={...} />}
 *   </PropertyRow>
 */
function PropertyRow({ id, label, required, help, error, layout = 'inline', children }) {
  const messageId = error || help ? `${id}-message` : undefined
  const inputProps = {
    id,
    invalid: Boolean(error),
    required,
    'aria-describedby': messageId,
  }

  return (
    <div className={cx('prop', layout === 'stacked' && 'is-stacked')}>
      <label id={`${id}-label`} htmlFor={id} className="prop-label">
        {label}
        {required && (
          <>
            <span className="prop-required" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>
      <div className="prop-control">
        {typeof children === 'function' ? children(inputProps) : children}
        {error ? (
          <p id={messageId} className="field-error">
            <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
            {error}
          </p>
        ) : (
          help && (
            <p id={messageId} className="prop-help">
              {help}
            </p>
          )
        )}
      </div>
    </div>
  )
}

export default PropertyRow
