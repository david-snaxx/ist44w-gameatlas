// A checkbox for yes/no values. onChange receives true or false, not the event.
function Checkbox({ checked, onChange }) {
  return (
    <input type="checkbox" className="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  )
}

export default Checkbox
