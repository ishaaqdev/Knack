import { inflateSync, inflateRawSync } from 'node:zlib'
import { safeParse } from './db.js'

/**
 * Resume ingestion.
 *
 * A resume is the one document that already contains everything the app has to
 * ask for in onboarding — the skills, the projects, the numbers. Reading it is
 * worth doing properly, so the extraction here is deliberate rather than a
 * dependency: Node already ships zlib, and both formats students actually
 * submit (PDF and DOCX) are zlib containers underneath.
 *
 * Nothing here trusts the result blindly. `looksLikeProse` gates every path, so
 * a scanned or heavily-subset PDF is reported as unreadable instead of being
 * stored as mojibake that would then poison every prompt downstream.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
export const MAX_RESUME_CHARS = 18_000

export class ResumeError extends Error {
  constructor(message, status = 422) {
    super(message)
    this.status = status
  }
}

/* ------------------------------------------------------------------ PDF --- */

const PDF_ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }

/** Decodes a PDF literal string: escapes, octal codes, and line continuations. */
function pdfLiteral(raw) {
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (c !== '\\') {
      out += c
      continue
    }
    const next = raw[++i]
    if (next === undefined) break
    if (next === '\n') continue // escaped newline = line continuation
    if (next >= '0' && next <= '7') {
      let oct = next
      while (oct.length < 3 && raw[i + 1] >= '0' && raw[i + 1] <= '7') oct += raw[++i]
      out += String.fromCharCode(parseInt(oct, 8))
      continue
    }
    out += PDF_ESCAPES[next] ?? next
  }
  return out
}

/** Decodes a PDF hex string, treating it as UTF-16BE when it carries the BOM. */
function pdfHex(raw) {
  const hex = raw.replace(/[^0-9a-fA-F]/g, '')
  const bytes = []
  for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let s = ''
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1])
    }
    return s
  }
  return String.fromCharCode(...bytes)
}

/**
 * Pulls readable text out of one decoded content stream.
 *
 * PDF has no concept of a word — only glyphs placed at coordinates. Spaces are
 * inferred from the kerning numbers inside a TJ array (a large negative shift is
 * how most producers write a space), and line breaks from the text-positioning
 * operators.
 */
function contentStreamText(content) {
  let out = ''
  const token = /\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]*>|(-?\d+(?:\.\d+)?)|(TJ|Tj|Td|TD|T\*|ET)/g

  let pendingKern = 0
  let m
  while ((m = token.exec(content))) {
    const tok = m[0]

    if (m[1] !== undefined) {
      pendingKern = Number(m[1])
      continue
    }
    if (m[2] !== undefined) {
      if (m[2] !== 'TJ' && m[2] !== 'Tj') out += '\n'
      pendingKern = 0
      continue
    }
    // A string. Emit the inferred space first, then the glyphs.
    if (pendingKern <= -110) out += ' '
    pendingKern = 0
    out += tok[0] === '(' ? pdfLiteral(tok.slice(1, -1)) : pdfHex(tok.slice(1, -1))
  }
  return out
}

function pdfText(buf) {
  const bin = buf.toString('latin1')
  const chunks = []

  // Walk every stream object. Only Flate-compressed and plain streams are read;
  // image and font streams simply produce no text tokens and fall away.
  const re = /stream\r?\n?/g
  let m
  while ((m = re.exec(bin))) {
    const dict = bin.slice(Math.max(0, m.index - 400), m.index)
    const end = bin.indexOf('endstream', re.lastIndex)
    if (end === -1) break

    const raw = buf.subarray(m.index + m[0].length, end)
    re.lastIndex = end

    if (/\/(DCTDecode|JPXDecode|CCITTFaxDecode|Image)/.test(dict)) continue

    try {
      const data = /\/FlateDecode/.test(dict) ? inflateSync(raw) : raw
      const text = data.toString('latin1')
      // Cheap guard: a content stream always contains a text-showing operator.
      if (/\bTJ\b|\bTj\b|\bBT\b/.test(text)) chunks.push(contentStreamText(text))
    } catch {
      /* Encrypted, damaged, or an object stream we cannot read — skip it. */
    }
  }

  return chunks.join('\n')
}

/* ----------------------------------------------------------------- DOCX --- */

