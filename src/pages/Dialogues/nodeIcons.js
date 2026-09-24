import { Flag, MessageSquare, Play, Split, Square, Zap } from 'lucide-react'

// One Lucide icon per dialogue node type (used on nodes, the toolbar and the "Add next step" menu)
export const NODE_ICONS = {
  start: Play,
  line: MessageSquare,
  choice: Split,
  condition: Flag,
  action: Zap,
  end: Square,
}
