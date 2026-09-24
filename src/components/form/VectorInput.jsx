import { cx } from '../../utils/cx.js'

const AXES = ['x', 'y', 'z']

/**
 * Side-by-side number boxes for vector2/vector3, like Unity's inspector.
 * value: { x, y, z? }. Empty boxes are stored as '' until a number is typed.
 */
function VectorInput({ id, dimensions = 3, value, onChange, invalid, required, disabled, ...props }) {
  return (
    <div role="group" className="vector" {...props}>
      {AXES.slice(0, dimensions).map((axis, index) => (
        <label key={axis} className={cx('vector-axis', invalid && 'is-invalid', disabled && 'is-disabled')}>
          <span className="vector-axis-label">{axis.toUpperCase()}</span>
          <input
            id={index === 0 ? id : undefined}
            type="number"
            step="any"
            className="vector-axis-input"
            value={value?.[axis] ?? ''}
            required={required}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, [axis]: event.target.value === '' ? '' : Number(event.target.value) })
            }
          />
        </label>
      ))}
    </div>
  )
}

export default VectorInput
