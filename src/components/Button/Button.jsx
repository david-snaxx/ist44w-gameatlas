import { cx } from '../../utils/cx.js'

/**
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * icon: a Lucide icon component, e.g. icon={Save}
 * Icon-only buttons (no children) should pass a title, which shows as a tooltip.
 */
function Button({ variant = 'secondary', icon: Icon, children, className, ...props }) {
  return (
    <button type="button" className={cx('btn', `btn-${variant}`, className)} {...props}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}

export default Button
