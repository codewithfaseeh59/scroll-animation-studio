You are helping me build scroll-animation-studio in this repo folder. First, save this whole brief as CLAUDE.md in the repo root (exactly as written), then do STEP 1 only.

## RULES
1. I am the only author. Never add "Co-Authored-By", Claude, Anthropic or "Generated with" lines anywhere (commits, PRs, README, comments, files).
2. NEVER run git commit, git push, or create/merge pull requests. Write the code, then give me: branch name, commit message, PR title and PR description. I run the Git commands myself.
3. ONE STEP PER MESSAGE. Do exactly the step I name, then STOP and wait. Never write code for a later step, even if it seems efficient. If a step is too big, tell me and propose how to split it.
4. Every step must leave the app building, with typecheck, lint and tests passing, so each branch can merge on its own.
5. After each step explain in 3-5 simple lines what you built and why. I must be able to explain every file in an interview.
6. TypeScript strict, no `any`. Dependencies: react, react-dom, zustand, plus dev tools (vite, vitest, testing-library, eslint, prettier, playwright later). NO animation library inside the editor, and NO GSAP anywhere (its license restricts visual animation tools). Do not add other dependencies without asking me.
7. Every test must use hand-checked numbers. If a test fails, fix the code, not the test.
8. No placeholder junk, dead code, unused dependencies or commented-out code.
9. If you need a fact you cannot verify (for example browser support for CSS scroll-driven animations), say so and tell me what to check. Do not guess.

## PROJECT
ScrollStudio: a visual editor where a developer builds a scroll-driven animation scene (layers + keyframes on a scroll-progress timeline), previews it live, and exports clean code. It is a developer tool, not a no-code site builder.
The editor has its own pure-TypeScript animation engine for the preview. Exporters generate: (a) native CSS scroll-driven animations (animation-timeline, animation-range, @keyframes), zero dependencies; (b) Motion (MIT, motion.dev) React + TypeScript code using useScroll and useTransform. Every export includes prefers-reduced-motion handling (static final layout, no motion) and a graceful fallback where scroll-driven animations are unsupported.
Stack: Vite, React 18+, TypeScript strict, zustand, CSS variables + CSS Modules (light/dark), Vitest + React Testing Library, Playwright (one e2e late), ESLint + Prettier, GitHub Actions CI, deploy on Vercel. MIT license.

## DOCUMENT MODEL (pure TS, no React)
Project: { version, name, sceneLength (in viewport heights, e.g. 4 means 400vh), stage aspect ratio, layers[] }
Layer: { id, name, type: "rect" | "text" | "image", base: {x, y, width, height} in % of the stage, style (color, text, fontSize, src, radius), keyframes[] }
Keyframe: { id, progress (0..1 of the scene scroll), values: partial of { translateX, translateY (% of the layer), scale, rotate (deg), opacity, blur (px) }, ease }
Easing set (fixed): linear, easeIn, easeOut, easeInOut (cubic-bezier based), plus power2In/power2Out/power2InOut and sineInOut implemented by me as pure functions. Each maps to a CSS cubic-bezier or timing keyword for export.
Interpolation: before the first keyframe hold the first values; after the last hold the last; between two keyframes apply the SECOND keyframe's ease to the local progress; a property missing from a keyframe is not animated at that keyframe (use the nearest keyframe that defines it).

