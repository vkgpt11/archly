# GCP production deployment

This directory contains the production-only deployment configuration for:

- Firebase Hosting for the React build
- Cloud Run for the Spring Boot container
- Neon PostgreSQL through its pooled JDBC endpoint
- Firebase Storage reserved for a later image-upload migration

Local development remains controlled by the existing root README, `ui/.env`,
`application.yml`, and `deployment/docker-compose.yml`.

For the account-level setup checklist, IAM requirements, GitHub variables, and
deployment sequence, see `doc/gcp-deployment-configuration.md`.

## Required cloud resources

1. Google Cloud project `archly-prod-123` with billing enabled.
2. Firebase project `archly-prod-123` linked to that Google Cloud project.
3. An Artifact Registry Docker repository named `archly`.
4. Cloud Build, Cloud Run, Artifact Registry and Secret Manager APIs enabled.
5. A Neon project in a region close to the selected Cloud Run region.
6. A production Google OAuth web client.

## Backend secrets

Create these Secret Manager secrets. Values must not be committed:

- `archly-neon-jdbc-url`: Neon pooled connection URL in JDBC form, for example
  `jdbc:postgresql://...-pooler.../neondb?sslmode=require`
- `archly-neon-username`
- `archly-neon-password`

Grant the Cloud Run runtime service account `Secret Manager Secret Accessor`.
Grant the Cloud Build service account the minimum roles needed to push to the
repository, deploy Cloud Run, use its runtime service account, and read the
deployment secrets.

## Deploy the API

The checked-in defaults use region `asia-east1`, service `archly-api`, UI origin
`https://archly-prod-123.web.app`, and the Archly production Google OAuth client
ID. Run this command from the repository root:

```powershell
gcloud builds submit --config deployment/gcp/cloudbuild-backend.yaml .
```

The service deliberately uses zero minimum instances, at most two instances,
and a five-connection database pool. Flyway migrations execute when a new
instance starts, so only backward-compatible migrations should be deployed.

## Deploy the UI

Create `ui/.env.production` from `ui/.env.production.example`. Use the final
Cloud Run URL for `VITE_API_URL`, then run from the repository root:

```powershell
cd ui
npm ci
npm run build
cd ..
npx firebase-tools deploy --config deployment/gcp/firebase.json --only hosting
```

After Firebase assigns the final hosting domain, configure that exact origin
in `_UI_ORIGIN`, redeploy Cloud Run, and add
`https://archly-prod-123.web.app` to the Google OAuth client's authorized
JavaScript origins. No custom domain is configured for the initial deployment.

## Firebase Storage status

The bucket rules deny all access intentionally. Archly currently embeds pasted
images in document HTML. Enabling Storage before a backend-mediated upload flow
exists would either break image insertion or create insecure public access.
Image upload, ownership, quotas, signed access, cleanup and migration are tracked
as a separate product requirement.

## Rollback

- Cloud Run: route traffic back to the preceding healthy revision.
- Firebase Hosting: use the Firebase Hosting release history to roll back.
- Database: use Neon restore/time-travel according to the subscribed plan.

## GitHub deployment workflow

GitHub Actions is the selected deployment method. `Deploy to GCP` is manual and
runs the complete CI workflow before deployment.
Configure a protected GitHub `production` environment with:

Secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

Variables:

- `GCP_PROJECT_ID`
- `GCP_REGION` (`asia-east1`)
- `CLOUD_RUN_SERVICE` (for example `archly-api`)
- `CLOUD_RUN_API_URL` (the service URL ending in `/api`)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_HOSTING_ORIGIN` (origin only, with no trailing slash)
- `GOOGLE_CLIENT_ID`

Use environment reviewers to require approval before the deployment job starts.
