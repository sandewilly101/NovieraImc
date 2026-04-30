# Novira — UI / UX & Performance Audit

> Full-system review covering every page, component, the 3D editor, CSS/styling,
> build pipeline, and HTML entry points.  
> Each issue includes **severity**, **location**, and a **concrete fix**.

---

## Table of Contents

1. [Critical Issues (Fix First)](#1-critical-issues-fix-first)
2. [Page-by-Page UI/UX Audit](#2-page-by-page-uiux-audit)
3. [Component-Level UX Audit](#3-component-level-ux-audit)
4. [3D Editor & Store Performance](#4-3d-editor--store-performance)
5. [CSS, Tokens & Styling](#5-css-tokens--styling)
6. [Accessibility (a11y)](#6-accessibility-a11y)
7. [Responsive Design](#7-responsive-design)
8. [Animation & Rendering Performance](#8-animation--rendering-performance)
9. [Build, Bundle & Loading](#9-build-bundle--loading)
10. [SEO & Meta](#10-seo--meta)
11. [Summary Scoreboard](#11-summary-scoreboard)

---

## 1. Critical Issues (Fix First)

These are the issues that cause **broken flows**, **runtime errors**, or **severe UX failures**.

### 1.1 Routing — `/editor` Has No Project Context

```
Broken flow diagram:

  DashboardPage ──click card──▶ navigate('/editor')    ← no project ID!
  StarredPage   ──click card──▶ navigate('/editor')    ← no project ID!
  MarketplacePage ─click card──▶ navigate('/editor')   ← no project ID!
  SharedPage    ──click card──▶ navigate('/editor/123') ← route doesn't exist!

  App.jsx only defines:  <Route path="/editor" element={<EditorPage />} />
```

| File | Severity | Fix |
|------|----------|-----|
| `App.jsx` | **Critical** | Add `<Route path="/editor/:projectId?" ... />` and read `useParams()` in `EditorPage` to call `loadProject(id)`. |
| `DashboardPage.jsx`, `StarredPage.jsx`, `MarketplacePage.jsx` | **Critical** | Change `navigate('/editor')` → `navigate('/editor/${project.id}')`. |
| `SharedPage.jsx` | **Critical** | Already sends `/editor/${id}` but App has no matching route — fixed by adding the parameterized route above. |

---

### 1.2 DashboardLayout — `setUserProfile` ReferenceError

| File | Severity | Fix |
|------|----------|-----|
| `DashboardLayout.jsx` | **Critical** | The `ProfileUpdate` event listener calls `setUserProfile(...)`, which is **never destructured** from the store. Runtime crash when avatar is updated. Destructure `setUserProfile` from `useStore` or call `fetchUserProfile()`. |

---

### 1.3 SharedPage — `ProjectModal` Props Mismatch

| File | Severity | Fix |
|------|----------|-----|
| `SharedPage.jsx` | **Critical** | Passes `onSubmit` and `initialData` to `ProjectModal`, but that component only accepts `onCreate(name)` — no edit mode exists. Edit flow is broken. Either build edit support in `ProjectModal` or use a separate `EditProjectModal`. |

---

### 1.4 SettingsPage — Security Tab Unreachable

| File | Severity | Fix |
|------|----------|-----|
| `SettingsPage.jsx` | **Critical** | `renderTabContent` has a `case 'security':` but the sidebar tab array has no "Security" entry — the code is **dead/unreachable**. Either add the tab or remove the dead case and rely solely on `/security`. |

---

### 1.5 Modals — Broken Exit Animations (×3)

| Files | Severity | Fix |
|-------|----------|-----|
| `ConfirmModal.jsx`, `NotificationModal.jsx`, `StatusModal.jsx` | **Critical** | Pattern: `if (!isOpen) return null` runs **before** `<AnimatePresence>`, so the component unmounts instantly and the Framer Motion exit animation **never plays**. Move the `isOpen` check **inside** `AnimatePresence` as a conditional child. |

**Before (broken):**
```jsx
if (!isOpen) return null;
return <AnimatePresence><motion.div ...>{...}</motion.div></AnimatePresence>;
```

**After (correct):**
```jsx
return (
  <AnimatePresence>
    {isOpen && <motion.div ...>{...}</motion.div>}
  </AnimatePresence>
);
```

---

### 1.6 SceneObject — Re-renders the Entire Scene on Any Store Change

| File | Severity | Fix |
|------|----------|-----|
| `SceneObject.jsx` | **Critical** | Uses `useStore()` with **no selector** (~20+ fields). Every state update re-renders **every object**. Use per-field selectors: `useStore(s => s.selectedId)`, `useStore(s => s.objects)`, etc. |

---

### 1.7 MeasurementLayer — Wrong Scale Axis Mapping

| File | Severity | Fix |
|------|----------|-----|
| `MeasurementLayer.jsx` | **Critical** | `ObjectRuler` uses `scale?.[1]` for **all** axes (width, height, depth). Width should use `[0]`, depth should use `[2]`. Incorrect dimension labels destroy trust in the precision tool. |

---

## 2. Page-by-Page UI/UX Audit

### 2.1 LandingPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Mobile menu: no Escape-to-close, no focus trap | **High** | Add `onKeyDown` Escape handler, focus trap, restore focus on close |
| "Get Started" on mobile → `/editor`, on desktop → signup — inconsistent CTA | **High** | Align copy and destination across breakpoints |
| Footer links (Documentation, Tutorials, Blog, Community, Privacy, Terms) are dead `href="#"` | **Medium** | Link to real pages or remove until implemented |
| Social links (Facebook, Instagram) are `href="#"` | **Medium** | Wire real URLs or remove |
| `navigator.clipboard.writeText` has no try/catch | **Medium** | Wrap in try/catch, show toast on failure |
| Unused `isHovered` / `setIsHovered` state + unused `useStore` import | **Low** | Remove dead code |

---

### 2.2 Login.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Hardcoded `http://localhost:5000/api/auth/login` | **High** | Use centralized `apiService` / env-based URL |
| Social login buttons: no handlers, no aria-labels | **High** | Add `aria-label` per provider; disable until OAuth works |
| "Remember me" checkbox does nothing | **Medium** | Implement session persistence or remove |
| "Forgot password?" is dead `href="#"` | **Medium** | Link to recovery flow or hide |
| Password toggle: no `aria-label` / `aria-pressed` | **Medium** | Add `aria-label="Show password"` |
| "Sign up" is `<span onClick>` — not keyboard accessible | **Medium** | Use `<Link to="/signup">` |
| Inputs lack `id`/`htmlFor` label association | **Medium** | Add proper label pairing |

---

### 2.3 Signup.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Hardcoded localhost API URL | **High** | Centralize base URL |
| Social buttons: nonfunctional, poor a11y | **High** | Same as Login |
| No client-side password rules beyond `required` | **Medium** | Min length, match confirmation, inline errors |
| "Sign in" prompt is `<span onClick>` | **Medium** | Use `<Link>` |

---

### 2.4 DashboardPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Project cards navigate to `/editor` without project ID | **Critical** | Navigate to `/editor/${project.id}` |
| Star toggle shows StatusModal every time — noisy | **Low** | Toast or silent update with optional undo |
| Filter logic has `'shared'` branch but no UI chip | **Medium** | Add "Shared" chip or remove branch |
| Project card: no keyboard activation equivalent | **Medium** | Card as focusable region or primary-action button |
| Meta text at `8px` — likely illegible | **Medium** | Use ≥ 12 px for readability |

---

### 2.5 AiStudioPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| `handleGenerate` navigates to `/editor` immediately — user leaves while job may still run | **High** | Stay on page until complete, or open editor in new tab |
| Optimistic AI credits decrement before task succeeds — desyncs on failure | **High** | Decrement only after success; refresh profile on failure |
| `setInterval` polling in `handleDownloadFormat` **never cleared** on unmount → memory leak | **High** | Store interval ID; clear on completion/error/unmount |
| Format dropdown: CSS `:hover` only, no keyboard/touch | **High** | Use disclosure button + `aria-expanded` + focus management |
| `alert()` for credit/conversion/load errors | **Medium** | Replace with inline banners/toasts |
| Textarea "500" character limit not enforced with `maxLength` | **Medium** | Add `maxLength={500}` + counter |
| Style chips are `motion.div onClick` — not keyboard accessible | **Medium** | `role="radio"` group or `<button aria-pressed>` |
| "Spatial Layout Engine" / "Photogrammetry Lab" are non-functional placeholders | **Medium** | Disable + "Coming soon" or hide |

---

### 2.6 DesignerPortalPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Hardcoded `http://localhost:5000` for API calls | **High** | Env-based API client |
| Profile fetch errors: only `console.error`, UI shows zeros | **High** | Error banner + retry button |
| "Initialize Upload" / "Manage Settlement" buttons have no `onClick` | **High** | Wire flow or disable + tooltip |
| `Background3D` uses `Math.random()` per render — flicker | **Medium** | `useMemo` with fixed seed |
| Category grid uses `div onClick` — not keyboard accessible | **Medium** | Use `<button>` / `radiogroup` |
| `marketValue` onChange sets string from number initial state — type drift | **Medium** | `parseFloat` / `valueAsNumber` |

---

### 2.7 EditorPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Suspense fallback is just a flat color — no loading indicator | **Medium** | Use `useProgress` from drei or custom "Loading scene…" |
| Floating tool buttons use `title` only — no `aria-label` | **Medium** | Add `aria-label` matching tool name |
| Keyboard shortcuts (G/R/S) override browser without UI hint | **Medium** | Add a shortcuts help panel (?) or first-run tooltip |
| Footer hide on pointer down — surprising, small toggle to restore | **Low** | More visible "Show assets" affordance |

---

### 2.8 MarketplacePage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Card click goes to `/editor` without loading that template | **Critical** | Pass template/project ID into editor |
| Hardcoded localhost API | **High** | Shared API base URL |
| Fetch failure: `console.error` only, shows empty grid | **High** | Error state + retry button |
| Filter chips are `motion.div onClick` — not buttons | **High** | Use `<button>` / `role="tab"` |
| `handleClaim` success uses `alert()` | **Medium** | Non-blocking toast |
| Filter track `[...filters, ...filters]` duplicates DOM | **Medium** | CSS marquee or `aria-hidden` on duplicates |

---

### 2.9 MyAssetsPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Hardcoded localhost API | **High** | Env-based URL |
| "Filter" button has no handler | **High** | Implement or remove |
| `handleDownload` always uses `.png` — wrong for non-image assets | **High** | Branch on asset MIME type |
| `prompt` / `confirm` / `alert` for rename/delete | **Medium** | Use modal components |
| Ellipsis menu button has no menu | **Medium** | Implement menu or remove |

---

### 2.10 SecurityPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Modal: no `role="dialog"`, `aria-modal`, focus trap, or Escape | **High** | Full dialog pattern + focus management |
| `PasswordField` eye button has `tabIndex={-1}` | **Medium** | Keep in tab order with `aria-label` |
| Both API calls fail: no user message shown | **Medium** | Error alert/banner when both requests fail |

---

### 2.11 SettingsPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| `handleSave` catch: `console.error` only, no user feedback | **High** | Show inline error + `saveSuccess = false` |
| "Enable 2FA" button has no `onClick` | **High** | Navigate to `/security` or open flow |
| Header title color `#048fbd76` is low contrast | **Medium** | Use solid color meeting WCAG AA |
| Form labels missing `htmlFor` | **Medium** | Associate labels and inputs |
| Duplicate password/email flows vs SecurityPage | **Medium** | Single source of truth |

---

### 2.12 SharedPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Hero layout: fixed `width: 300px` sidebar, `maxHeight: 200px` — clips on small screens | **High** | Stack layout with media queries; `overflow-y: auto` |
| Activity fetch errors: silent | **Medium** | Show error on feed |
| Delete/share uses `window.confirm` — no undo | **Medium** | Use `ConfirmModal` + undo toast |

---

### 2.13 StarredPage.jsx

| Issue | Severity | Fix |
|-------|----------|-----|
| Rename/delete failures use `alert()` | **Medium** | Use `StatusModal` |
| Fetch failure shows "No starred" misleadingly (no error ≠ empty) | **High** | Distinguish error state vs empty state |

---

## 3. Component-Level UX Audit

### 3.1 Modals — System-Wide Pattern Issues

Every modal in the system shares these gaps:

| Issue | Severity | Affected Components |
|-------|----------|---------------------|
| No backdrop click-to-close | **High** | `LibraryBrowser`, `ConfirmModal`, `DismantleModal`, `ImportModal`, `LayoutManagerModal`, `ProjectModal`, `ShareModal`, `SessionWarningModal`, `VaultPreviewModal` |
| No Escape key handler | **High** | All above (except `index.html` has a global Escape, but only for its own overlays) |
| No focus trap (focus can escape to page behind) | **High** | All above |
| No scroll lock on `<body>` | **Medium** | All above |
| Exit animation broken (`return null` before `AnimatePresence`) | **Critical** | `ConfirmModal`, `NotificationModal`, `StatusModal`, `ProjectModal` (likely) |

**Recommendation:** Create a shared `<ModalShell>` wrapper that handles backdrop dismiss, Escape, focus trap (`focus-trap-react`), body scroll lock, and wraps children in `AnimatePresence` correctly.

---

### 3.2 `LibraryBrowser.jsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Full-screen overlay at `z-[1000]` — no close method except button | **High** | Backdrop click + Escape |
| Errors use `alert()` | **Medium** | Inline error messages |
| Search placeholder shows internal tab IDs (`sf`, `ph`, `lib`) | **Medium** | Use human-readable names |
| Thumbnails have `alt=""` — invisible to screen readers | **Medium** | Descriptive alt text |

---

### 3.3 `EditorHeader.jsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Menu items (File, Edit, Render…) and workspace tabs are **non-functional** — high confusion for users expecting Blender-like menus | **Critical** | Wire handlers or disable/hide until implemented |
| Tabs not keyboard-roled | **Medium** | Add `role="tablist"` / `role="tab"` |

---

### 3.4 `PropertiesPanel.jsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Several tool buttons (Sel, Cam, Focus, Array, Sub, Bevel, Smth) have **no `onClick`** — look interactive, do nothing | **High** | Wire handlers or disable with tooltip |
| Undo/Redo not surfaced in toolbar or shortcuts | **High** | Add Ctrl+Z/Y and visible buttons |
| Scene tree `fontSize: 7px` — illegible on most displays | **Medium** | Use ≥ 11 px |
| Numeric inputs silently fallback to 0 on invalid input | **Medium** | Inline validation feedback |

---

### 3.5 `AiGenerationTool.jsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Empty prompt returns silently — no user feedback | **Medium** | Show "Please enter a prompt" message |
| Credits check uses `alert()` | **Medium** | Inline error |
| v2 toggle is `div onClick` — not keyboard accessible | **Medium** | Use `role="switch"` or `<button>` |

---

### 3.6 `layout/Sidebar.jsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Sketchfab token entry uses `window.prompt` — poor UX and security perception | **Medium** | Use a proper input field in the sidebar |
| Rodin/library search button has **no `onClick`** — does not trigger search | **Medium** | Wire the handler |

---

### 3.7 `AssetBrowser.jsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Default `selectedCatalog` is `'HDRIs'` but first catalog ID is `'all'` — inconsistent initial state | **Medium** | Default to `'all'` or match first catalog |
| Filter/cog icons not wired; search doesn't filter assets | **Medium** | Implement or remove |

---

### 3.8 `DashboardLayout.jsx`

| Issue | Severity | Fix |
|-------|----------|-----|
| Sidebar items are `<div onClick>` — not buttons/links, no tab order | **High** | Use `<button>` or `<NavLink>` with `aria-current` |
| Search input: no `aria-label`, no submit/clear | **Medium** | Add `aria-label="Search projects"` |
| Notification bell: no `aria-expanded`, no unread count announced | **Medium** | Add `aria-expanded` + `aria-label` with count |
| `alert('Failed to accept invite')` | **Low** | In-app toast |

---

## 4. 3D Editor & Store Performance

### 4.1 Zustand Store — Re-render Issues

```
How Zustand re-renders work:

  useStore()            ← subscribes to ALL state → re-renders on ANY change
  useStore(s => s.x)    ← subscribes to x only   → re-renders only when x changes

  Problem: SceneObject, EditorPage, LayoutOverlay all use useStore() with no selector.
  Effect:  Every state change re-renders every object + the entire editor layout.
```

| Issue | File | Severity | Fix |
|-------|------|----------|-----|
| SceneObject subscribes to ~20+ fields via unscoped `useStore()` | `SceneObject.jsx` | **Critical** | Per-field selectors or `useShallow` |
| EditorPage broad destructure causes full-page re-renders | `EditorPage.jsx` | **High** | Narrow selectors |
| LayoutOverlay re-renders on unrelated updates | `LayoutOverlay.jsx` | **High** | Select only `layoutDimensions`, `selectedId` |
| LiftHandler calls `updateObject` **every frame** during lift — triggers store-wide updates 60×/s | `LiftHandler.jsx` | **High** | Use refs + local state during lift; commit once on pointer-up |
| TransformControls `onChange` writes to store continuously during drag | `SceneObject.jsx` | **Medium** | Local transform during drag; commit on `dragging-changed: false` |
| `objectHistory` spreads large nested map on each save | `useStore.js` | **Medium** | Consider Immer or external history stack |

---

### 4.2 Collision Detection — Expensive Per-Frame Work

| Issue | File | Severity | Fix |
|-------|------|----------|-----|
| Collision detection runs in `useFrame` per object with `JSON.stringify` comparisons | `SceneObject.jsx` | **Critical** | Single physics pass in one system component; shallow compare; only run for selected/lifted objects |

---

### 4.3 GPU Memory Leaks

| Issue | File | Severity | Fix |
|-------|------|----------|-----|
| GLTF `scene.clone()` + material clones: **no `dispose()`** on unmount/change | `SceneObject.jsx` | **High** | `useEffect` cleanup: dispose meshes/materials from discarded clone |
| `URL.createObjectURL` for audio: no `revokeObjectURL` on replace/unmount | `EditorPage.jsx` | **Medium** | Revoke in cleanup |
| `BreakSphere` sets `document.body.style.cursor` — never reset on unmount | `SceneObject.jsx` | **Low** | Reset cursor in cleanup |
| Inline `bufferGeometry` + `setFromPoints` creates new geometry every render | `SceneObject.jsx` | **Medium** | `useMemo` the geometry |

---

### 4.4 Editor UX Gaps

| Issue | File | Severity | Fix |
|-------|------|----------|-----|
| **No multi-select** — only `selectedId` (singular) in store | `useStore.js` | **High** | Add `selectedIds[]` + group transform |
| **Box Select tool** in toolbar but no marquee selection implementation | `EditorPage.jsx` | **Medium** | Implement or remove/disable tool |
| **Undo/Redo** exists in store but no keyboard shortcuts (Ctrl+Z/Y) and no visible buttons | `useStore.js` / `PropertiesPanel.jsx` | **High** | Wire shortcuts + expose in toolbar |
| **Autosave runs** but save status is **never shown** in the header | `useStore.js` / `EditorHeader.jsx` | **High** | Show "Saving… / Saved ✓ / Error" indicator |
| **No unsaved-changes warning** on navigation/close | — | **Medium** | Add `beforeunload` + route guard |
| `loadProject` has no loading indicator or error UI | `useStore.js` | **Medium** | Loading spinner for scene fetch; toast on failure |
| No translate snap (only rotation snap with Shift) | `SceneObject.jsx` | **Medium** | Add `translationSnap` / grid snap option |
| `CameraAnimator` uses `useEffect(..., [orbitRef.current])` — ref doesn't trigger re-runs | `CameraAnimator.jsx` | **Low** | Use callback ref or `useFrame` check |

---

## 5. CSS, Tokens & Styling

### 5.1 Undefined CSS Variables (Styles Silently Break)

```
Variables USED in code but NEVER DEFINED in :root:

  var(--cyan)             ← referenced in index.css
  var(--text)             ← referenced in index.css
  var(--text-secondary)   ← referenced in Topbar.jsx, Sidebar.jsx
  var(--text-primary)     ← referenced in Topbar.jsx, Sidebar.jsx
  var(--glass-border)     ← referenced in Topbar.jsx, Sidebar.jsx
  var(--accent-color)     ← referenced in Topbar.jsx
  var(--accent-hover)     ← referenced in Topbar.jsx
  var(--bg-floating)      ← referenced in Topbar.jsx
  var(--silver-dark)      ← referenced in index.css

  Result: properties using these fallback to initial/inherited values → colors disappear.
```

| Severity | Fix |
|----------|-----|
| **High** | Define all tokens in `:root` or replace with existing tokens (`--ink`, `--blue`, `--silver`, etc.). |

---

### 5.2 Design Token Inconsistency

| Issue | Severity | Fix |
|-------|----------|-----|
| `:root` defines `--blue: #2B6FD4` but components use `#2563eb`, `#3b82f6` (Tailwind blues) in gradients | **Medium** | Normalize to one primary accent + semantic aliases |
| `pro-editor.css` uses own `--pro-*` tokens + hardcoded hex, `pro-asset-browser` forces light chrome inside dark editor | **Medium** | Document or align "editor dark" vs "browser light" |
| Three visual languages: `index.css` (light), `app.html` (dark spatial), `pro-editor` (dark VS-style) | **Medium** | Unified theme system with `[data-theme]` toggle |

---

### 5.3 Monolithic CSS

| Issue | Severity | Fix |
|-------|----------|-----|
| `index.css` is **~13,000 lines** in one file | **Medium** | Split by route/feature (landing, dashboard, editor); lazy-load editor CSS |
| ~130+ occurrences of `transition: all` — triggers unnecessary layout/paint work | **Medium** | Replace with specific properties: `transition: transform 0.2s, opacity 0.2s` |
| ~120 `@keyframes` / `animation:` declarations — many run simultaneously | **Medium** | Pause off-screen animations with `content-visibility` or IntersectionObserver |
| Heavy use of inline `style={{}}` in JSX (PropertiesPanel ~141, Sidebar ~83, EditorPage ~47) | **Medium** | Move repeated patterns to classes + tokens |

---

### 5.4 z-index Sprawl

```
Current z-index landscape (sampled):

  0–3     ← base content
  5–20    ← subtle layers
  50–100  ← panels, toolbars
  200     ← floating UI
  1000    ← nav, overlays
  2000    ← session warnings
  2500    ← special overlays
  3000    ← landing nav
  9999    ← vault preview
  10000   ← critical modals

  Problem: no scale, magic numbers, easy to collide.
```

| Severity | Fix |
|----------|-----|
| **Medium** | Define a token scale: `--z-dropdown: 10`, `--z-sticky: 20`, `--z-modal: 100`, `--z-toast: 200`. Replace all magic numbers. |

---

## 6. Accessibility (a11y)

### 6.1 Interactive Elements That Aren't Buttons or Links

| Location | Issue | Fix |
|----------|-------|-----|
| `DashboardLayout.jsx` sidebar items | `<div onClick>` — not focusable, no role | Use `<button>` or `<NavLink>` |
| `LandingPage.jsx` nav items | Similar pattern | Use semantic `<nav>` + `<button>` / `<a>` |
| `AiStudioPage.jsx` style chips | `<motion.div onClick>` | `<button aria-pressed>` or `role="radio"` group |
| `MarketplacePage.jsx` filter chips | `<motion.div onClick>` | `<button>` / `role="tab"` |
| `DesignerPortalPage.jsx` category grid | `<div onClick>` | `<button>` / `radiogroup` |
| All modal close buttons | Some missing `aria-label` | Add `aria-label="Close"` |

---

### 6.2 Missing ARIA Patterns

| Pattern | Issue | Fix |
|---------|-------|-----|
| Modals | No `role="dialog"`, `aria-modal="true"`, `aria-labelledby` | Add to modal shell |
| Tabs (editor, dashboard) | No `role="tablist"` / `role="tab"` / `aria-selected` | Implement proper tab semantics |
| Dropdowns | No `aria-expanded`, `aria-haspopup` | Add to toggle buttons |
| Toggle buttons (password visibility, AI v2 switch) | No `aria-pressed` or `role="switch"` | Add appropriate roles |

---

### 6.3 Color Contrast Issues

| Location | Issue | Fix |
|----------|-------|-----|
| `SettingsPage.jsx` header: `#048fbd76` (semi-transparent) | Fails WCAG AA on most backgrounds | Use solid color |
| `PropertiesPanel.jsx` tree: `fontSize: 7px` | Illegible | Minimum 11 px |
| `DashboardPage.jsx` metadata: `fontSize: 8px` | Below readable threshold | Minimum 12 px |

---

## 7. Responsive Design

### 7.1 Missing Breakpoints

| Issue | Severity | Fix |
|-------|----------|-----|
| `index.css` has only ~17 `@media` blocks for ~13,000 lines — most layouts are desktop-only | **Medium** | Add breakpoints for navigation, dashboard grids, editor toolbars |
| `pro-editor.css` fixed sidebar widths (180 px catalog, 296 px left panel, 252 px right panel) | **Medium** | Drawer pattern or `min()`/`clamp()` widths for smaller screens |
| `SharedPage.jsx` hero: fixed `width: 300px` sidebar, `maxHeight: 200px` — clips on mobile | **High** | Stack layout + media queries |
| `app.html` inline `style="width:175px"` on input | **Low** | Use `max-width: 175px; width: 100%` |

---

### 7.2 Hardcoded Sizes

| Pattern | Prevalence | Fix |
|---------|-----------|-----|
| `px` values in inline styles | Very common across all pages | Prefer `rem`/`em` or CSS tokens for spacing/type |
| `fontSize: 13`, `fontSize: '14px'` mixed with no type scale | Throughout JSX | Standardize on a type scale (`--text-xs` … `--text-xl`) |
| `font-weight: 100` on dashboard metadata | Several pages | 100 often not loaded; use 400/500 |

---

## 8. Animation & Rendering Performance

### 8.1 CSS Performance Drains

| Issue | Severity | Fix |
|-------|----------|-----|
| Widespread `backdrop-filter` / `-webkit-backdrop-filter` on glass UI, nav, modals, hero | **Medium–High** | Reduce blur radius; avoid animating blur; prefer solid/semi-transparent fills on low-end |
| `transition: all` (130+ occurrences) — widens what the browser interpolates including layout properties | **Medium** | Replace with specific: `transition: transform 0.2s, opacity 0.2s` |
| `filter: brightness()`, `filter: blur()`, `drop-shadow` on hovers | **Medium** | Reserve for few elements; prefer `opacity` / `transform` |
| No `will-change` hints anywhere | **Low** | Add targeted `will-change: transform` on always-moving hero/3D elements |

---

### 8.2 Three.js / R3F Performance

| Issue | Severity | Fix |
|-------|----------|-----|
| `ContactShadows` resolution 1024 + Grid + EnvSystem (Clouds limit 400) | **Medium** | Quality settings slider; reduce shadow res dynamically |
| `MeshDistortMaterial` + multiple `Float` in decorative scenes | **Medium** | Skip on low-end (detect via `navigator.hardwareConcurrency` or `renderer.info`) |
| `Suspense fallback={null}` in LayoutManagerModal — blank canvas while loading | **Medium** | Show spinner or skeleton |
| `LayoutOverlay` uses `useMemo` for texture side effects — wrong hook | **Low** | Use `useEffect` for mutations |

---

### 8.3 Inline Hover Handlers

| Issue | Severity | Fix |
|-------|----------|-----|
| Many components use `onMouseEnter={() => setStyle({...})}` / `onMouseLeave` to change styles — forces style recalc per event | **Medium** | Use CSS `:hover` / `:focus-visible` pseudo-classes instead |

---

## 9. Build, Bundle & Loading

### 9.1 Font Loading

```
Current font loading chain:

  index.css: @import url('fonts.googleapis.com/...')  ← render-blocking
             Loads: Poppins, Syne, Squada One, Archivo

  src/index.html: <link rel="stylesheet" href="fonts.googleapis.com/...">
                  Loads: DM Sans, Syne  ← different body font!

  src/app.html: @import inside <style>  ← extra round-trip
                Loads: Space Mono, Syne

  Result: 5+ font families, conflicting body fonts, render-blocking imports
```

| Severity | Fix |
|----------|-----|
| **Medium** | Reduce to 1–2 families + mono. Use `<link rel="preconnect">` + `<link>` (not `@import`). Add `font-display: swap`. Self-host if possible. |

---

### 9.2 Three.js Version Skew

| Issue | Severity | Fix |
|-------|----------|-----|
| `app.html` loads Three.js **r128** from CDN; `package.json` has **^0.164.0** | **High** | Single version + single delivery method (npm bundler or CDN, not both) |

---

### 9.3 Build Tooling Confusion

| Issue | Severity | Fix |
|-------|----------|-----|
| `package.json` uses **react-scripts** (CRA) for `start`/`build` | Info | — |
| `vite.config.js` exists but is **not wired** to any npm script | **Low** | Remove or migrate to Vite fully |
| No bundle analyzer or compression plugin | **Medium** | Add `source-map-explorer` or `webpack-bundle-analyzer`; enable gzip/brotli on server |

---

### 9.4 Bundle Size Concerns

| Dependency | Concern | Fix |
|------------|---------|-----|
| `three` + `@react-three/fiber` + `@react-three/drei` + `@react-three/csg` + `@react-three/postprocessing` | Heavy 3D stack | Route-level `React.lazy` + `Suspense` for editor pages |
| `framer-motion` + `gsap` | Two animation libraries | Pick one or tree-shake aggressively |
| `@heroicons/react` + `react-icons` | Overlapping icon libraries | Pick one |
| `wavesurfer.js` | Only needed in editor | Lazy-load |

---

### 9.5 HTML Entry Points

| Issue | Severity | Fix |
|-------|----------|-----|
| `public/index.html` has no description, OG tags, theme-color, canonical | **High** | Add meta tags; use `react-helmet-async` for per-route |
| No favicon or icon assets in `public/` | **High** | Add `favicon.ico` + `apple-touch-icon` + link tags |
| No `robots.txt` or sitemap | **Medium** | Add when URL structure stabilizes |
| `src/index.html` is ~4,000 lines of inline CSS/JS | **High** (if served) | Split into proper build pipeline |
| No PWA manifest or service worker | **Low–Medium** | Add if offline/installable is a goal |

---

## 10. SEO & Meta

| Issue | Severity | Fix |
|-------|----------|-----|
| SPA shell (`public/index.html`) has no crawlable content | **High** | Prerender, SSR, or static landing page for public routes |
| No `meta name="description"` | **High** | Add relevant description |
| No Open Graph / Twitter card tags | **Medium** | Add for link previews |
| No canonical URL | **Low–Medium** | Add `<link rel="canonical">` |
| No structured data (JSON-LD) | **Low** | Add for marketplace/portfolio pages if SEO matters |

---

## 11. Summary Scoreboard

### By Severity

| Severity | Count | Examples |
|----------|-------|---------|
| **Critical** | 10 | Route /editor missing project ID, SceneObject re-renders, broken modal animations, MeasurementLayer axis bug, EditorHeader dead menus, collision perf, setUserProfile crash |
| **High** | 35+ | Hardcoded localhost URLs, no undo/redo UI, autosave invisible, GPU memory leaks, modals missing a11y, undefined CSS vars, font loading, missing meta tags |
| **Medium** | 50+ | Missing responsive breakpoints, alert() usage, inconsistent tokens, z-index sprawl, transition:all, missing ARIA |
| **Low** | 15+ | Dead code cleanup, minor a11y, build config tidying |

---

### By Category

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| **Routing & Navigation** | 4 | 2 | 2 | — |
| **Modal UX** | 3 | 6 | 5 | 1 |
| **3D Editor Performance** | 3 | 5 | 4 | 2 |
| **Accessibility** | — | 8 | 15+ | 3 |
| **CSS / Design Tokens** | — | 2 | 8 | 2 |
| **Forms & Feedback** | — | 6 | 10+ | 2 |
| **Build & Bundle** | — | 3 | 4 | 2 |
| **SEO & Meta** | — | 3 | 2 | 1 |

---

### Recommended Fix Order

```
PHASE 1 — Stop the Bleeding ✅ COMPLETED
  ✅ Fix /editor/:projectId routing + all navigate() calls
  ✅ Fix setUserProfile crash in DashboardLayout
  ✅ Fix modal AnimatePresence pattern (×4 modals)
  ✅ Fix MeasurementLayer axis mapping
  ✅ Scope SceneObject Zustand selectors
  ✅ Define missing CSS variables in :root

PHASE 2 — Core UX Polish ✅ COMPLETED
  ✅ Centralize API base URL (remove all localhost hardcodes)
  ✅ Add backdrop click + Escape + ARIA to all modals
  ✅ Wire EditorHeader menus (File/Edit/Render dropdowns)
  ✅ Surface undo/redo (Ctrl+Z/Y) + save status in editor
  ✅ Replace all alert()/prompt()/confirm() with in-app UI
  ✅ Fix GPU memory leaks (dispose GLTF clones on unmount)
  ✅ Throttle LiftHandler (ref-based) + TransformControls (commit on drag-end)

PHASE 3 — Accessibility & Responsive ✅ COMPLETED
  ✅ Convert div-onClick to <button> in DashboardLayout sidebar
  ✅ Add ARIA roles (dialog, aria-modal, aria-expanded, aria-current)
  ✅ Fix SharedPage hero sidebar responsiveness
  ✅ Fix font loading (preconnect in HTML, non-blocking)
  ✅ Fix 15 highest-impact transition:all → specific properties
  ✅ Add meta/OG tags, theme-color, description in index.html
  ✅ Fix illegible 8px font sizes → 11px across all pages
  ✅ Fix font-weight:100 → 400 for readability
  ✅ Fix SettingsPage header color contrast (WCAG AA)
  ✅ Fix AiStudioPage interval leak + replace all alerts

PHASE 4 — Remaining Polish (future)
  ├─ Split index.css by route (landing, dashboard, editor)
  ├─ Lazy-load 3D editor dependencies with React.lazy
  ├─ Add bundle analysis (source-map-explorer)
  ├─ Quality settings slider for 3D rendering
  ├─ Single collision detection system (instead of per-object)
  ├─ PWA manifest + service worker (if offline support needed)
  └─ Full keyboard navigation for 3D editor viewport
```

---

*Generated: April 14, 2026 — Novira UI/UX & Performance Audit*
*Updated: April 14, 2026 — Phases 1–3 implemented*
