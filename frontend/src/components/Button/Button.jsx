/**
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * icon: a Lucide icon component, e.g. icon={Save}
 * className: an extra class, e.g. "push-right"
 * Any other prop (onClick, disabled, title, …) is passed on to the <button>.
 * Icon-only buttons (no children) should pass a title, which shows as a tooltip.
 */
function Button({ variant = 'secondary', icon, children, className, ...buttonProps }) {
  let classes = `btn btn-${variant}`
  if (className) {
    classes = `${classes} ${className}`
  }

  // A component name in JSX must start with a capital letter, so copy the icon into one
  const Icon = icon

  // {...buttonProps} passes every remaining prop straight on to the <button>
  return (
    <button type="button" className={classes} {...buttonProps}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}

export default Button
