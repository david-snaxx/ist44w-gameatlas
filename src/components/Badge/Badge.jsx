// tone: 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info'
function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export default Badge
