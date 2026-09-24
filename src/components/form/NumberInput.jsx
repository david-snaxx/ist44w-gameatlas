// Accepts whole and decimal numbers; whether a whole number is required is checked by validation
function NumberInput(props) {
  return <input type="number" step="any" className="input input-number" {...props} />
}

export default NumberInput
