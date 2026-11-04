/** @type {[string, RegExp][]} */
const APPS = [
  ["Messenger", /MessengerForiOS|Orca-Android|FB_IAB\/MESSENGER/],
  ["Facebook", /FBAN|FBAV|FB_IAB/],
  ["Instagram", /Instagram/],
  ["Snapchat", /Snapchat/],
  ["TikTok", /musical_ly|BytedanceWebview|TikTok/]
];

/** @param {string} ua */
const apple = (ua) => /iPhone|iPad|iPod/.test(ua);

export function inApp(ua = navigator.userAgent) {
  const hit = APPS.find(([, pattern]) => pattern.test(ua));
  return hit ? hit[0] : null;
}

export function inAppNote(ua = navigator.userAgent) {
  const app = inApp(ua);
  if (!app) return null;
  const browser = apple(ua) ? "Safari" : "Chrome";
  return `Tu es dans ${app} : ton compte n'existera que dans ${app}. Ouvre plutôt le jeu dans ${browser} : copie le lien et colle-le dans ${browser}.`;
}
