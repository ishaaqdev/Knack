# Knack

AI-powered gamified soft-skill training for engineering students.

Pick a track and play a **level**: four workplace judgement calls, then one
situation you have to answer in your own words. Every stage is generated for
you, the written stage is graded 1–10 with specific feedback, and XP, streaks,
per-track skill scores and a composite **Professional Readiness Score** turn it
into a five-minute daily habit rather than a course.

There is also a **mock interview** — five rounds, from "tell me about yourself"
through to salary and closing questions, with the questions written from your
own resume and a debrief that grades every answer.

Scenarios are personalised from four independent sources:

- **Stated profile** — an 8-field onboarding (year, branch, target role,
  experience, work setting, what you find hard, and self-rated confidence per
  track). A final-year CSE student aiming at a startup gets payment-gateway pull
  requests; a first-year ECE student aiming at core engineering gets a PCB
  calculation error in a sprint review.
- **GitHub portfolio** (optional) — link a public GitHub and the app reads your
  non-forked repositories, then trains you on the stack you actually use. An
  embedded/IoT student gets TensorFlow Lite latency and Arduino calibration
  arguments; a web student gets schema and deployment ones.
- **Derived context** — a rolling summary the model rewrites every three
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
| API | http://127.0.0.1:5190 (loopback only) |

Testing on a phone? The Vite dev server binds `0.0.0.0`, so open
`http://<your-lan-ip>:5173` on any device on the same Wi-Fi. `/api` is proxied
server-side, so the API, the SQLite file and your OpenRouter key stay off the
network.

Single-port demo build (one URL, no Vite):

```bash
npm run build && npm start   # everything on http://localhost:5190
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
  db.js             SQLite schema, additive migrations, track seed
  auth.js           scrypt password hashing, session tokens, route guards
  profile.js        The 8 onboarding fields — options, validation, prompt phrasing
  github.js         Public GitHub reader — repo filtering, README extraction
  context.js        Derived learner context: when to refresh, what to inject
  gamification.js   XP, levels, streaks, rolling skill scores, readiness, difficulty
  prompts.js        Gemma prompt templates (tune here)
  ai.js             OpenRouter client — retries, model fallback, JSON extraction
  fallback.js       Offline scenario bank + rubric for when the model is down
  routes/           auth.js · quest.js · user.js · history.js

web/src/
  pages/            Home · Auth · Onboarding · Dashboard · TrackSelect ·
                    QuestSession · Feedback · Profile
  components/       Header · Ring · ScoreDial · TrackCard · Insight ·
                    ProfileEditor · AttemptDetail · …
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
| `POST` | `/api/auth/github` | links a public GitHub, distils it, stores the brief |
| `DELETE` | `/api/auth/github` | unlinks and clears the stored portfolio |
| `POST` | `/api/auth/resume` | distils pasted resume text |
| `POST` | `/api/auth/resume/file` | same, from a raw PDF/DOCX/TXT body |
| `DELETE` | `/api/auth/resume` | removes the resume and everything derived from it |
| `POST` | `/api/quest/level/generate` | `{ levelId, setting, stages[4], difficulty }` — option scores stay server-side |
| `GET` | `/api/quest/level/written/:levelId` | the fifth stage, generated in the background since the level was served |
| `POST` | `/api/quest/level/submit` | `{ score, stages[], writtenScore, xp, streak, levelUp, trackScores, nudge }` |
| `GET` | `/api/interview` | rounds, which are unlocked, best score each, readiness |
| `POST` | `/api/interview/start` | `{ runId, opener, questions[3] }` |
| `POST` | `/api/interview/submit` | per-answer grades, round verdict, XP, unlock |
| `GET` | `/api/interview/runs/:id` | a past round in full |
| `POST` | `/api/quest/generate` | single scenario — the pre-level route, still live |
| `POST` | `/api/quest/evaluate` | grades a single scenario |
| `GET` | `/api/user` | profile, XP, level, streak, per-track scores, readiness, derived insight, last 5 attempts |
| `PATCH` | `/api/user` | edit the profile (re-validated against the same rules) |
| `POST` | `/api/user/reset` | wipes progress and learned context, keeps the profile |
| `GET` | `/api/history` | `?trackId=&limit=&offset=` — paginated attempts |
| `GET` | `/api/health` | server + OpenRouter key status |

Everything under `/api/quest` and `/api/interview` additionally requires a
completed profile — scenario quality depends on it, so the route refuses rather
than degrading.

A level in progress is held in server memory, not in the browser. The generated
options carry their own scores, so round-tripping them through the client would
hand the score sheet to the person being scored.

### Data model

```
users            id, email, passwordHash, name,
                 yearOfStudy, branch, targetRole, experience, workSetting,
                 confidence (JSON), focusAreas (JSON), onboardedAt,
                 githubUsername, githubBrief, githubStack (JSON),
                 githubDomains (JSON), githubLevel, githubRepoCount,
                 githubSyncedAt,
                 resumeText, resumeBrief, resumeSkills (JSON),
                 resumeProjects (JSON), resumeHighlights (JSON),
                 resumeFileName, resumeUpdatedAt,
                 xp, streak, longestStreak, lastActiveDate, interviewLevel,
                 createdAt
