# Add "Powered by OpenKBS" link to footer

## Context
The platform (УниКомпас — a Bulgarian university comparison app) is built on OpenKBS
but has no attribution. The user wants a simple **"Powered by OpenKBS"** link in the
footer that points back to OpenKBS. (User initially considered a thematic phrasing but
settled on the plain "Powered by OpenKBS" form.)

## Change
Single shared footer component, rendered on every route via `App.jsx`:
`frontend/src/components/Footer.jsx`

Add the attribution to the bottom copyright row (line 40). Convert that single `<p>`
into a flex row so the copyright sits on the left and the OpenKBS link on the right,
reusing the exact link styling already used for the RSVU link (lines 30-37):
`inline-flex items-center gap-1.5 text-xs font-semibold text-accent-soft hover:underline`
with `Icon.globe`.

Result (replacing line 40):

```jsx
<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-xs text-forest/40">© {new Date().getFullYear()} УниКомпас · Хакатон проект „Избор на университет“</p>
  <a
    href="https://openkbs.com"
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-soft hover:underline"
  >
    <Icon.globe size={13} /> Powered by OpenKBS
  </a>
</div>
```

No new icons, colors, or dependencies — `Icon.globe`, `accent-soft`, and the link
pattern all already exist in this file.

## Verify
1. `cd frontend && npm run dev` — open the app, confirm the footer shows
   "Powered by OpenKBS" on the right of the copyright line, link opens openkbs.com.
2. Check responsive: on narrow width the link stacks under the copyright (sm:flex-row).
3. Build + deploy: commit, then `cd frontend && npm run build` and `openkbs site deploy`.

## Files
- `frontend/src/components/Footer.jsx` — only file changed.
