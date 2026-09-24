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
  return (
    <div className="prop">
      <span className="prop-label">
        {label}
        {required && ' *'}
      </span>
      <div className="prop-control">
        {children}
        {error ? <p className="field-error">{error}</p> : help && <p className="prop-help">{help}</p>}
      </div>
    </div>
  )
}

export default PropertyRow
