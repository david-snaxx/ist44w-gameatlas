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
  {
    key: 'problems',
    label: 'Status',
    render: (row) =>
      row.problems > 0 ? (
        <Badge tone="warning">{plural(row.problems, 'problem')}</Badge>
      ) : (
        <Badge tone="success">Ready</Badge>
      ),
  },
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

  const context = {
    blueprintIds: blueprints.map((blueprint) => blueprint.id),
    assetKeys: Object.fromEntries(
      blueprints.map((blueprint) => [
        blueprint.id,
        assets.filter((asset) => asset.schemaId === blueprint.id).map((asset) => asset.key),
      ]),
    ),
  }

  const rows = dialogues.map((dialogue) => ({
    id: dialogue.id,
    key: dialogue.key,
    name: dialogue.name,
    lines: countNodes(dialogue.nodes, 'line'),
    choices: countNodes(dialogue.nodes, 'choice'),
    problems: validateDialogueGraph(dialogue, context).length,
    updated: dialogue.updatedAt,
  }))

  const search = query.trim().toLowerCase()
  const visibleRows = search
    ? rows.filter((row) => `${row.name} ${row.key}`.toLowerCase().includes(search))
    : rows

  const newDialogue = () => navigate('/dialogues/new')
  const newButton = (
    <Button variant="primary" icon={Plus} onClick={newDialogue}>
      New dialogue
    </Button>
  )

  return (
    <ListPage
      title="Dialogues"
      intro="Conversations between characters and the player, built as a tree of lines, player choices and actions."
      noun="dialogue"
      crumbs={[{ label: 'Dialogues' }]}
      topBarActions={
        <TopBarActions noun="dialogue" newPath="/dialogues/new" importFile={parseDialogueFile} />
      }
      actions={
        <>
          <Button
            icon={Download}
            disabled={dialogues.length === 0}
            onClick={() =>
              downloadCollection({
                toast,
                noun: 'dialogue',
                filename: 'dialogues.json',
                items: dialogues,
                problems: (dialogue) => validateDialogueGraph(dialogue, context).length,
                toExport: toDialogueExport,
              })
            }
          >
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
      onSelect={(id) => navigate(`/dialogues/${dialogues.find((dialogue) => dialogue.id === id).key}`)}
      empty={<EmptyState message="No dialogues yet.">{newButton}</EmptyState>}
    />
  )
}

export default DialogueListPage
