// Sample content for the style showcase only. Not real app data.

export const RARITY_OPTIONS = [
  { value: 'common', label: 'Common' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
]

export const ENTITY_OPTIONS = [
  { value: 'old_merchant', label: 'Old Merchant', hint: 'old_merchant' },
  { value: 'forest_troll', label: 'Forest Troll', hint: 'forest_troll' },
  { value: 'captain_mira', label: 'Captain Mira', hint: 'captain_mira' },
  { value: 'cave_bat', label: 'Cave Bat', hint: 'cave_bat' },
  { value: 'the_archivist', label: 'The Archivist', hint: 'the_archivist' },
]

// Property type labels come from the real field-type registry
export { PROPERTY_TYPE_OPTIONS } from '../../schema/fieldTypes.js'

export const SAMPLE_ASSETS = [
  {
    id: 'sword_of_fire',
    name: 'Sword of Fire',
    description: 'A blade that never cools. Sets struck enemies alight.',
    rarity: 'epic',
    damage: 12,
    weight: 3.5,
    stackable: false,
    droppedBy: 'forest_troll',
    updated: '2026-09-12',
  },
  {
    id: 'iron_shield',
    name: 'Iron Shield',
    description: 'Heavy, dented, dependable.',
    rarity: 'common',
    damage: 0,
    weight: 6,
    stackable: false,
    droppedBy: 'captain_mira',
    updated: '2026-09-10',
  },
  {
    id: 'healing_potion',
    name: 'Healing Potion',
    description: 'Restores a small amount of health.',
    rarity: 'common',
    damage: 0,
    weight: 0.25,
    stackable: true,
    droppedBy: 'old_merchant',
    updated: '2026-09-14',
  },
  {
    id: 'moonlit_bow',
    name: 'Moonlit Bow',
    description: 'Arrows glow faintly at night.',
    rarity: 'rare',
    damage: 9,
    weight: 1.8,
    stackable: false,
    droppedBy: 'the_archivist',
    updated: '2026-09-08',
  },
  {
    id: 'crown_of_ash',
    name: 'Crown of Ash',
    description: '',
    rarity: 'legendary',
    damage: 0,
    weight: 1.1,
    stackable: false,
    droppedBy: '',
    updated: '2026-09-01',
  },
  {
    id: 'rusty_dagger',
    name: 'Rusty Dagger',
    description: 'Better than nothing.',
    rarity: 'common',
    damage: 3,
    weight: 0.6,
    stackable: false,
    droppedBy: 'cave_bat',
    updated: '2026-08-29',
  },
]

// kind 'fill': a background color (sample text uses `on`). kind 'text': a text color.
export const COLOR_GROUPS = [
  {
    title: 'Surfaces',
    colors: [
      { token: '--color-bg-app', use: 'App frame, graph canvas', kind: 'fill' },
      { token: '--glass-panel-bg', use: 'Dashboard cards (translucent glass)', kind: 'fill' },
      { token: '--color-bg-panel', use: 'Graph nodes, solid card fallback', kind: 'fill' },
      { token: '--color-bg-raised', use: 'Hover rows, table headers', kind: 'fill' },
      { token: '--color-border', use: 'Section rules and dividers', kind: 'fill' },
      { token: '--color-bg-input', use: 'Filled inputs', kind: 'fill' },
      { token: '--color-bg-input-hover', use: 'Input hover', kind: 'fill' },
      { token: '--color-border-strong', use: 'Focused input border', kind: 'fill' },
    ],
  },
  {
    title: 'Text',
    colors: [
      { token: '--color-text', use: 'Primary text', kind: 'text' },
      { token: '--color-text-muted', use: 'Labels, placeholders', kind: 'text' },
      { token: '--color-text-subtle', use: 'Hints (not on inputs)', kind: 'text' },
    ],
  },
  {
    title: 'Accent',
    colors: [
      { token: '--color-accent', use: 'Primary buttons, toggles', kind: 'fill', on: '--color-on-accent' },
      { token: '--color-accent-hover', use: 'Primary hover', kind: 'fill', on: '--color-on-accent' },
      { token: '--color-accent-text', use: 'Links, focus ring, active nav', kind: 'text' },
      { token: '--color-accent-soft', use: 'Selected rows', kind: 'fill' },
    ],
  },
  {
    title: 'Status',
    colors: [
      { token: '--color-success', use: 'Success fill', kind: 'fill', on: '--color-on-accent' },
      { token: '--color-success-text', use: 'Success text/icons', kind: 'text' },
      { token: '--color-warning', use: 'Warning fill', kind: 'fill', on: '--color-on-warning' },
      { token: '--color-warning-text', use: 'Warning text/icons', kind: 'text' },
      { token: '--color-error', use: 'Error fill, danger button', kind: 'fill', on: '--color-on-accent' },
      { token: '--color-error-text', use: 'Error text, required *', kind: 'text' },
      { token: '--color-info', use: 'Info fill', kind: 'fill', on: '--color-on-accent' },
      { token: '--color-info-text', use: 'Info text/icons', kind: 'text' },
    ],
  },
]
