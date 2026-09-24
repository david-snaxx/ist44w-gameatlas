import { cx } from '../../utils/cx.js'

/**
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * icon: a Lucide icon component, e.g. icon={Save}
 * Icon-only buttons (no children) must pass aria-label and title.
 */
function Button({ variant = 'secondary', icon: Icon, children, className, ...props }) {
  return (
    <button
      type="button"
      className={cx('btn', `btn-${variant}`, !children && 'btn-icon', className)}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </button>
  )
}

export default Button
