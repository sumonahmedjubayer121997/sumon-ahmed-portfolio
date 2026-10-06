# Sumon Ahmed — Portfolio

An interactive portfolio for a Data Scientist / AI & LLM Engineer, built as a small digital laboratory: the interface
itself demonstrates systems thinking — physics-based UI, WebGL simulations and live, inspectable ML demos.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Three.js + React Three Fiber (+ drei) · Motion · Zustand ·
React Router. Physics is a small hand-written engine (springs, bodies, fields, collisions) — no physics library, because
spring maths is cheaper and more controllable for UI.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
npm run format     # prettier
```

---

## Content — Firebase + private admin

Your content (profile, projects, experience, skills, research) lives in **Firestore** and is edited in a private
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
- Blog posts and the AI Lab / Method copy still live in `src/data/` (posts move to MDX in a later stage).

### Try it locally (Firebase Emulator Suite — no real project needed)

```bash
npm run emulators      # Auth, Firestore, Storage on localhost (UI at http://localhost:4000)
npm run dev:emu        # site + /admin wired to the emulators → http://localhost:5173/admin
```

On `/admin` choose **Local test account**, copy the user ID it shows, create a document `admins/<that id>` in the
emulator UI (Firestore tab), press **Check again**, then **Import starter content**.

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
anyway); drafts, writes and uploads require an `admins/{uid}` document; assistant logs and messages are server-only.

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

- **First paint without JavaScript:** `build/htmlShell.ts` renders the navigation and hero copy (from
  `src/data/site.ts`) into `index.html` at build time, so text paints before the bundle runs. React replaces it on mount
  and continues the CSS intro from the same point, and below-the-fold sections render in a time-sliced transition.

- three.js / R3F live in a separate chunk, loaded only when a scene approaches the viewport (the hero waits for idle).
- Render loops pause off-screen; adaptive pixel ratio via drei's `PerformanceMonitor`.
- Particle budgets by device tier (`lib/device.ts`); fewer particles and no physics stages on mobile.
- No React re-renders in animation paths: refs, typed arrays and transient Zustand reads only.

### Accessibility

- Semantic landmarks, skip link, visible focus rings, real links/buttons for every interactive object
  (WebGL is decorative; its content exists as DOM text and controls).
- `prefers-reduced-motion`: custom cursor and physics disabled, WebGL replaced by static SVG renders of the same
  scenes, scroll stories become small multiples, page transitions become instant.

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

## Deployment

It's a static SPA. Deep links (`/work/…`, `/blog/…`) need a rewrite to `index.html`:

- **Netlify** — `public/_redirects` is included.
- **Vercel** — `vercel.json` is included.
- **Firebase Hosting** — add `"rewrites": [{ "source": "**", "destination": "/index.html" }]`.
