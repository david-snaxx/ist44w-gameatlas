import { cx } from '../../utils/cx.js'

/** A small switch between a few views. options: [{ value, label }] */
function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx('seg-btn', value === option.value && 'is-active')}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default SegmentedControl