sessions         tokenHash, userId, createdAt, expiresAt
learner_context  userId, summary, recurringGaps (JSON), pushNext,
                 attemptsAtUpdate, updatedAt
tracks           id, name, description, blurb, sortOrder
attempts         id, userId, trackId, difficulty, scenarioText, userResponse,
                 score, feedback, strengths, gaps, suggestion, xpAwarded,
                 source, kind, detail (JSON), timestamp, localDate
interview_runs   id, userId, level, role, questions (JSON), answers (JSON),
                 perAnswer (JSON), score, verdict, strengths, gaps, nextFocus,
                 xpAwarded, source, timestamp, localDate
```

`attempts.kind` is `level` for the five-stage format and `open` for the older
single-scenario rows; `detail` holds the per-stage breakdown. Interview rounds
live in their own table because an interview is not a track, and must never move
a track score.

### Auth

Email + password. Passwords are hashed with **scrypt** from Node's own `crypto`
module (N=16384, r=8, p=1, 64-byte key, per-password random salt) — memory-hard,
OWASP-recommended, and it keeps the project free of a native build step.
Verification is timing-safe, and login returns the same error whether or not the
email exists.

Sessions are 32 bytes of CSPRNG output in an `httpOnly`, `sameSite=lax` cookie.
Only the **SHA-256 hash** of the token is stored, so a database dump does not
hand over live sessions. Expired rows are swept at boot.

### Ports

The API listens on **5190**, bound to `127.0.0.1` only. Port 5174 is avoided
because it collided with an unrelated local service during development — and
because Express binding the `0.0.0.0` wildcard loses to any process holding the
specific `127.0.0.1` binding, that collision was silent and only surfaced when
the proxy target changed from `localhost` (which resolved to `::1`) to
`127.0.0.1`. Set `HOST=0.0.0.0` in `server/.env` only if you deliberately want
the API on the network.

---

## Gamification rules

| Mechanic | Rule |
|---|---|
| **XP** | Each judgement call `score × 2.5` (max 25); the written stage `score × 10` (max 100); plus `+5` at a 3-day streak and `+10` at 7 days |
| **Level score** | `0.4 × mean(four choices) + 0.6 × written` — recognising the right move counts, producing it counts more |
| **Levels** | Novice 0–400 · Intermediate 400–1200 · Advanced 1200–2600 · Expert 2600+ |
| **Interview** | `score × 5` per answer, so up to 150 a round. A round unlocks the next at 6/10 — XP never does |
| **Streak** | +1 per calendar day with ≥1 quest; 0 after a full day missed |
| **Track skill** | Rolling mean of the last 5 scores in that track, scaled to 0–100 |
| **Difficulty** | <45 easy · 45–74 medium · 75+ hard, nudged ±1 by recent trend. Before any attempts exist, self-rated confidence picks the entry point |
| **Readiness** | Plain mean of the three track scores — an untouched track counts as 0 |

---

## Personalisation

The four sources are kept deliberately separate.

**Stated profile** (`profile.js`) is collected once and editable in Profile. Each
option carries a `prompt` string — the phrasing handed to the model — so the UI
label and the model's wording can differ without drifting apart. Self-rated
confidence seeds the *starting difficulty* only; it never touches the score.

**GitHub portfolio** (`github.js`) is optional and skippable. Two things matter
in how it reads a profile:

*READMEs are the least reliable signal.* Plenty of student repos ship
`# project-name` or an untouched Create React App readme, so language,
description, topics and recency lead, and READMEs only enrich — boilerplate ones
are detected and dropped. Forks and archived repos are excluded: a forked
tutorial is not evidence of anything and skews the whole picture.

