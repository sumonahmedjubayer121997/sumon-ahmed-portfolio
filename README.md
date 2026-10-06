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

## Replacing the content

All copy lives in `src/data/` — components never hard-code content.

| File            | What it holds                                                                            |
| --------------- | ---------------------------------------------------------------------------------------- |
| `site.ts`       | Name, roles, statement, intro, location, **email**, **social links**, nav                |
| `projects.ts`   | The four projects, their concept links, positions in the project system, case-study copy |
| `aiLab.ts`      | AI Lab components, links and the two animated pipelines (RAG, agent loop)                |
| `dataModel.ts`  | The four Data → Model stages and prediction class shares                                 |
| `about.ts`      | About heading, paragraphs, facts and the discipline path                                 |
| `research.ts`   | MSc dissertation details, abstract, figure stages                                        |
| `skills.ts`     | Skill groups, their items and their centres in the ecosystem                             |
| `experience.ts` | Timeline milestones                                                                      |
| `blog.ts`       | Posts as structured blocks (`p`, `h2`, `code`, `formula`, `list`, `demo`)                |
| `catalogue.ts`  | Fictional titles used by the TF-IDF demo                                                 |

**Before publishing**, search for `TODO` and `PLACEHOLDER`:

- `site.ts` — the email address (`hello@sumonahmed.dev`) and social URLs are placeholders.
- `projects.ts` — outcome metrics marked `PLACEHOLDER` are illustrative. Replace them with your real results.
- `research.ts` / `experience.ts` — confirm years, roles and the risk value shown in Fig. 1 (`ResearchSection.tsx`).

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
