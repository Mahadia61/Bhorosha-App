import words from './profanity.json'

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const englishPattern = new RegExp(`\\b(${words.english.map(escape).join('|')})\\b`, 'giu')
const banglaPattern = new RegExp(`(${words.bangla.map(escape).join('|')})`, 'giu')

/** Masks configured disrespectful terms while preserving the rest of the feedback. */
export function sanitizeCommunityText(value: string) {
  return value.replace(englishPattern, match => '*'.repeat(match.length)).replace(banglaPattern, match => '*'.repeat(match.length))
}
