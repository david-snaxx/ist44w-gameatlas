import { Plus, Upload } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import Button from '../Button/Button.jsx'
import { useToast } from '../Toast/useToast.js'

/**
 * The two buttons every section shows in the top bar: import a file, or start a new thing.
 *
 * noun: what is being made, e.g. "asset" (used in both button labels)
 * newPath: the editor route for a new one, e.g. "/dialogues/new"
 * importFile(text): parses a chosen file and returns { error } or { imported }
 *
 * On a successful import the editor opens pre-filled through navigation state
 * (STYLE-GUIDELINES §7.15); nothing is saved until the user clicks Save.
 */
function TopBarActions({ noun, newPath, importFile }) {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef(null)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // so picking the same file again still triggers a change
    if (!file) return

    const result = importFile(await file.text())
    if (result.error) {
      toast.show({ status: 'error', message: result.error })
      return
    }
    navigate(newPath, { state: { imported: result.imported, origin: 'file' } })
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleFile} />
      <Button variant="ghost" icon={Upload} onClick={() => fileInputRef.current.click()}>
        Import {noun}
      </Button>
      <Button variant="ghost" icon={Plus} onClick={() => navigate(newPath)}>
        New {noun}
      </Button>
    </>
  )
}

export default TopBarActions
