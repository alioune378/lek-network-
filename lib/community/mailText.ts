type L = 'fr' | 'en' | 'ar';
const pick = (l?: string): L => (l === 'en' || l === 'ar' ? l : l === 'fr' || l === 'wo' ? 'fr' : 'en');

const T = {
  verify: {
    fr: ['Confirmez votre adresse — LËK Community', 'Bonjour,\n\nPour activer votre compte LËK Community, ouvrez ce lien (valable 24 heures) :\n{url}\n\nSi vous n’avez rien demandé, ignorez ce message.\n\nLËK Network — Toujours un temps d’avance.'],
    en: ['Confirm your address — LËK Community', 'Hello,\n\nTo activate your LËK Community account, open this link (valid for 24 hours):\n{url}\n\nIf you did not ask for this, ignore this message.\n\nLËK Network'],
    ar: ['أكّد عنوانك — LËK Community', 'مرحباً،\n\nلتفعيل حسابك في LËK Community افتح هذا الرابط (صالح 24 ساعة):\n{url}\n\nإذا لم تطلب ذلك فتجاهل هذه الرسالة.\n\nLËK Network'],
  },
  reset: {
    fr: ['Réinitialiser votre mot de passe — LËK', 'Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n{url}\n\nSi vous n’avez rien demandé, ignorez ce message : votre mot de passe ne change pas.'],
    en: ['Reset your password — LËK', 'Hello,\n\nTo choose a new password, open this link (valid for 1 hour):\n{url}\n\nIf you did not ask for this, ignore this message: your password stays the same.'],
    ar: ['إعادة تعيين كلمة المرور — LËK', 'مرحباً،\n\nلاختيار كلمة مرور جديدة افتح هذا الرابط (صالح ساعة واحدة):\n{url}\n\nإذا لم تطلب ذلك فتجاهل الرسالة: كلمة مرورك لن تتغير.'],
  },
  existing_account: {
    fr: ['Tentative d’inscription — LËK Community', 'Bonjour,\n\nQuelqu’un a essayé de créer un compte LËK Community avec votre adresse, qui a déjà un compte. Si c’était vous, connectez-vous ou réinitialisez votre mot de passe :\n{url}\n\nSinon, vous pouvez ignorer ce message.'],
    en: ['Registration attempt — LËK Community', 'Hello,\n\nSomeone tried to create a LËK Community account with your address, which already has an account. If it was you, sign in or reset your password:\n{url}\n\nOtherwise you can ignore this message.'],
    ar: ['محاولة تسجيل — LËK Community', 'مرحباً،\n\nحاول أحدهم إنشاء حساب في LËK Community بعنوانك، وهو مرتبط بحساب موجود. إن كنت أنت فسجّل الدخول أو أعد تعيين كلمة المرور:\n{url}\n\nوإلا فتجاهل هذه الرسالة.'],
  },
} as const;

export function mailText(kind: keyof typeof T, locale: string | undefined, url: string) {
  const [subject, text] = T[kind][pick(locale)];
  return { subject, text: text.replace('{url}', url) };
}