/** Minimal ZIP reader — enough to pull one known entry out of a .docx. */
function zipEntry(buf, wanted) {
  // End of central directory, searched backwards past any trailing comment.
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66_000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) throw new ResumeError('That file is not a readable .docx.')

  let p = buf.readUInt32LE(eocd + 16)
  const count = buf.readUInt16LE(eocd + 10)

  for (let i = 0; i < count && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOff = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)

    if (name === wanted) {
      // The local header repeats the name/extra lengths, and they can differ.
      const lnLen = buf.readUInt16LE(localOff + 26)
      const leLen = buf.readUInt16LE(localOff + 28)
      const start = localOff + 30 + lnLen + leLen
      const data = buf.subarray(start, start + compSize)
      return method === 8 ? inflateRawSync(data) : data
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new ResumeError('That .docx has no document body we can read.')
}

function docxText(buf) {
  const xml = zipEntry(buf, 'word/document.xml').toString('utf8')
  return xml
    .replace(/<w:p[ >]/g, '\n<w:p ')
    .replace(/<w:br\s*\/?>/g, '\n')
    .replace(/<w:tab\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

/* -------------------------------------------------------------- shaping --- */

export function cleanResumeText(raw) {
  return String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•●▪]/g, '- ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_RESUME_CHARS)
}

/**
 * Is this actually prose, or the debris of a font we could not decode?
 *
 * A subset-encoded PDF still yields *characters* — they are simply the wrong
 * ones. The tell is the ratio of letters to noise and the presence of ordinary
 * words, so both are checked rather than the length alone.
 */
export function looksLikeProse(text) {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < 50) return false

  const letters = (text.match(/[A-Za-z]/g) ?? []).length
  if (letters / text.length < 0.5) return false

  const real = words.filter((w) => /^[A-Za-z][a-z]{2,}/.test(w)).length
  return real / words.length > 0.25
}

/** Routes a file to the right reader by magic bytes, not by its extension. */
export function extractResumeText(buf, fileName = '') {
  if (!buf?.length) throw new ResumeError('The file was empty.')
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new ResumeError('That file is over 4 MB. Export a smaller PDF or paste the text.', 413)
  }

  const head = buf.subarray(0, 4).toString('latin1')
  let text

  if (head.startsWith('%PDF')) text = pdfText(buf)
  else if (head.startsWith('PK')) text = docxText(buf)
  else if (/\.(txt|md|rtf|csv)$/i.test(fileName) || !buf.subarray(0, 512).includes(0)) {
    text = buf.toString('utf8')
  } else {
    throw new ResumeError('Unsupported file. Upload a PDF, DOCX or TXT — or paste the text.')
  }

  const clean = cleanResumeText(text)

  if (!looksLikeProse(clean)) {
    throw new ResumeError(
      head.startsWith('%PDF')
        ? 'That PDF has no readable text layer — it is probably a scan or an image export. Open it, select all, copy, and paste the text instead.'
        : 'We could not read enough text out of that file. Paste your resume text instead.'
    )
  }
  return clean
}

/* ---------------------------------------------------- prompt projections --- */

/**
 * What the *scenario* generator is allowed to see.
 *
 * Deliberately not the brief. The GitHub work taught this the hard way: hand a
 * small model a sentence naming a specific project and every scenario it writes
 * afterwards is about that project. A bounded skill list gives the same
 * technical concreteness with nothing to fixate on.
 */
export function resumeBrief(user) {
  const skills = safeParse(user?.resumeSkills, [])
  if (!skills.length) return null
  return { skills: skills.slice(0, 8) }
}

/**
 * What the *interviewer* is allowed to see — which is everything, because an
 * interview that has not read your resume is not an interview.
 */
export function interviewBrief(user) {
  if (!user?.resumeUpdatedAt) return null
  return {
    brief: user.resumeBrief ?? '',
    skills: safeParse(user.resumeSkills, []),
    projects: safeParse(user.resumeProjects, []),
    highlights: safeParse(user.resumeHighlights, []),
  }
}

/** The raw document, trimmed for the one prompt that legitimately needs it. */
export const resumeExcerpt = (user, chars = 4500) => (user?.resumeText ?? '').slice(0, chars)
