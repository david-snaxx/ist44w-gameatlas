/**
 * A dropdown (the browser's own <select>), used for enum and reference properties.
 * options: [{ value, label }]. onChange receives the chosen value, not the event.
 * placeholder: adds an empty first choice with this text, e.g. "Choose an asset…"
 */
function Select({ id, options, value, onChange, placeholder, disabled }) {
  return (
    <select id={id} className="input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default Select
