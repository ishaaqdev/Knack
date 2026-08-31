/**
 * Checks the README's promises against the repository.
 *
 * A setup section that names a script which does not exist wastes the reader's
 * first ten minutes, and it is exactly the kind of thing that rots quietly.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'

// Run from anywhere in the repo.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'))
const md = readFileSync('README.md', 'utf8')
let problems = 0

/* npm scripts */
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const scripts = [...new Set([...md.matchAll(/npm run ([a-z:]+)/g)].map((m) => m[1]))]
const badScripts = scripts.filter((x) => !pkg.scripts[x])
console.log('npm scripts referenced :', scripts.join(', '))
if (badScripts.length) {
  console.log('  NOT IN package.json  :', badScripts.join(', '))
  problems += badScripts.length
}

/* files and tools it tells you to run or open */
const paths = [...new Set([...md.matchAll(/`(docs\/[\w.-]+|server\/\.env\.example)`/g)].map((m) => m[1]))]
const toolRuns = [...new Set([...md.matchAll(/node (docs\/[\w.-]+\.mjs)/g)].map((m) => m[1]))]
const allPaths = [...new Set([...paths, ...toolRuns])]
const badPaths = allPaths.filter((f) => !existsSync(f))
console.log('files referenced       :', allPaths.join(', '))
if (badPaths.length) {
  console.log('  MISSING ON DISK      :', badPaths.join(', '))
  problems += badPaths.length
}

/* server modules named in the architecture tree */
const tree = md.slice(md.indexOf('server/src/'), md.indexOf('web/src/'))
const named = [...new Set([...tree.matchAll(/^ {2}([a-z]+\.js)/gm)].map((m) => m[1]))]
const actual = readdirSync('server/src').filter((f) => f.endsWith('.js'))
const ghosts = named.filter((n) => !actual.includes(n))
const undocumented = actual.filter((a) => !named.includes(a))
console.log(`server modules         : ${named.length} named, ${actual.length} on disk`)
if (ghosts.length) {
  console.log('  NAMED BUT ABSENT     :', ghosts.join(', '))
  problems += ghosts.length
}
if (undocumented.length) {
  console.log('  ON DISK, UNDOCUMENTED:', undocumented.join(', '))
  problems += undocumented.length
}

/* every route the README documents should be mounted somewhere */
const mounted = readFileSync('server/src/index.js', 'utf8')
const prefixes = [...mounted.matchAll(/app\.use\('(\/api\/[a-z]+)'/g)].map((m) => m[1])
const documented = [...new Set([...md.matchAll(/\| `(\/api\/[\w/:.-]+)`/g)].map((m) => m[1]))]
const orphans = documented.filter(
  (r) => !prefixes.some((p) => r === p || r.startsWith(p + '/')) && r !== '/api/health'
)
console.log(`API routes             : ${documented.length} documented, ${prefixes.length} prefixes mounted`)
if (orphans.length) {
  console.log('  NO MOUNTED PREFIX    :', orphans.join(', '))
  problems += orphans.length
}

console.log(problems ? `\n${problems} problems.` : '\nREADME matches the repository.')
process.exit(problems ? 1 : 0)
