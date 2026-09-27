// plural(1, 'problem') -> "1 problem", plural(3, 'problem') -> "3 problems"
// Irregular words take their plural form: plural(2, 'property', 'properties') -> "2 properties"
export function plural(count, word, pluralWord = `${word}s`) {
  if (count === 1) {
    return `${count} ${word}`
  }
  return `${count} ${pluralWord}`
}
