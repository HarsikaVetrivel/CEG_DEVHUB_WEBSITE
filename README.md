# CEG DEV HUB

CEG DEV HUB is a hackathon discovery and student-collaboration web application for students of CEG (College of Engineering, Guindy). It consists of a **React 19 / Vite 8 / TypeScript** frontend styled with **Tailwind CSS v4**, and an **Express 4 / TypeScript / MongoDB** backend with session-based authentication and a full admin panel.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, TypeScript ~6, Vite 8, Tailwind CSS v4 |
| Backend | Express 4, TypeScript 5, Mongoose 9, MongoDB |
| Auth | express-session + connect-mongo, bcryptjs, session-bound CSRF |
| Validation | Zod |
| Email | Nodemailer |
| Security | Helmet, express-rate-limit |

## Project Structure

```
CEG_DEVHUB_WEBSITE/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection, env loading
│   │   ├── middleware/      # auth, CSRF, error handling
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # Express route handlers
│   │   ├── scripts/         # seedAdmin.ts
│   │   ├── services/        # Business logic
│   │   ├── types/           # Shared TypeScript types
│   │   ├── utils/           # Helpers (errors, etc.)
│   │   ├── validators/      # Zod schemas
│   │   ├── app.ts
│   │   └── index.ts
│   ├── tests/               # Vitest integration + unit tests
│   │   ├── helpers/         # db.ts, request.ts, hackathon.ts
│   │   ├── auth.test.ts
│   │   ├── hackathons.test.ts
│   │   ├── dashboard.test.ts
│   │   └── reminders.test.ts
│   ├── .env.example
│   └── openapi.yaml
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/      # Navbar, ProtectedRoute, AdminRoute, ProfileDrawer, PasswordInput
    │   ├── contexts/        # React contexts (auth, etc.)
    │   ├── lib/             # API client utilities
    │   ├── pages/           # Page-level components
    │   └── App.tsx          # Route definitions
    ├── index.html
    └── vite.config.ts
```

## Implemented Features

### Authentication & Accounts
- Student registration, login, logout
- Profile viewing and editing
- Password change (authenticated)
- Forgot-password / reset-password flow (token-based, email delivery via Nodemailer)
- Session-bound CSRF protection on all mutating routes
- Role-based access: `STUDENT` and `ADMIN`

### Admin Panel (`/admin`)
- Protected admin login page (`/admin/login`)
- Full hackathon CRUD: create, read, update, delete
- Listing-status moderation: `PENDING → PUBLISHED / REJECTED`
- Pagination and search across all hackathon records
- Seeded admin account via `npm run seed:admin`

### Hackathon Discovery
- Public leaderboard / rankings page (`/rankings`)
- Authenticated hackathon directory with search, filter and pagination (`/hackathons`)
- Hackathon detail page with full metadata (`/hackathons/:slug`)
- Supported modes: `ONLINE`, `OFFLINE`, `HYBRID`
- Domain tags, eligibility, team-size constraints, prize details, required skills

### Student Dashboard (`/dashboard`)
- Bookmarks: add / remove hackathons, persisted in MongoDB
- Notifications: in-app notification list, mark-as-read
- Reminder preferences: configurable days-before-deadline reminders
- Backend scheduler creates `ReminderDelivery` records for bookmarked hackathons with idempotent processing and retry handling

### Participations (`/participations`)
- Log participation in hackathons (status, team name, notes, etc.)
- Update and withdraw participation records
- View all personal participations

### Achievements (`/achievements`)
- View earned achievements tied to hackathon participation records

### Teammate Discovery (`/teammates`)
- Create and manage team requests (skills required, hackathon, team size)
- Browse open team requests from other students
- Apply to join teams
- Review incoming applications and accept / reject
- Withdraw own applications

### Data Models

| Model | Purpose |
|---|---|
| `User` | Students and admins |
| `Hackathon` | Core hackathon listings |
| `Bookmark` | Student–hackathon bookmarks |
| `Notification` | In-app notification records |
| `ReminderDelivery` | Tracks scheduled deadline reminders |
| `Participation` | Student participation entries |
| `UserAchievement` | Achievement records per participation |
| `TeamRequest` | Open teammate requests |
| `TeamApplication` | Applications to team requests |
| `PasswordResetToken` | Time-limited reset tokens |

### API Routes

| Prefix | Description |
|---|---|
| `GET /api/v1` | API info |
| `GET /api/v1/health` | Health check |
| `GET /api/v1/auth/csrf` | Fetch CSRF token |
| `/api/v1/auth/*` | Register, login, logout, profile, change-password, forgot/reset-password |
| `/api/v1/hackathons/*` | Public/student hackathon listing and detail |
| `/api/v1/student/*` | Dashboard, bookmarks, notifications, reminders, participations, achievements, teammates |
| `/api/v1/admin/*` | Admin-only hackathon management (requires `ADMIN` role) |
| `/api/v1/stats` | Aggregate platform statistics |

Full contract: [`backend/openapi.yaml`](backend/openapi.yaml)

## Not Implemented Yet

- Email verification on registration (college email policy enforcement)
- CI/CD and deployment configuration

## Already Resolved

The following items were previously listed as gaps or incomplete and have since been addressed:

