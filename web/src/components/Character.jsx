import { useId } from 'react'
import { cx } from '../lib/ui'

/**
 * A person, drawn.
 *
 * Every character in Knack (the five at the discussion table, the interviewer in
 * each round, your colleagues at work) is the same small piece of SVG fed a
 * different `look`. Nothing is an image file, so the whole cast works offline,
 * scales to any size without going soft, and can change expression: a face that
 * frowns when the room turns on you says more than a label that says "tense".
 *
 * Shapes are deliberately plain: round heads, thick features, a glossy badge
 * behind. The aim is a sticker you would find in a game, not a portrait, so a
 * trainee reads who someone is from their hair and the set of their brows before
 * they read a word about them.
 *
 * A look is data: { skin, hair, hairColor, brows, eyes, accessory, top, topColor }.
 * Looks never encode a gender; names and pronouns are separate fields.
 */

/* --------------------------------------------------------------- colour --- */

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))

/** Mix a hex colour towards black (amt < 0) or white (amt > 0). */
function shade(hex, amt) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  const target = amt < 0 ? 0 : 255
  const a = Math.abs(amt)
  const ch = (v) => clamp(v + (target - v) * a)
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const INK = '#1a1a1f'

/* ------------------------------------------------------- fallback looks --- */

const SKINS = ['#8d5a3b', '#a9714b', '#b9764a', '#c68a5a', '#d19a6c', '#e0ac7e']
const HAIRS = ['crop', 'side', 'wavy', 'long', 'bun', 'curly']
const HAIR_COLORS = ['#1b1a19', '#2b1f1c', '#3a2a22', '#171313']
const TOPS = ['tee', 'collar', 'hoodie', 'blazer', 'kurta']
const TOP_COLORS = ['#2e2e36', '#3a3a44', '#4a4a55', '#8a4a24', '#d8d4cc', '#ff7a35']
const ACCESSORIES = ['none', 'glasses', 'round-glasses', 'earrings', 'none', 'beard']
const BROWS = ['level', 'arched', 'thick']
const EYES = ['calm', 'round', 'bright']

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A stable look for anyone who was not given one (the trainee, a custom name). */
export function lookFromSeed(seed = 'you') {
  const h = hash(String(seed))
  // Unsigned shift: h can be above 2^31, and a signed shift would make the index
  // negative for about half of all names.
  const pick = (list, shift) => list[(h >>> shift) % list.length]
  return {
    skin: pick(SKINS, 1),
    hair: pick(HAIRS, 4),
    hairColor: pick(HAIR_COLORS, 7),
    brows: pick(BROWS, 9),
    eyes: pick(EYES, 11),
    accessory: pick(ACCESSORIES, 13),
    top: pick(TOPS, 16),
    topColor: pick(TOP_COLORS, 19),
  }
}

/* ----------------------------------------------------------------- hair --- */

function HairBack({ style, color }) {
  const dark = shade(color, -0.25)
  switch (style) {
    case 'long':
      return (
        <path
          d="M33 48 C30 26 44 16 60 16 C76 16 90 26 87 48 L91 94 C80 98 70 92 66 84 L54 84 C50 92 40 98 29 94 Z"
          fill={dark}
        />
      )
    case 'bun':
      return (
        <>
          <circle cx="60" cy="13" r="10" fill={dark} />
          <circle cx="57" cy="10.5" r="3" fill={shade(color, 0.25)} opacity="0.45" />
        </>
      )
    case 'curly':
      return (
        <g fill={dark}>
          <circle cx="37" cy="40" r="9" />
          <circle cx="47" cy="28" r="10.5" />
          <circle cx="60" cy="24" r="11.5" />
          <circle cx="73" cy="28" r="10.5" />
          <circle cx="83" cy="40" r="9" />
          <circle cx="34" cy="52" r="6.5" />
          <circle cx="86" cy="52" r="6.5" />
        </g>
      )
    default:
      return null
  }
}

