/**
 * One setting: a title and explanation on the left, its buttons (the children) on the right. Rows stacked in a
 * section get a rule between them.
 *
 *   <SettingRow title="Download a backup" text="One file with everything.">
 *     <Button …>Download backup</Button>
 *   </SettingRow>
 */
function SettingRow({ title, text, children }) {
  return (
    <div className="setting-row">
      <div>
        <h2 className="setting-row-title">{title}</h2>
        <p className="setting-row-text">{text}</p>
      </div>
      {children}
    </div>
  )
}

export default SettingRow
