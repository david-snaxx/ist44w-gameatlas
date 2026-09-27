/** A small switch between a few views. options: [{ value, label }] */
function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((option) => (
        <SegmentButton key={option.value} option={option} isActive={option.value === value} onChange={onChange} />
      ))}
    </div>
  )
}

/** One choice in the switch. The chosen one is highlighted. */
function SegmentButton({ option, isActive, onChange }) {
  let className = 'seg-btn'
  if (isActive) {
    className = 'seg-btn is-active'
  }

  return (
    <button type="button" className={className} onClick={() => onChange(option.value)}>
      {option.label}
    </button>
  )
}

export default SegmentedControl
