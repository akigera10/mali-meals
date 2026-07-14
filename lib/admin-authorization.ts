import type { User } from '@supabase/supabase-js'

type AdminIdentity = Pick<User, 'id' | 'email' | 'app_metadata'>

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
}

export function getAuthorizedAdminEmails(): Set<string> {
  return new Set(
    [
      ...splitList(process.env.ADMIN_EMAILS),
      ...splitList(process.env.ADMIN_ORDER_EMAIL),
      ...splitList(process.env.MALI_ORDERS_EMAIL),
      // This is the existing single-admin account used by the application.
      'orders@malismeals.com',
    ].map(email => email.toLowerCase())
  )
}

/**
 * Authorize only identities trusted by server-controlled data.
 *
 * Preferred: set app_metadata.role = "admin" (or include "admin" in
 * app_metadata.roles) through Supabase's admin API/dashboard.
 *
 * Deployment fallback: ADMIN_USER_IDS and ADMIN_EMAILS are comma-separated,
 * server-only allowlists. Existing order-notification addresses are also
 * accepted so current single-admin deployments do not get locked out while
 * migrating to app_metadata.
 *
 * Never use user_metadata here: Supabase users can edit it themselves.
 */
export function isAuthorizedAdminUser(user: AdminIdentity | null | undefined): boolean {
  if (!user) return false

  const role = user.app_metadata?.role
  const roles = user.app_metadata?.roles
  if (role === 'admin' || (Array.isArray(roles) && roles.includes('admin'))) {
    return true
  }

  const allowedIds = new Set(splitList(process.env.ADMIN_USER_IDS))
  if (allowedIds.has(user.id)) return true

  const allowedEmails = getAuthorizedAdminEmails()

  return !!user.email && allowedEmails.has(user.email.toLowerCase())
}
