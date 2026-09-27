/**
 * A short explanation above a form: why this editor is pre-filled, or what's out of date.
 * tone: 'info' (default) or 'warning'. Anything richer than a sentence (a list, a link)
 * can be passed as children.
 */
function Notice({ tone = 'info', children }) {
  let className = 'notice'
  if (tone === 'warning') {
    className = 'notice notice-warning'
  }
  return <div className={className}>{children}</div>
}

/**
 * Why an editor opened already filled in (STYLE-GUIDELINES §7.15). `extra` adds a
 * sentence that only applies to one kind of thing, e.g. that a blueprint's assets
 * aren't copied.
 */
export function ImportNotice({ isDuplicate, originName, extra = '' }) {
  let message = 'Imported from a file. Review it, then save.'
  if (isDuplicate) {
    message = `Copy of “${originName}”. Change what you need, then save.${extra}`
  }
  return <Notice>{message}</Notice>
}

export default Notice