| Item | Resolution |
|---|---|
| No dedicated rate limit on auth routes. | A stricter `authRateLimit` middleware (20 requests/IP/hour) is applied to the entire `/api/v1/auth` prefix in `app.ts`. GET requests (CSRF token fetch) are skipped. |
| Reminder preference changes do not reconcile already-created reminders. | `updateReminderPreferences` in `services/student.ts` calls `syncAllUserReminders` immediately after saving, which cancels stale `ReminderDelivery` records and upserts new ones for all bookmarks. |
| Home page uses demo data; database may have no published hackathons. | `Landing.tsx` fetches live hackathon data from `/api/v1/hackathons` and platform stats from `/api/v1/stats`. Empty states are shown when no hackathons are published yet. |
| Reminder email delivery not wired. | `processDueReminders` in `services/reminders.ts` calls `sendReminderEmail` (non-blocking) after writing the in-app notification. SMTP delivery activates automatically when `SMTP_HOST` is configured. |
| Reverse-proxy trust not configured. | `app.ts` now calls `app.set('trust proxy', 1)` when `NODE_ENV === 'production'`, so `req.ip` correctly reflects the real client IP behind Nginx/Caddy/Railway/Render and rate limiting works correctly. |
| No automated test coverage. | 34 integration and unit tests added under `backend/tests/` using Vitest + Supertest + mongodb-memory-server. Covers auth (register, login, logout, CSRF), hackathon discovery, dashboard (participations, bookmarks), and reminder scheduling. Run with `npm test`. |
| Achievement win/podium counts included unverified claims and withdrawn participations. | `checkAndAwardAchievements` now requires `verificationStatus: 'VERIFIED'` and `status: { $ne: 'WITHDREW' }` for win/podium counts, matching leaderboard and dashboard logic. |
| `PATCH /participations/:id` accepted `status: 'WITHDREW'`, bypassing the withdraw flow. | `updateParticipation` now throws 400 if `status: 'WITHDREW'` is sent — the `DELETE /participations/:id` endpoint must be used for withdrawals. |
| Notification `body` field missing from `/student/notifications` response. | Added `body` to the `.select()` in `getNotifications` so notification text is properly returned to the frontend. |
| Deleting a hackathon left orphaned Participations, Bookmarks, and ReminderDeliveries. | `adminDeleteHackathon` now cascades `deleteMany` across all three collections after removing the hackathon document. |

## Known Gaps & Recommended Fixes

| Gap | Recommended fix |
|---|---|
| No email ownership confirmation on registration. | Registration is already restricted to `@student.annauniv.edu` addresses (domain enforced in `validators/auth.ts`). What is missing is **ownership verification**: send a confirmation link to the inbox so only the real holder of that address can activate the account. |

> **Do not deploy without setting a strong `SESSION_SECRET`.** The server will refuse to start if the variable is missing, too short, or set to a known-insecure value. Email verification, external reminder delivery, and account recovery should not be assumed to work without additional wiring.

## Prerequisites

- **Node.js 20.19+** (Node.js 22.12+ recommended) and npm
- **MongoDB**, running locally or available via a connection URI
- A terminal and web browser

## Run Locally

Use **two separate terminal windows** from the project root.

### 1. Configure and start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` and set:

| Variable | Description |
|---|---|
| `PORT` | API port (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string (default `mongodb://127.0.0.1:27017/ceg-dev-hub`) |
| `SESSION_SECRET` | At least 32-character random string — **required** |
| `CORS_ORIGIN` | Frontend origin (default `http://localhost:5173`) |

Generate a random development secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `SESSION_SECRET` in `backend/.env`, then start the API:

```powershell
npm run dev
```

The API listens at `http://localhost:5000`. It must be able to connect to MongoDB before it starts listening.

### 2. Seed the admin user

```powershell
npm run seed:admin
```

This creates or resets the platform administrator account:

| Field | Value |
|---|---|
| Email | `devhubadmin` |
| Password | `devhubadmin@123` |
| Role | `ADMIN` |

### 3. (Optional) Seed demo hackathons and a test student

```powershell
npm run seed:demo
```

Inserts 5 published hackathons across different domains plus a demo student account so the landing page shows real statistics immediately on a fresh install. Safe to re-run — skips records that already exist.

| Field | Value |
|---|---|
| Email | `demo@student.annauniv.edu` |
| Password | `Demo@1234` |
| Admin portal | `http://localhost:5173/admin/login` |

### 4. Start the frontend

In a second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend calls the API at `http://localhost:5000` by default.

To use a different API origin, set `VITE_API_BASE_URL` in `frontend/.env` before starting Vite, and set the matching allowed origin in `backend/.env` as `CORS_ORIGIN`.

> Never commit `.env` files or production credentials.

## Build

```powershell
# Backend
cd backend
npm run build        # outputs to backend/dist/

# Frontend (new terminal from project root)
cd frontend
npm run build        # outputs to frontend/dist/
```

## Frontend Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Student login |
| `/register` | Public | Student registration |
| `/forgot-password` | Public | Request password reset email |
| `/reset-password` | Public | Set new password via token |
| `/rankings` | Public | Public hackathon leaderboard |
| `/admin/login` | Public | Admin login |
| `/hackathons` | Authenticated | Hackathon directory |
| `/hackathons/:slug` | Authenticated | Hackathon detail |
| `/dashboard` | Authenticated | Student dashboard |
| `/bookmarks` | Authenticated | Saved hackathons |
| `/notifications` | Authenticated | In-app notifications |
| `/participations` | Authenticated | Participation log |
| `/achievements` | Authenticated | Earned achievements |
| `/teammates` | Authenticated | Teammate discovery |
| `/admin` | Admin only | Admin panel |
