// Plain text + one button (passed as children). No illustrations.
function EmptyState({ message, children }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {children}
    </div>
  )
}

export default EmptyState
