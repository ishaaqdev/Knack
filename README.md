# Knack

AI-powered gamified soft-skill training for engineering students.

Pick a track, get an AI-generated workplace scenario at your level, write how you
would actually respond, and get scored 1–10 with specific feedback. XP, streaks,
per-track skill scores and a composite **Professional Readiness Score** turn it
into a five-minute daily habit rather than a course.

---

## Run it

```bash
npm run install:all     # first time only
npm run dev
```

| | |
|---|---|
| **App** | **http://localhost:5173** |
| API | http://localhost:5174 |

Single-port demo build (one URL, no Vite):

```bash
npm run build && npm start   # everything on http://localhost:5174
```

> On npm 11+, `better-sqlite3` needs its native binary approved once:
> `cd server && npm approve-scripts better-sqlite3 && npm rebuild better-sqlite3`

---

## Stack

- **Frontend** — React 19 + Vite, Tailwind CSS v4, Framer Motion, React Router, Zustand
- **Backend** — Node + Express 5
- **AI** — `google/gemma-4-31b-it:free` via OpenRouter, with a fallback model chain
- **Storage** — SQLite (`better-sqlite3`), file at `server/data/knack.db`

Config lives in `server/.env`. Prompt templates are isolated in
`server/src/prompts.js` so they can be tuned without touching route logic.

---

## Architecture

```
server/src/
  index.js          Express app, static SPA in production
  db.js             SQLite schema + track seed + single local profile
  gamification.js   XP, levels, streaks, rolling skill scores, readiness, difficulty
  prompts.js        Gemma prompt templates (tune here)
  ai.js             OpenRouter client — retries, model fallback, JSON extraction
  fallback.js       Offline scenario bank + rubric for when the model is down
  routes/           quest.js · user.js · history.js

web/src/
  pages/            Home · Dashboard · TrackSelect · QuestSession · Feedback · Profile
  components/       Header · Ring · ScoreDial · TrackCard · AttemptDetail · …
  store/useKnack.js Global XP/streak/session state
```

### API

| Method | Route | Returns |
|---|---|---|
| `POST` | `/api/quest/generate` | `{ scenarioText, taskPrompt, difficulty, source }` |
| `POST` | `/api/quest/evaluate` | `{ score, strengths, gaps, suggestion, xp, streak, levelUp, trackScores, readinessScore, nudge }` |
| `GET` | `/api/user` | profile, XP, level, streak, per-track scores, readiness, last 5 attempts |
| `GET` | `/api/history` | `?trackId=&limit=&offset=` — paginated attempts |
| `POST` | `/api/user/reset` | wipes progress (demo/testing) |
| `PATCH` | `/api/user` | rename the local profile |
| `GET` | `/api/health` | server + OpenRouter key status |

### Data model

```
users     id, name, xp, streak, longestStreak, lastActiveDate, createdAt
tracks    id, name, description, blurb, sortOrder
attempts  id, trackId, difficulty, scenarioText, userResponse, score,
          feedback, strengths, gaps, suggestion, xpAwarded, source,
          timestamp, localDate
```

---

## Gamification rules

| Mechanic | Rule |
|---|---|
| **XP** | `score × 10`, plus `+5` at a 3-day streak and `+10` at 7 days |
| **Levels** | Novice 0–150 · Intermediate 150–400 · Advanced 400–800 · Expert 800+ |
| **Streak** | +1 per calendar day with ≥1 quest; 0 after a full day missed |
| **Track skill** | Rolling mean of the last 5 scores in that track, scaled to 0–100 |
| **Difficulty** | <45 easy · 45–74 medium · 75+ hard, nudged ±1 by recent trend |
| **Readiness** | Plain mean of the three track scores — an untouched track counts as 0 |

---

## Design

**"Ember on Ink"** — one accent, no second brand colour.

| Token | Hex |
|---|---|
| ink / surface / raised | `#0E0E10` · `#16161A` · `#1D1D22` |
| line / hairline | `#26262D` · `#1F1F25` |
| text / dim / faint | `#F2F0EC` · `#9A9AA5` · `#63636E` |
| **ember** (XP, streak, CTA) | **`#FF7A35`** |
| ember-hi / ember-dormant | `#FFA061` · `#8A4A24` |

Two fonts: **Space Grotesk** for headings and every number (tabular figures, so
counters do not jitter), **Inter** for body.

**Signature motif — the Ember Ring.** Every quantity is an arc on a ring: ember
stroke, round caps, starting at 12 o'clock. XP-to-level, track skill, readiness
and the score dial all share one shape language. Identity markers are pills with
a leading dot — solid and glowing when active, hollow when dormant. Icons are
hand-rolled 1.5px SVGs on a single grid; no icon library, no emoji.

Animation is Framer Motion springs, 200–600ms, and every animated element has a
`prefers-reduced-motion` fallback.

---

## Notes and assumptions

- **Single local profile, no auth.** The user row is fixed at `id = 1`.
- **Streaks use the server's local calendar date.** The server runs on the same
  machine as the browser, so server-local == user-local.
- **"Streak at risk" is 18:00 local** with today's quest still open. It is a
  visual state on the flame only — no popups, no notifications.
- **Readiness counts untouched tracks as 0**, so it rewards breadth. A single
  track at 90 gives a readiness of 30.
- **Offline fallback.** Free-tier Gemma is served from a shared upstream pool and
  does return 429s under load. When every model in the chain fails, the app falls
  back to a local scenario bank and a deterministic rubric. That output is tagged
  `source: "offline"` and labelled in the UI — it is never passed off as AI.

## Future scope

Badges/achievements, multi-user accounts and leaderboards, a real skill-tree
visualisation, a fully built-out AI hallucination-detection track, and a mobile
app — all deliberately out of scope for this base version.
