# Archly

Archly is a technical diagramming and documentation prototype built with React, React Flow, Java, Spring Boot, and PostgreSQL.

See [Diagram as code](doc/diagram-as-code.md) for the editable architecture DSL, regions, component shorthands, styling, and live-preview controls.

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

### AI diagram generation

Set `OPENAI_API_KEY` in the backend environment to enable **Generate** in the
project editor. The browser sends the natural-language description to Archly's
authenticated backend; the API key is never sent to the UI. You can override
the default model with `OPENAI_MODEL` and the compatible Responses API endpoint
with `OPENAI_BASE_URL`.

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

### Prepare production

Complete these one-time prerequisites before the first deployment:

1. Enable billing and the required Google Cloud APIs in project
   `archly-prod-123`.
2. Create the `archly` Docker repository in Artifact Registry region
   `asia-east1`.
3. Initialize Firebase Hosting and Firebase Storage in the same project.
4. Create the Neon production database and select its pooled endpoint.
5. Store the Neon JDBC URL, username, and rotated password in Google Secret
   Manager as:
   - `archly-neon-jdbc-url`
   - `archly-neon-username`
   - `archly-neon-password`
6. Confirm the Cloud Run runtime account can access only those three secrets.
7. Confirm the GitHub deployer account can submit builds, push images, deploy
   Cloud Run and Firebase, and act as the runtime account.
8. Configure Workload Identity Federation to trust only the intended GitHub
   repository.
9. Add both Firebase origins to the production Google OAuth Web client:
   - `https://archly-prod-123.web.app`
   - `https://archly-prod-123.firebaseapp.com`

In GitHub, open **Settings → Environments → production** and add these
environment variables:

| Variable | Value |
| --- | --- |
| `GCP_PROJECT_ID` | `archly-prod-123` |
| `GCP_REGION` | `asia-east1` |
| `CLOUD_RUN_SERVICE` | `archly-api` |
| `FIREBASE_PROJECT_ID` | `archly-prod-123` |
| `FIREBASE_HOSTING_ORIGIN` | `https://archly-prod-123.web.app` |
| `GOOGLE_CLIENT_ID` | `222938267134-rcss0fnu7snhe4tmi1c1vlr9htoruif2.apps.googleusercontent.com` |

Add these as protected environment secrets:

| Secret | Value |
| --- | --- |
| `GCP_SERVICE_ACCOUNT` | `archly-deployer@archly-prod-123.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity provider resource name |

Never put the Neon password, credential-bearing database URL, access token, or
service-account JSON key in GitHub variables or repository files.

### Deploy from GitHub

1. Commit and push the tested changes to `main`.
2. Open the repository's **Actions** tab.
3. Select **Deploy to GCP**.
4. Select **Run workflow**, choose `main`, and start the run.
5. Approve the `production` environment if an approval rule is configured.
6. Confirm the `verify` job completes successfully.
7. Confirm the deployment completes these stages:
   - Authenticate to GCP using Workload Identity Federation
   - Build and push the Java API container
   - Deploy `archly-api` to Cloud Run
   - Discover the generated Cloud Run URL
   - Build the React UI with `<cloud-run-url>/api`
   - Deploy Firebase Hosting and deny-by-default Storage rules
8. Open `https://archly-prod-123.web.app` after the workflow succeeds.

A push to `main` does not automatically deploy production. The deployment
workflow must be started manually.

### Test the deployed application

Run this production smoke test in a private browser window:

1. Open `https://archly-prod-123.web.app` and confirm no Firebase setup page,
   blank screen, or console error appears.
2. Sign in using a verified personal `gmail.com` account.
3. Confirm a non-Gmail or unverified identity is rejected and cannot call
   project APIs.
4. Create a project, rename it, add documentation, add canvas components and
   connections, and wait for the saved state.
5. Refresh the browser and confirm the document and diagram are restored.
6. Duplicate the project and verify edits to the copy do not change the
   original.
7. Open the project in two tabs and confirm conflicting edits show the recovery
   workflow without silently discarding either version.
8. Create and revoke a read-only share link; verify anonymous access is
   read-only and the revoked link stops working.
9. Export PNG, SVG, Markdown, and editable source; inspect arrows, labels,
   background, icons, fonts, and off-screen content.
10. Delete a disposable project and confirm it disappears from the dashboard
    and remains deleted after refresh.
11. Confirm browser developer tools show no CORS, OAuth, failed API, React Flow,
    or unhandled JavaScript errors.

Then verify the platform:

```powershell
gcloud run services describe archly-api `
  --project archly-prod-123 `
  --region asia-east1 `
  --format "value(status.url,status.latestReadyRevisionName)"

gcloud run services logs read archly-api `
  --project archly-prod-123 `
  --region asia-east1 `
  --limit 100
```

Confirm the latest Cloud Run revision is ready, Flyway migrations completed,
Neon connectivity succeeds, and logs contain no credentials or sensitive
tokens. Record the Git commit SHA, workflow URL, UI URL, API URL, Cloud Run
revision, and smoke-test result for the release.

If deployment or verification fails, do not weaken authentication, CORS,
Storage rules, or IAM to make it pass. Use the troubleshooting and rollback
sections in the detailed deployment runbook.

Deployment references:

- [Rebuild production from an empty cloud project](doc/deployment-rebuild-guide.md)
- [Detailed GCP, Firebase, Neon and GitHub deployment runbook](doc/gcp-deployment-configuration.md)
- [Deployment FAQ](doc/deployment-faq.md)
- [Executable GCP configuration](deployment/gcp/README.md)
- [Deployment requirements](doc/deployment-requirements-gcp.md)
