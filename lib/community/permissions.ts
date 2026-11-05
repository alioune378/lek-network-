export type StaffRole = 'journalist' | 'editor' | 'moderator' | 'admin';
export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
  locale: string | null;
  staff: { role: StaffRole; title: string } | null;
  restriction: { kind: 'comment_restricted' | 'suspended'; endsAt: string | null; reason: string } | null;
  deleted: boolean;
};

/** Every capability is checked on the server; the interface only mirrors these rules. */
export const can = {
  comment: (v: Viewer | null) => Boolean(v && v.emailVerified && !v.deleted && !v.restriction),
  react: (v: Viewer | null) => Boolean(v && v.emailVerified && !v.deleted && v.restriction?.kind !== 'suspended'),
  report: (v: Viewer | null) => Boolean(v && v.emailVerified && !v.deleted && v.restriction?.kind !== 'suspended'),
  staffNote: (v: Viewer | null) => Boolean(v?.staff && can.comment(v)),
  moderate: (v: Viewer | null) => Boolean(v?.staff && ['moderator', 'editor', 'admin'].includes(v.staff.role) && !v.restriction),
  inbox: (v: Viewer | null) => Boolean(v?.staff && !v.restriction),
  manageStaff: (v: Viewer | null) => v?.staff?.role === 'admin' && !v.restriction,
};
