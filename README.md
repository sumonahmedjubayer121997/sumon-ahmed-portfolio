# Sumon Ahmed — Portfolio

An interactive portfolio for a Data Scientist / AI & LLM Engineer, built as a small digital laboratory: the interface
itself demonstrates systems thinking — physics-based UI, WebGL simulations and live, inspectable ML demos.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Three.js + React Three Fiber (+ drei) · Motion · Zustand ·
React Router. Physics is a small hand-written engine (springs, bodies, fields, collisions) — no physics library, because
spring maths is cheaper and more controllable for UI.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # content pull, type-check, client + SSR builds, prerender → dist/
npm run preview    # serve dist/ the way Firebase Hosting does (clean URLs, 404s, /admin shell)
npm run format     # prettier
```

---

## Content — Firebase + private admin

Your content (profile, projects, blog posts, experience, skills, research) lives in **Firestore** and is edited in a private
**content studio at `/admin`**. The public site never talks to Firestore: `npm run build` (and `npm run dev`) first runs
`scripts/content/pull.ts`, which reads _published_ documents, validates them against the zod schemas in
`src/content/schema.ts` (invalid content fails the build) and writes `src/generated/content.json`. Components read it
through `src/content/index.ts`.

```
/admin (Google sign-in, admins/{uid}) ──▶ Firestore + Storage ──(build)──▶ src/generated/content.json ──▶ static site
```

- **No Firebase configured?** The pull falls back to the bundled starter content (`src/content/seed.ts`, built from
  `src/data/*`), so the site always builds. Set `CONTENT_SOURCE=firestore` in CI so placeholders can never ship by
  accident.
- **Placeholders** — starter values that are invented (metrics, email, socials, timeline) are flagged per field. The
  studio overview lists everything still flagged; editing a field (or "Mark as real") clears it.
- **Evaluation figures** — add confusion matrices and precision–recall curves from your real numbers (paste straight
  from a spreadsheet or `sklearn` output), or upload images to Storage. They render as accessible charts on project pages.
- **Blog posts** are written in the studio in a small Markdown dialect (`src/content/markdown.ts`: `##`/`###`
  headings, bullet and numbered lists, code, `$$ formulas $$`, `> [!NOTE]` / `[!TIP]` / `[!WARNING]` callouts, quotes,
  `![alt](https://…)` images, links and `<Demo kind="tfidf" />` for live demos) with a live preview. The syntax is
  MDX-compatible. Invalid posts (an unclosed code block, an unknown demo, an image without alt text) can't be saved and
  fail the build.
- **At build time** each post is parsed and its code highlighted (shiki, colours adjusted to 4.5:1 contrast) into
  `src/generated/posts.json`, loaded only by the post page. The site gets `/blog` (all notes, filterable by tag),
  `/rss.xml`, a table of contents for posts with 3+ sections, heading links, share buttons and related notes.
- **CV and availability** — Profile → _CV and availability_: upload a PDF (up to 700 KB; stored in `site/cv`, written to
  `/cv/<name>.pdf` by each build, so no Storage bucket is needed) or paste a link. A "Download CV" button then appears in
  the hero, contact section, menu and blog author box; the "Available" line can be switched off.
- **Contact form** — messages go to Firestore `messages/{id}`: anyone may create one, only admins read, triage
  (new / read / spam) and delete them in `/admin` → Messages (unread count in the sidebar). Spam checks, enforced by
  `firestore.rules`: an empty honeypot field, ≥ 3 s on the form, length and email checks, at most 3 links, a server
  timestamp; plus one message per browser per minute. The Firebase SDK loads only once someone starts typing. Email
  alerts and stronger bot protection (App Check) are the next step and need the Blaze plan.
- **Drafts and scheduling** — _Published_ off keeps a post out of the build; a future date holds it back until the first
  build on or after that date. Set _Last updated_ when you revise a published post.
- **Organize with AI** (post and project editors) — paste rough notes; Gemini (Firebase AI Logic, `src/admin/ai/`) fills
  the title (plus alternatives), excerpt, tags and body, or a project's summary, problem, approach, pipeline, stack,
  results and decisions. The next number is filled automatically. The model is told to use only what the notes say, and
  `guards.ts` checks it in code: numbers and links missing from the notes are flagged, unsupported results and URLs
  are dropped, and gaps come back as "Questions for you". Nothing is saved until you press Save (new documents start
  unpublished); notes stay in the browser. The SDK loads only when used. App Check guards the requests: reCAPTCHA
  Enterprise (`VITE_RECAPTCHA_SITE_KEY`) on the live site, a debug token in `.env.development.local` on localhost.
  Gemini's free tier needs a project without billing, and this one is on Blaze (Storage requires it), so AI requests go
  through a separate, billing-free Firebase project, `sumon-ai-eb16d` (`VITE_AI_FIREBASE_*`; App Check keys belong to
  it). Free-tier requests are turned away first when Gemini is busy, so the studio falls back from
  `gemini-3.8-flash` to `3.6-flash` to `3.5-flash-lite`; expect 10–30 s, occasionally a "busy, try again" message.
- The AI Lab / Method copy and navigation stay in `src/data/` (structural, not content).

### Try it locally (Firebase Emulator Suite — no real project needed)

```bash
npm run emulators      # Auth, Firestore, Storage on localhost (UI at http://localhost:4000)
npm run dev:emu        # site + /admin wired to the emulators → http://localhost:5173/admin
```

On `/admin` choose **Local test account**, copy the user ID it shows, create a document `admins/<that id>` in the
emulator UI (Firestore tab), press **Check again**, then **Import starter content**. If a section is ever empty (e.g.
a project set up before blog posts moved to Firestore), the overview offers to import just that section.

### Connect your real Firebase project (one-time)

1. `firebase login --reauth`
2. Create a project at console.firebase.google.com → enable **Firestore** (region `europe-west2`), **Storage** and
   **Authentication → Google** sign-in.
3. Project settings → _Your apps_ → add a **Web app**; copy its config into `.env.local` and `.env.production`
   (see `.env.example` — these values are not secret).
4. `firebase use --add` (pick the project), then deploy the security rules:
   `firebase deploy --only firestore:rules,storage`
5. Open `/admin`, sign in with Google, create `admins/<your uid>` in the console as instructed, import the starter
   content and start replacing placeholders.

Security model (see `firestore.rules`, `storage.rules`): published content is publicly readable (it's on the website
anyway); drafts, writes and uploads require an `admins/{uid}` document; contact messages are create-only for visitors
and readable by admins only; assistant logs are server-only.

---

## Architecture

```
src/
  components/
    layout/      Navbar, Footer, CustomCursor, PageTransition, ScrollManager
    sections/    Hero, ProjectSystem, ProjectNode, ProjectIndex, DataModelSection, AILab,
                 PipelineVisualization, AboutSection, ResearchSection, SkillSystem,
                 ExperienceTimeline, BlogSection, ContactSection
    ui/          MagneticButton, TransitionLink, RevealText, ScrollInertia, Tilt, Arrow, SectionLabel
    previews/    Generative SVG previews per project (no stock imagery)
    demos/       TfidfDemo (working recommender), PreprocessDemo (NLP pipeline)
    fallbacks/   Static SVG versions of every WebGL scene
    PhysicsCanvas.tsx   Lazy, visibility-aware WebGL host with fallbacks
  physics/       spring, body, forces, world (PhysicsWorld), particles (ParticleField), spatialHash, noise
  hooks/         useSpringPhysics, useMagneticInteraction, useCursorRepulsion, useParticleSimulation,
                 useScrollPhysics, usePhysicsWorld, useTransitionNavigate, …
  three/         SceneCanvas, ParticleField (hero), HeroScene, DataModelScene, AILabScene, shaders
  lib/           ticker, pointer, scroll, device, store, colour, maths, NLP, TF-IDF, scene layouts
  data/          content (see above)
  pages/         HomePage, ProjectPage, BlogPostPage, NotFoundPage
  content/       zod schemas, seed content, typed accessors, Firebase env
  admin/         private content studio (/admin): auth gate, editors, figure editor
  components/figures/  ConfusionMatrix, PRCurve, EvaluationFigure
scripts/
  content/pull.ts      build-time Firestore pull + validation
  emulators.mjs        starts the Firebase emulators (includes a Windows Java fix)
```

### Physics model

Every interactive object follows the same chain — never `position = mouse`:

```
distance → force → acceleration → velocity → position
```

- `physics/spring.ts` — damped harmonic springs (semi-implicit Euler, sub-stepped for stability).
- `physics/world.ts` — `PhysicsWorld`: bodies with `mass`, `friction`, `springStrength`, `attraction`, `repulsion`,
  `maxVelocity`; damped links; pointer fields; soft collisions; momentum-preserving drag; fixed timestep.
- `physics/particles.ts` — `ParticleField`: typed-array particle simulation (flow field + target springs + pointer
  fields) uploaded straight to GPU buffers.
- `lib/ticker.ts` — one shared `requestAnimationFrame` loop with **read → update → render** phases so layout reads never
  interleave with style writes. Loops sleep when nothing moves.

### Performance

- **Prerendered pages:** every public route is rendered to static HTML at build time (see _Prerendering_ below), so
  text paints before any JavaScript runs and React hydrates the existing markup. The hero and page titles animate in
  with CSS (`intro-rise`), which starts at first paint and simply continues through hydration. On client-side
  navigation to the homepage, sections below the fold render in a time-sliced transition.

- three.js / R3F live in a separate chunk, loaded only when a scene approaches the viewport (the hero waits for idle).
- Render loops pause off-screen; adaptive pixel ratio via drei's `PerformanceMonitor`.
- Particle budgets by device tier (`lib/device.ts`); fewer particles and no physics stages on mobile.
- No React re-renders in animation paths: refs, typed arrays and transient Zustand reads only.

### Prerendering, SEO and link previews

`npm run build` runs: content pull → `tsc -b` → client build → SSR build of `src/entry-server.tsx` →
`scripts/prerender.ts`, which writes:

- `index.html`, `work/<slug>.html`, `blog/<slug>.html` and `404.html` — complete HTML per route, with its own `<title>`,
  description, canonical URL, Open Graph / Twitter tags, JSON-LD (`Person` + `WebSite`, `CreativeWork`,
  `BlogPosting`) and `modulepreload` links for the route's chunks;
- `og/*.png` — 1200×630 link-preview images drawn with satori + resvg (`scripts/og.ts`);
- `sitemap.xml` and `robots.txt`; `app.html` — an empty client shell, served only for `/admin`.

`SITE_URL` (default `https://sumonahmed.web.app`) sets canonical and Open Graph URLs — set it in `.env.production`
when a custom domain is added.

**Hydration rule:** the browser's first render must match the server's HTML. Browser-only values (WebGL support,
quality tier, reduced motion, timings) therefore come from `useClientValue` / `useWebGL` / `useBudget`
(`src/lib/hydration.ts`, `src/hooks/useDevice.ts`): server default during hydration, real value right after.
Never read `window`, `navigator` or `performance` during render.

### Accessibility

- Semantic landmarks, skip link, visible focus rings, real links/buttons for every interactive object
  (WebGL is decorative; its content exists as DOM text and controls).
- After client-side navigation, focus moves to the new page's `<h1>` and its title is announced in a live region
  (`ScrollManager`), as a full page load would. Without JavaScript, scroll-reveal text is shown immediately.
- `prefers-reduced-motion`: custom cursor and physics disabled, WebGL replaced by static SVG renders of the same
  scenes, scroll stories become small multiples, page transitions become instant.

### Embedding map (`/map`)

After the content pull, `scripts/content/embed.ts` splits the writing into passages (project overviews and steps, blog
sections, research, about, experience, skills), embeds each locally with `all-MiniLM-L6-v2` (transformers.js — no API
key; the ~23 MB model is cached in `node_modules/.cache`), keeps each passage's 3 nearest neighbours by cosine
similarity, and lays everything out in 3D with a seeded UMAP. The result (`src/generated/embedding-map.json`, cached by
content hash) is loaded only by `/map`: a WebGL scene you can drag (with momentum), hover and click to pin, plus a
panel with the exact similarities and a full passage list for keyboards and screen readers. Without WebGL or with
reduced motion it falls back to a 2D projection. If the model can't be downloaded, the build keeps the previous map.

### Keyboard

| Key                     | Action                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `⌘K` / `Ctrl K`, or `/` | Command palette: jump to any project, note or section; copy email, download CV, RSS    |
| `D`                     | Lab mode: velocity vectors, springs, collision radii, link strain and a live stats HUD |
| `M`                     | Sound on / off (also the speaker button in the nav, the footer and the palette)        |
| `↑` `↓` `↵` `Esc`       | Move, open and close inside the palette                                                |

Lab mode is off for reduced-motion users (and its footer switch hidden); the palette and HUD load on first use.

### Sound

Off by default and remembered per browser (`src/lib/sound.ts`). Everything is synthesised with the Web Audio API —
no audio files — by `src/lib/soundEngine.ts`, a ~1.3 KB (gzipped) chunk loaded only when someone turns sound on. Notes
come from a pentatonic scale, so overlapping sounds never clash. Sounds follow actions only: dragging and throwing
project and skill nodes (collisions are louder the harder they hit, lower for bigger nodes, and only heard around a
drag — not while scrolling), holding the mouse down in the hero, opening the palette and choosing an item, Lab mode,
sending a message, and the map (a note per colour group as the pointer crosses dots, a chord when a passage is
pinned). Audio pauses while the tab is hidden, and nothing on the site depends on hearing it.

### Debug switches

| URL parameter          | Effect                                            |
| ---------------------- | ------------------------------------------------- |
| `?webgl=0`             | Force the non-WebGL fallbacks                     |
| `?motion=reduce`       | Simulate `prefers-reduced-motion`                 |
| `?tier=low\|mid\|high` | Force a quality tier (particle budgets)           |
| `?settled`             | Pre-run simulations to their organised state (QA) |

---

## Notes

- `three` is pinned to r182: from r183 `THREE.Clock` is deprecated, and React Three Fiber 9 still constructs one, which
  logs a console warning. Lift the pin once R3F switches to `THREE.Timer`.
- Lighthouse in a headless/CI environment renders WebGL in software (SwiftShader), which inflates Total Blocking Time.
  Measure on a real device for representative numbers.

## Publishing and deployment

Firebase Hosting, site `sumonahmed` (https://sumonahmed.web.app). `.github/workflows/deploy.yml` builds from Firestore
(`CONTENT_SOURCE=firestore`, so placeholder content can never ship) and deploys. It runs when you press **Publish now**
in `/admin`, on every push to `main`, and daily at 05:30 UTC (scheduled posts appear on their day). Pull requests run
`.github/workflows/checks.yml`: formatting, type-check and the full build.

One-time setup for the Publish button:

1. In the project folder run `npx firebase init hosting:github` — it signs in to GitHub and stores the deploy key as the
   repository secret `FIREBASE_SERVICE_ACCOUNT_PORTFOLIOCLAUDE_1C692`. Answer _No_ to both workflow questions (the
   project has its own); if it writes `firebase-hosting-*.yml` files, delete them.
2. Create a [fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new): only this repository,
   permission _Actions: Read and write_.
3. Paste it in `/admin` → Overview → Publishing. It is stored in `site/publish`, which only admins can read, and is
   never part of the public site.

Until the deploy key exists, the workflow still builds (and fails on invalid content) but skips the deploy.

Manual deploy, from your machine:

```bash
npm run build
npx firebase deploy --only hosting
```

`firebase.json` serves the prerendered files with clean URLs, sends unknown paths to `404.html` with a real 404
status, rewrites `/admin` to the client-only `app.html`, marks HTML `no-cache` and hashed assets immutable. For Google
sign-in on the live `/admin`, add the site's domain under Firebase Authentication → Settings → Authorized domains.
