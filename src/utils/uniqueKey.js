// Makes an ID that isn't taken yet: uniqueKey('sword_copy', ['sword_copy']) -> "sword_copy_2"
export function uniqueKey(base, takenKeys) {
  if (!takenKeys.includes(base)) {
    return base
  }

  let number = 2
  while (takenKeys.includes(`${base}_${number}`)) {
    number++
  }
  return `${base}_${number}`
}
