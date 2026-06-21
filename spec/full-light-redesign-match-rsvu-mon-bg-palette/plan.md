# Full light redesign — match rsvu.mon.bg palette

## Context

УниКомпас currently ships a **dark glassmorphism** theme (near-black `ink` backgrounds,
indigo `accent`, white-opacity glass surfaces, starfield overlay). The user wants the
whole site re-themed to look like **https://rsvu.mon.bg/#/** — a light, institutional
design. From the screenshot the user shared, the target palette is:

- **Background:** pale mint / off-white (`#E8F3E9`-ish)
- **Cards / hero panels:** deep forest green (`#0E3B2A`) with light text
- **Primary accent:** vivid green (`#37B96A`)
- **Secondary accent:** coral-red (`#E85B4F`)
- **Body text:** dark forest green / near-black on the light background

The user explicitly chose **"Full light redesign"** — match the screenshot faithfully,
not a partial tweak. The outcome: a bright, green-forward site where the default page
background is light, text is dark, and forest-green panels + green/coral accents carry
the brand. This is purely a visual/theming change — **no logic, routing, or data
changes.**

## Strategy

Drive as much as possible from the **two central theme files** (tailwind.config.js +
index.css) so the per-file pass is mostly mechanical class swaps. The dark theme leans
heavily on `bg-white/[opacity]` glass surfaces and `text-white`/`text-slate-*`; these
are inverted for a light theme. ~17 files reference colors (~143 accent refs, ~155
white/slate text refs, ~62 white-opacity surfaces, 15 `.glass` usages, 5 hardcoded
gradients).

### 1. `frontend/tailwind.config.js` — redefine token scales

Keep the token **names** (`ink`, `accent`) so most existing class names keep working,
but remap their values. Add a forest panel scale + coral secondary.

```js
colors: {
  // page + light surfaces (was near-black). Now mint → white range.
  ink: {
    950: '#e8f3e9', // page background (lightest)
    900: '#ffffff', // raised card surface
    850: '#f1f7f1', // inset / input surface
    800: '#e2ede3', // hover
    700: '#caddce', // borders
  },
  // forest-green panels for hero/feature cards + dark text
  forest: {
    DEFAULT: '#0E3B2A',
    900: '#0a2d20',
    800: '#0E3B2A',
    700: '#155138',
    ink: '#0c2a1e', // darkest — body text on light bg
  },
  // primary accent — vivid green
  accent: {
    DEFAULT: '#37B96A',
    soft: '#2f9e5a',  // readable green TEXT on light bg (was a lighter tint)
    deep: '#2a8f51',  // hover
  },
  // secondary accent — coral
  coral: { DEFAULT: '#E85B4F', soft: '#f2796f', deep: '#d4493e' },
},
```

Note: `accent.soft` was a *lighter* indigo tint for dark bg; on light bg the "soft"
text variant must be *darker* for contrast, hence `#2f9e5a`.

### 2. `frontend/src/index.css` — invert globals + rewrite component classes

- `:root { color-scheme: light; }`
- `body`: `@apply bg-ink-950 text-forest-ink`. Replace the two indigo radial-gradients
  with faint green tints (`rgba(55,185,106,0.10)` and `rgba(14,59,42,0.05)`); switch
  the `body::before` starfield dot to a faint dark `rgba(14,59,42,0.04)` or remove it
  (white dots are invisible on light).
- `.glass`: replace dark glassmorphism with a **solid light card** —
  `@apply rounded-2xl border border-forest/10 bg-ink-900` + soft shadow
  (`0 1px 2px rgba(14,59,42,.06), 0 12px 32px -12px rgba(14,59,42,.12)`). Remove
  `backdrop-blur`.
