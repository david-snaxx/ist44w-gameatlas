import { edgeId } from './dialogueGraph.js'

const edge = (source, sourceHandle, target) => ({ id: edgeId(source, sourceHandle, target), source, sourceHandle, target })

// An example dialogue shown the first time GameAtlas opens. It uses the starter Entity and Item assets.
export const STARTER_DIALOGUES = [
  {
    id: 'starter-merchant-greeting',
    key: 'merchant_greeting',
    name: 'Merchant greeting',
    description: 'The Old Merchant greets the player, and gives returning customers a free potion.',
    speakerBlueprint: 'entity',
    itemBlueprint: 'item',
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 150 }, data: {} },
      {
        id: 'line_1',
        type: 'line',
        position: { x: 200, y: 80 },
        data: { speaker: 'old_merchant', text: 'Ah, a traveler! Care to see my wares?' },
      },
      {
        id: 'choice_1',
        type: 'choice',
        position: { x: 540, y: 90 },
        data: {
          options: [
            { id: 'response_1', text: 'Show me what you have.' },
            { id: 'response_2', text: 'Not today.' },
          ],
        },
      },
      { id: 'condition_1', type: 'condition', position: { x: 880, y: 0 }, data: { flag: 'met_merchant' } },
      {
        id: 'line_2',
        type: 'line',
        position: { x: 1220, y: -200 },
        data: { speaker: 'old_merchant', text: "Welcome back, friend. This one's on the house." },
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 1560, y: -200 },
        data: { action: 'giveItem', item: 'healing_potion', quantity: 1, flag: '', value: true },
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 1220, y: 120 },
        data: { action: 'setFlag', item: '', quantity: 1, flag: 'met_merchant', value: true },
      },
      {
        id: 'line_3',
        type: 'line',
        position: { x: 1560, y: 120 },
        data: { speaker: 'old_merchant', text: "First time here? Come back soon and I'll have something for you." },
      },
      {
        id: 'line_4',
        type: 'line',
        position: { x: 880, y: 380 },
        data: { speaker: 'old_merchant', text: 'Safe travels, then.' },
      },
      { id: 'end_1', type: 'end', position: { x: 1920, y: 60 }, data: {} },
    ],
    edges: [
      edge('start', 'next', 'line_1'),
      edge('line_1', 'next', 'choice_1'),
      edge('choice_1', 'option:response_1', 'condition_1'),
      edge('choice_1', 'option:response_2', 'line_4'),
      edge('condition_1', 'yes', 'line_2'),
      edge('condition_1', 'no', 'action_2'),
      edge('line_2', 'next', 'action_1'),
      edge('action_1', 'next', 'end_1'),
      edge('action_2', 'next', 'line_3'),
      edge('line_3', 'next', 'end_1'),
      edge('line_4', 'next', 'end_1'),
    ],
    createdAt: '2026-09-13T10:00:00.000Z',
    updatedAt: '2026-09-13T17:20:00.000Z',
  },
]
