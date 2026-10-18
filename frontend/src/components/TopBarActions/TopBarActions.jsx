import { Plus, Upload } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import Button from '../Button/Button.jsx'
import { useToast } from '../Toast/useToast.js'

/**
 * The top bar's Import and New buttons. An import opens the editor pre-filled (STYLE-GUIDELINES §7.15).
 * noun: what is being made, e.g. "asset" (used in both button labels)
 * newPath: the editor route for a new one, e.g. "/dialogues/new"
 * importFile(text): parses a chosen file and returns { error } or { imported }
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
