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

/** GitHub mark, redrawn at our stroke weight rather than dropped in as a logo. */
export const IconGithub = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest} aria-hidden="true">
    <path d="M12 2.2a9.8 9.8 0 0 0-3.1 19.1c.49.09.67-.21.67-.47v-1.8c-2.73.59-3.3-1.16-3.3-1.16-.45-1.13-1.09-1.43-1.09-1.43-.89-.61.07-.6.07-.6.98.07 1.5 1.01 1.5 1.01.88 1.5 2.3 1.07 2.86.82.09-.64.34-1.07.62-1.32-2.18-.25-4.47-1.09-4.47-4.85 0-1.07.38-1.95 1.01-2.63-.1-.25-.44-1.25.1-2.6 0 0 .83-.27 2.7 1.01a9.4 9.4 0 0 1 4.92 0c1.87-1.28 2.7-1.01 2.7-1.01.54 1.35.2 2.35.1 2.6.63.68 1.01 1.56 1.01 2.63 0 3.77-2.3 4.6-4.49 4.84.35.31.67.91.67 1.84v2.73c0 .26.18.57.68.47A9.8 9.8 0 0 0 12 2.2z" />
  </svg>
)

export const TRACK_ICONS = {
  'workplace-communication': IconSpeech,
  'critical-thinking': IconBranch,
  'ai-fluency': IconSpark,
}

export const IconDoc = (p) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
)

export const IconUpload = (p) => (
  <Svg {...p}>
    <path d="M12 16V4m0 0L8 8m4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Svg>
)

export const IconBriefcase = (p) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
  </Svg>
)

export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Svg>
)

export const IconList = (p) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Svg>
)

export const IconPen = (p) => (
  <Svg {...p}>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z" />
  </Svg>
)

export const IconMic = (p) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" />
  </Svg>
)

export const IconStop = (p) => (
  <Svg {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />
  </Svg>
)

export const IconWifiOff = (p) => (
  <Svg {...p}>
    <path d="M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 3-1.9m10 1.9a10 10 0 0 0-4.4-2.6M2 9.4a15 15 0 0 1 4.2-2.7m5.8-.7a15 15 0 0 1 10 3.4M12 20h.01" />
  </Svg>
)

export function IconStar({ size = 20, filled = true, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path
        d="M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6 6.2 20.7l1.1-6.5L2.6 9.6l6.5-.9z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const IconBuilding = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="3.5" width="11" height="17" rx="1.5" />
    <path d="M15.5 9.5h4a1 1 0 0 1 1 1v10h-5M8 8h4M8 12h4M8 16h4" />
  </Svg>
)

export const IconPeople = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17" cy="9.5" r="2.4" />
    <path d="M17.5 14.6c2.2.2 3.5 1.9 3.5 4.4" />
  </Svg>
)