function HairFront({ style, color }) {
  const hi = shade(color, 0.28)
  switch (style) {
    case 'crop':
      return (
        <>
          <path d="M35 47 C34 26 48 19 60 19 C73 19 87 27 85 47 C80 38 72 34 60 34 C48 34 40 38 35 47 Z" fill={color} />
          <path d="M45 26 C52 22 62 22 70 25" stroke={hi} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      )
    case 'side':
      return (
        <>
          <path d="M34 49 C32 27 47 18 62 19 C77 20 89 30 86 49 C83 40 76 33 66 31 C55 38 42 36 34 49 Z" fill={color} />
          <path d="M44 27 C52 21 64 21 74 26" stroke={hi} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      )
    case 'wavy':
      return (
        <>
          <path
            d="M33 54 C29 30 44 17 60 17 C76 17 91 30 87 54 C85 43 81 36 73 33 C67 38 54 38 48 33 C40 37 35 44 33 54 Z"
            fill={color}
          />
          <path d="M43 25 C51 19 66 19 75 25" stroke={hi} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      )
    case 'long':
      return (
        <>
          <path d="M35 46 C37 29 49 22 60 22 C72 22 83 29 85 46 C77 36 68 33 60 33 C52 33 43 36 35 46 Z" fill={color} />
          <path d="M44 27 C52 22 66 22 75 27" stroke={hi} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      )
    case 'bun':
      return (
        <path d="M35 47 C34 27 48 20 60 20 C73 20 87 28 85 47 C80 39 72 35 60 35 C48 35 40 39 35 47 Z" fill={color} />
      )
    case 'curly':
      return (
        <g fill={color}>
          <circle cx="47" cy="33" r="7.5" />
          <circle cx="60" cy="30" r="8.5" />
          <circle cx="73" cy="33" r="7.5" />
          <circle cx="40" cy="42" r="5" />
          <circle cx="80" cy="42" r="5" />
        </g>
      )
    default:
      return null
  }
}

/* ----------------------------------------------------------------- face --- */

function Eyes({ kind, expression }) {
  const y = 52
  const squint = expression === 'frown' ? 0.82 : expression === 'surprised' ? 1.25 : 1
  const one = (cx, flip) => {
    const hl = (dx, dy, r) => <circle cx={cx + dx} cy={y + dy} r={r} fill="#fff" />
    switch (kind) {
      case 'sharp':
        return (
          <g key={cx}>
            <ellipse cx={cx} cy={y} rx="3.6" ry={2.9 * squint} fill={INK} />
            {hl(1, -0.9, 1)}
          </g>
        )
      case 'sleepy':
        return (
          <g key={cx}>
            <ellipse cx={cx} cy={y + 0.4} rx="3.2" ry={2.4 * squint} fill={INK} />
            <path d={`M${cx - 4} ${y - 1.2} Q${cx} ${y - 3.4} ${cx + 4} ${y - 1.2}`} stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            {hl(1, -0.5, 0.9)}
          </g>
        )
      case 'bright':
        return (
          <g key={cx}>
            <ellipse cx={cx} cy={y} rx="3.5" ry={4.8 * squint} fill={INK} />
            {hl(1.2, -1.8, 1.4)}
            {hl(-1, 1.4, 0.7)}
          </g>
        )
      case 'round':
        return (
          <g key={cx}>
            <circle cx={cx} cy={y} r={4 * squint} fill={INK} />
            {hl(1.2, -1.3, 1.2)}
          </g>
        )
      default:
        return (
          <g key={cx}>
            <ellipse cx={cx} cy={y} rx="3.1" ry={4 * squint} fill={INK} />
            {hl(1, -1.4, 1.1)}
          </g>
        )
    }
  }
  return (
    <>
      {one(50, false)}
      {one(70, true)}
    </>
  )
}

function Brows({ kind, expression, color }) {
  const w = kind === 'thick' ? 3.6 : 2.4
  const common = { stroke: color, strokeWidth: w, strokeLinecap: 'round', fill: 'none' }
  const lift = expression === 'surprised' ? -3 : 0

  // A frown pulls the inner ends down; a "think" raises one side.
  if (expression === 'frown' || kind === 'angled') {
    return (
      <>
        <path d={`M43 ${43 + lift} L56 ${46.5 + lift}`} {...common} />
        <path d={`M64 ${46.5 + lift} L77 ${43 + lift}`} {...common} />
      </>
    )
  }
  if (expression === 'think') {
    return (
      <>
        <path d={`M44 ${45} Q50 ${41} 56 ${44.5}`} {...common} />
        <path d={`M64 ${42.5} Q70 ${38.5} 76 ${42}`} {...common} />
      </>
    )
  }
  if (kind === 'arched') {
    return (
      <>
        <path d={`M44 ${46 + lift} Q50 ${41 + lift} 56 ${45 + lift}`} {...common} />
        <path d={`M64 ${45 + lift} Q70 ${41 + lift} 76 ${46 + lift}`} {...common} />
      </>
    )
  }
  return (
    <>
      <path d={`M44 ${45 + lift} L56 ${45 + lift}`} {...common} />
      <path d={`M64 ${45 + lift} L76 ${45 + lift}`} {...common} />
    </>
  )
}

