import { Braces, Copy, EyeOff } from 'lucide-react'
import { useState } from 'react'
import Button from '../Button/Button.jsx'
import { useToast } from '../Toast/useToast.js'

/**
 * Read-only view of a value as formatted JSON.
 * It's hidden until the user asks for it; alwaysVisible skips that (e.g. a dedicated JSON tab).
 */
function JsonPreview({ value, alwaysVisible = false }) {
  const [visible, setVisible] = useState(alwaysVisible)
  const toast = useToast()
  const json = JSON.stringify(value, null, 2)

  async function handleCopy() {
    await navigator.clipboard.writeText(json)
    toast.show({ status: 'success', message: 'JSON copied' })
  }

  if (!visible) {
    // The <div> keeps the button its natural width when the parent is a column
    return (
      <div>
        <Button variant="ghost" icon={Braces} onClick={() => setVisible(true)}>
          Show JSON
        </Button>
      </div>
    )
  }

  return (
    <div className="json">
      <div className="row">
        <Button variant="ghost" icon={Copy} onClick={handleCopy}>
          Copy
        </Button>
        {!alwaysVisible && (
          <Button variant="ghost" icon={EyeOff} onClick={() => setVisible(false)}>
            Hide
          </Button>
        )}
      </div>
      <pre className="json-code">{json}</pre>
    </div>
  )
}

export default JsonPreview
