/*
 * Assets (documents in saved data, the API and the database) in their saved shape (PLAN.md §5.4): numbers are
 * numbers, and empty optional values are null.
 */

/** One filled-in {@link Blueprint}, e.g. the "Sword of Fire" made from the Item blueprint. */
export interface Asset {
    /** The internal UUID. Never shown to users and never exported. */
    id: string
    /** The ID users see, unique among its blueprint's assets. Links and exports use this. */
    key: string
    /** The ID of the {@link Blueprint} the asset was made from. */
    schemaId: string
    /** The {@link Blueprint}'s version when the asset was last saved. */
    schemaVersion: number
    /** See: {@link AssetData}. */
    data: AssetData
    /** ISO 8601 creation time. */
    createdAt: string
    /** Last ISO 8601 update time. */
    updatedAt: string
}

/** An asset's values, keyed by property ID: { name: "Sword of Fire", damage: 12, … }. */
export interface AssetData {
    /** The value of one property. See: {@link FieldValue}. */
    [key: string]: FieldValue
}

/**
 * One saved value. Which kind depends on the property's type:
 *   string, text      -> a string ('' when empty)
 *   int, float        -> a number, or null when empty
 *   bool              -> true or false
 *   enum, reference   -> the chosen option or the linked asset's key, or null when empty
 *   vector2, vector3  -> { x, y } or { x, y, z }
 *   list              -> an array of the item type's values
 *   object (group)    -> the group's own values, keyed by property ID
 */
export type FieldValue = string | number | boolean | null | Vector2 | Vector3 | FieldValue[] | AssetData

/** A two-axis vector. Saved as { x, y } because that's the shape Unity's JsonUtility reads a Vector2 from. */
export interface Vector2 {
    x: number
    y: number
}

/** A three-axis vector. Saved as { x, y, z } for the same reason as {@link Vector2}. */
export interface Vector3 {
    x: number
    y: number
    z: number
}

/**
 * The engine-facing asset file made by toExport(). Values stay under `data`, so a property called "id" can't clash
 * with the asset's own ID.
 */
export interface AssetExport {
    /** The {@link Asset}'s `key` (not its internal UUID). */
    id: string
    /** The {@link Blueprint}'s ID. */
    blueprint: string
    /** The {@link Blueprint}'s version the asset was saved against. */
    blueprintVersion: number
    /** See: {@link AssetData}. */
    data: AssetData
}

/** Problems with an asset's values, by path: { "stats.strength": "Must be 0 or more" }. List items use their index. */
export interface ValueErrors {
    /** The message shown under that property's input. */
    [path: string]: string
}
