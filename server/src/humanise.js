/**
 * Takes the "assistant" out of model text.
 *
 * A small model asked to play a candidate in a group discussion still writes the
 * way it writes everything: tidy dashes, a connective at the start of every
 * turn, a polite opener. People do not talk like that, and a trainee who spends
 * a week practising against it learns to answer a register nobody uses.
 *
 * The prompts ask for natural speech (see VOICE in prompts.js). This is the
 * second line of defence, because prompts are a request and this is a guarantee.
 * It is deliberately small and conservative: every rule here is a swap that is
 * safe in any sentence, never a rewrite that could change a meaning.
 */

const OPENERS =
  /^(certainly|sure|absolutely|of course|great question|great point|good question|that'?s a (great|good|valid|excellent|fair) (point|question))[!,.:]\s*/i

// Stock connectives. Each maps to something a person would actually say, or to
// nothing when the sentence stands without it.
const SWAPS = [
  [/\b(Furthermore|Moreover|Additionally),\s*/g, 'Also, '],
  [/\bIn conclusion,\s*/gi, ''],
  [/\bIn summary,\s*/gi, ''],
  [/\bTo summari[sz]e,\s*/gi, ''],
  [/\bIt(?:'s| is) (?:important|worth) (?:to note|noting) that\s*/gi, ''],
  [/\bIt(?:'s| is) crucial to\b/gi, 'You have to'],
  [/\bdelve(s|d)? (?:in)?to\b/gi, 'dig$1 into'],
  [/\butili[sz]e(s|d)?\b/gi, (_m, s) => (s === 's' ? 'uses' : s === 'd' ? 'used' : 'use')],
  [/\butili[sz]ing\b/gi, 'using'],
  [/\bleverag(?:e|es|ed|ing)\b/gi, (m) => (/ing$/.test(m) ? 'using' : /ed$/.test(m) ? 'used' : /s$/.test(m) ? 'uses' : 'use')],
  [/\ba rich tapestry of\b/gi, 'a mix of'],
  [/\bin today'?s (?:fast-paced|ever-changing|digital) world,?\s*/gi, ''],
  [/\bAs an AI\b[^.]*\.\s*/gi, ''],
]

export function humanise(input) {
  let s = String(input ?? '')
  if (!s) return s

  // Markdown does not exist in speech or in a feedback note.
  s = s
    .replace(/```[a-z]*\n?|```/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)\*(\S[^*\n]*?)\*(?=\s|[.,;:!?]|$)/g, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')

  s = s.replace(OPENERS, '')
  for (const [from, to] of SWAPS) s = s.replace(from, to)

  /*
   * Dashes. A trailing one is somebody being cut off, which reads as an
   * ellipsis. A numeric range stays a hyphen. Everything else is a pause, and a
   * comma is the pause people actually write.
   */
  s = s
    .replace(/\s*[—–]\s*$/g, '...')
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s*[—–]\s*(?=[A-Z])/g, '. ')
    .replace(/\s*[—–]\s*/g, ', ')

  // Whatever the swaps removed from the front, the sentence still starts capitalised.
  s = s.replace(/^\s*([a-z])/, (_m, c) => c.toUpperCase())

  return s.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
}
