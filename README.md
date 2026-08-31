# Knack

An AI career simulation for engineering students. You do not answer questions
about a workplace; you go to one.

```
Group discussion → Interview → Joining → Internship → The offer → Full-time
```

Six phases, each gated on performance rather than XP. You sit a group discussion
against five AI candidates with real personalities, get through five interview
rounds with someone who has read your resume, join a company, and then work
there — days made of messages, decisions, and live conversations with colleagues
who remember how you treated them. At the end there is a performance review, a
number, and a negotiation you can handle well or badly.

**Ten professional attributes** run underneath all of it, 0–100, and they are
deliberately not XP. XP is what you get for turning up. An attribute is a claim
about what you can do, and it goes down. Supporting the room in a group
discussion without ever taking direction moves Teamwork and Emotional
Intelligence up and **Leadership down** — that disagreement is the point.

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
- **Resume** (optional) — upload a PDF, DOCX or TXT and it is read on this
  machine, then reduced to skills, projects and claims worth defending. Only the
  skills reach a scenario; the projects go to the interviewer, who is the one
  who should be asking about them.
- **Derived context** — a rolling summary the model rewrites every three
  attempts, describing what you reliably do well and what you keep missing. It
  feeds forward into both scenario generation and grading, so feedback can say
  *"this is the same gap as last time"* rather than treating every attempt as
  the first.

---

## The simulation

| Piece | What it does | Why it is not decoration |
|---|---|---|
| **Ten attributes** (`attributes.js`) | 0–100, tiered, with the specific thing that would move each one | They go **down**. One answer moves different attributes in different directions — never `+5` to everything |
| **Characters** (`characters.js`) | Five colleagues, created the day you join | They store *what* they remember, not just a number, so the app can say "you helped me when I first joined" and mean something |
| **Consequences** (`consequences.js`) | Notable decisions are written down with a due count | They fire **2–3 levels later**, reported as a callback with the original cause next to the effect |
| **The office** (`workplace.js`) | Five locations, three timed beats a day | Where you go decides what happens. Each beat is written *after* the previous one, so a promise made at 10am comes due at 3pm |
| **Group discussion** (`routes/gd.js`) | Five AI candidates, beat by beat | "Stay quiet" is a first-class button. Never speaking caps you at 25 on every dimension and the verdict says why |
| **The offer** (`offer.js`) | A number assembled from attributes, level scores and standing | Two negotiation attempts, four outcomes, and only one of them is "you got more money" |
| **Badges** (`badges.js`) | 24, every one condition-checked | Locked ones are shown with their condition — a milestone nobody knows about motivates nobody |

Phases gate on competency, never on XP: a group discussion clears at 6/10, an
interview round at 6/10, an internship level advances at 5/10, and a promotion
needs Leadership rather than attendance.

### The office day

A day is three beats, not the blueprint's nine-item timetable — a daily habit
that takes forty minutes is a habit nobody keeps, and the same nine beats every
day is exactly the linear course the design is trying not to be.

Each beat is one of **a message**, **the work**, **a decision** (four options,
scored 9/6/3/1) or **a conversation** (up to three live exchanges with a
colleague who responds in character and gets harder work if your relationship
with them is poor). All four are on a visible timer. Running out of time is an
answer with its own consequence, not a failure state — real decisions are taken
before you feel ready.

The company also moves on its own: every third day someone is promoted,
transfers out, or a new intern starts, and the People directory updates to match.

---

## Run it

**You need:** Node 20 or newer (built on 24), and a free OpenRouter account.

**1 — Install**

```bash
git clone https://github.com/ishaaqdev/Knack.git
cd Knack
npm run install:all
```

**2 — Add your API key.** This is the only required configuration; without it
every generation falls back to the offline bank.

```bash
cp server/.env.example server/.env
```

Then open `server/.env` and paste a key from
[openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) into
`OPENROUTER_API_KEY`. The file is gitignored and never leaves your machine.

**3 — Run**

```bash
npm run dev
```

