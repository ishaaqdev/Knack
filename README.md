# Knack

AI-powered gamified soft-skill training for engineering students.

Pick a track, get an AI-generated workplace scenario **written for you**, write
how you would actually respond, and get scored 1â€“10 with specific feedback. XP,
streaks, per-track skill scores and a composite **Professional Readiness Score**
turn it into a five-minute daily habit rather than a course.

Scenarios are personalised from two independent sources:

- **Stated profile** â€” an 8-field onboarding (year, branch, target role,
  experience, work setting, what you find hard, and self-rated confidence per
  track). A final-year CSE student aiming at a startup gets payment-gateway pull
  requests; a first-year ECE student aiming at core engineering gets a PCB
  calculation error in a sprint review.
- **Derived context** â€” a rolling summary the model rewrites every three
  attempts, describing what you reliably do well and what you keep missing. It
  feeds forward into both scenario generation and grading, so feedback can say
  *"this is the same gap as last time"* rather than treating every attempt as
  the first.

---

## Run it

```bash
npm run install:all     # first time only
npm run dev
```

| | |
|---|---|
| **App** | **http://localhost:5173** |
| API | http://localhost:5190 |

Single-port demo build (one URL, no Vite):

```bash
npm run build && npm start   # everything on http://localhost:5190
```

> On npm 11+, `better-sqlite3` needs its native binary approved once:
> `cd server && npm approve-scripts better-sqlite3 && npm rebuild better-sqlite3`

---

## Stack

- **Frontend** â€” React 19 + Vite, Tailwind CSS v4, Framer Motion, React Router, Zustand
- **Backend** â€” Node + Express 5
- **AI** â€” `google/gemma-4-31b-it:free` via OpenRouter, with a fallback model chain
- **Storage** â€” SQLite (`better-sqlite3`), file at `server/data/knack.db`

Config lives in `server/.env`. Prompt templates are isolated in
`server/src/prompts.js` so they can be tuned without touching route logic.

---

## Architecture

```
server/src/
  index.js          Express app, static SPA in production
  db.js             SQLite schema, additive migrations, track seed
  auth.js           scrypt password hashing, session tokens, route guards
  profile.js        The 8 onboarding fields â€” options, validation, prompt phrasing
  context.js        Derived learner context: when to refresh, what to inject
  gamification.js   XP, levels, streaks, rolling skill scores, readiness, difficulty
  prompts.js        Gemma prompt templates (tune here)
  ai.js             OpenRouter client â€” retries, model fallback, JSON extraction
  fallback.js       Offline scenario bank + rubric for when the model is down
  routes/           auth.js Â· quest.js Â· user.js Â· history.js

web/src/
  pages/            Home Â· Auth Â· Onboarding Â· Dashboard Â· TrackSelect Â·
                    QuestSession Â· Feedback Â· Profile
  components/       Header Â· Ring Â· ScoreDial Â· TrackCard Â· Insight Â·
                    ProfileEditor Â· AttemptDetail Â· â€¦
  store/useKnack.js Auth, profile, XP/streak and quest-session state
```

### API

| Method | Route | Returns |
|---|---|---|
| `POST` | `/api/auth/signup` | creates account, sets session cookie |
| `POST` | `/api/auth/login` | sets session cookie |
| `POST` | `/api/auth/logout` | clears session |
| `GET` | `/api/auth/me` | current account or `null` |
| `GET` | `/api/auth/onboarding` | field definitions + options (server owns these) |
| `POST` | `/api/auth/onboarding` | saves the 8-field profile |
| `POST` | `/api/quest/generate` | `{ scenarioText, taskPrompt, difficulty, source }` |
| `POST` | `/api/quest/evaluate` | `{ score, strengths, gaps, suggestion, xp, streak, levelUp, trackScores, readinessScore, nudge }` |
| `GET` | `/api/user` | profile, XP, level, streak, per-track scores, readiness, derived insight, last 5 attempts |
| `PATCH` | `/api/user` | edit the profile (re-validated against the same rules) |
| `POST` | `/api/user/reset` | wipes progress and learned context, keeps the profile |
| `GET` | `/api/history` | `?trackId=&limit=&offset=` â€” paginated attempts |
| `GET` | `/api/health` | server + OpenRouter key status |

Everything under `/api/quest` additionally requires a completed profile â€”
scenario quality depends on it, so the route refuses rather than degrading.

### Data model

```
users            id, email, passwordHash, name,
                 yearOfStudy, branch, targetRole, experience, workSetting,
                 confidence (JSON), focusAreas (JSON), onboardedAt,
                 xp, streak, longestStreak, lastActiveDate, createdAt
sessions         tokenHash, userId, createdAt, expiresAt
learner_context  userId, summary, recurringGaps (JSON), pushNext,
                 attemptsAtUpdate, updatedAt
tracks           id, name, description, blurb, sortOrder
attempts         id, userId, trackId, difficulty, scenarioText, userResponse,
                 score, feedback, strengths, gaps, suggestion, xpAwarded,
                 source, timestamp, localDate
```

