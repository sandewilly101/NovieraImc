# Novira Spatial — Complete Project Documentation

> **A collaborative 3D spatial design platform built with React, Three.js, and a Node.js backend.**
> This guide is written for developers new to React and Node.js — every concept is explained clearly from the ground up.

---

## Table of Contents

1. [What is Novira?](#1-what-is-novira)
2. [The Big Picture — Architecture Overview](#2-the-big-picture--architecture-overview)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Technology Stack](#4-technology-stack)
5. [How to Run the Project](#5-how-to-run-the-project)
6. [The Entry Point — How the App Boots](#6-the-entry-point--how-the-app-boots)
7. [Routing — How Pages Are Connected](#7-routing--how-pages-are-connected)
8. [Authentication Flow](#8-authentication-flow)
9. [The API Layer — Talking to the Backend](#9-the-api-layer--talking-to-the-backend)
10. [State Management with Zustand](#10-state-management-with-zustand)
11. [Pages In Depth](#11-pages-in-depth)
12. [The 3D Editor — The Heart of Novira](#12-the-3d-editor--the-heart-of-novira)
13. [Components Breakdown](#13-components-breakdown)
14. [Custom Hooks](#14-custom-hooks)
15. [Utilities](#15-utilities)
16. [Styling](#16-styling)
17. [Data Flow — Putting It All Together](#17-data-flow--putting-it-all-together)
18. [Backend API Contract](#18-backend-api-contract)
19. [Key Concepts for React Beginners](#19-key-concepts-for-react-beginners)
20. [Glossary](#20-glossary)

---

## 1. What is Novira?

Novira Spatial is a **web-based 3D design platform** that lets users:

- Create and manage **3D spatial design projects** (think event stages, exhibition booths, interior layouts)
- Use a powerful **browser-based 3D editor** with real-time manipulation (move, rotate, scale objects)
- **Generate 3D models with AI** (text-to-3D and image-to-3D via the Tripo API)
- Import models from **Sketchfab** or local files (.glb/.gltf)
- **Dismantle** complex 3D models into individual parts
- **Share and collaborate** on projects with other designers
- Browse a **community marketplace** of public designs

```
┌─────────────────────────────────────────────────────────────────┐
│                        NOVIRA SPATIAL                           │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │ Landing  │  │ Dashboard│  │ 3D Editor│  │ AI Studio│      │
│   │  Page    │→ │  Page    │→ │  Page    │  │  Page    │      │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │Templates │  │ My Assets│  │ Settings │  │ Security │      │
│   │  Page    │  │  Page    │  │  Page    │  │  Page    │      │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. The Big Picture — Architecture Overview

Novira uses a **client-server architecture** — the React frontend (what users see) talks to a separate Node.js backend through HTTP requests.

```
┌──────────────────────────────┐          ┌──────────────────────────┐
│       FRONTEND (React)       │          │    BACKEND (Node.js)     │
│       Port: 3000             │          │    Port: 5000            │
│                              │          │                          │
│  ┌────────────────────────┐  │  HTTP    │  ┌──────────────────┐   │
│  │   React Components     │  │ ◄──────► │  │  Express Routes   │   │
│  │   (What users see)     │  │  JSON    │  │  /api/auth/*      │   │
│  └────────────────────────┘  │          │  │  /api/projects/*  │   │
│            │                 │          │  │  /api/users/*     │   │
│            ▼                 │          │  │  /api/tripo/*     │   │
│  ┌────────────────────────┐  │          │  └──────────────────┘   │
│  │   Zustand Store        │  │          │           │              │
│  │   (App State)          │  │          │           ▼              │
│  └────────────────────────┘  │          │  ┌──────────────────┐   │
│            │                 │          │  │   Database        │   │
│            ▼                 │          │  │   (MongoDB/SQL)   │   │
│  ┌────────────────────────┐  │          │  └──────────────────┘   │
│  │   API Service Layer    │──┤          │           │              │
│  │   (Axios HTTP Client)  │  │          │           ▼              │
│  └────────────────────────┘  │          │  ┌──────────────────┐   │
│                              │          │  │  External APIs    │   │
│  ┌────────────────────────┐  │          │  │  (Tripo AI, etc.) │   │
│  │   Three.js / R3F       │  │          │  └──────────────────┘   │
│  │   (3D Rendering)       │  │          │                          │
│  └────────────────────────┘  │          │                          │
└──────────────────────────────┘          └──────────────────────────┘

localStorage:
  ├── token          (JWT auth token)
  ├── userName       (display name)
  └── lastActivityAt (idle tracking)
```

### Key Insight for Beginners
- The **frontend** is a Single Page Application (SPA) — the browser loads ONE HTML page, and React swaps content dynamically as you navigate.
- The **backend** is NOT in this repository — it runs separately at `http://localhost:5000`. The frontend calls it via HTTP.
- **JWT (JSON Web Token)** is stored in `localStorage` after login and attached to every API request for authentication.

---

## 3. Project Folder Structure

```
D:\Novira\
└── novera\                          ← React app root
    ├── package.json                 ← Dependencies & scripts
    ├── public\
    │   └── index.html               ← The single HTML page (has <div id="root">)
    ├── scripts\
    │   └── fix-mediapipe-sourcemap.js  ← Postinstall helper
    └── src\                         ← ALL source code lives here
        │
        ├── index.js                 ← ★ App entry point (mounts React)
        ├── App.jsx                  ← ★ Router setup (all routes defined here)
        ├── index.css                ← Global styles
        │
        ├── api\
        │   └── apiService.js        ← ★ ALL backend API calls centralized here
        │
        ├── store\
        │   └── useStore.js          ← ★ Zustand global state (the brain of the app)
        │
        ├── hooks\
        │   ├── useSession.js        ← Idle timeout / session management
        │   ├── useAiTask.js         ← AI generation task polling
        │   └── useCommunityProjects.js ← Community projects data fetching
        │
        ├── pages\                   ← Full-page components (one per route)
        │   ├── LandingPage.jsx      ← Public homepage
        │   ├── Login.jsx            ← Login form
        │   ├── Signup.jsx           ← Registration form
        │   ├── DashboardLayout.jsx  ← Dashboard shell (sidebar + header + Outlet)
        │   ├── DashboardPage.jsx    ← Project list & stats
        │   ├── EditorPage.jsx       ← ★ The 3D editor (most complex page)
        │   ├── AiStudioPage.jsx     ← AI model generation vault
        │   ├── MarketplacePage.jsx  ← Community templates browser
        │   ├── DesignerPortalPage.jsx ← Designer profile & blueprints
        │   ├── StarredPage.jsx      ← Starred/favorite projects
        │   ├── SharedPage.jsx       ← Shared/collaborative projects
        │   ├── MyAssetsPage.jsx     ← User's asset library
        │   ├── SettingsPage.jsx     ← Profile & account settings
        │   └── SecurityPage.jsx     ← 2FA & security settings
        │
        ├── components\
        │   ├── layout\              ← Layout-level components
        │   │   ├── Navbar.jsx       ← Top navigation bar (global)
        │   │   ├── Sidebar.jsx      ← Editor left sidebar (assets, library, AI)
        │   │   ├── PropertiesPanel.jsx ← Editor right panel (transform, materials)
        │   │   └── LibraryBrowser.jsx  ← Full-screen asset library modal
        │   │
        │   ├── canvas\              ← 3D canvas components (inside Three.js)
        │   │   ├── SceneContent.jsx     ← Renders all scene objects
        │   │   ├── models\
        │   │   │   └── SceneObject.jsx  ← Individual 3D object renderer
        │   │   ├── CameraAnimator.jsx   ← Smooth camera transitions
        │   │   ├── ViewNavigator.jsx    ← Camera angle quick-switch
        │   │   ├── DropHandler.jsx      ← Drag-and-drop into the 3D scene
        │   │   ├── LiftHandler.jsx      ← Click-to-place object movement
        │   │   ├── EnvSystem.jsx        ← Environment (sky, terrain)
        │   │   ├── AudioController.jsx  ← 3D audio in the scene
        │   │   ├── MeasurementLayer.jsx ← Distance measurement overlay
        │   │   ├── LayoutOverlay.jsx    ← PDF floorplan overlay
        │   │   ├── LayoutManagerModal.jsx ← Layout/floorplan management
        │   │   ├── Vault3DPreview.jsx   ← AI vault 3D model preview
        │   │   └── VaultPreviewModal.jsx ← AI vault preview modal
        │   │
        │   ├── editor\              ← Editor-specific UI components
        │   │   ├── EditorHeader.jsx     ← Top bar in editor (project name, save)
        │   │   ├── AssetBrowser.jsx     ← Bottom asset browser strip
        │   │   ├── AiGenerationTool.jsx ← Text/image-to-3D generation UI
        │   │   └── AudioWaveform.jsx    ← Audio visualizer using wavesurfer.js
        │   │
        │   ├── common\              ← Reusable UI components
        │   │   ├── ProtectedRoute.jsx   ← Auth gate for protected pages
        │   │   ├── ConfirmModal.jsx     ← "Are you sure?" modal
        │   │   ├── StatusModal.jsx      ← Success/error feedback modal
        │   │   ├── NotificationModal.jsx ← Bell notifications panel
        │   │   ├── SessionWarningModal.jsx ← "Session expiring" modal
        │   │   ├── ImportModal.jsx      ← File import modal (.glb/.gltf)
        │   │   ├── DismantleModal.jsx   ← Object dismantle confirmation
        │   │   ├── CookieConsent.jsx    ← Cookie consent banner
        │   │   └── Background3D.jsx     ← Decorative 3D background
        │   │
        │   ├── dashboard\           ← Dashboard-specific components
        │   │   ├── ProjectModal.jsx     ← Create new project modal
        │   │   └── ShareModal.jsx       ← Share/invite modal
        │   │
        │   ├── EditorScene.jsx      ← (Legacy) editor scene wrapper
        │   ├── HeroBackground3D.jsx ← Landing page 3D hero animation
        │   ├── Sidebar.jsx          ← (Legacy) sidebar
        │   └── Topbar.jsx           ← (Legacy) top bar
        │
        ├── styles\
        │   └── pro-editor.css       ← Editor-specific styles
        │
        └── utils\
            ├── colorUtils.js        ← Deterministic color from string
            ├── pdfLoader.js         ← PDF to image for layout overlays
            └── sketchfabLoader.js   ← Sketchfab API integration
```

---

## 4. Technology Stack

### Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **React** | 18.2 | UI framework — builds the interface from components |
| **react-router-dom** | 6.30 | URL routing — maps URLs to page components |
| **zustand** | 5.0 | State management — lightweight alternative to Redux |
| **axios** | 1.13 | HTTP client — makes API calls to the backend |
| **three** | 0.164 | 3D rendering engine (low-level) |
| **@react-three/fiber** | 8.16 | React wrapper for Three.js |
| **@react-three/drei** | 9.122 | Ready-made 3D helpers (OrbitControls, Grid, etc.) |
| **@react-three/csg** | 4.0 | Boolean operations on 3D geometry (union, subtract, intersect) |
| **@react-three/postprocessing** | 2.19 | Visual effects (bloom, SSAO, etc.) |
| **framer-motion** | 12.34 | Smooth animations and transitions |
| **gsap** | 3.14 | Advanced animations (landing page) |
| **react-dropzone** | 15.0 | Drag-and-drop file uploads |
| **jszip** | 3.10 | ZIP file handling (for .glb/.gltf bundles) |
| **wavesurfer.js** | 7.12 | Audio waveform visualization |
| **date-fns** | 4.1 | Date formatting utilities |
| **@heroicons/react** | 2.2 | Beautiful SVG icons (by Tailwind team) |
| **react-icons** | 5.6 | Additional icon sets (FontAwesome, etc.) |

### How They Relate

```
                        React (UI Framework)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     react-router-dom    zustand          axios
     (Page Navigation)   (State Store)    (API Calls)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      @react-three/*     framer-motion    react-dropzone
      (3D Rendering)     (Animations)     (File Drops)
              │
      ┌───────┼───────┐
      ▼       ▼       ▼
    three   drei    postprocessing
    (3D)   (Helpers) (Effects)
```

---

## 5. How to Run the Project

### Prerequisites
- **Node.js** (v18 or later) — [download](https://nodejs.org)
- **npm** (comes with Node.js)
- The **backend server** running on `http://localhost:5000` (separate repo)

### Steps

```bash
# 1. Navigate to the React app
cd D:\Novira\novera

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app will open at `http://localhost:3000`.

### Available Scripts

| Command | What it does |
|---------|-------------|
| `npm start` | Starts dev server with hot-reload at port 3000 |
| `npm run build` | Creates optimized production build in `build/` folder |
| `npm test` | Runs test suite |
| `npm run eject` | Ejects from Create React App (irreversible, not recommended) |

> **Important:** The backend at `http://localhost:5000` must be running for login, project management, and AI features to work.

---

## 6. The Entry Point — How the App Boots

When someone visits `http://localhost:3000`, here's what happens step by step:

```
1. Browser loads public/index.html
   └── Contains: <div id="root"></div>

2. React bootstraps in src/index.js
   └── ReactDOM.createRoot(document.getElementById('root'))
       └── Renders <App /> inside <React.StrictMode>

3. App.jsx defines the router
   └── <BrowserRouter> wraps everything
       ├── <Navbar />           (always rendered, hides on most pages)
       ├── <Routes>             (picks ONE route based on URL)
       │   ├── / → LandingPage
       │   ├── /login → LoginPage
       │   ├── /signup → SignupPage
       │   ├── /dashboard → ProtectedRoute → DashboardLayout → DashboardPage
       │   ├── /editor → ProtectedRoute → EditorPage
       │   └── ... more routes
       └── <CookieConsent />    (always rendered at bottom)
```

### The Boot Files

**`src/index.js`** — The very first JavaScript that runs:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**`src/App.jsx`** — The routing hub that decides which page to show:
```javascript
export default function App() {
    return (
        <Router>
            <div className="app-container">
                <Navbar />         {/* Global nav bar */}
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    {/* Protected routes require login */}
                    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/starred" element={<StarredPage />} />
                        {/* ...more routes */}
                    </Route>
                    <Route path="/editor" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                </Routes>
                <CookieConsent />  {/* Cookie banner */}
            </div>
        </Router>
    );
}
```

---

## 7. Routing — How Pages Are Connected

React Router v6 is used for navigation. Here's the complete route map:

```
URL Path          Component              Auth Required?    Layout
─────────────────────────────────────────────────────────────────
/                 LandingPage            No               None (standalone)
/login            LoginPage              No               None (standalone)
/signup           SignupPage             No               None (standalone)
/dashboard        DashboardPage          YES              DashboardLayout
/starred          StarredPage            YES              DashboardLayout
/shared           SharedPage             YES              DashboardLayout
/templates        MarketplacePage        YES              DashboardLayout
/designer         DesignerPortalPage     YES              DashboardLayout
/ai-studio        AiStudioPage           YES              DashboardLayout
/assets           MyAssetsPage           YES              DashboardLayout
/settings         SettingsPage           YES              DashboardLayout
/security         SecurityPage           YES              DashboardLayout
/editor           EditorPage             YES              None (standalone)
```

### Layout Nesting

The `DashboardLayout` wraps most protected pages. It provides the sidebar navigation and top header bar. Child pages render inside it via React Router's `<Outlet>`.

```
DashboardLayout
├── Sidebar (left)
│   ├── Logo
│   ├── User info
│   ├── WORKSPACE section
│   │   ├── Nov Projects → /dashboard
│   │   ├── Starred → /starred
│   │   └── Shared → /shared
│   ├── CREATE section
│   │   ├── Nov Studio → /editor
│   │   ├── Novira AI → /ai-studio
│   │   └── Templates → /templates
│   ├── RESOURCES section
│   │   ├── My Assets → /assets
│   │   └── Designer Portal → /designer
│   ├── SETTINGS section
│   │   ├── Settings → /settings
│   │   └── Security → /security
│   └── Logout button
│
├── Header (top)
│   ├── Search bar
│   ├── AI Credits display
│   ├── Notification bell
│   └── "New Design" button
│
└── Content Area (center)          ← <Outlet> renders the child page here
    └── (DashboardPage / StarredPage / etc.)
```

### How `ProtectedRoute` Works

This is the simplest component in the project but one of the most important:

```javascript
export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login?reason=auth" />;
    }
    return children;
}
```

**Logic:** If there's no JWT token in `localStorage`, redirect to `/login`. Otherwise, render the protected content.

---

## 8. Authentication Flow

### Registration (Signup)

```
User fills form        Frontend sends           Backend creates user      Frontend stores token
(name, email,    →    POST /api/auth/register  →  returns JWT token    →  in localStorage
 password)             {fullName, email,          {success, token,         then navigates
                        password}                  user}                   to /dashboard
```

### Login

```
User fills form        Frontend sends           Backend validates       Frontend stores token
(email,          →    POST /api/auth/login     →  credentials, returns → in localStorage
 password)             {email, password}           JWT token               then navigates
                                                   {success, token,        to /dashboard
                                                    user}
```

### Every Subsequent API Call

```
Frontend makes request  →  Axios interceptor adds header  →  Backend validates JWT
                            Authorization: Bearer <token>      If invalid → 401
                                                               If valid → process request

If 401 received:
  → Clear localStorage (token, userName, lastActivityAt)
  → Redirect to /login?reason=session_expired
```

### Session Idle Timeout

The `useSession` hook tracks user activity:

```
User Activity Timeline
──────────────────────────────────────────────────────────────────────
│  Active          │  Warning Period  │  Auto-Logout
│  (0-25 min)      │  (25-30 min)     │  (30 min)
│                  │  ⚠ Modal shown   │  🚪 Forced logout
│  Any mouse/key   │  "Keep Alive?"   │
│  resets the       │  ← Click Yes →  │
│  timer            │  Timer resets    │
──────────────────────────────────────────────────────────────────────
```

**Tracked events:** mousemove, mousedown, keydown, scroll, touchstart, click

---

## 9. The API Layer — Talking to the Backend

All API communication is centralized in `src/api/apiService.js`. This is the **single source of truth** for every HTTP call the app makes.

### The Axios Instance

```javascript
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});
```

### Request Interceptor (Attaches Token)

Every outgoing request automatically gets the auth token:

```javascript
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

### Response Interceptor (Handles 401)

If the backend rejects a request with 401 (unauthorized), the user is logged out:

```javascript
api.interceptors.response.use(
    (response) => response,  // success: pass through
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login?reason=session_expired';
        }
        return Promise.reject(error);
    }
);
```

### API Services Overview

The file exports **7 service objects**, each grouping related endpoints:

```
apiService.js
│
├── projectService          ← CRUD for design projects
│   ├── getProjects()           GET    /projects
│   ├── createProject(data)     POST   /projects
│   ├── getProject(id)          GET    /projects/:id
│   ├── updateProject(id,data)  PUT    /projects/:id
│   ├── deleteProject(id)       DELETE /projects/:id
│   ├── toggleStar(id)          PUT    /projects/:id/star
│   ├── toggleShare(id)         PUT    /projects/:id/share
│   ├── inviteUser(id,data)     POST   /projects/:id/invite
│   ├── acceptInvite(id)        PUT    /projects/:id/accept
│   ├── heartbeat(id)           PUT    /projects/:id/heartbeat
│   ├── getLatest()             GET    /projects/sync/latest
│   ├── saveSceneGraph(id,sg)   PUT    /projects/:id/scenegraph
│   └── getSharedActivity()     GET    /projects/activity/shared
│
├── communityService        ← Public community projects
│   ├── getFinished()           GET    /projects/community?type=finished
│   ├── getShared()             GET    /projects/community?type=shared
│   ├── toggleLike(id)          PUT    /projects/:id/like
│   └── recordView(id)          POST   /projects/:id/view
│
├── dashboardService        ← Dashboard statistics
│   └── getStats()              GET    /dashboard/stats
│
├── notificationService     ← User notifications
│   ├── getNotifications()      GET    /notifications
│   └── markAsRead(id)          PUT    /notifications/:id/read
│
├── userService             ← User profile management
│   ├── getProfile()            GET    /users/me
│   ├── updateProfile(data)     PUT    /users/me
│   ├── uploadAvatar(formData)  POST   /users/me/avatar
│   ├── updatePassword(data)    PUT    /users/me/password
│   ├── updateEmail(data)       PUT    /users/me/email
│   └── updatePlan(data)        PUT    /users/me/plan
│
├── securityService         ← Two-factor authentication
│   ├── getStatus()             GET    /security/status
│   ├── setup2FA()              GET    /security/2fa/setup
│   ├── verify2FA(data)         POST   /security/2fa/verify
│   ├── disable2FA(data)        POST   /security/2fa/disable
│   └── validate2FA(data)       POST   /security/2fa/validate
│
└── tripoService            ← AI 3D model generation
    ├── createTask(data)        POST   /tripo/task
    ├── getTaskStatus(id)       GET    /tripo/task/:id
    ├── getUserTasks()          GET    /tripo/tasks
    └── convertTask(id,fmt)     POST   /tripo/task  {type:'convert'}
```

---

## 10. State Management with Zustand

### What is Zustand?

Zustand is a lightweight state management library. Think of it as a **single shared object** that any component can read from and write to. When data changes, all components using that data automatically re-render.

```
Traditional React (prop drilling):          Zustand (shared store):

       App                                         ┌──────────┐
      / | \                                        │  STORE   │
     A  B  C       pass props down               │  objects  │
    /|     |\      through every level            │  selectedId│
   D  E   F  G    (messy for deep trees)         │  mode     │
                                                   └──────────┘
                                                     ↑ ↑ ↑ ↑
                                                     A B C D    any component
                                                                can read/write
```

### The Novira Store (`src/store/useStore.js`)

This is the **brain of the application**. It holds all shared state and logic for the 3D editor.

#### State Categories

```
useStore
│
├── PROJECT STATE
│   ├── projectId          ← Current project ID (from backend)
│   ├── projectName        ← Current project name
│   └── isSaving           ← Is an autosave in progress?
│
├── SCENE OBJECTS
│   ├── objects[]          ← Array of ALL 3D objects in the scene
│   ├── selectedId         ← ID of the currently selected object
│   └── groundRef          ← Reference to the ground plane
│
├── EDITOR TOOLS
│   ├── mode               ← 'build' mode
│   ├── activeTool         ← 'select' | 'move' | 'rotate' | 'scale' | 'focus' | ...
│   ├── transformMode      ← 'translate' | 'rotate' | 'scale'
│   ├── wireframe          ← Show wireframe?
│   ├── gridVisible        ← Show grid?
│   ├── lightingEnabled    ← Scene lighting on/off
│   ├── environmentVisible ← World environment on/off
│   ├── measurementsEnabled ← Distance measurements on/off
│   ├── linkingMode        ← Object linking mode on/off
│   └── smartZoomEnabled   ← Auto-focus on click
│
├── CAMERA
│   ├── cameraFocusTarget  ← Where camera looks
│   ├── cameraFocusPosition ← Where camera is
│   ├── interiorMode       ← Inside-object navigation
│   └── exteriorCameraState ← Saved position before entering interior
│
├── OBJECT MANIPULATION
│   ├── liftedObjectId     ← Object being dragged
│   ├── liftOrigin         ← Original position of lifted object
│   ├── isTransformDragging ← Is the transform gizmo being dragged?
│   ├── axisLock           ← Locked axis during movement
│   ├── moveDelta          ← Real-time position change [dx, dy, dz]
│   ├── rotationDelta      ← Real-time rotation change [rx, ry, rz]
│   └── collidingPairs     ← Objects currently colliding
│
├── DISMANTLE SYSTEM
│   ├── isDismantleModalOpen
│   ├── dismantleTarget
│   ├── isDismantling
│   ├── dismantleProgress
│   ├── highlightedPartNames
│   ├── selectedSubMeshName
│   └── meshVisibilityMap  ← Which sub-meshes are hidden
│
├── LAYOUT SYSTEM
│   ├── layoutOverlays[]   ← PDF floorplan overlays in the scene
│   ├── layoutDimensions[] ← Dimension annotations
│   ├── layoutEnabled      ← Show/hide layouts
│   └── layoutManagerOpen  ← Layout modal visible?
│
├── UNDO/REDO HISTORY
│   └── objectHistory      ← Per-object undo/redo stacks (max 20 states)
│
├── AUDIO
│   ├── soundEnabled
│   ├── customAudioUrl
│   ├── audioLoop
│   └── audioPlaybackRate
│
├── AI GENERATION
│   ├── aiTask             ← Current AI task state (status, progress, result)
│   ├── userTasks[]        ← All user's AI generation tasks
│   └── isLoadingTasks
│
└── USER PROFILE
    └── userProfile        ← Cached user data from backend
```

#### Key Actions (Functions)

| Action | What it does |
|--------|-------------|
| `addObject(obj, pos)` | Adds a new 3D object to the scene at the correct Y position |
| `removeObject(id)` | Removes an object and its children from the scene |
| `updateObject(id, updates)` | Updates any property of an object (position, color, etc.) |
| `duplicateObject(id)` | Clones an object with a slight position offset |
| `dismantleObject(id, parts)` | Splits a model into individual mesh parts (batched) |
| `assembleObject(id)` | Reassembles a dismantled model |
| `quickExtractPart(id, meshName)` | Extracts one specific part from a model |
| `quickReassemblePart(partId)` | Puts an extracted part back |
| `setParent(child, parent)` | Links two objects (parent-child hierarchy) |
| `breakParent(id)` | Breaks all links in a parent-child group |
| `saveHistory(id)` | Snapshots an object's state for undo |
| `undoObject(id)` | Restores previous state |
| `redoObject(id)` | Restores next state |
| `loadProject()` | Fetches the latest project from the backend |
| `saveProject()` | Saves the scene graph to the backend |
| `startAiTask(type, prompt, imageUrl)` | Starts an AI 3D generation job |
| `pollAiTask()` | Checks AI task progress |
| `fetchUserProfile()` | Gets user data from backend |

#### Autosave Subscription

The store subscribes to its own changes. When `objects` changes and a `projectId` is set, it auto-saves after 1.5 seconds:

```javascript
useStore.subscribe((state, prevState) => {
    if (state.objects !== prevState.objects && state.projectId) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => state.saveProject(), 1500);
    }
});
```

#### AI Task Polling

When an AI task is running, a 3-second polling interval checks for completion:

```
startAiTask()
    │
    ▼
Status: 'queued' ──► Poll every 3s ──► Status: 'running' ──► Poll every 3s
                                                                    │
                     ┌──────────────────────────────────────────────┘
                     ▼
              Status: 'success'  →  Remove hologram placeholder
                  or                 Refresh user profile (credits)
              Status: 'failed'       Refresh tasks list
```

---

## 11. Pages In Depth

### Landing Page (`/`)

The public homepage with:
- Animated 3D hero background (`HeroBackground3D` component using Three.js)
- Feature showcase sections
- Call-to-action buttons leading to `/signup`
- Navigation to Templates, AI Studio, Designer portal
- Contact information

### Login Page (`/login`)

A split-pane layout:
- **Left pane:** Decorative 3D cube animation + branding text
- **Right pane:** Login form with email/password
- Handles query params: `?reason=timeout` shows session expired message, `?reason=auth` shows auth required message
- Social login buttons (Google, Facebook, WhatsApp) are **UI only — not wired to OAuth**
- On success: stores `token`, `userName`, `lastActivityAt` in localStorage → navigates to `/dashboard`

### Signup Page (`/signup`)

Similar split-pane layout with:
- Full name, email, password, confirm password fields
- Password visibility toggle
- On success: same localStorage storage → navigates to `/dashboard`

### Dashboard Page (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│  Good morning, John ✨         📅 Tuesday, April 14        │
│  Here's your workspace overview                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │In Review  │ │Render    │ │Notifs    │     🚀 Launch     │
│  │   3      │ │Ready: 2  │ │   5      │     Editor        │
│  └──────────┘ └──────────┘ └──────────┘     🔥 7 Day      │
│                                              Streak        │
├─────────────────────────────────────────────────────────────┤
│  📊 Stats Cards                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │Active  │  │Avg.    │  │Storage │  │AI      │           │
│  │Projects│  │Objects │  │Used    │  │Credits │           │
│  │  12    │  │  45    │  │  67%   │  │  30    │           │
│  │████░░░ │  │███░░░░ │  │██████░ │  │████░░░ │           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Recent Projects     [All] [Draft] [Review] [Starred]      │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │  + New │  │Project │  │Project │  │Project │           │
│  │Project │  │   A    │  │   B    │  │   C    │           │
│  │        │  │ ⭐ 📤 ✏│  │ ⭐ 📤 ✏│  │ ⭐ 📤 ✏│           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. On mount, fetches projects + stats in parallel via `Promise.all`
2. Refreshes every 30 seconds
3. Projects can be created, renamed, starred, shared, deleted
4. Each project card shows: object count, live collaborators, last updated time

### Editor Page (`/editor`) — The Main Event

See [Section 12](#12-the-3d-editor--the-heart-of-novira) for the deep dive.

### AI Studio Page (`/ai-studio`)

A dedicated page for AI 3D model generation with:
- Task history (all previous generations)
- 3D preview of generated models (using `Vault3DPreview`)
- Download and scene-add capabilities
- Credit system (each generation costs credits)

### Settings Page (`/settings`)

Profile management with tabs:
- **Profile:** Username, display name, bio, company, industry, website
- **Avatar:** Upload/change profile picture
- **Email:** Change email address
- **Password:** Change password
- **Plan:** Subscription management

### Security Page (`/security`)

Two-factor authentication management:
- Setup 2FA (QR code)
- Verify 2FA
- Disable 2FA

---

## 12. The 3D Editor — The Heart of Novira

The editor page is the most complex part of the application. Here's its complete layout:

```
┌──────────────────────────────────────────────────────────────────────┐
│ EditorHeader (project name, save status, back to dashboard)         │
├──────────┬────────────────────────────────────────────┬──────────────┤
│          │  ┌─ Top Strip ──────────────────────────┐  │              │
│          │  │ SMART ZOOM ON │ WORLD OFF │ LAYOUT   │  │              │
│          │  └──────────────────────────────────────┘  │              │
│          │                                            │              │
│          │           ┌─────────────────┐              │  Properties  │
│ Sidebar  │           │                 │   Tool Strip │  Panel       │
│ (Left)   │           │    3D Canvas    │   (Vertical) │  (Right)     │
│          │           │    (Three.js)   │   ┌──┐       │              │
│ Assets   │           │                 │   │▼ │Select │  Scene Tree  │
│ Library  │           │  OrbitControls  │   │▼ │Focus  │  Transform   │
│ Sketchfab│           │  Grid           │   │▼ │Move   │  Materials   │
│ AI Gen   │           │  Lighting       │   │▼ │Rotate │  Lighting    │
│ Community│           │  SceneContent   │   │▼ │Scale  │  Branding    │
│ Hierarchy│           │  EnvSystem      │   │▼ │Delete │  Modifiers   │
│          │           │                 │   │▼ │Link   │  Dismantle   │
│          │           └─────────────────┘   └──┘       │              │
│          │                                            │  Viewport    │
│          │  ┌─ HUD Overlay ────────────────────┐      │  Tools       │
│          │  │ Object: Chair │ W:50cm H:80cm    │      │              │
│          │  │ MOVE ΔX:+2.3  ΔY:0.0  ΔZ:-1.5  │      │              │
│          │  └──────────────────────────────────┘      │              │
│          ├────────────────────────────────────────────┤              │
│          │ Asset Browser (bottom footer strip)        │              │
│          │ [Drag & drop assets into the 3D scene]     │              │
└──────────┴────────────────────────────────────────────┴──────────────┘
```

### Three.js / React Three Fiber

The 3D viewport is powered by **React Three Fiber (R3F)**, which lets you write Three.js scenes using React components:

```jsx
<Canvas shadows camera={{ position: [8, 8, 8], fov: 45 }}>
    {/* Lighting */}
    <ambientLight intensity={0.5} />
    <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />

    {/* Environment */}
    <Environment preset="studio" />
    <Grid infiniteGrid />
    <ContactShadows />

    {/* Scene Content (renders all objects) */}
    <SceneContent />

    {/* Interaction */}
    <DropHandler />           {/* Handles drag-and-drop */}
    <CameraAnimator />        {/* Smooth camera transitions */}
    <OrbitControls />          {/* Mouse-based camera control */}
</Canvas>
```

### How a 3D Object is Represented

Every object in the scene is stored as a plain JavaScript object in the `objects[]` array:

```javascript
{
    id: "obj_1713100000_abc123",    // Unique ID
    name: "Rubber Duck",            // Display name
    type: "gltf",                   // 'primitive' | 'gltf' | 'gltf-part' | 'sketchfab' | 'ai-hologram' | 'ground'
    url: "https://...duck.gltf",    // Model URL (for gltf/sketchfab types)
    geo: "box",                     // Geometry type (for primitives: box/sphere/cylinder/torus/cone/plane)
    position: [0, 0.5, 0],         // [x, y, z] in world space
    rotation: [0, 0, 0],           // [rx, ry, rz] in radians
    scale: [1, 1, 1],              // [sx, sy, sz] scale factors
    dimensions: [1, 1, 1],         // Base size before scaling
    color: "#3b82f6",              // Material color
    parentId: null,                // Parent object ID (for linked groups)
    linkOffset: null,              // Offset from parent
    visible: true,                 // Show/hide
    locked: false,                 // Prevent selection
    parts: [...],                  // Sub-mesh info (after model analysis)
    modifiers: [...],              // CSG boolean modifiers
    reflectivity: 0.3,            // Material reflectivity
    lightIntensity: 85,           // Light properties
    beamAngle: 45,                // Spotlight angle
}
```

### Object Lifecycle

```
1. CREATION
   addObject({type, geo/url, color, ...})
   └── Generates unique ID
   └── Calculates spawn position (on top of ground)
   └── Adds to objects[] array
   └── Triggers autosave (1.5s debounce)

2. MANIPULATION
   updateObject(id, {position, rotation, scale, color, ...})
   └── Updates the object in place
   └── If position changed and object has children → moves children too
   └── Triggers autosave

3. DUPLICATION
   duplicateObject(id)
   └── Clones the object with new ID
   └── Offsets position by [+1, 0, +1]

4. DISMANTLING
   dismantleObject(id, parts)
   └── Marks parent as 'group' type
   └── Creates individual 'gltf-part' objects for each mesh
   └── Processes in batches of 10 (max 50 parts)
   └── Shows progress percentage

5. DELETION
   removeObject(id)
   └── Removes the object AND all its children
   └── Clears selection if deleted object was selected
```

### Editor Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `G` | Activate Move tool |
| `R` | Activate Rotate tool |
| `S` | Activate Scale tool |
| `F` or `.` | Focus camera on selected object |
| `Escape` | Switch to Select tool |
| `Shift + Ctrl` | Quick Dismantle mode (click parts to detach) |

### Left Sidebar Panels

The editor sidebar has multiple toggleable sections:

1. **Asset Categories** — Browse by type (Venues, Booths, Furniture, Lighting, Audio, AI)
2. **Sketchfab Import** — Search and import from Sketchfab's model library
3. **3D Library** — Built-in models from the Khronos glTF sample library (Duck, Helmet, Sponza, etc.)
4. **AI Generation** — Text-to-3D or Image-to-3D generation tool
5. **Local Import** — Upload .glb/.gltf files from your computer
6. **Community Designs** — Browse public projects (Finished/Shared tabs)
7. **Scene Hierarchy** — Tree view of all objects with parent-child relationships

### Right Properties Panel

When an object is selected:

1. **Scene Tree** — Expandable tree of all scene objects with visibility/lock toggles
2. **Transform** — Position (X/Y/Z), Rotation, Scale inputs with up/down buttons
3. **Dimensions** — Calculated real-world size in centimeters
4. **Move/Rotation Deltas** — Real-time feedback during manipulation
5. **Modifiers (CSG)** — Boolean subtract/union/intersect with other primitives
6. **Materials** — Color swatches + reflectivity slider
7. **Lighting** — Light intensity, beam angle, color
8. **Branding** — Logo application tools
9. **Modeling & Dismantle** — Full dismantle button + layout manager

### Asset Browser (Bottom Strip)

A collapsible footer panel for quick access to commonly used assets.

### The HUD Overlay

When an object is selected, an overlay shows:
- Object name and type
- Width, Height, Thickness in centimeters
- Real-time move deltas (ΔX, ΔY, ΔZ in cm)
- Real-time rotation deltas (degrees)
- Interior mode badge
- Detached part badge

### Drag-and-Drop Workflow

```
Sidebar Asset Card                    3D Canvas
┌──────────┐                         ┌─────────────────────┐
│ 🦆 Duck  │  ← User starts drag →  │                     │
│          │                         │   DropHandler        │
│ [drag]   │  dataTransfer:          │   detects drop       │
│          │  {type:'gltf',          │   event, reads       │
└──────────┘   name:'Duck',          │   JSON, calls        │
               url:'...'}            │   addObject()        │
                                     │                     │
                                     │   🦆 Object appears │
                                     └─────────────────────┘
```

---

## 13. Components Breakdown

### Canvas Components (`components/canvas/`)

| Component | Purpose |
|-----------|---------|
| `SceneContent` | Renders all objects from the store using `SceneObject` |
| `SceneObject` | Renders a single 3D object (primitive geometry or loaded GLTF model) |
| `CameraAnimator` | Smoothly animates camera to focus targets |
| `ViewNavigator` | Quick camera angle presets (Top, Front, Side, etc.) |
| `DropHandler` | Listens for drag-and-drop events on the 3D canvas |
| `LiftHandler` | Handles click-to-lift-and-place object movement |
| `EnvSystem` | Sky, terrain, and environmental elements |
| `AudioController` | Manages 3D positional audio in the scene |
| `MeasurementLayer` | Draws distance measurement lines between objects |
| `LayoutOverlay` | Renders PDF floorplan images as 3D planes in the scene |
| `LayoutManagerModal` | UI for managing layout overlays (upload PDF, scale, position) |
| `Vault3DPreview` | Renders AI-generated models in a mini 3D preview |
| `VaultPreviewModal` | Full-screen modal for inspecting AI models |

### Common Components (`components/common/`)

| Component | Purpose |
|-----------|---------|
| `ProtectedRoute` | Redirects to login if no auth token exists |
| `ConfirmModal` | Reusable "Are you sure?" confirmation dialog |
| `StatusModal` | Shows success/error/info feedback messages |
| `NotificationModal` | Dropdown panel showing notifications with accept/decline actions |
| `SessionWarningModal` | Warning popup when session is about to expire |
| `ImportModal` | File picker for local .glb/.gltf model imports |
| `DismantleModal` | Confirmation dialog for object dismantling |
| `CookieConsent` | Cookie acceptance banner at page bottom |
| `Background3D` | Decorative animated 3D background for pages |

### Dashboard Components (`components/dashboard/`)

| Component | Purpose |
|-----------|---------|
| `ProjectModal` | Modal form for creating a new project |
| `ShareModal` | Modal for sharing/inviting users to a project |

---

## 14. Custom Hooks

### `useSession` — Session Timeout Management

**File:** `src/hooks/useSession.js`

```
Usage: const { showWarning, remaining, keepAlive, forceLogout } = useSession();

Purpose: Tracks user activity and forces logout after 30 minutes of inactivity.
         Shows a warning modal at 25 minutes with a countdown.

How it works:
  1. On mount, starts a 25-minute idle timer
  2. Any user activity (mouse, keyboard, scroll) resets the timer
  3. After 25 minutes idle: shows warning modal with countdown
  4. After 30 minutes idle: clears localStorage, redirects to /login
  5. User can click "Keep Alive" to reset the timer

Returns:
  - showWarning (boolean) — Should the warning modal be visible?
  - remaining (number) — Seconds until auto-logout
  - keepAlive (function) — Call to reset the idle timer
  - forceLogout (function) — Call to immediately log out
```

### `useAiTask` — AI Generation Polling

**File:** `src/hooks/useAiTask.js`

```
Usage: const { taskId, status, progress, resultUrl, error, startTask, reset } = useAiTask();

Purpose: Manages a single AI 3D generation task lifecycle.

How it works:
  1. startTask(type, prompt, imageUrl) → POST to /tripo/task
  2. Automatically polls every 3 seconds while status is 'queued' or 'running'
  3. Stops polling when status becomes 'success' or 'failed'

Status flow: idle → starting → queued → running → success/failed
```

### `useCommunityProjects` — Community Data Fetching

**File:** `src/hooks/useCommunityProjects.js`

```
Usage: const { finished, shared, loading, error, toggleLike, recordView, refetch } = useCommunityProjects();

Purpose: Fetches and manages community/public projects.

How it works:
  1. On mount, fetches both finished and shared community projects
  2. Enriches each project with a deterministic color palette
  3. Provides optimistic UI updates for likes and views
     (updates UI immediately, then sends API call in background)

Returns:
  - finished[] — Completed community projects
  - shared[] — Shared community projects
  - loading — Is data being fetched?
  - toggleLike(id, tab) — Like/unlike a project
  - recordView(id, tab) — Track a project view
```

---

## 15. Utilities

### `colorUtils.js` — Deterministic Color Generation

```javascript
getPremiumColor("Rubber Duck")  // → "#6366f1" (always the same for same string)
```

Hashes a string and maps it to one of 10 curated premium colors. Used throughout the app for consistent object/project coloring.

### `sketchfabLoader.js` — Sketchfab API Integration

Handles:
- `fetchAPI(url)` — Authenticated fetch to Sketchfab API
- `downloadSketchfabModel(uid, token)` — Downloads a 3D model from Sketchfab, extracts the GLTF, and returns a blob URL

### `pdfLoader.js` — PDF to Image Conversion

Converts PDF files into images that can be used as layout overlays in the 3D scene (floorplans, blueprints).

---

## 16. Styling

The project uses **plain CSS** (no Tailwind CSS, no CSS modules):

| File | Purpose |
|------|---------|
| `src/index.css` | **Global styles** — all page layouts, components, animations, themes |
| `src/styles/pro-editor.css` | **Editor-specific styles** — sidebar, properties panel, scene tree |

The CSS uses:
- **CSS Custom Properties** (variables) for theming: `var(--blue)`, `var(--green)`, etc.
- **Glass morphism** effects: `backdrop-filter: blur()` for frosted glass look
- **3D CSS transforms** for decorative cube animations on login/dashboard
- **CSS animations** for loading states, pulsing badges, rotating objects
- **Responsive design** with mobile menu overlay for smaller screens

---

## 17. Data Flow — Putting It All Together

Here's how a typical user session flows through the entire system:

### Flow 1: User Logs In and Opens a Project

```
┌─────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Login   │     │ Dashboard│     │   Backend    │     │ Database │
│  Page    │     │  Page    │     │  (Port 5000) │     │          │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
     │                │                   │                   │
     │ POST /auth/login                   │                   │
     │ {email, password} ─────────────────►                   │
     │                                    │ Query user ───────►
     │                                    │ ◄── user data ────┤
     │                                    │ Generate JWT      │
     │ ◄── {success, token, user} ────────┤                   │
     │                                    │                   │
     │ Store token in localStorage        │                   │
     │ Navigate to /dashboard             │                   │
     │                │                   │                   │
     │                │ GET /projects     │                   │
     │                │ (Bearer token) ───►                   │
     │                │                   │ Query projects ───►
     │                │                   │ ◄── projects[] ───┤
     │                │ ◄── projects[] ───┤                   │
     │                │                   │                   │
     │                │ GET /dashboard/stats                  │
     │                │ (Bearer token) ───►                   │
     │                │                   │ Compute stats ────►
     │                │ ◄── stats ────────┤ ◄── stats ────────┤
     │                │                   │                   │
     │                │ Render cards       │                   │
     │                │                   │                   │
```

### Flow 2: User Edits a 3D Scene

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Editor  │     │  Zustand │     │   Backend    │     │ Database │
│  Page    │     │  Store   │     │  (Port 5000) │     │          │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
     │                │                   │                   │
     │ useEffect: loadProject()           │                   │
     │ ───────────────►                   │                   │
     │                │ GET /projects/sync/latest             │
     │                │ ──────────────────►                   │
     │                │                   │ Get latest ───────►
     │                │ ◄── project data ─┤ ◄── scene data ──┤
     │                │                   │                   │
     │                │ Set objects[]     │                   │
     │ ◄── re-render ─┤                   │                   │
     │                │                   │                   │
     │ User moves an object               │                   │
     │ updateObject(id, {position})       │                   │
     │ ───────────────►                   │                   │
     │                │ Update objects[]  │                   │
     │ ◄── re-render ─┤                   │                   │
     │                │                   │                   │
     │                │ ── 1.5s delay ──  │                   │
     │                │ (autosave)        │                   │
     │                │ PUT /projects/:id/scenegraph          │
     │                │ {sceneGraph: objects[]}               │
     │                │ ──────────────────►                   │
     │                │                   │ Save scene ───────►
     │                │ ◄── success ──────┤ ◄── ok ──────────┤
```

### Flow 3: AI 3D Model Generation

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  AI Gen  │     │  Zustand │     │   Backend    │     │ Tripo AI │
│  Tool    │     │  Store   │     │  (Port 5000) │     │  Service │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
     │                │                   │                   │
     │ "A red sports car"                │                   │
     │ startAiTask('text_to_model', prompt)                  │
     │ ───────────────►                   │                   │
     │                │ POST /tripo/task  │                   │
     │                │ ──────────────────►                   │
     │                │                   │ Create task ──────►
     │                │ ◄── {id, status} ─┤ ◄── queued ──────┤
     │                │                   │                   │
     │                │ Add hologram      │                   │
     │                │ placeholder to    │                   │
     │ ◄── ✨ hologram ┤ scene            │                   │
     │                │                   │                   │
     │                │ Poll every 3s:    │                   │
     │                │ GET /tripo/task/:id                   │
     │                │ ──────────────────►                   │
     │                │                   │ Check status ─────►
     │                │ ◄── running 45% ──┤ ◄── 45% ─────────┤
     │ ◄── progress ──┤                   │                   │
     │                │                   │                   │
     │                │ (repeat polling)  │                   │
     │                │ ◄── success + url ┤ ◄── model ready ──┤
     │                │                   │                   │
     │                │ Remove hologram   │                   │
     │                │ Add real 3D model │                   │
     │ ◄── 🚗 model ──┤ to scene          │                   │
```

---

## 18. Backend API Contract

The backend is **not included** in this repository. It runs separately at `http://localhost:5000`. Here's the complete API contract the frontend expects:

### Authentication

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/auth/register` | POST | `{fullName, email, password}` | `{success, token, user}` |
| `/api/auth/login` | POST | `{email, password}` | `{success, token, user}` |

### Projects

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/projects` | GET | — | `{success, data: Project[]}` |
| `/api/projects` | POST | `{name, status, thumbnailIcon, themeColors}` | `{success, data: Project}` |
| `/api/projects/:id` | GET | — | `{success, data: Project}` |
| `/api/projects/:id` | PUT | `{name?, status?, ...}` | `{success, data: Project}` |
| `/api/projects/:id` | DELETE | — | `{success}` |
| `/api/projects/:id/star` | PUT | — | `{success, data: Project}` |
| `/api/projects/:id/share` | PUT | — | `{success, data: Project}` |
| `/api/projects/:id/invite` | POST | `{email}` | `{success}` |
| `/api/projects/:id/accept` | PUT | — | `{success}` |
| `/api/projects/:id/heartbeat` | PUT | — | `{success}` |
| `/api/projects/:id/scenegraph` | PUT | `{sceneGraph: Object[]}` | `{success}` |
| `/api/projects/:id/like` | PUT | — | `{success}` |
| `/api/projects/:id/view` | POST | — | `{success}` |
| `/api/projects/sync/latest` | GET | — | `{success, data: {id, name, sceneGraph}}` |
| `/api/projects/activity/shared` | GET | — | `{success, data: [...]}` |
| `/api/projects/community?type=` | GET | — | `{success, data: Project[]}` |

### Users

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/users/me` | GET | — | `{success, data: UserProfile}` |
| `/api/users/me` | PUT | `{username?, bio?, ...}` | `{success, data: UserProfile}` |
| `/api/users/me/avatar` | POST | `FormData(file)` | `{success, data: {avatarUrl}}` |
| `/api/users/me/password` | PUT | `{currentPassword, newPassword}` | `{success}` |
| `/api/users/me/email` | PUT | `{email, password}` | `{success, token?}` |
| `/api/users/me/plan` | PUT | `{plan}` | `{success}` |

### Dashboard

| Endpoint | Method | Response Shape |
|----------|--------|---------------|
| `/api/dashboard/stats` | GET | `{success, data: {totalProjects, avgObjects, storageUsage, aiCredits, dayStreak, ...}}` |

### Notifications

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/notifications` | GET | `{success, data: Notification[]}` |
| `/api/notifications/:id/read` | PUT | `{success}` |

### Security (2FA)

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/security/status` | GET | — | `{success, data: {twoFactorEnabled}}` |
| `/api/security/2fa/setup` | GET | — | `{success, data: {qrCode, secret}}` |
| `/api/security/2fa/verify` | POST | `{token}` | `{success}` |
| `/api/security/2fa/disable` | POST | `{token}` | `{success}` |
| `/api/security/2fa/validate` | POST | `{token}` | `{success}` |

### AI / Tripo

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/tripo/task` | POST | `{type, prompt?, imageUrl?, options?}` | `{success, data: {id, status}}` |
| `/api/tripo/task/:id` | GET | — | `{success, data: {id, status, progress, resultUrl?}}` |
| `/api/tripo/tasks` | GET | — | `{success, data: Task[]}` |
| `/api/tripo/proxy-model?url=` | GET | — | Proxied GLB binary (CORS bypass) |

---

## 19. Key Concepts for React Beginners

### What is a Component?

A component is a **reusable piece of UI**. In Novira, every page, button, and panel is a component.

```jsx
// A simple component
function Greeting({ name }) {
    return <h1>Hello, {name}!</h1>;
}

// Usage
<Greeting name="John" />  // renders: <h1>Hello, John!</h1>
```

### What is JSX?

JSX is HTML-like syntax **inside JavaScript**. The `.jsx` extension means the file contains JSX.

```jsx
// This JSX:
const element = <div className="card"><h1>Title</h1></div>;

// Gets compiled to:
const element = React.createElement('div', {className: 'card'},
    React.createElement('h1', null, 'Title')
);
```

### What is `useState`?

`useState` lets a component remember values between renders.

```jsx
const [count, setCount] = useState(0);
// count = current value (starts at 0)
// setCount = function to update it
// When setCount is called, the component re-renders
```

### What is `useEffect`?

`useEffect` runs code **after** the component renders. Used for API calls, subscriptions, etc.

```jsx
useEffect(() => {
    // This runs after every render
    fetchData();
}, []);  // Empty array = only run once (on mount)

useEffect(() => {
    // This runs when 'userId' changes
    fetchUser(userId);
}, [userId]);  // Dependency array
```

### What is `useNavigate`?

React Router's hook for programmatic navigation:

```jsx
const navigate = useNavigate();
navigate('/dashboard');  // Go to dashboard page
navigate('/login?reason=auth');  // Go to login with query param
```

### What is `<Outlet>`?

In nested routes, `<Outlet>` is where child routes render:

```
DashboardLayout (parent route)
├── Sidebar
├── Header
└── <Outlet />  ← DashboardPage / StarredPage / etc. renders here
```

### Props vs State

```
Props (passed from parent):         State (owned by component):
  - Read-only                         - Mutable (via setState)
  - Come from above                   - Created within component
  - Component doesn't control         - Component fully controls
    their values                       their values

  <Card title="My Project" />         const [title, setTitle] = useState('');
         ↑ prop                              ↑ state
```

### What is `localStorage`?

A browser API that stores key-value pairs **permanently** (survives page refresh, browser close):

```javascript
localStorage.setItem('token', 'abc123');      // Save
const token = localStorage.getItem('token');   // Read → 'abc123'
localStorage.removeItem('token');              // Delete
```

Novira uses it for:
- `token` — JWT authentication token
- `userName` — Display name
- `lastActivityAt` — Last activity timestamp (for idle detection)
- `novera_sketchfab_token` — Sketchfab API token (optional)

---

## 20. Glossary

| Term | Definition |
|------|-----------|
| **JWT** | JSON Web Token — a signed string that proves who you are. Sent with every API request. |
| **SPA** | Single Page Application — the browser loads one HTML page, JavaScript handles all navigation. |
| **Component** | A reusable piece of UI in React (a function that returns JSX). |
| **Hook** | A special function in React (starts with `use`) that lets components use state, effects, etc. |
| **State** | Data that a component manages and can change. Changing state triggers a re-render. |
| **Props** | Data passed from a parent component to a child component. Read-only. |
| **Route** | A mapping between a URL path and a React component. |
| **Zustand** | A lightweight state management library (alternative to Redux). |
| **Axios** | An HTTP client library for making API requests (alternative to `fetch`). |
| **Three.js** | A JavaScript library for 3D rendering in the browser. |
| **R3F** | React Three Fiber — a React renderer for Three.js. |
| **Drei** | A collection of helper components for R3F (OrbitControls, Grid, etc.). |
| **CSG** | Constructive Solid Geometry — boolean operations (union, subtract, intersect) on 3D shapes. |
| **GLTF/GLB** | Standard 3D model file formats. GLTF is JSON-based, GLB is binary. |
| **Scene Graph** | The tree structure of all 3D objects in a scene (saved to the backend). |
| **Interceptor** | Axios middleware that runs before every request (add token) or after every response (handle 401). |
| **Autosave** | Automatic saving of the scene to the backend 1.5 seconds after any change. |
| **Dismantle** | Breaking a 3D model into its individual mesh components. |
| **Interior Mode** | Camera mode where you navigate inside a 3D object (like walking through a building). |
| **Layout Overlay** | A 2D image (usually a PDF floorplan) displayed as a flat plane in the 3D scene. |
| **Tripo** | The AI service used for text-to-3D and image-to-3D model generation. |
| **Sketchfab** | A platform for hosting and sharing 3D models. Novira can import from it. |
| **Hologram** | A placeholder object shown in the scene while an AI model is being generated. |

---

> **Document generated for the Novira Spatial project.**
> Last updated: April 14, 2026
