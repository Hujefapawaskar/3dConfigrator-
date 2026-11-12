# Soleform: 3D sneaker configurator

Soleform is a real-time 3D sneaker configurator, built as a SaaS-style web app. Customers style 15 zones of a sneaker. For each zone they choose the color and material, and for the shoe as a whole they choose the silhouette, sole, lacing and side graphic, and can add a personal monogram. They see every change instantly in 3D, then save, share or export the design. Exports are images, a 3D model, or PDF documents.

The shoe and every material texture are generated in code, so the project ships with no 3D model or texture files.

## Features

**Studio (`/studio`)**

- **Zones:** 15 configurable zones, grouped into Upper, Sole and Details.
- **Colors:** a curated palette, a custom picker with hex entry, an eyedropper where the browser supports it, and recently used colors.
- **Materials:** 13 procedural physically based (PBR) materials. Options are leather, suede, patent, knit, canvas, metallic, EVA foam, rubber, cotton, waxed, polished metal, brushed metal and nylon thread.
- **Advanced options:**
  - Low, mid or high-top silhouette.
  - Court, runner or platform sole.
  - Criss-cross or straight-bar lacing.
  - Flat, round or rope laces.
  - Wave, bolt, arc or no side graphic.
  - A personalised monogram on the heel or the tongue.
- **View:**
  - 7 camera views with animated transitions.
  - Auto-rotate, an exploded view, fullscreen, and 4 lighting environments.
  - Hover and click parts directly on the 3D model to edit them.
- **Colorways:** 9 preset colorways, a "Surprise me" generator that picks harmonious colors, and undo/redo.
- **Saving and sharing:** live pricing with a breakdown, a size picker, and a demo checkout. Saving a design adds it to your library with a thumbnail. You can also share a link that contains the whole design.
- **Export:**
  - HD PNG, transparent PNG and a 3D model (`.glb`).
  - A multi-page **Spec sheet PDF**: renders from 5 angles, a materials table for all 15 zones, options, personalisation, price and a share link.
  - An **Order confirmation PDF**.
- **Autosave:** your work is saved as you go and restored after a refresh.
- **Keyboard shortcuts:** listed below.

**Marketing site (`/`)**

- A 3D hero with a live colorway switcher.
- A pinned, scroll-driven story built with GSAP ScrollTrigger.
- Features, colorways, pricing, testimonials and FAQ sections.

**My designs (`/designs`)** is a library of saved designs. You can search, sort, rename, duplicate, delete, open, share or download a spec sheet.

**Motion:** branded route transitions (React `<ViewTransition>`), a first-visit preloader, and consistent loading states. All motion respects `prefers-reduced-motion`.

## Tech stack

| Concern | Library |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript (strict) |
| 3D | three.js, @react-three/fiber, @react-three/drei |
| Animation | GSAP (ScrollTrigger, SplitText, Flip) via `@gsap/react` |
| Styling | Tailwind CSS v4 (design tokens in `src/app/globals.css`) |
| State | zustand |
| PDF | @react-pdf/renderer, loaded only when an export starts |
| UI | lucide-react icons, react-colorful |

## Getting started

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project |

Routes: `/` (landing page), `/studio` (configurator), `/designs` (saved designs).

You can deep-link into the studio:

- `/studio?preset=midnight` opens a preset colorway.
- `/studio?id=<savedId>` opens a saved design.
- `/studio?d=<payload>` opens a shared design. The share dialog generates these links.

## Project structure

