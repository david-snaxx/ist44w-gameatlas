/**
 * Side-by-side number boxes for vector2/vector3, like Unity's inspector.
 * axes: e.g. ['x', 'y', 'z']. value: { x, y, z }. Empty boxes are stored as '' until a number is typed.
 * id goes on the first box.
 */
function VectorInput({ id, axes, value, onChange }) {
  return (
    <div className="row">
      {axes.map((axis, index) => (
        <span key={axis} className="row">
          {axis.toUpperCase()}
          <input
            id={index === 0 ? id : undefined}
            type="number"
            step="any"
            className="input input-number"
            value={value?.[axis] ?? ''}
            onChange={(event) =>
              onChange({ ...value, [axis]: event.target.value === '' ? '' : Number(event.target.value) })
            }
          />
        </span>
      ))}
    </div>
  )
}

export default VectorInput