| | |
|---|---|
| **App** | **http://localhost:5173** |
| API | http://127.0.0.1:5190 (loopback only) |

**4 — Sign up**, answer the eight onboarding questions, and you start at the
group discussion. Optionally add a resume and a GitHub username on the Profile
page — both make the scenarios and the interview specific to you.

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

### If the AI is not responding

OpenRouter's free tier allows **50 requests per day, account-wide** across every
`:free` model. When it runs out, everything still works — scenarios come from the
offline bank and grading from a local rubric — and the interface says so rather
than pretending otherwise.

```bash
curl http://localhost:5173/api/health     # model chain and any active cooldown
```

Free model availability also drifts. Models silently become paid-only and start
returning 404; if the chain in `server/.env` stops working, replace it from the
current free list at [openrouter.ai/models](https://openrouter.ai/models?q=free).
Adding $10 of credit raises the limit to 1000/day and is not consumed by
`:free` models.

---

## Stack

- **Frontend** — React 19 + Vite, Tailwind CSS v4, Framer Motion, React Router, Zustand
- **Backend** — Node + Express 5
- **AI** — OpenRouter free tier, a four-model fallback chain under a time budget
- **Storage** — SQLite (`better-sqlite3`), file at `server/data/knack.db`

Config lives in `server/.env`. Prompt templates are isolated in
`server/src/prompts.js` so they can be tuned without touching route logic.

---

## Architecture

```
server/src/
  index.js          Express app, static SPA in production
  db.js             SQLite schema (16 relations), additive migrations, track seed
  auth.js           scrypt hashing, session tokens, route guards, attribute seeding

  — who the trainee is
  profile.js        The 8 onboarding fields — options, validation, prompt phrasing
  resume.js         PDF and DOCX text extraction via zlib, then distillation
  github.js         Public GitHub reader — repo filtering, README extraction
  context.js        Derived learner context: when to refresh, what to inject

  — the simulation
  attributes.js     The ten permanent attributes, tiers, deltas, and their log
  characters.js     Persistent colleagues, relationships, what they remember
  consequences.js   Decisions scheduled now and fired several levels later
  career.js         The six-phase spine, gates, bands, objective, challenges
  workplace.js      Rooms, the shape of a day, company evolution, day summary
  offer.js          Compensation, the review, negotiation outcomes, promotion
  badges.js         24 achievements, rarity, and the conditions behind them
  interview.js      The five interview rounds and their unlock rules
  gamification.js   XP, levels, streaks, rolling skill scores, readiness, difficulty
  variation.js      Scenario shape sampling — 18,480 combinations

  — talking to the model
  prompts.js        Every prompt template (tune here, not in routes)
  ai.js             OpenRouter client — time budget, model fallback, JSON extraction
  fallback.js       Offline banks and rubrics for when the model is unreachable

  routes/           auth · quest · interview · gd · career · workplace · offer ·
                    user · history

web/src/
  pages/            Home · Auth · Onboarding · Dashboard · TrackSelect ·
                    QuestSession · Feedback · Interview · GroupDiscussion ·
                    Career · Joining · People · Workplace · Offer · Badges ·
                    Profile
  components/       Header · Avatar · Attributes · Countdown · Ring · ScoreDial ·
                    TrackCard · Insight · ResumeCard · GithubCard · primitives · …
  store/useKnack.js Auth, profile, XP/streak, level and career state
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
| `GET` | `/api/career` | phase, attributes, cast, badges, company and role options |
| `POST` | `/api/career/company` | choose the company and role you are aiming at |
| `POST` | `/api/career/join` | join the company — this is what creates the cast |
| `GET` `PATCH` | `/api/career/people/:id` | a colleague, and renaming them |
| `GET` | `/api/gd` | panel, best score, whether it is cleared |
| `POST` | `/api/gd/start` `/turn` `/finish` | a group discussion, beat by beat |
| `GET` | `/api/workplace` | the office: locations, team, company news, open day |
| `POST` | `/api/workplace/day` | start a day at a location |
| `POST` | `/api/workplace/dialogue` | one exchange in a live conversation |
| `POST` | `/api/workplace/answer` | grade the current beat and write the next |
| `POST` | `/api/workplace/close` | end the day, fire consequences, move the company |
| `GET` | `/api/offer` | performance review and the offer |
| `POST` | `/api/offer/negotiate` | one negotiation attempt, two allowed |
| `POST` | `/api/offer/decide` | accept or decline; accepting starts the full-time phase |
| `POST` | `/api/offer/promote` | take a promotion, if the competency gate is met |
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
                 phase, simCompany, simCompanyKind, simRole, joinedCompanyAt,
                 internshipLevel, gdCleared, lastReviewLevel,
                 jobTitle, ctc, gradeIndex, levelsSinceHire, createdAt
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
gd_runs          id, userId, topic, transcript (JSON), contributions (JSON),
                 scores (JSON), score, verdict, strengths, gaps, nextFocus,
                 xpAwarded, source, timestamp, localDate

attributes       userId, key, value, updatedAt
attribute_log    id, userId, key, delta, before, after, reason, source, at
characters       id, userId, slug, name, defaultName, pronouns, role,
                 department, personality, strengths (JSON), weaknesses (JSON),
                 careerHistory (JSON), joinedLabel, relationship, status
character_events id, userId, characterId, summary, delta, before, after, at
consequences     id, userId, characterId, kind, cause, effect, weight,
                 dueAfter, firedAt, createdAt
workdays         id, userId, dayNumber, location, events (JSON),
                 summary (JSON), status, xpAwarded, createdAt, closedAt
company_events   id, userId, kind, characterId, headline, detail, atDay, seen
offers           id, userId, company, title, fixed, variable, joiningBonus,
                 benefits (JSON), location, workingModel, joiningDate,
                 probation, reviewScores (JSON), reviewFeedback, rounds (JSON),
                 status, createdAt, decidedAt
badges           id, userId, slug, why, phase, at
```

Sixteen relations. Every child cascades from the account, so deleting a trainee
removes their whole simulation.

Two rules worth knowing. `attempts.kind` is `level` for the five-stage format,
`workday` for a day in the office and `open` for the older single-scenario rows;
`detail` holds the per-stage breakdown. And interviews and discussions live in
their own tables because neither is a track — they must never move a track score.

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

## The presentation

The Phase 2 deck lives in `docs/` as HTML, with a generated PDF beside it.

| File | |
|---|---|
| `Knack_Phase2_Presentation.pdf` | 38 slides, ready to present |
| `Knack_Phase2_Presentation.html` | the source |
| `Knack_Mini_Project_Report.html` | the long-form report |

Regenerate the PDF after editing the HTML:

```bash
# Chrome or Edge, headless. Pages are 264x198mm so the blue band bleeds to the edge.
msedge --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=docs/Knack_Phase2_Presentation.pdf \
  docs/Knack_Phase2_Presentation.html
```

By hand: open the HTML, Ctrl+P, **Save as PDF**, margins **None**, and tick
**Background graphics** — the blue band disappears without it.

### Check it before you present

Slides are fixed 4:3 boxes with `overflow:hidden`, so one that has grown too
tall does not look broken — it silently loses its last rows. Two checkers exist
because both of these shipped at least once:

```bash
node docs/check-overflow.mjs      # any slide taller than its box
node docs/check-numbering.mjs     # numbered lists that restart or skip
node docs/check-readme.mjs        # this file, against the actual repository
```

Both drive a real browser and read back what is actually painted. Reading the
source would not have caught either bug. Note the limit: an SVG can overflow its
own `viewBox` while the slide still fits, so **look at any figure you edit**.

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

Leaderboards, a real skill-tree visualisation, a fully built-out AI
hallucination-detection track, spoken interview and group-discussion rounds,
multiple companies running at once, email verification and password reset, and a
native mobile app — all deliberately out of scope for this version.

Leaderboards specifically are not coming: ranking classmates on communication
ability would deter exactly the students who most need the practice.