### Auth

Email + password. Passwords are hashed with **scrypt** from Node's own `crypto`
module (N=16384, r=8, p=1, 64-byte key, per-password random salt) â€” memory-hard,
OWASP-recommended, and it keeps the project free of a native build step.
Verification is timing-safe, and login returns the same error whether or not the
email exists.

Sessions are 32 bytes of CSPRNG output in an `httpOnly`, `sameSite=lax` cookie.
Only the **SHA-256 hash** of the token is stored, so a database dump does not
hand over live sessions. Expired rows are swept at boot.

---

## Gamification rules

| Mechanic | Rule |
|---|---|
| **XP** | `score Ã— 10`, plus `+5` at a 3-day streak and `+10` at 7 days |
| **Levels** | Novice 0â€“150 Â· Intermediate 150â€“400 Â· Advanced 400â€“800 Â· Expert 800+ |
| **Streak** | +1 per calendar day with â‰¥1 quest; 0 after a full day missed |
| **Track skill** | Rolling mean of the last 5 scores in that track, scaled to 0â€“100 |
| **Difficulty** | <45 easy Â· 45â€“74 medium Â· 75+ hard, nudged Â±1 by recent trend. Before any attempts exist, self-rated confidence picks the entry point |
| **Readiness** | Plain mean of the three track scores â€” an untouched track counts as 0 |

---

## Personalisation

The two halves are kept deliberately separate.

**Stated profile** (`profile.js`) is collected once and editable in Profile. Each
option carries a `prompt` string â€” the phrasing handed to the model â€” so the UI
label and the model's wording can differ without drifting apart. Self-rated
confidence seeds the *starting difficulty* only; it never touches the score.

**Derived context** (`context.js`) is the interesting half. The naive approach â€”
stuffing past attempts into every prompt â€” grows without bound and degrades
output on a small model. Instead the model rewrites a compact summary every
**3 attempts** from a **6-attempt window**, and only that summary is injected.
Prompt cost stays flat no matter how long someone trains. The refresh runs
fire-and-forget after the response is sent, so it never sits on the request path;
a failure just means the summary is one cycle stale.

Both are surfaced in the UI (the "What Knack has picked up" card) rather than
hidden â€” personalisation the user cannot see reads as a black box.

**The failure mode to know about:** hand a small model a profile and it recites
it back â€” every scenario opening *"As a final-year CSE studentâ€¦"*. The prompts
state explicitly that the background selects the setting, the other people and
the stakes, and must never appear in the text. Worth keeping if you tune them.

---

## Design

**"Ember on Ink"** â€” one accent, no second brand colour.

| Token | Hex |
|---|---|
| ink / surface / raised | `#0E0E10` Â· `#16161A` Â· `#1D1D22` |
| line / hairline | `#26262D` Â· `#1F1F25` |
| text / dim / faint | `#F2F0EC` Â· `#9A9AA5` Â· `#63636E` |
| **ember** (XP, streak, CTA) | **`#FF7A35`** |
| ember-hi / ember-dormant | `#FFA061` Â· `#8A4A24` |

Two fonts: **Space Grotesk** for headings and every number (tabular figures, so
counters do not jitter), **Inter** for body.

**Signature motif â€” the Ember Ring.** Every quantity is an arc on a ring: ember
stroke, round caps, starting at 12 o'clock. XP-to-level, track skill, readiness
and the score dial all share one shape language. Identity markers are pills with
a leading dot â€” solid and glowing when active, hollow when dormant. Icons are
hand-rolled 1.5px SVGs on a single grid; no icon library, no emoji.

Animation is Framer Motion springs, 200â€“600ms, and every animated element has a
`prefers-reduced-motion` fallback.

---

## Notes and assumptions

- **Streaks use the server's local calendar date.** The server runs on the same
  machine as the browser, so server-local == user-local.
- **"Streak at risk" is 18:00 local** with today's quest still open. It is a
  visual state on the flame only â€” no popups, no notifications.
- **Readiness counts untouched tracks as 0**, so it rewards breadth. A single
  track at 90 gives a readiness of 30.
- **Offline fallback.** Free-tier Gemma is served from a shared upstream pool and
  does return 429s under load. When every model in the chain fails, the app falls
  back to a local scenario bank and a deterministic rubric. That output is tagged
  `source: "offline"` and labelled in the UI â€” it is never passed off as AI.

- **No email verification or password reset.** Accounts are real but the recovery
  flow is out of scope; there is no mail transport wired up.
- **Age is deliberately not collected.** Year of study is strictly better signal
  for scenario difficulty, and personal data that does not change the output is
  not worth storing.

## Future scope

Badges/achievements, leaderboards, a real skill-tree visualisation, a fully
built-out AI hallucination-detection track, email verification and password
reset, and a mobile app â€” all deliberately out of scope for this version.
