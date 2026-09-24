import { cx } from '../../utils/cx.js'

function TextArea({ invalid, className, ...props }) {
  return (
    <textarea
      rows={3}
      className={cx('input', 'textarea', invalid && 'is-invalid', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export default TextArea
