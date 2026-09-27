import { Download, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Badge from '../../components/Badge/Badge.jsx'
import Button from '../../components/Button/Button.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ListPage from '../../components/ListPage/ListPage.jsx'
import TopBarActions from '../../components/TopBarActions/TopBarActions.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import {
  countNodes,
  dialogueCheckContext,
  parseDialogueFile,
  toDialogueExport,
  validateDialogueGraph,
} from '../../data/dialogueGraph.js'
import { useAssets } from '../../data/useAssets.js'
import { useDialogues } from '../../data/useDialogues.js'
import { useBlueprints } from '../../schema/useBlueprints.js'
import { downloadCollection } from '../../utils/downloadJson.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'key', label: 'ID' },
  { key: 'lines', label: 'Lines' },
  { key: 'choices', label: 'Choices' },
  { key: 'problems', label: 'Status', render: (row) => <StatusBadge problems={row.problems} /> },
  { key: 'updated', label: 'Updated', render: (row) => formatDateTime(row.updated) },
]

/** Every dialogue in a table (/dialogues). */
function DialogueListPage() {
  const dialogues = useDialogues()
  const blueprints = useBlueprints()
  const assets = useAssets()
  const navigate = useNavigate()
  const toast = useToast()
  const [query, setQuery] = useState('')

  const context = dialogueCheckContext(blueprints, assets)

  const rows = []
  for (const dialogue of dialogues) {
    rows.push({
      id: dialogue.id,
      key: dialogue.key,
      name: dialogue.name,
      lines: countNodes(dialogue.nodes, 'line'),
      choices: countNodes(dialogue.nodes, 'choice'),
      problems: validateDialogueGraph(dialogue, context).length,
      updated: dialogue.updatedAt,
    })
  }

  // The rows whose name or ID contains the search text
  const search = query.trim().toLowerCase()
  let visibleRows = rows
  if (search) {
    visibleRows = rows.filter((row) => `${row.name} ${row.key}`.toLowerCase().includes(search))
  }

  function handleDownload() {
    downloadCollection({
      toast: toast,
      noun: 'dialogue',
      filename: 'dialogues.json',
      items: dialogues,
      problems: (dialogue) => validateDialogueGraph(dialogue, context).length,
      toExport: toDialogueExport,
    })
  }

  function openDialogue(id) {
    const dialogue = dialogues.find((candidate) => candidate.id === id)
    navigate(`/dialogues/${dialogue.key}`)
  }

  // The same button appears in the header and in the empty state
  const newButton = (
    <Button variant="primary" icon={Plus} onClick={() => navigate('/dialogues/new')}>
      New dialogue
    </Button>
  )

  return (
    <ListPage
      title="Dialogues"
      intro="Conversations between characters and the player, built as a tree of lines, player choices and actions."
      noun="dialogue"
      crumbs={[{ label: 'Dialogues' }]}
      topBarActions={<TopBarActions noun="dialogue" newPath="/dialogues/new" importFile={parseDialogueFile} />}
      actions={
        <>
          <Button icon={Download} disabled={dialogues.length === 0} onClick={handleDownload}>
            Download all
          </Button>
          {newButton}
        </>
      }
      search={query}
      onSearch={setQuery}
      columns={COLUMNS}
      rows={visibleRows}
      total={rows.length}
      onSelect={openDialogue}
      empty={<EmptyState message="No dialogues yet.">{newButton}</EmptyState>}
    />
  )
}

/** The Status cell: how many problems the dialogue has, or that it's ready. */
function StatusBadge({ problems }) {
  if (problems > 0) {
    return <Badge tone="warning">{plural(problems, 'problem')}</Badge>
  }
  return <Badge tone="success">Ready</Badge>
}

export default DialogueListPage
