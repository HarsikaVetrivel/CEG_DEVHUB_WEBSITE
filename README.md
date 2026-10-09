# CEG DEV HUB

CEG DEV HUB is a hackathon discovery and student-planning web application. The current implementation covers the initial foundation and Phases 1–5. It consists of a React/Vite frontend and an Express/TypeScript API backed by MongoDB.

## Implemented so far

- **Application foundation:** React, TypeScript, Vite and Tailwind frontend; Express API; initial landing page and routing.
- **Student accounts and sessions:** Registration, login, logout and current-user endpoints; bcrypt password hashing; MongoDB-backed sessions; session-bound CSRF protection.
- **Hackathon discovery:** Public listing and detail endpoints, published-listing filtering, pagination, search/filter support, and frontend discovery/detail views.
- **Student dashboard:** Authenticated dashboard, bookmarks, notifications and reminder preferences.
- **Deadline reminders:** A backend scheduler creates in-app reminders for bookmarked hackathons. Delivery records support idempotent processing and retry handling.
- **API documentation:** OpenAPI specification is in [`backend/openapi.yaml`](backend/openapi.yaml).

Hackathon listings must be published in MongoDB before they appear in discovery. There is not yet an admin interface or a supported admin-provisioning workflow, so a new local database may show no listings.

## Not implemented yet

The following product areas remain future work; they are not available as complete user-facing features today:

- Admin account provisioning and management UI.
- Hackathon creation, editing, moderation, ingestion and audit workflows.
- Student participation tracking, achievement workflows and rankings.
- Teammate discovery and collaboration features.
- Profile editing and password recovery.
- Email verification and notification delivery through email or push.
- Automated backend/frontend test suites and deployment/operations setup.

The landing page still includes illustrative/demo content. Replace it with live data before treating it as production content.

## Known gaps and recommended fixes

These are known limitations to address before a public production launch:

| Gap | Recommended fix |
| --- | --- |
| The backend has a known development fallback for `SESSION_SECRET`; the production check enforces length but does not reject that exact fallback. | Require a secret supplied through the environment, reject the known fallback in every environment, and store a strong unique secret in the deployment secret manager. |
| Authentication routes only receive the general API rate limit; there is no stricter dedicated login/registration limit. | Add and test tighter per-IP limits for login and registration, with appropriate monitoring and user feedback. |
| There is no college-email verification or email ownership confirmation. | Define the allowed email policy and add a verification flow before relying on student identity. |
| Reminder preference changes do not reliably reschedule already-created reminders when preferences are changed or re-enabled. | Reconcile pending reminder deliveries against current preferences and deadline data when settings change; add regression tests. |
| Reverse-proxy trust is not configured for deployment. | Configure Express proxy trust only for the known proxy topology, then verify secure-cookie and client-IP behavior. |
| No automated test suite currently covers the implemented flows. | Add unit/integration tests for authentication, CSRF, hackathon discovery, dashboard actions, and reminder scheduling/delivery. |
| The home page contains demo statistics, cards and deadlines, and the database may have no published hackathons. | Connect the home page to real API data and provide an authorized admin/publishing workflow or clearly labeled empty states. |

Do not deploy with the default session secret. External reminder delivery, account recovery, and email verification should not be assumed to exist.

## Prerequisites

- **Node.js 20.19 or newer** (Node.js 22.12+ recommended) and npm.
- **MongoDB**, running locally or available through a MongoDB connection URI.
- A terminal and web browser.

## Run locally

Install and start the backend and frontend separately. Use two terminal windows from the project root.

### 1. Configure and start the backend

In PowerShell:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` and set a unique `SESSION_SECRET` (at least 32 characters for production), and update `MONGODB_URI` if MongoDB is not listening at the local default. For a random development secret, run this from a terminal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into `SESSION_SECRET` in `backend/.env`. Then start the API:

```powershell
npm run dev
```

The API listens at `http://localhost:5000` by default. It must be able to connect to MongoDB before it starts listening.

### 2. Start the frontend

In a second PowerShell terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. By default, the frontend calls the API at `http://localhost:5000`. To use a different API origin, set `VITE_API_BASE_URL` in a frontend `.env` file before starting Vite, and set the matching allowed origin in `backend/.env` as `CORS_ORIGIN`.

The backend environment variables and defaults are documented in [`backend/.env.example`](backend/.env.example). Never commit `.env` files or production credentials.

## Build

Run each build from its application directory:

```powershell
# Backend
cd backend
npm run build

# Frontend (from the project root after the backend command)
cd ..\frontend
npm run build
```

The frontend production build is written to `frontend/dist`; the backend build is written to `backend/dist`.

## API entry points

- API information: `GET http://localhost:5000/api/v1`
- Health checks: `GET http://localhost:5000/api/v1/health`
- Auth CSRF token: `GET http://localhost:5000/api/v1/auth/csrf`
- OpenAPI contract: [`backend/openapi.yaml`](backend/openapi.yaml)

Student write requests use the session-based CSRF token. The frontend API client handles session credentials and CSRF token acquisition for supported flows.
