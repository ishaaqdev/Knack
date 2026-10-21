/**
 * The people in a group discussion, and the temperature of the room.
 *
 * Two jobs, both deterministic on purpose. Who is at the table is fixed so that
 * a trainee who runs five discussions learns the same five people and can start
 * to predict them, which is most of what a real GD preparation is. And the mood
 * is computed from the transcript rather than asked of the model, so the room
 * still has a mood when the model is unreachable and the panel is scripted.
 */

/* ------------------------------------------------------------- roster ----- */

/**
 * `look` is a drawing spec for the Character component on the client. `how` is
 * what the model is told; everything else is for the trainee to read.
 */
export const GD_PANEL = [
  {
    name: 'Rohit',
    pronouns: 'he/him',
    trait: 'Dominant',
    how: 'talks first, talks longest, interrupts to finish his own point',
    tagline: 'Opens first, closes last.',
    background: 'Final year, Mechanical, from Pune. Captained his college cricket team.',
    strengths: ['Gets the room moving', 'Never short of a point'],
    tell: 'Talks over people when he thinks he is right, which is often.',
    speaking: 'Fast and loud. Finishes other people\'s sentences for them.',
    accent: '#ff7a35',
    look: { skin: '#c68a5a', hair: 'crop', hairColor: '#1b1a19', brows: 'thick', eyes: 'sharp', accessory: 'none', top: 'collar', topColor: '#3a3a44' },
  },
  {
    name: 'Anjali',
    pronouns: 'she/her',
    trait: 'Knowledgeable',
    how: 'brings real facts and numbers, but states them flatly and does not push',
    tagline: 'Has read the report you have only heard of.',
    background: 'Final year, Computer Science, from Hyderabad. Runs the college data club.',
    strengths: ['Specific numbers', 'Calm under challenge'],
    tell: 'Gives the right fact and then stops, so it gets drowned out.',
    speaking: 'Even and precise. Rarely raises her voice or her hand.',
    accent: '#f2f0ec',
    look: { skin: '#8d5a3b', hair: 'long', hairColor: '#171313', brows: 'arched', eyes: 'bright', accessory: 'round-glasses', top: 'collar', topColor: '#2e2e36' },
  },
  {
    name: 'Vikram',
    pronouns: 'he/him',
    trait: 'Aggressive',
    how: 'challenges whatever was just said, sometimes fairly, sometimes not',
    tagline: 'Will argue the other side just to see if you can hold yours.',
    background: 'Final year, Electronics, from Chennai. Debate society, two years running.',
    strengths: ['Finds the weak step in an argument', 'Not afraid of silence'],
    tell: 'Pushes back by reflex, even on points he agrees with.',
    speaking: 'Sharp and clipped. Questions that sound like accusations.',
    accent: '#ffa061',
    look: { skin: '#d9a066', hair: 'side', hairColor: '#2c1d16', brows: 'angled', eyes: 'sharp', accessory: 'stubble', top: 'tee', topColor: '#4a4a55' },
  },
  {
    name: 'Sneha',
    pronouns: 'she/her',
    trait: 'Diplomatic',
    how: 'tries to reconcile two positions and bring quieter people in',
    tagline: 'Hears both sides and says so out loud.',
    background: 'Final year, Information Science, from Bengaluru. Student placement coordinator.',
    strengths: ['Bridges two positions', 'Brings quiet people in'],
    tell: 'Smooths things over so well that the real disagreement never gets settled.',
    speaking: 'Warm and measured. Uses people\'s names.',
    accent: '#9a9aa5',
    look: { skin: '#b9764a', hair: 'bun', hairColor: '#1d1616', brows: 'level', eyes: 'calm', accessory: 'earrings', top: 'kurta', topColor: '#8a4a24' },
  },
  {
    name: 'Imran',
    pronouns: 'he/him',
    trait: 'Quiet',
    how: 'says very little, but what he says is usually the best point so far',
    tagline: 'Speaks twice. Both times it matters.',
    background: 'Final year, Civil, from Lucknow. Open-source contributor on the side.',
    strengths: ['Finds the point nobody has made', 'Short, exact sentences'],
    tell: 'Waits for a gap that sometimes never comes.',
    speaking: 'Quiet and brief. Looks at the table before he speaks.',
    accent: '#63636e',
    look: { skin: '#c28b62', hair: 'curly', hairColor: '#1a1514', brows: 'level', eyes: 'sleepy', accessory: 'glasses', top: 'hoodie', topColor: '#d8d4cc' },
  },
]

