# Novira — Bugs & Issues Report

> Full audit of the Novira frontend (`novera/`) and backend (`Novira-server/`).
> Date: April 14, 2026

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Security vulnerability or data-loss bug that must be fixed immediately |
| **HIGH** | Serious bug that breaks features or exposes sensitive data |
| **MEDIUM** | Incorrect behavior, bad patterns, or minor security concerns |
| **LOW** | Code quality, dead code, or minor UX issues |

---

## CRITICAL Issues

### 1. Unauthenticated User CRUD Endpoints (Backend)
- **File:** `Novira-server/src/routes/userRoutes.js` — Lines 41-45
- **Category:** Security
- **Description:** Five routes (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`) have **no `protect` middleware**. Anyone on the internet can list all users, read any user (including password hashes), create accounts, update any user, or delete users without authentication.
- **Impact:** Full account takeover, data theft, user deletion.

### 2. Password Hashes Exposed in API Responses (Backend)
- **File:** `Novira-server/src/controllers/userController.js` — Lines 9-10, 18-19, 27-31, 44-45
- **Category:** Security
- **Description:** `createUser`, `getUsers`, `getUserById`, and `updateUser` all return the full `User` object without excluding the `password` field. Bcrypt hashes are sent to the client in JSON responses.
- **Impact:** Leaked password hashes enable offline brute-force attacks.

### 3. Unauthenticated SSRF via Model Proxy (Backend)
- **File:** `Novira-server/src/routes/tripoRoutes.js` — Line 9
- **File:** `Novira-server/src/controllers/tripoController.js` — Lines 152-230
- **Category:** Security
- **Description:** `GET /api/tripo/proxy-model?url=<anything>` has **no `protect` middleware** and fetches any arbitrary URL server-side. An attacker can use it to reach internal services, cloud metadata endpoints (`169.254.169.254`), or abuse server egress. Response also sets `Access-Control-Allow-Origin: *`.
- **Impact:** Server-Side Request Forgery (SSRF), internal network scanning, credential theft from cloud metadata.

### 4. Hardcoded Admin Credentials Reset on Every Startup (Backend)
- **File:** `Novira-server/src/index.js` — Lines 199-244
- **Category:** Security
- **Description:** The `seedAdminUser` function runs on **every server startup**, resetting the superadmin password to the hardcoded value `novira@studio`. Even if the admin changes their password, the next restart reverts it. The credentials (`admin@novira.studio` / `novira@studio`) are predictable.
- **Impact:** Permanent backdoor. Anyone who reads the source code can log in as superadmin.

---

## HIGH Issues

### 5. 2FA Bypass — Login Ignores Two-Factor Authentication (Backend)
- **File:** `Novira-server/src/controllers/authController.js` — Lines 49-82
- **Category:** Security
- **Description:** The `login` endpoint issues a full JWT token after password check alone. It never checks `user.twoFactorEnabled` or requires a 2FA token. Users who set up 2FA via the security page are not actually protected.
- **Impact:** 2FA is cosmetic — all accounts are password-only regardless of 2FA settings.

### 6. Login Ignores Account Status (Backend)
- **File:** `Novira-server/src/controllers/authController.js` — Lines 49-82
- **File:** `Novira-server/src/middlewares/authMiddleware.js`
- **Category:** Security
- **Description:** Neither login nor the `protect` middleware check `isBanned` or `isActive` flags. Banned or deactivated users can still log in and use the API with existing JWTs.
- **Impact:** Account bans are ineffective.

### 7. Notification Schema Mismatch — Invites Silently Fail (Backend)
- **File:** `Novira-server/src/controllers/projectController.js` — Lines 191-197
- **File:** `Novira-server/src/models/Notification.js` — Lines 18-21
- **Category:** Logic Bug
- **Description:** Project invite creates a notification with `type: 'PROJECT_INVITE'` and field `relatedId`, but the Notification model only allows `ENUM('info', 'success', 'warning', 'error')` and has no `relatedId` column. The insert will fail with a Sequelize validation error.
- **Impact:** Project invitation notifications never get created. Collaboration invites are broken.

### 8. Dashboard Plan Limits Use Wrong Keys (Backend)
- **File:** `Novira-server/src/controllers/dashboardController.js` — Lines 32-38
- **Category:** Logic Bug
- **Description:** `planLimits` has keys `free`, `pro`, `team`, `enterprise` but the `User.plan` ENUM is `free`, `advanced`, `premium`. Paid users (`advanced`/`premium`) always fall back to `free` tier limits on the dashboard.
- **Impact:** Paying users see incorrect/lower limits on their dashboard.

### 9. `updateMe` Leaks Password Hash in Response (Backend)
- **File:** `Novira-server/src/controllers/userController.js` — Lines 100-106
- **Category:** Security
- **Description:** After `user.update(updates)`, the full user object (including password hash) is returned as `data: user` without excluding sensitive fields.
- **Impact:** Every profile update leaks the password hash to the client.

### 10. Plan Upgrade Without Payment Verification (Backend)
- **File:** `Novira-server/src/controllers/userController.js` — Lines 209-244
- **Category:** Security
- **Description:** `PUT /api/users/me/plan` lets any authenticated user set their plan to `premium` or `advanced` with full storage/credits, with no payment gateway or verification.
- **Impact:** Any user can grant themselves premium for free.

### 11. Hardcoded API URL in 10+ Frontend Files
- **Files:** `Login.jsx`, `Signup.jsx`, `apiService.js`, `DesignerPortalPage.jsx`, `MarketplacePage.jsx`, `MyAssetsPage.jsx`, `SceneObject.jsx`, `Vault3DPreview.jsx`, `VaultPreviewModal.jsx`, `LayoutManagerModal.jsx`
- **Category:** Configuration
- **Description:** `http://localhost:5000` is hardcoded in at least 10 files. There is no environment variable (`REACT_APP_API_URL`) usage anywhere in the frontend.
- **Impact:** App cannot be deployed to production without manually editing every file.

### 12. Unsafe ALTER TABLE Migrations on Every Startup (Backend)
- **File:** `Novira-server/src/index.js` — Lines 109-184
- **Category:** Database / Architecture
- **Description:** ~20 `ALTER TABLE` statements run on every server start. In production, these can cause table locks, replication lag, and failed partial states. Errors are silently swallowed for duplicate columns but not for other failures.
- **Impact:** Database corruption risk in production, blocking deployments.

---

## MEDIUM Issues

### 13. `DashboardLayout.jsx` References Undefined `setUserProfile`
- **File:** `novera/src/pages/DashboardLayout.jsx` — Line 87
- **Category:** Runtime Error
- **Description:** The `ProfileUpdate` event handler calls `setUserProfile(prev => ...)`, but `setUserProfile` is never declared. The component destructures `{ userProfile, fetchUserProfile }` from the store — there is no local `setUserProfile` state setter.
- **Impact:** Clicking avatar update from another page crashes the dashboard at runtime.

### 14. No Rate Limiting on Auth Routes (Backend)
- **File:** `Novira-server/src/routes/authRoutes.js`
- **Category:** Security
- **Description:** `/api/auth/login` and `/api/auth/register` have no rate limiting. The `express-rate-limit` package is imported in `index.js` but never used globally, and auth routes don't use it at all.
- **Impact:** Brute-force and credential stuffing attacks are unrestricted.

### 15. Mass Assignment on `createProject` and `updateProject` (Backend)
- **File:** `Novira-server/src/controllers/projectController.js` — Lines 53-62, 80-99
- **Category:** Security
- **Description:** `Project.create(req.body)` and `project.update(req.body)` pass raw request body. A client can set fields like `likes`, `views`, `isVerified`, `isShared` directly.
- **Impact:** Users can manipulate project metadata (fake likes, fake verification status).

### 16. Race Condition in Like Toggle (Backend)
- **File:** `Novira-server/src/controllers/projectController.js` — Lines 317-353
- **Category:** Logic Bug
- **Description:** `toggleLikeProject` reads `project.likes`, increments/decrements, and saves without a transaction or row lock. Concurrent likes can overwrite each other.
- **Impact:** Like counts become inaccurate under concurrent usage.

### 17. AI Credit Deduction Not Atomic (Backend)
- **File:** `Novira-server/src/controllers/tripoController.js` — Lines 7-51
- **Category:** Logic Bug
- **Description:** Credits are checked, then the external Tripo API is called, then the task is saved, then credits are deducted — all without a transaction. Parallel requests can overspend credits, and partial failures leave inconsistent state.
- **Impact:** Users can exceed their credit balance; orphaned tasks possible.

### 18. Login/Signup Use Raw `fetch` Instead of Axios Instance
- **Files:** `novera/src/pages/Login.jsx` — Line 40, `novera/src/pages/Signup.jsx` — Line 40
- **Category:** Consistency / Maintainability
- **Description:** Login and signup use raw `fetch('http://localhost:5000/api/auth/...')` with a hardcoded URL instead of the centralized `apiService.js` Axios instance. If the API URL changes, these pages break independently.
- **Impact:** Inconsistent error handling; duplicated URL management.

### 19. `useSession` Hook Has Missing useEffect Dependencies
- **File:** `novera/src/hooks/useSession.js` — Lines 68, 86
- **Category:** React Anti-pattern
- **Description:** Two `useEffect` hooks have empty or incomplete dependency arrays. `scheduleTimers` and `onActivity` are referenced but not listed as deps (worked around with refs, but the pattern is fragile and produces lint warnings).
- **Impact:** Potential stale closure bugs; eslint warnings.

### 20. `hpp` and Global Rate Limiter Imported But Never Used (Backend)
- **File:** `Novira-server/src/index.js` — Lines 6-7
- **Category:** Dead Code / Security Gap
- **Description:** `hpp` (HTTP Parameter Pollution protection) and `express-rate-limit` are `require`d but never applied as middleware on the app.
- **Impact:** Security features the developer intended are silently absent.

### 21. SQL Logging Enabled in All Environments (Backend)
- **File:** `Novira-server/src/config/database.js` — Line 12
- **Category:** Security / Performance
- **Description:** `logging: console.log` dumps every SQL query (including bound values) in all environments, including production.
- **Impact:** Sensitive data in logs; performance overhead.

### 22. Designer Profile Seeds Fake Metrics (Backend)
- **File:** `Novira-server/src/controllers/designerController.js` — Lines 8-20
- **Category:** Logic Bug
- **Description:** `findOrCreate` defaults include hardcoded fake metrics like `totalDeployments: 1247`, `grossRevenue`, etc. New designer profiles start with fabricated data.
- **Impact:** Misleading dashboard data; trust issues if users notice.

### 23. `EditorPage.jsx` Missing Cleanup for Keyboard Listeners
- **File:** `novera/src/pages/EditorPage.jsx` — Lines 89-119
- **Category:** React Anti-pattern
- **Description:** The keyboard event listener `useEffect` has an empty dependency array, meaning `handleKeyDown`/`handleKeyUp` capture initial state. While this works for direct store access, it's a fragile pattern.
- **Impact:** Potential memory leaks if the component remounts frequently.

### 24. Dismantling Object Uses Nested `setTimeout` Without Cleanup
- **File:** `novera/src/store/useStore.js` — `dismantleObject` function (around line 400-468)
- **Category:** Memory Leak
- **Description:** `dismantleObject` uses recursive `setTimeout(processBatch, 80)` with no cancellation mechanism. If the user navigates away or starts a new dismantle, old timeouts keep firing.
- **Impact:** Orphaned batch processing; potential state corruption.

### 25. PDF.js Loaded from CDN Without Subresource Integrity
- **File:** `novera/src/utils/pdfLoader.js`
- **Category:** Security
- **Description:** PDF.js is loaded via a `<script>` tag from a CDN without SRI (Subresource Integrity) hash verification.
- **Impact:** If the CDN is compromised, malicious code executes in the user's browser.

---

## LOW Issues

### 26. Unused Import: `FaTwitter` in Login Page
- **File:** `novera/src/pages/Login.jsx` — Line 14
- **Category:** Dead Code
- **Description:** `FaTwitter` is imported from `react-icons/fa` but never used in the JSX.

### 27. Unused Hook: `useAiTask` Not Imported Anywhere
- **File:** `novera/src/hooks/useAiTask.js`
- **Category:** Dead Code
- **Description:** The `useAiTask` custom hook exists but is never imported by any component. The store handles AI tasks internally instead.

### 28. Unused Import: `AudioWaveform` in EditorPage
- **File:** `novera/src/pages/EditorPage.jsx` — Line 5
- **Category:** Dead Code
- **Description:** `AudioWaveform` is imported but never rendered in the component.

### 29. Unused Import: `useStore` in LandingPage
- **File:** `novera/src/pages/LandingPage.jsx` — Line 3
- **Category:** Dead Code
- **Description:** `useStore` is imported but never used on the landing page.

### 30. Duplicate Entry Files: `index.js` and `main.jsx`
- **File:** `novera/src/main.jsx`
- **Category:** Dead Code
- **Description:** Both `index.js` and `main.jsx` exist as entry points. CRA uses `index.js`; `main.jsx` (Vite convention) is likely leftover from a migration and is unused.

### 31. Standalone HTML Files in `src/`
- **Files:** `novera/src/index.html`, `novera/src/app.html`
- **Category:** Dead Code
- **Description:** Two large standalone HTML files exist in `src/` that are not referenced by the React app. These appear to be prototypes or marketing pages from before the React migration.

### 32. Social Login Buttons Are Non-Functional
- **Files:** `novera/src/pages/Login.jsx`, `novera/src/pages/Signup.jsx`
- **Category:** UX
- **Description:** Google, Facebook, and WhatsApp login buttons are rendered but have no `onClick` handlers. They are purely decorative.
- **Impact:** Users may click them expecting OAuth flows and get confused.

### 33. `ProtectedRoute` Only Checks Token Presence
- **File:** `novera/src/components/common/ProtectedRoute.jsx`
- **Category:** Security (Low risk in frontend context)
- **Description:** Route protection only checks `localStorage.getItem('token')` — it does not verify the token is valid, not expired, or well-formed. An expired or garbage token passes the frontend gate but fails on API calls.
- **Impact:** Users with expired tokens see brief flashes of protected pages before being redirected by API 401s.

### 34. `errorHandler` Leaks Internal Error Messages (Backend)
- **File:** `Novira-server/src/middlewares/errorHandler.js`
- **Category:** Security
- **Description:** The generic error handler returns `error.message` to the client, which can contain raw database errors, SQL syntax, or stack traces.

### 35. 50MB Body Limit on All Routes (Backend)
- **File:** `Novira-server/src/index.js` — Lines 68-69
- **Category:** Performance
- **Description:** `express.json({ limit: '50mb' })` applies globally. Only a few routes (scene graph save, avatar upload) need large payloads. Login and other lightweight routes accept 50MB bodies.
- **Impact:** Memory pressure from oversized requests; potential DoS vector.

### 36. No Pagination on Several Backend Endpoints
- **Files:** `assetController.js` (`getAssets`), `tripoController.js` (`getUserTasks`), `projectController.js` (`getProjects`)
- **Category:** Performance
- **Description:** Multiple list endpoints return all records without pagination support.
- **Impact:** Slow responses as data grows; potential timeouts.

### 37. `.env` File Contains Live Secrets
- **File:** `Novira-server/.env`
- **Category:** Security
- **Description:** Contains database password, JWT secret, Cloudinary keys, and Tripo API credentials in plaintext. If this file has ever been committed to git, all secrets should be rotated.
- **Impact:** Full compromise if secrets are leaked.

### 38. CORS Origin Whitelist is Hardcoded Localhost Only (Backend)
- **File:** `Novira-server/src/index.js` — Lines 75-80
- **Category:** Configuration
- **Description:** CORS only allows `localhost:5173`, `localhost:3000`, and their `127.0.0.1` equivalents. Deploying to a real domain requires a code change.
- **Impact:** Deployment friction; easy to forget.

### 39. `GET /novira-test` Exposes Server Fingerprint (Backend)
- **File:** `Novira-server/src/index.js` — Lines 99-101
- **Category:** Security (Minor)
- **Description:** A public health check endpoint reveals the server technology stack.

### 40. N+1 Query in `getProjects` (Backend)
- **File:** `Novira-server/src/controllers/projectController.js` — Lines 9-50
- **Category:** Performance
- **Description:** For each project, a separate `ProjectMember.count` query runs inside `Promise.all`. With 100 projects, this means 101 queries.
- **Impact:** Slow dashboard loading as project count grows.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| HIGH | 8 |
| MEDIUM | 13 |
| LOW | 15 |
| **Total** | **40** |

### Top Priority Fixes (Do These First)

1. **Add `protect` middleware** to user CRUD routes (lines 41-45 of `userRoutes.js`) or remove them entirely
2. **Exclude `password`** from all user API responses (`attributes: { exclude: ['password'] }`)
3. **Add `protect` middleware** to `proxy-model` route + validate/whitelist URLs
4. **Remove or gate the admin seed** — don't reset password on every startup
5. **Check `twoFactorEnabled` and `isBanned`/`isActive`** in login flow
6. **Fix Notification model** — add `relatedId` field and update the type ENUM to include `'PROJECT_INVITE'`
7. **Fix dashboard plan limit keys** — change `pro`/`team`/`enterprise` to match `advanced`/`premium`
8. **Move hardcoded URLs** to `REACT_APP_API_URL` environment variable

---

> This report covers the codebase as of April 14, 2026. 
> Rotate all secrets in `.env` if the file has ever been shared or committed.
