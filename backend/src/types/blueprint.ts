/*
 * Blueprints: the definition of an asset type (called a *schema* in saved data, the API and the database).
 * This is the saved and downloaded shape (PLAN.md §5.2), as made by toDefinition() in
 * frontend/src/schema/blueprintDraft.js. Empty settings, settings that don't apply to the type, and `required: false` are left out.
 */

/** Possible {@link Blueprint.fields} types as defined in frontend/src/schema/fieldTypes.js. */
export type FieldType = | 'string' | 'text' | 'int' | 'float' | 'bool' | 'enum' | 'vector2' | 'vector3'
    | 'reference' | 'list' | 'object'

/** A property of a blueprint (a *field* in saved data). */
export type Field = | TextField | NumberField | BoolField | EnumField | VectorField | ReferenceField
    | ListField | GroupField

/** A schema definition for an {@link Asset}. This is most comparable to a type or plain object class. */
export interface Blueprint {
    /** The ID users see: snake_case, unique among blueprints. Assets and links refer to it. */
    id: string
    /** The name displayed in the UI. */
    name: string
    /** What the blueprint is for. Left out when empty. */
    description?: string
    /** Always 'form'. Dialogues are their own thing, not a blueprint. */
    kind: 'form'
    /** The current version. The first version will always be 1 and increment by 1. */
    version: number
    /** See: {@link Field}. The list of fields for all of a blueprint's properties. */
    fields: Field[]
}

/** The base data that all fields have, regardless of {@link Field} type. */
interface FieldBase {
    /** The property's ID: starts with a letter, unique among its siblings. It's the key in an asset's `data`. */
    key: string
    /** The name displayed above or beside the input. */
    label: string
    /** Only saved when true. Bool, vector and group properties never have it. */
    required?: boolean
    /** A hint shown under the input. Left out when empty. */
    help?: string
}

/** A {@link Blueprint} field for text input. */
export interface TextField extends FieldBase {
    /** 'string' is a one-line box, 'text' a multi-line one. */
    type: 'string' | 'text'
    /** The longest the text may be. */
    maxLength?: number
    /** What a new asset starts with. */
    default?: string
}

/** A {@link Blueprint} field for numeric input. */
export interface NumberField extends FieldBase {
    /** 'int' only accepts whole numbers. */
    type: 'int' | 'float'
    /** The lowest number allowed. */
    min?: number
    /** The highest number allowed. */
    max?: number
    /** What a new asset starts with. */
    default?: number
}

/** A {@link Blueprint} field for boolean input. */
export interface BoolField extends FieldBase {
    type: 'bool'
    /** Only saved when true, since "off" is what an on/off property starts as. */
    default?: boolean
}

/** A {@link Blueprint} field for enum-restricted input. */
export interface EnumField extends FieldBase {
    type: 'enum'
    /** The choices offered, in the order they're shown. */
    options: string[]
    /** One of `options`. */
    default?: string
}

/** A {@link Blueprint} field for vector 2 or 3 input. */
export interface VectorField extends FieldBase {
    /** 'vector2' is X and Y, 'vector3' adds Z. */
    type: 'vector2' | 'vector3'
}

/** A {@link Blueprint} field that links to another {@link Asset}. */
export interface ReferenceField extends FieldBase {
    type: 'reference'
    /** The ID of the blueprint whose assets this property links to. */
    targetSchema: string
}

/**
 * A {@link Blueprint} field for a list of values.
 * {@link ListItemType} defines what type this list is.
 */
export interface ListField extends FieldBase {
    type: 'list'
    /** What one entry of the list holds. */
    itemType: ListItemType
}

/** A {@link Blueprint} field for object input. */
export interface GroupField extends FieldBase {
    type: 'object'
    /** The group's own properties. */
    fields: Field[]
}

/**
 * A list's entry type.
 * A list can't hold another list or a group.
 * Certain types have additional fields.
 */
export type ListItemType =
    | { type: 'string' | 'text'; maxLength?: number }
    | { type: 'int' | 'float'; min?: number; max?: number }
    | { type: 'bool' }
    | { type: 'enum'; options: string[] }
    | { type: 'vector2' | 'vector3' }
    | { type: 'reference'; targetSchema: string }
