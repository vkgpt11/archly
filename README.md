# Archly

Archly is a technical diagramming and documentation prototype built with React, React Flow, Java, Spring Boot, and PostgreSQL.

## Repository structure

- `ui/` — React and TypeScript application
- `backend/` — Java 17 and Spring Boot API
- `deployment/` — local Docker Compose and production GCP deployment configuration
- `doc/` — product requirements and technical documentation

## Prerequisites

- Node.js 22+
- Java 17+
- Docker Desktop (optional)
- A Google OAuth web client configured for `http://localhost:5173` and/or `http://localhost:8088`

## Run locally

Copy `ui/.env.example` to `ui/.env` and set `VITE_GOOGLE_CLIENT_ID`. Set the same value as `GOOGLE_CLIENT_ID` before starting the backend.

```powershell
cd backend
$env:GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
.\mvnw.cmd spring-boot:run
```

In a second terminal:

```powershell
cd ui
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

### Local authentication bypass

For local debugging without Google, start the backend with `ARCHLY_AUTH_DEV_BYPASS=true` and the UI with `VITE_DEV_AUTH=true`. This exposes a **Continue as local developer** button and accepts only the fixed local token used by that button. Both flags default to `false` and must never be enabled in a deployed environment.

## Build and test

```powershell
cd backend
.\mvnw.cmd verify

cd ..\ui
npm ci
npm run lint -- --max-warnings=0
npm test
npm run build
```

GitHub Actions runs the same checks for every pull request and every push to `main`.

On Windows, all local checks can also be run with:

```powershell
.\verify.ps1
```

## Run with Docker

Copy `deployment/.env.example` to `deployment/.env`, set the Google client ID and database password, then run:

```powershell
docker compose --env-file deployment/.env -f deployment/docker-compose.yml up --build
```

Open `http://localhost:8088`.

## Production deployment

The initial cost-optimized production target uses:

- Firebase Hosting for the React UI
- Google Cloud Run in `asia-east1` for the Spring Boot API
- Neon PostgreSQL through a pooled JDBC endpoint
- Google Secret Manager for database credentials
- GitHub Actions with Workload Identity Federation for deployment

The configured Google Cloud and Firebase project is `archly-prod-123`, the
Cloud Run service is `archly-api`, and the initial frontend origin is
`https://archly-prod-123.web.app`. Firebase Storage remains deny-by-default and
is reserved for the separately planned image-storage migration.

Production deployment is manual: open **Actions → Deploy to GCP → Run
workflow**. The workflow runs the complete CI suite before deploying the API
and UI. Authentication bypass flags must remain disabled in production.

Deployment references:

- [Account, IAM, secrets and deployment checklist](doc/gcp-deployment-configuration.md)
- [Executable GCP configuration](deployment/gcp/README.md)
- [Deployment requirements](doc/deployment-requirements-gcp.md)
