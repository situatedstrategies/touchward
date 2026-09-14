/* ==========================================================================
   POST /api/support
   ==========================================================================

   Cloudflare Pages Function behind the support form on support.html. Takes the
   JSON that support.js posts and emails it to support@touchward-dopamine.com
   through Resend, with the visitor's address as the reply-to.

   Configuration, none of it in this repository:

     RESEND_API_KEY   Set under the Pages project: Settings > Environment
                      variables, for BOTH the Production and Preview
                      environments, or the form on branch previews fails and
                      falls back to mailto. The key needs sending permission
                      on touchward-dopamine.com, which must be a verified
                      sending domain in the Situated Strategies Resend account.

   Never paste the key into this file. functions/ sits inside the deployed
   output directory, so treat everything here as public.

   Bot handling: the client reports how long the form was on screen, and a
   post that arrives faster than a person could type is accepted with a 200
   and quietly dropped. No CAPTCHA, no honeypot field, no cookies.
   ========================================================================== */

const TO = 'support@touchward-dopamine.com';
const FROM = 'Touchward <notifications@touchward-dopamine.com>';
const MIN_ELAPSED_MS = 2000;
const MAX = { name: 120, email: 254, topic: 80, platform: 40, message: 8000, source: 500, userAgent: 400 };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clip = (value, limit) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Header injection guard for the one field that becomes an address.
const EMAIL_OK = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    // Surfaced as a 500 so support.js shows the mailto fallback rather than a
    // false confirmation. Fix by setting the variable, not by editing code.
    return json({ ok: false, error: 'Support form is not configured on this deployment.' }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'Expected a JSON body.' }, 400);
  }

  const name = clip(data.name, MAX.name);
  const email = clip(data.email, MAX.email);
  const topic = clip(data.topic, MAX.topic) || 'Something else';
  const platform = clip(data.platform, MAX.platform);
  const message = clip(data.message, MAX.message);
  const source = clip(data.source, MAX.source);
  const userAgent = clip(data.userAgent, MAX.userAgent) || request.headers.get('User-Agent') || '';
  const elapsedMs = Number(data.elapsedMs);

  if (!EMAIL_OK.test(email)) return json({ ok: false, error: 'Please add a valid email address.' }, 400);
  if (!message) return json({ ok: false, error: 'Please include a message.' }, 400);

  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_ELAPSED_MS) {
    return json({ ok: true, dropped: true });
  }

  const receivedAt = new Date().toISOString();
  const who = name ? `${name} <${email}>` : email;

  const lines = [
    `From: ${who}`,
    `Topic: ${topic}`,
    platform ? `Phone: ${platform}` : null,
    `Received: ${receivedAt}`,
    `Page: ${source}`,
    userAgent ? `Browser: ${userAgent}` : null,
  ].filter((line) => line !== null);

  const text = lines.concat(['', message]).join('\n');
  const html = `<p>${lines.map(escapeHtml).join('<br>')}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `Touchward support: ${topic}${name ? ` (${name})` : ''}`,
      text,
      html,
      tags: [{ name: 'source', value: 'touchward-support-form' }],
    }),
  });

  if (!res.ok) {
    // Resend's own error text is useful in the Pages log but is not for the
    // visitor, who only needs to know to try the mailto fallback.
    console.error('Resend rejected the support email', res.status, await res.text());
    return json({ ok: false, error: 'Could not send right now.' }, 502);
  }

  return json({ ok: true });
}

// Only POST is handled. Any other method falls through to static assets and
// gets the site's 404, so the URL never reads as a page.
