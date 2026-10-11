import Checkbox from '../../components/form/Checkbox.jsx'
import NumberInput from '../../components/form/NumberInput.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextArea from '../../components/form/TextArea.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import { createItemType } from '../../schema/blueprintDraft.js'
import { FIELD_TYPES, LIST_ITEM_TYPE_OPTIONS } from '../../schema/fieldTypes.js'
import EnumOptionsEditor from './EnumOptionsEditor.jsx'

/**
 * The settings that depend on a property's type, e.g. min/max for numbers.
 * Also used for a list's item type (isItemType), which has no default value.
 *
 * target: the property (or item type) being edited
 * onChange(settingName, changes): changes are merged into target
 * errorFor(settingName): the message to show, if any
 * blueprintOptions: the blueprints a link can point to, for the "Links to" dropdown
 *
 * Each type's settings are their own small component below; this one just picks the right one.
 */
function TypeSettings({ target, onChange, errorFor, blueprintOptions, isItemType = false }) {
  switch (target.type) {
    case 'string':
    case 'text':
      return <TextSettings target={target} onChange={onChange} errorFor={errorFor} isItemType={isItemType} />

    case 'int':
    case 'float':
      return <NumberSettings target={target} onChange={onChange} errorFor={errorFor} isItemType={isItemType} />

    case 'bool':
      // A list of on/off values has no settings (lists have no default values)
      if (isItemType) {
        return null
      }
      return <BoolSettings target={target} onChange={onChange} />

    case 'enum':
      return <EnumSettings target={target} onChange={onChange} errorFor={errorFor} isItemType={isItemType} />

    case 'reference':
      return <ReferenceSettings target={target} onChange={onChange} errorFor={errorFor} blueprintOptions={blueprintOptions} />

    case 'list':
      return <ListSettings target={target} onChange={onChange} errorFor={errorFor} blueprintOptions={blueprintOptions} />

    case 'object':
      return (
        <p className="small muted">
          After adding this group, use “Add property to…” under it in the property list to fill it.
        </p>
      )

    default:
      return null
  }
}

// ---------- One component per type ----------

/** Short and long text: a maximum length, and a default value. */
function TextSettings({ target, onChange, errorFor, isItemType }) {
  // Long text gets a bigger box for its default value
  let DefaultInput = TextInput
  if (target.type === 'text') {
    DefaultInput = TextArea
  }

  return (
    <>
      <PropertyRow label="Maximum length" error={errorFor('maxLength')} help="Leave empty for no limit.">
        <NumberInput
          min={1}
          value={numberText(target.maxLength)}
          onChange={(event) => onChange('maxLength', { maxLength: parseNumber(event.target.value) })}
        />
      </PropertyRow>
      {!isItemType && (
        <PropertyRow label="Default value" error={errorFor('default')} help="Pre-filled on new assets.">
          <DefaultInput
            value={target.default ?? ''}
            onChange={(event) => onChange('default', { default: event.target.value })}
          />
        </PropertyRow>
      )}
    </>
  )
}

/** Whole and decimal numbers: a minimum, a maximum, and a default value. */
function NumberSettings({ target, onChange, errorFor, isItemType }) {
  return (
    <>
      <PropertyRow label="Minimum" error={errorFor('min')} help="Leave empty for no limit.">
        <NumberInput
          value={numberText(target.min)}
          onChange={(event) => onChange('min', { min: parseNumber(event.target.value) })}
        />
      </PropertyRow>
      <PropertyRow label="Maximum" error={errorFor('max')} help="Leave empty for no limit.">
        <NumberInput
          value={numberText(target.max)}
          onChange={(event) => onChange('max', { max: parseNumber(event.target.value) })}
        />
      </PropertyRow>
      {!isItemType && (
        <PropertyRow label="Default value" error={errorFor('default')} help="Pre-filled on new assets.">
          <NumberInput
            value={numberText(target.default)}
            onChange={(event) => onChange('default', { default: parseNumber(event.target.value) })}
          />
        </PropertyRow>
      )}
    </>
  )
}

/** On/off: whether it starts on. */
function BoolSettings({ target, onChange }) {
  return (
    <PropertyRow label="On by default">
      <Checkbox checked={Boolean(target.default)} onChange={(checked) => onChange('default', { default: checked })} />
    </PropertyRow>
  )
}

/** Choice list: the options, and which one is picked by default. */
function EnumSettings({ target, onChange, errorFor, isItemType }) {
  const options = target.options ?? []

  function changeOptions(nextOptions) {
    const changes = { options: nextOptions }
    // Drop a default that no longer matches any option
    if (!nextOptions.includes(target.default)) {
      changes.default = undefined
    }
    onChange('options', changes)
  }

  function changeDefault(value) {
    // "No default" is the empty choice; it's stored as no value at all
    let nextDefault = value
    if (!value) {
      nextDefault = undefined
    }
    onChange('default', { default: nextDefault })
  }

  // The default can be any option that's filled in, each listed once
  const defaultOptions = [{ value: '', label: 'No default' }]
  const listed = []
  for (const option of options) {
    if (option.trim() && !listed.includes(option)) {
      listed.push(option)
      defaultOptions.push({ value: option, label: option })
    }
  }

  return (
    <>
      <PropertyRow label="Options" required error={errorFor('options')} help="Asset forms show these in a dropdown.">
        <EnumOptionsEditor options={options} onChange={changeOptions} />
      </PropertyRow>
      {!isItemType && (
        <PropertyRow label="Default option" error={errorFor('default')}>
          <Select options={defaultOptions} value={target.default ?? ''} onChange={changeDefault} />
        </PropertyRow>
      )}
    </>
  )
}

/** Link to asset: which blueprint's assets can be picked. */
function ReferenceSettings({ target, onChange, errorFor, blueprintOptions }) {
  return (
    <PropertyRow label="Links to" required error={errorFor('targetSchema')} help="The blueprint whose assets can be picked.">
      <Select
        placeholder="Choose a blueprint…"
        options={blueprintOptions}
        value={target.targetSchema ?? ''}
        onChange={(targetSchema) => onChange('targetSchema', { targetSchema: targetSchema })}
      />
    </PropertyRow>
  )
}

/** List: the type of each item, followed by that type's own settings. */
function ListSettings({ target, onChange, errorFor, blueprintOptions }) {
  const itemType = target.itemType ?? { type: 'string' }

  function changeItemType(type) {
    onChange('itemType', { itemType: createItemType(type) })
  }

  // The item type's settings are stored inside `itemType`, and its errors are named "itemType.<setting>"
  function itemErrorFor(settingName) {
    return errorFor(`itemType.${settingName}`)
  }

  function changeItemSetting(settingName, changes) {
    const nextItemType = { ...target.itemType, ...changes }
    onChange(`itemType.${settingName}`, { itemType: nextItemType })
  }

  return (
    <>
      <PropertyRow label="Each item is a" help={FIELD_TYPES[itemType.type]?.description}>
        <Select options={LIST_ITEM_TYPE_OPTIONS} value={itemType.type} onChange={changeItemType} />
      </PropertyRow>
      <TypeSettings
        target={itemType}
        isItemType
        blueprintOptions={blueprintOptions}
        errorFor={itemErrorFor}
        onChange={changeItemSetting}
      />
    </>
  )
}

// ---------- Helpers ----------

// Number settings are stored as numbers, or undefined when empty. The input shows '' for undefined.
function numberText(value) {
  if (value === undefined) {
    return ''
  }
  return value
}

function parseNumber(text) {
  if (text === '') {
    return undefined
  }
  return Number(text)
}

export default TypeSettings
