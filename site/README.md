# Touchward: Marketing Site

A two-page static site for **Touchward** (touch-reward), the app in this repository,
deployed on **Cloudflare Pages**. Same shape as the Have Another Cherry site, much
smaller: no build step, plain HTML/CSS/JS, one Pages Function for the support form.

- **Domain:** `touchward-dopamine.com` (support and privacy email: `support@touchward-dopamine.com`)
- **Cloudflare Pages project:** `touchward-site` (see `wrangler.jsonc`)

## Pages

| File           | URL        | Purpose |
| -------------- | ---------- | ------- |
| `index.html`   | `/`        | Icon, App Store and Google Play buttons, open-source note with the stack and the code layout |
| `support.html` | `/support` | Contact form to `support@`, quick answers, the privacy policy (`#privacy`) and terms (`#terms`) |
| `404.html`     | (fallback) | Not-found page |

`/privacy` and `/terms` redirect to the matching section of `/support` (see
`_redirects`). Those two short URLs are what to paste into App Store Connect and the
Play Console, which both ask for a privacy policy URL and a support URL.

Shared files: `styles.css` (design system, dark ground with the icon's blue and violet),
`support.js` (form), `assets/` (icon), plus `_headers`, `robots.txt`, `sitemap.xml`.

## Before launch: things to fill in

1. **App Store link.** `index.html` links to `https://apps.apple.com/app/touchward/id0000000000`.
   Replace the id with the real one from App Store Connect once the app is listed. The
   Google Play link already uses the package id `com.situatedstrategies.dopamine` from
   `app.json`, so it works as soon as the listing is live.
2. **The real icon.** `assets/icon.svg` is a hand-drawn rendition of the app icon, and the
   PNGs next to it were rendered from it. Drop the real icon PNG over `assets/icon.png`
   (1024 x 1024) and, if you like, regenerate `icon-512.png`, `apple-touch-icon.png`
   (180 x 180) and `favicon.png` (64 x 64) from it. Bump `?v=` on the `<link rel="icon">`
   tags if browsers hold on to the old one.
3. **Resend.** See **Support form** below. Until the key is set, the form falls back to a
   `mailto:` link, so nothing is lost.
4. **Legal review.** The privacy policy and terms in `support.html` are plain-language
   descriptions of what the app does today, written to match the code. They are not
   legal advice. Have someone look them over before launch, and keep them in sync if the
   app starts collecting anything.

## Local preview

Opening the `.html` files directly works, but skips clean URLs, the redirects, and the
form endpoint. To preview exactly how Cloudflare serves it, run the Pages runtime from
this folder:

```bash
cd site
npx wrangler pages dev        # http://127.0.0.1:8788
```

No Cloudflare login required for this.

## Deploy

Connect the Pages project to this repository and set:

- Production branch: `main`
- Root directory: `site`
- Framework preset: `None`, build command blank, build output directory `/`

Pushing to `main` then deploys. To deploy manually instead:

```bash
cd site
npx wrangler login
npx wrangler pages deploy     # targets the project named in wrangler.jsonc
```

`wrangler.jsonc` must keep `"name": "touchward-site"`. If it drifts, a manual deploy
silently creates a second Pages project rather than updating this one.

Attach `touchward-dopamine.com` to the project as a custom domain. Every absolute URL in
the site (`sitemap.xml`, `robots.txt`, the `og:` tags, the canonicals) already uses it.

## Support form

`support.html` posts JSON (`name`, `email`, `platform`, `topic`, `message`, `elapsedMs`,
`source`, `userAgent`) from `support.js` to `/api/support`, the Cloudflare Pages Function
in `functions/api/support.js`. The Function emails the message to
`support@touchward-dopamine.com` through Resend, from
`notifications@touchward-dopamine.com`, with the visitor's address as the reply-to, so
replying to the notification replies to them.

**One-time setup, or the form falls back to mailto:**

1. Add `touchward-dopamine.com` as a sending domain in the Situated Strategies Resend
   account and add the DNS records it gives you (Cloudflare DNS, since the domain is
   there).
2. Create an API key with sending permission on that domain.
3. Add it as `RESEND_API_KEY` under the Pages project's *Settings > Environment
   variables*, for **both** Production and Preview (previews are separate, and the
   branch preview is where every change is checked first).

The key is never committed; `functions/` sits inside the deployed output directory, so its
source is public. Bot filtering is a submit-timing check: a post that arrives under two
seconds after the form rendered is accepted and dropped. No CAPTCHA, no cookies.

Receiving mail at `support@touchward-dopamine.com` is separate from sending. Set up an
email routing rule for the domain (Cloudflare Email Routing forwards to any inbox for
free) so the address exists before it goes into the store listings.

## Analytics

None, on purpose. The privacy policy says the site sets no cookies and has no analytics.
If you add a tag later, update `support.html#privacy` in the same change.

## Writing style

Same rule as the app: no em dashes or en dashes anywhere. Periods, hyphens, and colons.