```text
src/
├─ app/                      Routes, root layout, global CSS, transitions CSS, icons, OG image
│  ├─ studio/                /studio
│  └─ designs/               /designs
├─ components/
│  ├─ studio/                Configurator UI
│  │  ├─ shell/              App bar, stage, view dock, dialogs, hotkeys, export actions
│  │  └─ panel/              Zones, color, material, style options, colorways, price footer
│  ├─ scene/                 3D layer: shoe model, lighting, camera rig, capture, GLB export
│  ├─ landing/               Marketing page sections and the scroll story
│  ├─ designs/               Saved-designs library
│  ├─ transitions/           Route transitions, preloader, brand loader
│  ├─ layout/                Navbar, footer, logo
│  └─ ui/                    Primitives: button, tooltip, dialog, switch, segmented control, toaster
├─ lib/
│  ├─ config/                Domain model: parts, materials, palette, options, presets, pricing, share codec
│  ├─ shoe/                  Procedural shoe geometry (contract in shoe/types.ts)
│  ├─ materials/             Procedural PBR textures and material factory; previews for UI chips
│  ├─ pdf/                   React-PDF documents (spec sheet, order confirmation) and export helpers
│  └─ …                      utils, color, storage, gsap setup, site constants
├─ store/                    zustand stores: studio (with undo/redo), designs library, toasts, URL bootstrap
└─ hooks/                    Media queries, hotkeys, hydration, click-outside
```

## How it works

- **Domain model.** `src/lib/config/types.ts` defines `ShoeDesign`, a small serialisable object holding the 15 part styles plus the shape options. The UI, the 3D scene, persistence, share links and the PDFs all read this one object. Untrusted input from URLs or localStorage passes through `sanitizeDesign`, which falls back field by field instead of throwing the whole design away.
- **Procedural shoe.** `src/lib/shoe` builds every part from parametric surfaces:
  - the footprint outline, the topline, the upper surface, overlay panels with edge walls, and the sole with its tread;
  - the tongue, collar, laces (swept along curves, ending in a bow), instanced eyelets and stitches, and decal patches.
  Shape options rebuild the geometry. Builds are cached by `geometryKey` and released with `dispose()`. UVs are in world units, so textures keep the same physical scale on every part.
- **Materials.** `src/lib/materials` generates tileable normal, roughness and sheen maps in typed arrays and applies them to `MeshPhysicalMaterial`. Colors are applied as given rather than baked into textures, and the renderer uses Neutral tone mapping, so on-screen colors match the swatches.
- **Scene.** `src/components/scene` binds the studio store to the model and drives:
  - GSAP color tweens, hover and selection highlights, and the exploded view;
  - camera views framed from the geometry bounds;
  - lighting rigs built from drei Lightformers, so the app makes no network requests for HDR environments.
  The scene registers a `SceneApi` (`capture`, `exportGLB`) that the UI calls for exports.
- **State.** `useStudio` holds the design with an undo/redo history. Rapid edits with the same key, such as dragging the color picker or typing, merge into one undo step. `bootstrapStudio` loads the design from the URL or from the autosaved draft.
- **Persistence.** Everything is client-side. The draft and the saved library live in localStorage, behind safe wrappers that handle the storage quota and corrupt data.

## Customising

- **Brand name and URL:** `src/lib/site.ts`. Set `NEXT_PUBLIC_SITE_URL` in production so Open Graph URLs are absolute.
- **Colors, fonts and motion tokens:** `src/app/globals.css` (`@theme`) and the font setup in `src/app/layout.tsx`.
- **Zones, materials, palettes, options, presets and prices:** `src/lib/config/*`. The UI is generated from these tables.

## Keyboard shortcuts (studio)

| Action | Keys |
| --- | --- |
| Undo / redo | Ctrl/⌘ + Z · Ctrl/⌘ + Shift + Z or Ctrl/⌘ + Y |
| Save to My designs | Ctrl/⌘ + S |
| Randomize colorway | R |
| Previous / next zone | `[` / `]` |
| Camera views | 1 to 7 |
| Auto-rotate · Exploded view · Fullscreen | A · E · F |
| Shortcut list · Close dialog | ? · Esc |

## Notes

- This is a front-end product demo. There is no backend: checkout is simulated and data stays in the browser.
- Requires WebGL 2. View transitions are a progressive enhancement; browsers without them navigate normally.
- Bundled PDF fonts (Geist, Geist Mono, Bricolage Grotesque, Instrument Serif) are under the SIL Open Font License; see `public/fonts/OFL.txt`.
