import { plural } from '../../utils/plural.js'

/**
 * A form's problems as a list. Clicking a problem moves focus to its input.
 * problems: [{ id, label, message }], where id is the input's element id
 * hiddenCount: problems not shown yet (the user hasn't touched those inputs or tried to save)
 * onSelect(problem): optional; replaces the default "focus the input" (e.g. to jump to a graph node)
 */
function ValidationSummary({ problems, hiddenCount, onSelect }) {
  if (problems.length === 0) {
    return hiddenCount > 0 ? (
      <p className="muted">Some properties still need values before this can be saved.</p>
    ) : (
      <p className="checks-ok">No problems</p>
    )
  }

  return (
    <div>
      <p className="checks-title">{plural(problems.length, 'problem')}</p>
      <ul className="checks-list">
        {problems.map((problem) => (
          <li key={problem.id}>
            <button
              type="button"
              className="link-button"
              onClick={() => (onSelect ? onSelect(problem) : document.getElementById(problem.id)?.focus())}
            >
              {problem.label}
            </button>
            <span className="muted">: {problem.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ValidationSummary