- `.glass-hover`: `hover:border-accent/40 hover:shadow-lg` (drop white-bg hover).
- `.btn-primary`: stays `bg-accent text-white` (green button, white text).
- `.btn-ghost`: `border-forest/15 bg-white text-forest-ink hover:border-forest/30 hover:bg-ink-850`.
- `.input`: `bg-ink-850 border-forest/15 text-forest-ink placeholder:text-forest/40 focus:border-accent/60 focus:ring-accent/20`.
- `.chip`: `border-forest/10 bg-ink-850 text-forest/70`.
- `.label`: `text-forest/60`.
- `.grad-text`: green gradient `linear-gradient(120deg,#155138,#37B96A,#2a8f51)`.
- Scrollbar thumb: `bg-forest/15` / hover `bg-forest/30`.

### 3. Per-file class pass (the 17 color-referencing files)

Mechanical swaps, guided by these rules:
- `text-white` on a **light** surface → `text-forest-ink`. Keep `text-white` only where
  it sits on a **forest-green or accent** fill (forest panels, primary buttons).
- `text-slate-200/300/400/500` (dimmed light-on-dark) → forest tints
  (`text-forest-ink` / `text-forest/70` / `text-forest/50`).
- `bg-white/[0.03..0.08]` glass surfaces → `bg-ink-900` (white card) or `bg-ink-850`
  (inset), with `border-forest/10`.
- `border-white/5..25` → `border-forest/10..20`.
- `text-accent-soft` used as accent text → keep (now resolves to readable green).
- Hardcoded indigo gradients (Home hero, etc.) → green/forest gradients.
- Where the design wants a dark panel for contrast (Home hero, stat callouts), use
  `bg-forest text-white` with `text-white/80` subtext — mirrors the rsvu hero card.
- Use `coral` for secondary CTAs / highlights to echo the screenshot's red accents.

Files to walk (visual-impact order):
1. `src/components/Navbar.jsx` — header bg (`bg-ink-950/70 backdrop-blur` → light
   `bg-ink-950/80 border-forest/10`), link colors, mobile panel bg.
2. `src/pages/Home.jsx` — hero gradient → forest panel + green; feature cards.
3. `src/components/UniversityCard.jsx` & `PentominoResults.jsx` — result cards.
4. `src/pages/Search.jsx` — form card, region select, results header.
5. `src/components/AuthModal.jsx` — modal surface (`bg-ink-900` now = white); **scrim
   `bg-ink-950/90` is now light mint → invisible; change to `bg-forest/40`** so the
   modal still dims the page. Role buttons recolored.
6. `src/components/Chatbot.jsx` — chat bubbles, input.
7. `src/components/FieldAutocomplete.jsx`, `SpecialtyAutocomplete.jsx`,
   `CriteriaRanker.jsx`, `RegionSubFilter.jsx` — dropdowns/chips.
8. `src/pages/Universities.jsx`, `Profile.jsx`, `Calculator.jsx`, `Community.jsx`.
9. `src/components/Footer.jsx`.

Watch-outs:
- **Auth modal scrim** must move off `ink-950` (now light) to `bg-forest/40`.
- **Navbar** sticky translucent bg must stay light + legible; add `border-forest/10`.
- Green glow `shadow-accent/25` on buttons still reads fine.
- Flags / external images need no change.

## Critical files
- `frontend/tailwind.config.js` — token remap (drives everything)
- `frontend/src/index.css` — globals + `.glass`/`.btn`/`.input`/`.chip`/`.label`/`.grad-text`
- 17 component/page files listed above — mechanical class swaps

## Deploy
1. `cd frontend && npm run build` (catches Tailwind/class errors).
2. Commit (`feat: light green redesign matching rsvu palette`).
3. `openkbs site deploy`.

## Verification
1. `npm run build` succeeds with no errors.
2. agent-browser screenshots at **desktop (1280)** and **mobile (390)**:
   - Home (hero + features), Search (form + results + chatbot), Universities,
     Community, Profile, Calculator, and the **auth modal** (open Регистрация → green
     form, visible scrim, centered).
3. Visual check vs. the rsvu screenshot: light mint background, forest-green panels,
   green primary buttons, coral secondary accents, dark legible text, **no leftover
   dark glassmorphism or indigo**.
4. Contrast sanity: body text + muted labels stay readable on light surfaces (no
   light-grey-on-white).