function Mouth({ expression, speaking }) {
  const lip = '#6b3a2a'
  if (speaking) {
    return (
      <g className="mouth-talk" style={{ transformOrigin: '60px 66px' }}>
        <path d="M53 65 Q60 77 67 65 Z" fill="#3a1a14" stroke={lip} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M56 71 Q60 74 64 71" fill="#c0603f" />
      </g>
    )
  }
  switch (expression) {
    case 'smile':
      return <path d="M52 64.5 Q60 73 68 64.5" stroke={lip} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    case 'frown':
      return <path d="M53 69.5 Q60 62.5 67 69.5" stroke={lip} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    case 'think':
      return <path d="M55 67.5 Q61 65.5 67 68.5" stroke={lip} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    case 'surprised':
      return <ellipse cx="60" cy="67.5" rx="3.2" ry="4.2" fill="#3a1a14" stroke={lip} strokeWidth="1.4" />
    default:
      return <path d="M54 66.5 Q60 68.5 66 66.5" stroke={lip} strokeWidth="2.4" fill="none" strokeLinecap="round" />
  }
}

/* ---------------------------------------------------------- accessories --- */

function Accessory({ kind, hairColor, accent }) {
  switch (kind) {
    case 'glasses':
      return (
        <g stroke={INK} strokeWidth="2" fill="rgb(255 255 255 / 0.14)">
          <rect x="41" y="45" width="17" height="13" rx="4" />
          <rect x="62" y="45" width="17" height="13" rx="4" />
          <path d="M58 51 H62" fill="none" />
          <path d="M41 50 L36 48 M79 50 L84 48" fill="none" />
        </g>
      )
    case 'round-glasses':
      return (
        <g stroke={INK} strokeWidth="2" fill="rgb(255 255 255 / 0.14)">
          <circle cx="50" cy="52" r="8" />
          <circle cx="70" cy="52" r="8" />
          <path d="M58 51 H62" fill="none" />
        </g>
      )
    case 'headphones':
      return (
        <>
          <path d="M33 54 C30 22 90 22 87 54" stroke="#2a2a30" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <rect x="26" y="48" width="9" height="17" rx="4.5" fill={shade(accent, -0.15)} stroke="#2a2a30" strokeWidth="1.5" />
          <rect x="85" y="48" width="9" height="17" rx="4.5" fill={shade(accent, -0.15)} stroke="#2a2a30" strokeWidth="1.5" />
        </>
      )
    case 'earrings':
      return (
        <>
          <circle cx="35.5" cy="63" r="2.4" fill="#ffa061" stroke="#a8481a" strokeWidth="0.8" />
          <circle cx="84.5" cy="63" r="2.4" fill="#ffa061" stroke="#a8481a" strokeWidth="0.8" />
        </>
      )
    case 'stubble':
      return (
        <g fill={hairColor} opacity="0.4">
          {[
            [46, 72], [51, 75], [56, 77], [64, 77], [69, 75], [74, 72],
            [43, 66], [77, 66], [49, 69], [71, 69], [60, 79], [54, 73], [66, 73],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.9" />
          ))}
        </g>
      )
    default:
      return null
  }
}

/** The beard goes behind the mouth, so it is drawn before the face detail. */
function Beard({ color, skin }) {
  return (
    <>
      <path
        d="M36 56 C36 82 48 88 60 88 C72 88 84 82 84 56 C81 71 72 75 60 75 C48 75 39 71 36 56 Z"
        fill={shade(color, -0.1)}
      />
      <ellipse cx="60" cy="66.5" rx="9.5" ry="5" fill={skin} />
    </>
  )
}

/* ----------------------------------------------------------------- body --- */

