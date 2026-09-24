import { cx } from '../../utils/cx.js'

// integer: whole numbers only (int), otherwise decimals are allowed (float)
function NumberInput({ integer = false, invalid, className, ...props }) {
  return (
    <input
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      step={integer ? 1 : 'any'}
      className={cx('input', 'input-number', invalid && 'is-invalid', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export default NumberInput
