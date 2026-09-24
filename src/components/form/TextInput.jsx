import { cx } from '../../utils/cx.js'

// mono: use the monospace font (for IDs like sword_of_fire)
function TextInput({ invalid, mono, className, ...props }) {
  return (
    <input
      type="text"
      className={cx('input', mono && 'input-mono', invalid && 'is-invalid', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export default TextInput
