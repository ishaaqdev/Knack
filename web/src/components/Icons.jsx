/**
 * Hand-rolled 1.5px stroke icons — no icon library, no emoji.
 * Everything shares one grid (24), one stroke width, round caps and joins.
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Svg = ({ size = 20, children, ...rest }) => (
  <svg width={size} height={size} {...base} {...rest} aria-hidden="true">
    {children}
  </svg>
)

export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M3.5 10.2 12 3.8l8.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" />
    <path d="M9.5 20.5v-6h5v6" />
  </Svg>
)

export const IconQuest = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" />
  </Svg>
)

export const IconUser = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.75" />
    <path d="M4.5 20.5c.9-3.7 3.9-5.75 7.5-5.75s6.6 2.05 7.5 5.75" />
  </Svg>
)

export const IconChart = (p) => (
  <Svg {...p}>
    <path d="M4 20V9.5M10 20V4.5M16 20v-7M22 20H2" />
  </Svg>
)

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Svg>
)

export const IconArrowLeft = (p) => (
  <Svg {...p}>
    <path d="M19.5 12h-15M10.5 18l-6-6 6-6" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </Svg>
)

export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="M8.5 5.5 15 12l-6.5 6.5" />
  </Svg>
)

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 3.5V8h-4.5" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.75" />
  </Svg>
)

/* ------------------------------------------------------- track glyphs ----- */

export const IconSpeech = (p) => (
  <Svg {...p}>
    <path d="M20.5 12.8c0 3.2-3.4 5.8-7.6 5.8-.9 0-1.8-.12-2.6-.35L5 20.2l1.35-3.4C4.6 15.7 3.5 14.1 3.5 12.3c0-3.2 3.4-5.8 7.6-5.8s9.4 2.6 9.4 6.3z" />
    <path d="M9 12.2h6" />
  </Svg>
)

export const IconBranch = (p) => (
  <Svg {...p}>
    <circle cx="6.5" cy="18.5" r="2.4" />
    <circle cx="17.5" cy="12" r="2.4" />
    <circle cx="17.5" cy="5" r="2.4" />
    <path d="M6.5 16.1V8.2a2.6 2.6 0 0 1 2.6-2.6h6M6.5 12.6h6.4a2.2 2.2 0 0 0 2.2-.6" />
  </Svg>
)

export const IconSpark = (p) => (
  <Svg {...p}>
    <path d="M12 3.5c0 4 1.6 6.2 5.6 6.9-4 .7-5.6 2.9-5.6 6.9 0-4-1.6-6.2-5.6-6.9 4-.7 5.6-2.9 5.6-6.9z" />
    <path d="M18.4 16.2c0 1.9.8 2.9 2.6 3.2-1.8.3-2.6 1.3-2.6 3.2" />
  </Svg>
)

/** The streak flame — solid + glowing when lit, hollow when dormant. */
export function IconFlame({ size = 20, lit = true, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...rest} aria-hidden="true">
      <path
        d="M12.6 2.4c.4 3 2.3 3.9 4 6.2a7.3 7.3 0 0 1 1.5 4.5A6.1 6.1 0 0 1 12 19.2a6.1 6.1 0 0 1-6.1-6.1c0-2.4 1.3-4 2.5-5.4.3 1 .9 1.7 1.8 2 .3-3.2 1.2-5.4 2.4-7.3z"
        fill={lit ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {lit && (
        <path
          d="M12 15.9c-1 0-1.9-.8-1.9-1.9 0-1 .7-1.6 1.2-2.4.6.8 2.6 1.5 2.6 2.5A1.9 1.9 0 0 1 12 15.9z"
          fill="#0E0E10"
          opacity="0.45"
        />
      )}
    </svg>
  )
}

export const TRACK_ICONS = {
  'workplace-communication': IconSpeech,
  'critical-thinking': IconBranch,
  'ai-fluency': IconSpark,
}
