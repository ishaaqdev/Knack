/**
 * Reads a public GitHub profile to ground scenarios in what the trainee has
 * actually built.
 *
 * Design notes:
 * - READMEs are the *least* reliable signal. Plenty of student repos ship
 *   "# project-name" or an untouched Create React App readme. Language,
 *   description, topics and recency are almost always present, so those lead
 *   and READMEs only enrich.
 * - Forks are excluded. A forked tutorial is not evidence of anything, and
 *   including them skews the whole picture.
 * - Everything is distilled once, at connect time, into a short brief. Raw
 *   READMEs are never injected into a scenario prompt — same bounded-cost
 *   reasoning as the rolling learner context.
 */

const API = 'https://api.github.com'
const MAX_REPOS = 10
const MAX_READMES = 5
const README_CHARS = 1500

const headers = () => {
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Knack-Training-App',
  }
  // Optional. Unauthenticated is 60 requests/hour per IP, which a sync of
  // ~7 calls will exhaust after a handful of accounts.
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

export const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

class GitHubError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function gh(path, { optional = false } = {}) {
  const res = await fetch(`${API}${path}`, { headers: headers() })

  if (res.status === 404) {
    if (optional) return null
    throw new GitHubError('No GitHub account with that username.', 404)
  }
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    if (remaining === '0') {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const mins = Math.max(1, Math.ceil((reset - Date.now()) / 60000))
      throw new GitHubError(
        `GitHub rate limit reached. Try again in about ${mins} minute${mins === 1 ? '' : 's'}, or set GITHUB_TOKEN in server/.env to raise the limit.`,
        429
      )
    }
    throw new GitHubError('GitHub refused the request.', 403)
  }
  if (!res.ok) {
    if (optional) return null
    throw new GitHubError(`GitHub returned ${res.status}.`, 502)
  }
  return res.json()
}

/** Decodes the base64 payload the readme endpoint returns. */
function decodeReadme(payload) {
  if (!payload?.content) return null
  try {
    const text = Buffer.from(payload.content, payload.encoding || 'base64').toString('utf8')
    return text
      .replace(/```[\s\S]*?```/g, ' ')      // code blocks carry little signal
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // badge images are noise
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, README_CHARS)
  } catch {
    return null
  }
}

/** Auto-generated scaffolding readmes tell us nothing — drop them. */
const isBoilerplate = (text) =>
  !text ||
  text.length < 80 ||
  /getting started with create react app|this project was bootstrapped with|npm run eject/i.test(text)

/**
 * Fetches the raw picture. Roughly 2 + MAX_READMES requests.
 * Returns null-ish shape rather than throwing when the account is simply empty.
 */
export async function fetchProfile(username) {
  if (!USERNAME_RE.test(username)) {
    throw new GitHubError('That does not look like a GitHub username.', 400)
  }

  const user = await gh(`/users/${username}`)
  const all = await gh(`/users/${username}/repos?per_page=100&sort=pushed&type=owner`)

  const repos = (Array.isArray(all) ? all : [])
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (Date.parse(b.pushed_at) - Date.parse(a.pushed_at)))
    .slice(0, MAX_REPOS)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      topics: r.topics ?? [],
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
    }))

  // READMEs only for the strongest few — each one is a request.
  const withReadmes = await Promise.all(
    repos.slice(0, MAX_READMES).map(async (r) => {
      const payload = await gh(`/repos/${username}/${r.name}/readme`, { optional: true })
      const readme = decodeReadme(payload)
      return { ...r, readme: isBoilerplate(readme) ? null : readme }
    })
  )

  const merged = [...withReadmes, ...repos.slice(MAX_READMES)]

  return {
    username: user.login,
    name: user.name,
    bio: user.bio,
    publicRepos: user.public_repos,
    repos: merged,
    // Languages across owned repos, most frequent first.
    languages: Object.entries(
      merged.reduce((acc, r) => {
        if (r.language) acc[r.language] = (acc[r.language] ?? 0) + 1
        return acc
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang),
  }
}

/** Serialises the raw profile for the distillation prompt. */
export function profileForPrompt(profile) {
  const lines = []
  if (profile.bio) lines.push(`Bio: ${profile.bio}`)
  if (profile.languages.length) lines.push(`Languages used: ${profile.languages.join(', ')}`)
  lines.push('')

  profile.repos.forEach((r, i) => {
    const bits = [`${i + 1}. ${r.name}`]
    if (r.language) bits.push(`[${r.language}]`)
    if (r.stars) bits.push(`(${r.stars}★)`)
    lines.push(bits.join(' '))
    if (r.description) lines.push(`   ${r.description}`)
    if (r.topics?.length) lines.push(`   topics: ${r.topics.join(', ')}`)
    if (r.readme) lines.push(`   readme: ${r.readme.slice(0, 700)}`)
  })

  return lines.join('\n')
}

export { GitHubError }
