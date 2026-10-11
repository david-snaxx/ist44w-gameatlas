import { ActionNode, ChoiceNode, ConditionNode, EndNode, LineNode, StartNode } from './DialogueNodes.jsx'

// Defined once, outside any component: React Flow would otherwise rebuild every node on each render
export const nodeTypes = {
  start: StartNode,
  line: LineNode,
  choice: ChoiceNode,
  condition: ConditionNode,
  action: ActionNode,
  end: EndNode,
}