/** What the trainee reads at the table. Drops what is only for the model. */
export const publicPanel = () =>
  GD_PANEL.map(({ how: _how, ...person }) => person)

/* --------------------------------------------------------- intensity ------ */

/**
 * How hard the panel pushes.
 *
 * The same room is a different experience for someone whose confidence is at 30
 * than for someone at 75, and a room that is too hard for the first teaches them
 * to stay quiet, which is the opposite of the point. This is the personalisation
 * a trainee can feel: the panel meets them where their attributes say they are.
 */
export function pressureFor(attributes = []) {
  const get = (k) => attributes.find((a) => a.key === k)?.value ?? 50
  const nerve = (get('confidence') + get('communication')) / 2
  if (nerve < 42) return { id: 'gentle', label: 'Gentle', why: 'Your confidence is still building, so the panel leaves you gaps.' }
  if (nerve > 66) return { id: 'tough', label: 'Tough', why: 'You are holding your own, so the panel pushes back harder.' }
  return { id: 'steady', label: 'Steady', why: 'A normal room: people interrupt, but there are gaps.' }
}

export const PRESSURE_PROMPT = {
  gentle:
    'Keep the room on the kind side. Vikram challenges the idea, never the trainee personally, and Rohit does not talk over them. Leave an obvious gap for the trainee to step into.',
  steady: 'A normal room. People interrupt now and then, but there are gaps.',
  tough:
    'Make it a hard room. Vikram pushes back on the trainee directly and Rohit tries to take the floor. Nobody hands them a gap; they have to make one.',
}

/* ------------------------------------------------------------- mood ------- */

