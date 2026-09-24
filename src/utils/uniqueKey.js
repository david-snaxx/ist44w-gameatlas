// Makes an ID that isn't taken yet: uniqueKey('sword_copy', ['sword_copy']) -> "sword_copy_2"
export function uniqueKey(base, takenKeys) {
  const taken = new Set(takenKeys)
  if (!taken.has(base)) return base
  let number = 2
  while (taken.has(`${base}_${number}`)) number++
  return `${base}_${number}`
}
