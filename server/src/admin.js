/**
 * Admin access.
 *
 * An admin is an account whose email is listed in KNACK_ADMIN_EMAILS (comma
 * separated, in server/.env). An admin can open every phase and every level
 * without earning it: all five interview rounds are open and need no mock first,
 * any internship level (5 to 30) can be played, and the career can be moved to
 * any phase.
 *
 * It is an environment setting and not a column on purpose. Nothing a request
 * carries can make an account an admin, so there is no route to protect, and the
 * list lives with the other machine-local settings in .env.
 */
export const adminEmails = () =>
  (process.env.KNACK_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

export const isAdmin = (user) => !!user?.email && adminEmails().includes(String(user.email).toLowerCase())

/** Express guard for admin-only routes. */
export function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'This is for admin accounts only.' })
  next()
}