const CLASH =
  /\b(no\b|wrong|disagree|not true|that'?s not|convenient|assum|really\?|but that|hold on|wait\b|nonsense|ridiculous|that doesn'?t|doesn'?t work|can'?t be|you'?re missing|not the point)/i
const WARM =
  /\b(agree|fair|good point|exactly|right\b|true\b|building on|that helps|fair enough|you'?re right|well said|i like that|makes sense|both)\b/i
const BRIDGE =
  /\b(can we|let'?s|what if|middle|reconcile|common ground|pull (it )?together|summari[sz]e|agreed on|in between)\b/i

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))
const wordsIn = (t) => (t.match(/\S+/g) ?? []).length

function expressionFor(text) {
  if (CLASH.test(text)) return { mood: 'Pushing back', expression: 'frown' }
  if (BRIDGE.test(text)) return { mood: 'Bridging', expression: 'smile' }
  if (WARM.test(text)) return { mood: 'Agreeing', expression: 'smile' }
  if (text.includes('?')) return { mood: 'Probing', expression: 'think' }
  return { mood: 'Making a point', expression: 'neutral' }
}

const LABELS = [
  { id: 'heated', label: 'Heated', tone: '#ff7a35' },
  { id: 'tense', label: 'Tense', tone: '#ffa061' },
  { id: 'lively', label: 'Lively', tone: '#f2f0ec' },
  { id: 'warm', label: 'Warm', tone: '#ffa061' },
  { id: 'calm', label: 'Calm', tone: '#9a9aa5' },
  { id: 'flat', label: 'Flat', tone: '#63636e' },
]
const pick = (id) => LABELS.find((l) => l.id === id)

/**
 * Reads the room from the last few turns.
 *
 * Three numbers, 0 to 100: tension (people disagreeing), warmth (people building
 * on each other) and energy (how much is being said and how fast). Those are two
 * of the axes of Russell's circumplex of affect plus a measure of cohesion, which
 * is enough to tell a room that is arguing from one that is agreeing quietly.
 */
export function roomMood({ transcript = [], panel = GD_PANEL, traineeName = null }) {
  const window = transcript.slice(-6)
  const texts = window.map((t) => t.text ?? '')

  const clash = texts.filter((t) => CLASH.test(t)).length
  const warm = texts.filter((t) => WARM.test(t)).length
  const bridge = texts.filter((t) => BRIDGE.test(t)).length
  const questions = texts.reduce((n, t) => n + (t.match(/\?/g) ?? []).length, 0)
  const avgWords = texts.length ? texts.reduce((n, t) => n + wordsIn(t), 0) / texts.length : 0

  const tension = clamp(15 + clash * 16 + questions * 4 - warm * 9 - bridge * 8)
  const warmth = clamp(35 + warm * 14 + bridge * 14 - clash * 9)
  const energy = clamp(25 + window.length * 8 + questions * 5 + (avgWords - 12))

  let id = 'calm'
  if (tension >= 66) id = 'heated'
  else if (tension >= 45 && energy >= 55) id = 'tense'
  else if (warmth >= 62) id = 'warm'
  else if (energy >= 62) id = 'lively'
  else if (energy < 38) id = 'flat'
  const label = pick(id)

  // Who is clashing: the most recent speakers whose lines read as pushback.
  const clashers = [
    ...new Set(
      window
        .filter((t) => !t.you && CLASH.test(t.text ?? ''))
        .map((t) => t.speaker)
        .reverse()
    ),
  ]

  // How long since the trainee last said anything.
  const lastYou = transcript.map((t) => !!t.you).lastIndexOf(true)
  const sinceYou = lastYou === -1 ? transcript.length : transcript.length - 1 - lastYou
  const lastThree = transcript.slice(-3).filter((t) => !t.you)
  // Only a name counts. A bare "you" in a panelist's line is almost always the
  // generic one ("define it however you like"), not a turn towards the trainee.
  const addressed =
    !!traineeName && lastThree.some((t) => new RegExp(`\\b${traineeName}\\b`, 'i').test(t.text ?? ''))

  const notes = {
    heated: clashers.length >= 2
      ? `${clashers[0]} and ${clashers[1]} are going at it. Everyone else is waiting to see who gives way.`
      : 'Voices are up. Nobody is giving an inch.',
    tense: clashers[0]
      ? `${clashers[0]} has just pushed back and nobody has picked it up yet.`
      : 'There is a disagreement on the table and it has not been settled.',
    warm: 'People are building on each other. Nobody is trying to win.',
    lively: 'Plenty being said, mostly in agreement. The pace is quick.',
    calm: 'Steady. Nobody is pressing anybody.',
    flat: 'It has gone quiet. Somebody is about to fill the gap.',
  }
  let note = notes[id]
  if (addressed) note += ' A couple of people have turned towards you.'
  else if (sinceYou >= 5 && transcript.length > 3) note += ' You have not said anything for a while and people have noticed.'

  const people = panel.map((p) => {
    const spoke = [...window].reverse().find((t) => t.speaker === p.name)
    const base = spoke
      ? expressionFor(spoke.text ?? '')
      : p.name === 'Imran'
        ? { mood: 'Thinking it over', expression: 'think' }
        : { mood: 'Listening', expression: 'neutral' }
    const waiting = transcript.length > 0 && transcript.at(-1)?.you && transcript.at(-1)?.to === p.name
    return {
      name: p.name,
      mood: waiting ? 'Waiting to answer you' : base.mood,
      expression: waiting ? 'surprised' : base.expression,
      spokeRecently: !!spoke,
    }
  })

  return {
    id,
    label: label.label,
    tone: label.tone,
    tension,
    warmth,
    energy,
    note,
    sinceYou,
    people,
  }
}
