/**
 * Deterministic content checks. Pure functions (no database), unit-tested in tests/community.
 *
 * Principles:
 * - Only obvious technical abuse is rejected outright (link floods, blocked link types).
 * - Everything else that looks risky is HELD for a human, never removed automatically.
 * - There is no list of political words and no scoring of opinions. Criticism of public officials,
 *   satire and unpopular views are not signals.
 */
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Signal = { code: string; severity: Severity; detail?: string };
export type Verdict = { outcome: 'publish' | 'hold' | 'reject'; signals: Signal[]; severity: Severity | null };

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const SHORTENERS = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rb\.gy|shorturl\.at|tiny\.cc|s\.id|lnkd\.in)\b/i;
const IP_LINK = /\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i;
const BAD_SCHEME = /\b(?:javascript|data|vbscript|file):/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Phone numbers: Senegal (+221 / 7x xxx xx xx) and generic international formats with 9+ digits.
const PHONE_RE = /(?:\+|00)\s?\d{1,3}[\s.-]?(?:\d[\s.-]?){8,12}\d|\b7[05678][\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/;
const PROMO_RE = /\b(?:promo(?:tion)?|code promo|discount|r[ée]duction|gagnez|win money|earn \$?\d+|crypto(?:monnaie)?|bitcoin|forex|casino|paris sportifs|1xbet|betting|loan|pr[êe]t rapide|whatsapp me|contactez[- ]moi sur whatsapp|dm me|follow me|abonnez[- ]vous|subscribe to my)\b/i;
// Explicit threats of violence (directed). Kept deliberately narrow: words like "kill" in news discussion are not signals on their own.
const THREAT_RE = [
  /\b(?:je vais|on va|j['’]?vais)\s+(?:te|vous|le|la|les)\s+(?:tuer|buter|égorger|egorger|brûler|bruler|frapper|retrouver)\b/i,
  /\b(?:i(?:'m| am)? (?:going to|gonna|will)|we (?:will|are going to))\s+(?:kill|hurt|shoot|stab|burn|find) (?:you|him|her|them)\b/i,
  /(?:سأقتلك|سنقتلك|سأذبحك|سنذبحك|سأحرقك)/,
  /\bdinaa\s+la\s+(?:rey|bóom|boom)\b/i,
  /\b(?:you|tu|vous)\s+(?:will|vas|allez)\s+(?:die|mourir)\b/i,
];

const order: Severity[] = ['low', 'medium', 'high', 'critical'];
const max = (a: Severity | null, b: Severity) => (a === null || order.indexOf(b) > order.indexOf(a) ? b : a);

export type CheckInput = {
  body: string;
  /** Minutes since the account was created. */
  accountAgeMin: number;
  /** Same text already posted by this author in the last 24 h. */
  ownDuplicates: number;
  /** Same text posted by other accounts in the last hour (coordinated / mass duplicates). */
  othersDuplicates: number;
  /** Moderation actions against the author in the last 90 days (excluding dismissals). */
  recentViolations: number;
};

export function analyse(i: CheckInput): Verdict {
  const s: Signal[] = [];
  const links = i.body.match(URL_RE) ?? [];
  if (BAD_SCHEME.test(i.body)) s.push({ code: 'dangerous_link', severity: 'high' });
  if (links.length > 3) s.push({ code: 'link_flood', severity: 'high', detail: String(links.length) });
  else if (links.length > 1) s.push({ code: 'many_links', severity: 'medium', detail: String(links.length) });
  if (links.some((l) => SHORTENERS.test(l))) s.push({ code: 'link_shortener', severity: 'medium' });
  if (links.some((l) => IP_LINK.test(l))) s.push({ code: 'ip_link', severity: 'high' });
  if (links.length && i.accountAgeMin < 60 * 24) s.push({ code: 'new_account_link', severity: 'medium' });
  if (PROMO_RE.test(i.body)) s.push({ code: 'promotional', severity: links.length ? 'medium' : 'low' });
  if (EMAIL_RE.test(i.body)) s.push({ code: 'private_info_email', severity: 'high' });
  if (PHONE_RE.test(i.body)) s.push({ code: 'private_info_phone', severity: 'high' });
  if (THREAT_RE.some((r) => r.test(i.body))) s.push({ code: 'threat', severity: 'critical' });
  if (i.ownDuplicates >= 3) s.push({ code: 'duplicate_flood', severity: 'high', detail: String(i.ownDuplicates) });
  else if (i.ownDuplicates >= 1) s.push({ code: 'duplicate', severity: 'low', detail: String(i.ownDuplicates) });
  if (i.othersDuplicates >= 2) s.push({ code: 'coordinated_duplicate', severity: 'high', detail: String(i.othersDuplicates) });
  const letters = i.body.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 30 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) s.push({ code: 'all_caps', severity: 'low' });
  if (/(.)\1{14,}/u.test(i.body)) s.push({ code: 'repeated_characters', severity: 'low' });
  if (i.recentViolations >= 2) s.push({ code: 'repeat_offender', severity: 'medium', detail: String(i.recentViolations) });

  let sev: Severity | null = null;
  for (const x of s) sev = max(sev, x.severity);
  // Reject only clear technical abuse; never for opinions.
  const reject = s.some((x) => ['link_flood', 'dangerous_link', 'ip_link', 'duplicate_flood'].includes(x.code));
  const hold = s.some((x) => x.severity === 'high' || x.severity === 'critical' || ['link_shortener', 'new_account_link', 'repeat_offender', 'many_links'].includes(x.code));
  return { outcome: reject ? 'reject' : hold ? 'hold' : 'publish', signals: s, severity: sev };
}

/** Normalised text used for duplicate detection. */
export function fingerprint(body: string): string {
  return body
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/https?:\/\/\S+/g, 'URL')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Graduated accountability: the suggested next step given past actions (moderators may go further). */
export const LADDER = ['educational_notice', 'warning', 'remove_comment', 'restrict', 'suspend', 'escalate'] as const;
export function suggestNextStep(previous: string[], severity: Severity): (typeof LADDER)[number] {
  if (severity === 'critical') return 'suspend';
  const rank = Math.max(-1, ...previous.map((a) => LADDER.indexOf(a as (typeof LADDER)[number])));
  const base = severity === 'high' ? 2 : 0;
  return LADDER[Math.min(LADDER.length - 1, Math.max(base, rank + 1))];
}