*The brief is never sent to the scenario prompt.* This one was learned the hard
way. The distilled brief names specific project subjects — "edge-AI waste
management system" — and a small model anchors on that so hard that back-to-back
generations came back as near-duplicates about the same project with the same
deadline. Only the bounded `stack` and `domains` lists reach the prompt; they
give the same technical concreteness with no single subject to fixate on. The
brief stays user-facing, shown on the Profile page so the inference is
inspectable.

Scenario generation also de-duplicates against recently *served* scenarios, not
just completed attempts — otherwise "Different scenario" hands back a near-copy,
since nothing was stored.

**Resume** (`resume.js`) is read on this machine and never uploaded anywhere but
your own server. PDF and DOCX are both zlib containers, and Node already ships
zlib, so extraction is about 200 lines rather than a dependency: inflate the
content streams, pull the text-showing operators, infer spaces from the kerning
numbers. A scanned PDF has no text layer at all, so the result is gated on
whether it actually reads as prose — the wrong answer here is not an error
message but silently storing mojibake that then poisons every prompt downstream.

The same anchoring rule as GitHub applies, for the same reason: the scenario
generator sees only the skill list. The projects and the claims worth defending
go to the **interviewer**, which is the one place naming your actual work is the
whole point.

**Derived context** (`context.js`) is the most interesting source. The naive approach —
stuffing past attempts into every prompt — grows without bound and degrades
output on a small model. Instead the model rewrites a compact summary every
**3 attempts** from a **6-attempt window**, and only that summary is injected.
Prompt cost stays flat no matter how long someone trains. The refresh runs
fire-and-forget after the response is sent, so it never sits on the request path;
a failure just means the summary is one cycle stale.

All of them are surfaced in the UI — the resume and GitHub cards on Profile, the
derived summary in "What Knack has picked up" — rather than hidden.
Personalisation the user cannot see reads as a black box.

**The failure mode to know about:** hand a small model a profile and it recites
it back — every scenario opening *"As a final-year CSE student…"*. The prompts
state explicitly that the background selects the setting, the other people and
the stakes, and must never appear in the text. Worth keeping if you tune them.

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

- **No email verification or password reset.** Accounts are real but the recovery
  flow is out of scope; there is no mail transport wired up.
- **Age is deliberately not collected.** Year of study is strictly better signal
  for scenario difficulty, and personal data that does not change the output is
  not worth storing.
- **GitHub reads public data only**, is entirely optional, and stores only the
  distilled brief — not the repositories or their contents. Unauthenticated the
  API allows 60 requests/hour and one sync costs about 7, so set `GITHUB_TOKEN`
  in `server/.env` if several people will demo it in one sitting.

## Future scope

Badges/achievements, leaderboards, a real skill-tree visualisation, a fully
built-out AI hallucination-detection track, spoken interview rounds, a group
discussion with several AI candidates, email verification and password reset,
and a mobile app — all deliberately out of scope for this version.
