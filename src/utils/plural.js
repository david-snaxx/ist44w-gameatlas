// plural(1, 'problem') -> "1 problem", plural(3, 'problem') -> "3 problems"
// Irregular words take their plural form: plural(2, 'property', 'properties') -> "2 properties"
export function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`
}
