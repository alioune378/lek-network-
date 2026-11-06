/** Usernames: 3–20 characters, lower-case letters, digits and underscore. Reserved words prevent impersonation. */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const RESERVED = ['admin', 'administrator', 'administrateur', 'moderator', 'moderateur', 'moderation', 'mod', 'staff', 'support', 'help', 'aide', 'official', 'officiel', 'newsroom', 'redaction', 'redac', 'editor', 'editeur', 'journalist', 'journaliste', 'root', 'system', 'systeme', 'null', 'undefined', 'anonymous', 'anonyme', 'deleted', 'supprime', 'lek', 'leknetwork', 'lek_network', 'lekinfo', 'lek_info', 'lekmedia', 'lek_media', 'lekproductions', 'lek_productions', 'lekstudios', 'lekwatch', 'leklive'];

const fold = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'l')
    .replace(/3/g, 'e')
    .replace(/[^a-z]/g, '');

/** True when a username or display name pretends to be the newsroom, staff or the platform. */
export function impersonates(name: string): boolean {
  const f = fold(name);
  if (!f) return false;
  if (f.startsWith('lek') || f.includes('leknetwork') || f.includes('redactionlek') || f.includes('lekredaction')) return true;
  return RESERVED.some((r) => f === fold(r)) || /^(admin|moderat|staff|official|officiel|redaction|newsroom)/.test(f);
}

export const validUsername = (u: string) => USERNAME_RE.test(u) && !impersonates(u);
