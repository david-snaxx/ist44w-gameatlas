/*
 * Blueprints (schemas in saved data, the API and the database), in the saved shape that toDefinition() in
 * frontend/src/schema/blueprintDraft.js makes (PLAN.md §5.2).
 */

/** Possible {@link Blueprint.fields} types as defined in frontend/src/schema/fieldTypes.js. */
export type FieldType = | 'string' | 'text' | 'int' | 'float' | 'bool' | 'enum' | 'vector2' | 'vector3'
    | 'reference' | 'list' | 'object'

/** A property of a blueprint (a *field* in saved data). */
export type Field = | TextField | NumberField | BoolField | EnumField | VectorField | ReferenceField
    | ListField | GroupField

/** A schema definition for an {@link Asset}. This is most comparable to a type or plain object class. */
export interface Blueprint {
    /** The ID users see, unique among blueprints. Assets and links use this. */
    id: string
    /** The name displayed in the UI. */
    name: string
    /** What the blueprint is for. Left out when empty. */
    description?: string
    /** Always 'form'. Dialogues are their own thing, not a blueprint. */
    kind: 'form'
    /** Starts at 1 and goes up by one each time the blueprint changes. */
    version: number
    /** The blueprint's properties. */
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

/** A {@link Blueprint} field for a list of values of one {@link ListItemType}. */
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

/** A list's entry type: any property type except a list or a group, with that type's settings. */
export type ListItemType =
    | { type: 'string' | 'text'; maxLength?: number }
    | { type: 'int' | 'float'; min?: number; max?: number }
    | { type: 'bool' }
    | { type: 'enum'; options: string[] }
    | { type: 'vector2' | 'vector3' }
    | { type: 'reference'; targetSchema: string }
