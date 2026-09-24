// A switch for booleans. A <label htmlFor={id}> pointing at it also toggles it.
function Toggle({ checked, onChange, invalid, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-invalid={invalid || undefined}
      className="toggle"
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span className="toggle-knob" />
    </button>
  )
}

export default Toggle