function Body({ top, color }) {
  const dark = shade(color, -0.22)
  const light = shade(color, 0.3)
  const shoulders = <path d="M10 124 C12 94 34 84 60 84 C86 84 108 94 110 124 Z" fill={color} />

  switch (top) {
    case 'collar':
      return (
        <>
          {shoulders}
          <path d="M50 84 L60 99 L70 84 Z" fill="#fff" />
          <path d="M50 84 L43 93 L58 100 Z" fill="#e8e6e2" />
          <path d="M70 84 L77 93 L62 100 Z" fill="#e8e6e2" />
        </>
      )
    case 'hoodie':
      return (
        <>
          {shoulders}
          <path d="M41 82 Q60 98 79 82 L82 91 Q60 108 38 91 Z" fill={dark} />
          <path d="M53 96 L52 110 M67 96 L68 110" stroke={light} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="52" cy="111" r="1.7" fill={light} />
          <circle cx="68" cy="111" r="1.7" fill={light} />
        </>
      )
    case 'blazer':
      return (
        <>
          {shoulders}
          <path d="M50 84 L60 100 L70 84 Z" fill="#fff" />
          <path d="M48 84 L57 104 L41 98 Z" fill={dark} />
          <path d="M72 84 L63 104 L79 98 Z" fill={dark} />
        </>
      )
    case 'kurta':
      return (
        <>
          {shoulders}
          <path d="M50 84 Q60 91 70 84 L70 89 Q60 96 50 89 Z" fill={light} />
          <path d="M60 92 L60 124" stroke={light} strokeWidth="2" />
          <circle cx="60" cy="100" r="1.7" fill={light} />
          <circle cx="60" cy="109" r="1.7" fill={light} />
        </>
      )
    default:
      return (
        <>
          {shoulders}
          <path d="M48 84 Q60 96 72 84 Z" fill="#c68a5a" opacity="0" />
        </>
      )
  }
}

/* ---------------------------------------------------------------- piece --- */

export function Character({
  look,
  seed,
  accent = '#ff7a35',
  expression = 'neutral',
  speaking = false,
  ring = null,
  size = 64,
  title,
  className,
}) {
  const uid = useId().replace(/:/g, '')
  const l = { ...lookFromSeed(seed ?? 'you'), ...(look ?? {}) }
  const skinDark = shade(l.skin, -0.14)
  const hairShade = l.hairColor

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? 'Character'}
      className={cx('shrink-0', className)}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`bg-${uid}`} cx="35%" cy="25%" r="85%">
          <stop offset="0%" stopColor={shade(accent, 0.45)} />
          <stop offset="55%" stopColor={accent} />
          <stop offset="100%" stopColor={shade(accent, -0.3)} />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <circle cx="60" cy="60" r="56" />
        </clipPath>
      </defs>

      {/* badge: thick lower edge first, so it reads as a pressed-out sticker */}
      <circle cx="60" cy="64" r="56" fill={shade(accent, -0.5)} />
      <circle cx="60" cy="60" r="56" fill={`url(#bg-${uid})`} />

      <g clipPath={`url(#clip-${uid})`}>
        <HairBack style={l.hair} color={hairShade} />
        <Body top={l.top} color={l.topColor} />

        {/* neck */}
        <rect x="51" y="72" width="18" height="18" rx="6" fill={skinDark} />

        {/* ears and head */}
        <circle cx="36" cy="55" r="4.8" fill={skinDark} />
        <circle cx="84" cy="55" r="4.8" fill={skinDark} />
        <ellipse cx="60" cy="52" rx="24.5" ry="27.5" fill={l.skin} />

        {l.accessory === 'beard' && <Beard color={hairShade} skin={l.skin} />}

        {/* cheeks, then the face itself */}
        <circle cx="44" cy="62" r="4.6" fill="#ff7a35" opacity="0.22" />
        <circle cx="76" cy="62" r="4.6" fill="#ff7a35" opacity="0.22" />

        <HairFront style={l.hair} color={hairShade} />
        <Brows kind={l.brows} expression={expression} color={shade(hairShade, 0.05)} />
        <Eyes kind={l.eyes} expression={expression} />
        <Accessory kind={l.accessory} hairColor={hairShade} accent={accent} />
        <Mouth expression={expression} speaking={speaking} />

        {/* gloss across the top of the badge */}
        <ellipse cx="42" cy="18" rx="30" ry="9" fill="#fff" opacity="0.16" transform="rotate(-18 42 18)" />
      </g>

      {ring && <circle cx="60" cy="60" r="58" fill="none" stroke={ring} strokeWidth="4" />}
    </svg>
  )
}

/* ---------------------------------------------------------- speaking dot --- */

/** Three bouncing dots: someone is about to say something. */
export function Typing({ color = 'currentColor', className }) {
  return (
    <span className={cx('inline-flex items-end gap-0.5', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ background: color, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  )
}
