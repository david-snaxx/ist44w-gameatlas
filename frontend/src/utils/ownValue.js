/**
 * `object[key]`, but only when `key` is the object's own key; otherwise undefined. A plain `object[key]` also finds
 * what every JavaScript object inherits, so a property, blueprint or type named "toString" or "constructor" would
 * find a built-in function and look filled in or valid. Use it wherever the key comes from saved or sent data.
 */
export function ownValue(object, key) {
  if (object === null || object === undefined) {
    return undefined
  }
  if (!Object.hasOwn(object, key)) {
    return undefined
  }
  return object[key]
}
