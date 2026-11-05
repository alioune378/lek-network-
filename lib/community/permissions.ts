import { STAFF_SESSION_HOURS, staffNeeds2fa } from './config';

export type StaffRole = 'journalist' | 'editor' | 'moderator' | 'admin' | 'owner';
export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
  locale: string | null;
  twoFactorEnabled: boolean;
  /** When the current session was signed in. */
  sessionCreatedAt: string;
  staff: { role: StaffRole; title: string } | null;
  restriction: { kind: 'comment_restricted' | 'suspended'; endsAt: string | null; reason: string } | null;
  deleted: boolean;
};

const RANK: Record<StaffRole, number> = { journalist: 1, moderator: 2, editor: 3, admin: 4, owner: 5 };
export const roleRank = (r: StaffRole | null | undefined) => (r ? RANK[r] : 0);

/**
 * Why staff powers are unavailable right now (null = available).
 * Staff powers require: a staff record, a verified email, no restriction, two-step verification,
 * and a session signed in within the last STAFF_SESSION_HOURS hours.
 */
export function staffBlock(v: Viewer | null): null | 'not_staff' | 'email_unverified' | 'restricted' | 'two_factor_required' | 'staff_session_expired' {
  if (!v?.staff || v.deleted) return 'not_staff';
  if (!v.emailVerified) return 'email_unverified';
  if (v.restriction) return 'restricted';
  if (staffNeeds2fa() && !v.twoFactorEnabled) return 'two_factor_required';
  if (Date.now() - new Date(v.sessionCreatedAt).getTime() > STAFF_SESSION_HOURS * 3600_000) return 'staff_session_expired';
  return null;
}
const staffOk = (v: Viewer | null, min: StaffRole | StaffRole[]) =>
  staffBlock(v) === null && (Array.isArray(min) ? min.includes(v!.staff!.role) || roleRank(v!.staff!.role) >= RANK.editor : roleRank(v!.staff!.role) >= RANK[min]);

/** Every capability is checked on the server; the interface only mirrors these rules. */
export const can = {
  comment: (v: Viewer | null) => Boolean(v && v.emailVerified && !v.deleted && !v.restriction),
  react: (v: Viewer | null) => Boolean(v && v.emailVerified && !v.deleted && v.restriction?.kind !== 'suspended'),
  report: (v: Viewer | null) => Boolean(v && v.emailVerified && !v.deleted && v.restriction?.kind !== 'suspended'),
  /** Editorial notes and the staff badge's privileges. */
  staffNote: (v: Viewer | null) => staffBlock(v) === null && can.comment(v),
  /** Moderation queue and decisions: moderators, editors, admins, owner. Journalists cannot moderate. */
  moderate: (v: Viewer | null) => staffOk(v, ['moderator']),
  /** Private newsroom inbox: any verified staff member. */
  inbox: (v: Viewer | null) => staffBlock(v) === null,
  /** Staff verification and pilot invitations: admins and the owner. */
  manageStaff: (v: Viewer | null) => staffOk(v, 'admin'),
  invite: (v: Viewer | null) => staffOk(v, 'admin'),
  /** Pilot questionnaire results: editors and above. */
  pilotResults: (v: Viewer | null) => staffOk(v, 'editor'),
};

/** Only the owner may grant or revoke admin/owner; admins may manage roles below admin. Nobody changes their own role. */
export function canAssignRole(actor: Viewer, target: StaffRole | 'revoke', currentTargetRole: StaffRole | null): boolean {
  if (!can.manageStaff(actor)) return false;
  const actorRank = roleRank(actor.staff!.role);
  const needed = Math.max(target === 'revoke' ? 0 : RANK[target], roleRank(currentTargetRole));
  return actor.staff!.role === 'owner' ? true : needed < RANK.admin && actorRank >= RANK.admin;
}
