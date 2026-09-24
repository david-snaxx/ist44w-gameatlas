import NumberInput from '../../components/form/NumberInput.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import Select from '../../components/form/Select.jsx'
import TextArea from '../../components/form/TextArea.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import Toggle from '../../components/form/Toggle.jsx'
import { createItemType } from '../../schema/blueprintDraft.js'
import { FIELD_TYPES, LIST_ITEM_TYPE_OPTIONS } from '../../schema/fieldTypes.js'
import EnumOptionsEditor from './EnumOptionsEditor.jsx'

// Number settings are stored as numbers (or undefined when empty)
const numberText = (value) => (value === undefined ? '' : value)
const parseNumber = (text) => (text === '' ? undefined : Number(text))

/**
 * The settings that depend on a property's type, e.g. min/max for numbers.
 * Also used for a list's item type (isItemType), which has no default value.
 *
 * target: the property (or item type) being edited
 * onChange(settingName, changes): changes are merged into target
 * errorFor(settingName): the message to show, if any
 */
function TypeSettings({ target, onChange, errorFor, idPrefix, blueprintOptions, isItemType = false }) {
  switch (target.type) {
    case 'string':
    case 'text': {
      const DefaultInput = target.type === 'text' ? TextArea : TextInput
      return (
        <>
          <PropertyRow
            id={`${idPrefix}-max-length`}
            label="Maximum length"
            layout="stacked"
            error={errorFor('maxLength')}
            help="Leave empty for no limit."
          >
            {(inputProps) => (
              <NumberInput
                {...inputProps}
                integer
                min={1}
                value={numberText(target.maxLength)}
                onChange={(event) => onChange('maxLength', { maxLength: parseNumber(event.target.value) })}
              />
            )}
          </PropertyRow>
          {!isItemType && (
            <PropertyRow
              id={`${idPrefix}-default`}
              label="Default value"
              layout="stacked"
              error={errorFor('default')}
              help="Pre-filled on new assets."
            >
              {(inputProps) => (
                <DefaultInput
                  {...inputProps}
                  value={target.default ?? ''}
                  onChange={(event) => onChange('default', { default: event.target.value })}
                />
              )}
            </PropertyRow>
          )}
        </>
      )
    }

    case 'int':
    case 'float':
      return (
        <>
          {['min', 'max'].map((setting) => (
            <PropertyRow
              key={setting}
              id={`${idPrefix}-${setting}`}
              label={setting === 'min' ? 'Minimum' : 'Maximum'}
              layout="stacked"
              error={errorFor(setting)}
              help="Leave empty for no limit."
            >
              {(inputProps) => (
                <NumberInput
                  {...inputProps}
                  integer={target.type === 'int'}
                  value={numberText(target[setting])}
                  onChange={(event) => onChange(setting, { [setting]: parseNumber(event.target.value) })}
                />
              )}
            </PropertyRow>
          ))}
          {!isItemType && (
            <PropertyRow
              id={`${idPrefix}-default`}
              label="Default value"
              layout="stacked"
              error={errorFor('default')}
              help="Pre-filled on new assets."
            >
              {(inputProps) => (
                <NumberInput
                  {...inputProps}
                  integer={target.type === 'int'}
                  value={numberText(target.default)}
                  onChange={(event) => onChange('default', { default: parseNumber(event.target.value) })}
                />
              )}
            </PropertyRow>
          )}
        </>
      )

    case 'bool':
      if (isItemType) return null
      return (
        <PropertyRow id={`${idPrefix}-default`} label="On by default" layout="stacked">
          {(inputProps) => (
            <Toggle
              {...inputProps}
              checked={Boolean(target.default)}
              onChange={(checked) => onChange('default', { default: checked })}
            />
          )}
        </PropertyRow>
      )

    case 'enum': {
      const options = target.options ?? []
      const defaultOptions = [...new Set(options.filter((option) => option.trim()))].map((option) => ({
        value: option,
        label: option,
      }))
      return (
        <>
          <PropertyRow
            id={`${idPrefix}-options`}
            label="Options"
            required
            layout="stacked"
            error={errorFor('options')}
            help="Asset forms show these in a dropdown."
          >
            {(inputProps) => (
              <EnumOptionsEditor
                {...inputProps}
                options={options}
                onChange={(nextOptions) =>
                  onChange('options', {
                    options: nextOptions,
                    // Drop a default that no longer matches any option
                    ...(nextOptions.includes(target.default) ? {} : { default: undefined }),
                  })
                }
              />
            )}
          </PropertyRow>
          {!isItemType && (
            <PropertyRow
              id={`${idPrefix}-default`}
              label="Default option"
              layout="stacked"
              error={errorFor('default')}
            >
              {(inputProps) => (
                <Select
                  {...inputProps}
                  options={[{ value: '', label: 'No default' }, ...defaultOptions]}
                  value={target.default ?? ''}
                  onChange={(value) => onChange('default', { default: value || undefined })}
                />
              )}
            </PropertyRow>
          )}
        </>
      )
    }

    case 'reference':
      return (
        <PropertyRow
          id={`${idPrefix}-target`}
          label="Links to"
          required
          layout="stacked"
          error={errorFor('targetSchema')}
          help="The blueprint whose assets can be picked."
        >
          {(inputProps) => (
            <Select
              {...inputProps}
              searchable
              placeholder="Choose a blueprint…"
              options={blueprintOptions}
              value={target.targetSchema ?? ''}
              onChange={(targetSchema) => onChange('targetSchema', { targetSchema })}
            />
          )}
        </PropertyRow>
      )

    case 'list':
      return (
        <>
          <PropertyRow
            id={`${idPrefix}-item-type`}
            label="Each item is a"
            layout="stacked"
            help={FIELD_TYPES[target.itemType?.type]?.description}
          >
            {(inputProps) => (
              <Select
                {...inputProps}
                options={LIST_ITEM_TYPE_OPTIONS}
                value={target.itemType?.type ?? 'string'}
                onChange={(type) => onChange('itemType', { itemType: createItemType(type) })}
              />
            )}
          </PropertyRow>
          <TypeSettings
            target={target.itemType ?? { type: 'string' }}
            isItemType
            idPrefix={`${idPrefix}-item`}
            blueprintOptions={blueprintOptions}
            errorFor={(setting) => errorFor(`itemType.${setting}`)}
            onChange={(setting, changes) =>
              onChange(`itemType.${setting}`, { itemType: { ...target.itemType, ...changes } })
            }
          />
        </>
      )

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

export default TypeSettings
