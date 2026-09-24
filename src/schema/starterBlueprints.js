// Example blueprints shown the first time GameAtlas opens (before anything has been saved)
export const STARTER_BLUEPRINTS = [
  {
    id: 'item',
    name: 'Item',
    description: 'Anything a player can pick up, equip or use.',
    kind: 'form',
    version: 1,
    fields: [
      { key: 'name', label: 'Name', type: 'string', required: true, maxLength: 64 },
      { key: 'description', label: 'Description', type: 'text', help: 'Shown in the inventory.' },
      {
        key: 'rarity',
        label: 'Rarity',
        type: 'enum',
        required: true,
        options: ['common', 'rare', 'epic', 'legendary'],
        default: 'common',
      },
      { key: 'damage', label: 'Damage', type: 'int', min: 0, default: 0 },
      { key: 'weight', label: 'Weight (kg)', type: 'float', min: 0 },
      { key: 'stackable', label: 'Stackable', type: 'bool' },
      { key: 'gripOffset', label: 'Grip offset', type: 'vector3' },
      { key: 'droppedBy', label: 'Dropped by', type: 'reference', targetSchema: 'entity' },
      { key: 'tags', label: 'Tags', type: 'list', itemType: { type: 'string' } },
      {
        key: 'stats',
        label: 'Stats',
        type: 'object',
        fields: [
          { key: 'strength', label: 'Strength', type: 'int', min: 0 },
          { key: 'agility', label: 'Agility', type: 'int', min: 0 },
        ],
      },
    ],
  },
  {
    id: 'entity',
    name: 'Entity',
    description: 'Characters and creatures in the world.',
    kind: 'form',
    version: 1,
    fields: [
      { key: 'name', label: 'Name', type: 'string', required: true, maxLength: 64 },
      { key: 'title', label: 'Title', type: 'string', help: 'e.g. "the Merchant"' },
      { key: 'health', label: 'Health', type: 'int', required: true, min: 1, default: 100 },
      {
        key: 'faction',
        label: 'Faction',
        type: 'enum',
        options: ['neutral', 'villagers', 'bandits', 'monsters'],
        default: 'neutral',
      },
      { key: 'hostile', label: 'Hostile', type: 'bool' },
      { key: 'portraitOffset', label: 'Portrait offset', type: 'vector2' },
    ],
  },
]
