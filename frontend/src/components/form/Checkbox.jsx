// A checkbox for yes/no values. onChange receives true or false, not the event.
function Checkbox({ checked, onChange }) {
  function handleChange(event) {
    onChange(event.target.checked)
  }

  return <input type="checkbox" className="checkbox" checked={checked} onChange={handleChange} />
}

export default Checkbox
