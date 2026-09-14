/** Public URLs and addresses the app points people at. The site lives in situatedstrategies/touchward-site. */
export const SITE_URL = "https://touchward-dopamine.com";
export const SUPPORT_URL = `${SITE_URL}/support`;
export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const TERMS_URL = `${SITE_URL}/terms`;
export const SUPPORT_EMAIL = "support@touchward-dopamine.com";
/** The site's Cloudflare Pages Function that emails the support inbox through Resend. */
export const SUPPORT_API = `${SITE_URL}/api/support`;
/** The site's Worker route that emails crash reports to the support inbox. */
export const CRASH_API = `${SITE_URL}/api/crash`;
export const SOURCE_URL = "https://github.com/situatedstrategies/touchward";
/** Opening this link fires a tap. Wire it to a shortcut, the Action Button, or a remapper. */
export const REWARD_LINK = "touchward://reward";
