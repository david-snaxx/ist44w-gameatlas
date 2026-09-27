/**
 * Side-by-side number boxes for vector2/vector3, like Unity's inspector.
 * axes: e.g. ['x', 'y', 'z']. value: { x, y, z }. Empty boxes are stored as '' until a number is typed.
 * id goes on the first box.
 */
function VectorInput({ id, axes, value, onChange }) {
  function changeAxis(axis, text) {
    // A copy of the whole vector with this one axis replaced
    const nextValue = { ...value }
    if (text === '') {
      nextValue[axis] = ''
    } else {
      nextValue[axis] = Number(text)
    }
    onChange(nextValue)
  }

  const axisInputs = []
  for (let index = 0; index < axes.length; index++) {
    const axis = axes[index]
    // Only the first box gets the id (it's what the problem list jumps to)
    let axisId = undefined
    if (index === 0) {
      axisId = id
    }
    const axisValue = value?.[axis] ?? ''
    axisInputs.push(<AxisInput key={axis} id={axisId} axis={axis} value={axisValue} onChange={changeAxis} />)
  }

  return <div className="row">{axisInputs}</div>
}

/** One axis: its letter and a number box. */
function AxisInput({ id, axis, value, onChange }) {
  function handleChange(event) {
    onChange(axis, event.target.value)
  }

  return (
    <span className="row">
      {axis.toUpperCase()}
      <input id={id} type="number" step="any" className="input input-number" value={value} onChange={handleChange} />
    </span>
  )
}

export default VectorInput