## FEATURES
Stage (aspect-ratio frame) with layers; add rect/text/image layers; select, drag (with snapping to edges, center and other layers), resize and rotate handles; inspector with numeric inputs; bottom timeline (ruler 0-100%, a row per layer, draggable keyframe diamonds, playhead scrubbing); auto-key (changing a property with the playhead at p creates or updates a keyframe at p); per-keyframe easing picker; undo/redo; scrub preview driven by my engine; "Browser preview" iframe that runs the real exported CSS with real scrolling (show a clear message if the browser does not support scroll-driven animations); export dialog with tabs (CSS, Motion React + TSX, single-file HTML, project JSON) with copy and download; autosave to localStorage; import/export project JSON with a versioned schema and migrations; share link (project JSON compressed in the URL hash, with a size limit and safe fallback on bad input); 4 templates (fade-up title, parallax layers, zoom-through, slide-in cards); keyboard shortcuts (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, K adds keyframe, Delete, arrows nudge, Space toggles playback of the scrub preview); light/dark theme; the editor itself is keyboard accessible and labelled.
Export rules: the CSS export uses a tall wrapper with a sticky stage, a view-timeline on the wrapper, and animation-range from contain 0% to contain 100%; layers animate with the individual transform properties (translate, scale, rotate), opacity and filter. Wrap in @supports (animation-timeline: view()). Add the prefers-reduced-motion block. Verify the exact syntax against MDN, and if you cannot access it, tell me what to verify.

## FOLDER STRUCTURE
src/engine/ (types, validate, ease, interpolate, document, history, serialize, migrate, codegen/{shared,css,motionReact,html}) + tests
src/store/editorStore.ts
src/components/ (Stage, LayerList, Inspector, Timeline, BrowserPreview, ExportDialog, Toolbar, Templates, ui)
src/hooks/, src/lib/ (geometry, id, download, clamp), src/templates/, src/styles/
.github/workflows/ci.yml, .claude/settings.json, LICENSE (MIT)

## TESTS (hand-checked numbers)
- ease: linear(0.5)=0.5, power2In(0.5)=0.25, power2Out(0.5)=0.75, all eases return 0 at 0 and 1 at 1
- interpolate: holds before first and after last keyframe; midpoint between opacity 0 and 1 with linear is 0.5; second keyframe's ease is used
- document ops are immutable; removing a layer removes its keyframes; keyframes stay sorted by progress
- history: undo/redo, redo cleared by a new edit, depth limit
- serialize: JSON and URL-hash round trip; garbage input returns a safe error; migrate upgrades an old version
- codegen CSS: keyframe percentages sorted and within 0-100; contains @supports, animation-timeline and the reduced-motion block
- codegen Motion: generated TSX has no syntax errors (check with ts.transpileModule diagnostics) and imports only from "motion/react"
- geometry: snapping thresholds, resize and rotate math
- e2e (late): add a layer, add two keyframes, open export, and the CSS contains the expected keyframes

## STEPS (each its own branch and PR; I will say "step N")
1 scaffold (main) | 2 feat/design-tokens-and-shell | 3 feat/engine-types-validation | 4 feat/engine-easing | 5 feat/engine-interpolation | 6 feat/engine-document-ops | 7 feat/engine-history | 8 feat/editor-store | 9 feat/stage-rendering | 10 feat/layer-list-and-add | 11 feat/select-and-drag | 12 feat/resize-and-rotate | 13 feat/inspector | 14 feat/timeline-ui | 15 feat/keyframes-and-autokey | 16 feat/scrub-preview | 17 feat/easing-picker | 18 feat/codegen-css | 19 feat/codegen-motion-react | 20 feat/export-dialog-and-html | 21 feat/browser-preview | 22 feat/persistence-and-share | 23 feat/templates | 24 feat/shortcuts-and-a11y | 25 test/e2e | 26 ci/github-actions | 27 docs/readme-and-deploy
PR titles use conventional commits, for example "feat: add easing functions".

## STEP 1 NOW
The folder already has README.md, .gitignore and LICENSE: do not overwrite them, merge anything Vite needs into them. Scaffold Vite + React + TypeScript (strict) in the current folder, add ESLint, Prettier, Vitest + React Testing Library, create .claude/settings.json with {"attribution":{"commit":"","pr":""},"includeCoAuthoredBy":false}, and save this brief as CLAUDE.md. Add scripts: typecheck, lint, test, build. Do not commit or push. Then explain what you created in simple words and give me the commit message. Then STOP.
