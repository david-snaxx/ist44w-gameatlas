import { plural } from '../../utils/plural.js'

/**
 * A form's problems as a list. Clicking a problem moves focus to its input.
 * problems: [{ id, label, message }], where id is the input's element id
 * hiddenCount: problems not shown yet (the user hasn't touched those inputs or tried to save)
 * onSelect(problem): optional; replaces the default "focus the input" (e.g. to jump to a graph node)
 */
function ValidationSummary({ problems, hiddenCount, onSelect }) {
  if (problems.length === 0) {
    if (hiddenCount > 0) {
      return <p className="muted">Some properties still need values before this can be saved.</p>
    }
    return <p className="checks-ok">No problems</p>
  }

  return (
    <div>
      <p className="checks-title">{plural(problems.length, 'problem')}</p>
      <ul className="checks-list">
        {problems.map((problem) => (
          <ProblemItem key={problem.id} problem={problem} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  )
}

/** One problem: the property's name (clickable) and what's wrong with it. */
function ProblemItem({ problem, onSelect }) {
  function handleClick() {
    if (onSelect) {
      onSelect(problem)
      return
    }
    // Otherwise put the cursor in the input that has the problem
    const input = document.getElementById(problem.id)
    if (input) {
      input.focus()
    }
  }

  return (
    <li>
      <button type="button" className="link-button" onClick={handleClick}>
        {problem.label}
      </button>
      <span className="muted">: {problem.message}</span>
    </li>
  )
}

export default ValidationSummary
