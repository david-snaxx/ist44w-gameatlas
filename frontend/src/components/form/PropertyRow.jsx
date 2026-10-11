/**
 * One labelled property in a form: label on the left, input on the right. In narrow places
 * (side panels, the dialogue editor, graph nodes) the label moves above the input by itself.
 *
 *   <PropertyRow label="Name" required error={error} help="Shown on the item card.">
 *     <TextInput value={name} onChange={...} />
 *   </PropertyRow>
 *
 * The error, if there is one, replaces the help text.
 */
function PropertyRow({ label, required, help, error, children }) {
  let message = null
  if (error) {
    message = <p className="field-error">{error}</p>
  } else if (help) {
    message = <p className="prop-help">{help}</p>
  }

  let labelText = label
  if (required) {
    labelText = `${label} *`
  }

  return (
    <div className="prop">
      <span className="prop-label">{labelText}</span>
      <div className="prop-control">
        {children}
        {message}
      </div>
    </div>
  )
}

export default PropertyRow
