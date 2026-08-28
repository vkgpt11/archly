# GCP deployment configuration checklist

This document records the account-level settings required to deploy Archly. It
is separate from:

- Product requirements in `deployment-requirements-gcp.md`
- Executable deployment configuration in `deployment/gcp/`
- Local development configuration

Never commit database passwords, service-account keys, access tokens, or other
credentials. Store secrets in Google Secret Manager or protected GitHub
environment secrets.

Selected deployment method: GitHub Actions using Workload Identity Federation.

This file is the single source of truth for production configuration. Files in
`deployment/gcp/` implement these settings; they should link here instead of
duplicating account setup instructions.

## 1. Architecture and configuration ownership

| System | Responsibility | Configuration location |
| --- | --- | --- |
| GitHub Actions | Runs tests and orchestrates deployment | GitHub `production` environment and `.github/workflows/deploy-gcp.yml` |
| Google Cloud | Builds containers, stores images, runs the Java API, and stores secrets | GCP project `archly-prod-123` |
| Firebase | Hosts the React UI and reserves Storage for future image uploads | Firebase project `archly-prod-123` |
| Neon | Hosts production PostgreSQL | Neon console; credentials copied only to Google Secret Manager |
| Google OAuth | Authenticates supported Gmail users | Google Auth Platform in project `archly-prod-123` |

Production request flow:

```text
Browser -> Firebase Hosting (React UI) -> Cloud Run (Java API) -> Neon PostgreSQL
                                      \-> Google OAuth token validation
```

Firebase Storage is deployed with deny-all rules. It is not currently in the
application request path.

## 2. Complete configuration inventory

### 2.1 Non-secret production values

| Name | Value | Configured in | Consumed by |
| --- | --- | --- | --- |
| GCP project ID | `archly-prod-123` | GitHub environment variable `GCP_PROJECT_ID` | GitHub Actions and Google Cloud CLI |
| GCP region | `asia-east1` | GitHub environment variable `GCP_REGION` | Cloud Build, Artifact Registry, and Cloud Run |
| Cloud Run service | `archly-api` | GitHub environment variable `CLOUD_RUN_SERVICE` | Cloud Build and Cloud Run |
| Artifact Registry repository | `archly` | GCP Artifact Registry | Cloud Build image push and Cloud Run image pull |
| Firebase project ID | `archly-prod-123` | GitHub environment variable `FIREBASE_PROJECT_ID` | Firebase deployment |
| Firebase Hosting origin | `https://archly-prod-123.web.app` | GitHub variable `FIREBASE_HOSTING_ORIGIN` | Backend CORS and Google OAuth |
| Google OAuth client ID | `222938267134-rcss0fnu7snhe4tmi1c1vlr9htoruif2.apps.googleusercontent.com` | GitHub variable `GOOGLE_CLIENT_ID` | UI OAuth and backend token validation |
| Runtime service account | `archly-runtime@archly-prod-123.iam.gserviceaccount.com` | Cloud Run deployment configuration | Cloud Run API process |
| Deployment service account | `archly-deployer@archly-prod-123.iam.gserviceaccount.com` | GitHub secret `GCP_SERVICE_ACCOUNT` and Cloud Build configuration | GitHub and Cloud Build |
| Custom domain | None | Not applicable | Default Firebase domains are used |

The Cloud Run URL is generated during deployment. The workflow discovers it
and sets `VITE_API_URL` to `<generated-service-url>/api` for the UI build. It is
not a GitHub variable and does not need to be copied manually.

### 2.2 Secrets and sensitive values

| Name | Storage location | Value rule |
| --- | --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | GitHub `production` environment secret | Full provider resource name created by Workload Identity Federation |
| `GCP_SERVICE_ACCOUNT` | GitHub `production` environment secret | `archly-deployer@archly-prod-123.iam.gserviceaccount.com` |
| `archly-neon-jdbc-url` | Google Secret Manager | Neon pooled JDBC URL without embedded username or password |
| `archly-neon-username` | Google Secret Manager | Neon database role name |
| `archly-neon-password` | Google Secret Manager | Current rotated Neon password |

Never store the Neon password or a complete credential-bearing connection URL
in GitHub variables, workflow logs, `.env` files, commits, or documentation.
The password previously exposed during setup must remain rotated.

## 3. Configuration status

| Item | Status |
| --- | --- |
| Runtime service account created | Done |
| Deployment service account created | Done |
| Runtime access to all three Neon secrets | Done |
| Deployer can act as runtime account | Done |
| Workload Identity pool and GitHub provider | Done |
| GitHub `production` environment | Done |
| GitHub authentication secrets | Done |
| Six GitHub production variables | Confirm before deployment |
| Required GCP APIs | Confirm before deployment |
| Artifact Registry repository `archly` | Confirm before deployment |
| Firebase Hosting initialized | Confirm before deployment |
| Neon secrets populated with current rotated credentials | Confirm before deployment |
| Google OAuth authorized origins | Confirm before production sign-in test |

## 4. Google Cloud configuration

### 4.1 Required APIs

Enable these APIs in the selected GCP project:

- Cloud Run Admin API
- Cloud Build API
- Artifact Registry API
- Secret Manager API
- Firebase Management API
- Firebase Hosting API
- Cloud Storage API
- Cloud Resource Manager API
- IAM Service Account Credentials API

### 4.2 Artifact Registry

Create a Docker repository with:

- Repository name: `archly`
- Format: Docker
- Region: the same region as Cloud Run where possible

Example image location:

```text
asia-east1-docker.pkg.dev/archly-prod-123/archly/backend
```

### 4.3 Service accounts and IAM

Runtime identity:

```text
archly-runtime@archly-prod-123.iam.gserviceaccount.com
```

Grant Secret Manager Secret Accessor only on the three Archly Neon secrets.

Deployment identity:

```text
archly-deployer@archly-prod-123.iam.gserviceaccount.com
```

It needs permission to submit Cloud Builds, push images to Artifact Registry,
deploy Cloud Run, write build logs, deploy Firebase Hosting and Storage rules,
and act as the runtime account. The Workload Identity provider must allow the
intended GitHub repository to impersonate this account.

### 4.4 Cloud Run

The workflow deploys `archly-api` in `asia-east1` with:

| Setting | Production value |
| --- | --- |
| Minimum instances | `0` |
| Maximum instances | `2` |
| Concurrency | `20` |
| CPU | `1` |
| Memory | `1 GiB` |
| Request timeout | `60 seconds` |
| Container port | `8080` |
| Database pool maximum | `5` |
| Spring profile | `cloud` |
| Development authentication bypass | `false` |

Cloud Run receives the three database values directly from Secret Manager.
The generated service URL is discovered automatically by GitHub Actions.

## 5. Firebase configuration

Connect the existing GCP project to Firebase and configure:

- Firebase Hosting
- The default Hosting site
- A Cloud Storage for Firebase bucket
- The default `web.app` domain
- No custom domain for the initial production deployment

Expected default origins:

```text
https://archly-prod-123.web.app
https://archly-prod-123.firebaseapp.com
```

Firebase Storage rules remain deny-by-default until Archly has a
backend-mediated upload flow with ownership checks, quotas, cleanup, and image
migration. Do not make the bucket public to enable image uploads.

The Hosting deployment serves `ui/dist`, rewrites application routes to
`index.html`, prevents caching of `index.html`, and applies immutable caching
to versioned static assets.

## 6. Neon PostgreSQL configuration

Create a Neon PostgreSQL project in a region close to Cloud Run. Use Neon's
pooled endpoint to prevent serverless instances from exhausting database
connections.

Required Neon values:

- Pooled hostname
- Database name
- Database username
- Database password

Create these Google Secret Manager secrets:

```text
archly-neon-jdbc-url
archly-neon-username
archly-neon-password
```

Enter their values directly into Secret Manager. Do not place them in GitHub
variables, workflow files, `.env` examples, or documentation.

The JDBC secret must have this shape:

```text
jdbc:postgresql://NEON-POOLED-HOST/NEON-DATABASE?sslmode=require
```

Do not include `postgresql://username:password@...` in the JDBC secret. Store
the username and password separately. Use the pooled Neon endpoint, require
TLS, keep the Cloud Run pool capped at five connections, and configure Neon
backups/restore and usage alerts before storing customer data.

## 7. Google OAuth

Create or update a production Web OAuth client. Add every production frontend
origin that users may open:

```text
https://archly-prod-123.web.app
https://archly-prod-123.firebaseapp.com
```

Use the same OAuth client ID in:

- UI build variable `VITE_GOOGLE_CLIENT_ID`
- Backend environment variable `GOOGLE_CLIENT_ID`

Archly does not need the Google OAuth client secret for its ID-token flow. Do
not commit or distribute a client secret.

## 8. Backend CORS

Set `UI_ORIGINS` to the exact Firebase Hosting origin. Do not use `*` in
production. An origin contains the scheme and hostname but no path or trailing
slash.

Example:

```text
https://archly-prod-123.web.app
```

## 9. GitHub production environment

GitHub Actions is the selected deployment method. Create a protected GitHub
environment named `production` and require an approver before deployment where
possible. The workflow is `.github/workflows/deploy-gcp.yml` and is triggered
manually through **Actions → Deploy to GCP → Run workflow**.

Add these environment variables:

```text
GCP_PROJECT_ID
GCP_REGION
CLOUD_RUN_SERVICE
FIREBASE_PROJECT_ID
FIREBASE_HOSTING_ORIGIN
GOOGLE_CLIENT_ID
```

Set `GOOGLE_CLIENT_ID` to:

```text
222938267134-rcss0fnu7snhe4tmi1c1vlr9htoruif2.apps.googleusercontent.com
```

Suggested initial values:

```text
GCP_PROJECT_ID=archly-prod-123
GCP_REGION=asia-east1
CLOUD_RUN_SERVICE=archly-api
FIREBASE_PROJECT_ID=archly-prod-123
FIREBASE_HOSTING_ORIGIN=https://archly-prod-123.web.app
GOOGLE_CLIENT_ID=222938267134-rcss0fnu7snhe4tmi1c1vlr9htoruif2.apps.googleusercontent.com
```

The workflow discovers the Cloud Run URL after deploying the API and injects
the URL plus `/api` into the Vite build automatically.

## 10. GitHub authentication to GCP

Use Workload Identity Federation rather than a downloadable service-account
key. Add these protected GitHub environment secrets:

```text
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
```

Set `GCP_SERVICE_ACCOUNT` to:

```text
archly-deployer@archly-prod-123.iam.gserviceaccount.com
```

The deployer account, its Service Account User binding on the runtime account,
the Workload Identity pool, GitHub provider, protected `production`
environment, and both GitHub authentication secrets have been created.

The deployment service account needs the minimum permissions required to:

- Submit Cloud Build builds
- Push images to Artifact Registry
- Deploy Cloud Run revisions
- Act as the dedicated Cloud Run runtime service account
- Deploy Firebase Hosting releases
- Deploy Firebase Storage rules

Do not create or store a JSON service-account key unless Workload Identity
Federation is unavailable and an explicitly approved exception exists.

## 11. Deployment sequence

1. Confirm the GCP project ID and region.
2. Enable the required APIs.
3. Connect the GCP project to Firebase.
4. Create the Artifact Registry Docker repository.
5. Create the Neon database and pooled endpoint.
6. Add Neon credentials to Secret Manager.
7. Create the Cloud Run runtime service account.
8. Create the GitHub deployment service account.
9. Configure Workload Identity Federation.
10. Add protected GitHub production variables and secrets.
11. Run the manual `Deploy to GCP` workflow.
12. Let the workflow resolve the generated Cloud Run URL for the UI build.
13. Confirm Google OAuth origins and backend CORS.
14. Run production authentication, project CRUD, save/recovery, sharing, and
    export smoke tests.

## 12. Detailed setup and deployment runbook

This section is the operational procedure for recreating or auditing the
production environment. Run each step once unless it explicitly describes a
deployment or verification action.

### 12.1 Operator prerequisites

The operator needs administration access to GCP project `archly-prod-123`, its
Firebase project, the production Neon project, the GitHub repository
`vkgpt11/archly`, and Google Auth Platform. Install the Google Cloud CLI for
read-only verification and any one-time setup performed from a terminal.

Select the correct project before using `gcloud`:

```powershell
gcloud auth login
gcloud config set project archly-prod-123
gcloud config set run/region asia-east1
gcloud config list
```

Local CLI selection does not alter Archly's local-development configuration.

### 12.2 Enable Google Cloud services

Enable the APIs needed by Cloud Build, Cloud Run, Artifact Registry, Secret
Manager, Firebase, IAM, and Workload Identity Federation:

```powershell
gcloud services enable `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  firebase.googleapis.com `
  firebasehosting.googleapis.com `
  storage.googleapis.com `
  cloudresourcemanager.googleapis.com `
  iam.googleapis.com `
  iamcredentials.googleapis.com `
  sts.googleapis.com `
  --project archly-prod-123
```

Confirm billing is enabled, then verify the API list:

```powershell
gcloud services list --enabled --project archly-prod-123
```

### 12.3 Create Artifact Registry

Create one regional Docker repository. Skip creation if the describe command
shows that it already exists.

```powershell
gcloud artifacts repositories create archly `
  --project archly-prod-123 `
  --location asia-east1 `
  --repository-format docker `
  --description "Archly production containers"

gcloud artifacts repositories describe archly `
  --project archly-prod-123 `
  --location asia-east1
```

Backend images are stored under:

```text
asia-east1-docker.pkg.dev/archly-prod-123/archly/backend:IMAGE_TAG
```

### 12.4 Verify service accounts and IAM boundaries

Runtime identity:

```text
archly-runtime@archly-prod-123.iam.gserviceaccount.com
```

Deployment identity:

```text
archly-deployer@archly-prod-123.iam.gserviceaccount.com
```

Responsibility mapping:

| Principal | Resource | Required capability |
| --- | --- | --- |
| Runtime account | Three Neon secrets | Read secret values at runtime |
| Deployer account | Cloud Build | Submit backend builds |
| Deployer account | Artifact Registry `archly` | Upload container images |
| Deployer account | Cloud Run | Create and update `archly-api` |
| Deployer account | Runtime account | Act as the runtime identity |
| Deployer account | Firebase | Deploy Hosting and Storage rules |
| GitHub federated principal | Deployer account | Impersonate through Workload Identity Federation |

Verify both accounts:

```powershell
gcloud iam service-accounts describe `
  archly-runtime@archly-prod-123.iam.gserviceaccount.com

gcloud iam service-accounts describe `
  archly-deployer@archly-prod-123.iam.gserviceaccount.com
```

Do not permanently grant Owner or Editor to either account. The runtime account
must not receive build or deployment permissions. Grant access at the narrowest
practical resource level.

### 12.5 Configure Neon PostgreSQL

In the Neon console:

1. Open the production project, branch, and database.
2. Select **Connect**.
3. Enable **Connection pooling** and verify the hostname contains `-pooler`.
4. Record the hostname, database, username, and password separately.
5. Rotate the password if it appeared in chat, a screenshot, shell history,
   logs, or a commit.
6. Enable usage alerts, backups, and restore capabilities appropriate to the
   selected Neon plan.

The current non-secret JDBC structure is:

```text
jdbc:postgresql://ep-withered-sea-azuzud6c-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channelBinding=require
```

The URL secret must not contain the username or password. Store those as two
separate secrets. Use a direct, non-pooled Neon connection for administrative
tools that are incompatible with transaction pooling.

### 12.6 Configure Google Secret Manager

Create the secret containers once:

```powershell
gcloud secrets create archly-neon-jdbc-url --replication-policy automatic
gcloud secrets create archly-neon-username --replication-policy automatic
gcloud secrets create archly-neon-password --replication-policy automatic
```

Add values through **Google Cloud Console → Security → Secret Manager** so the
password is not exposed in shell history. Add a new secret version during
rotation rather than overwriting documentation or workflow files.

Grant the runtime identity access to each secret:

```powershell
gcloud secrets add-iam-policy-binding archly-neon-jdbc-url `
  --member "serviceAccount:archly-runtime@archly-prod-123.iam.gserviceaccount.com" `
  --role roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding archly-neon-username `
  --member "serviceAccount:archly-runtime@archly-prod-123.iam.gserviceaccount.com" `
  --role roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding archly-neon-password `
  --member "serviceAccount:archly-runtime@archly-prod-123.iam.gserviceaccount.com" `
  --role roles/secretmanager.secretAccessor
```

The deployer does not need permission to read secret values. Cloud Run receives
them as `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD` using
Secret Manager references in `cloudbuild-backend.yaml`.

### 12.7 Configure Firebase

In the Firebase console:

1. Import the existing Google Cloud project `archly-prod-123`; do not create a
   second project with a similar name.
2. Open **Build → Hosting** and complete the initial Hosting setup.
3. Confirm the default Hosting site is `archly-prod-123.web.app`.
4. Open **Build → Storage** and create the default bucket if Storage rule
   deployment requires it.
5. Keep Storage private. The checked-in rules intentionally deny every read and
   write until the image-storage backend is implemented.

The workflow deploys `ui/dist` using `deployment/gcp/firebase.json`. All SPA
routes rewrite to `index.html`; the HTML is not cached, while versioned static
assets receive long-lived cache headers.

After deployment verify both potential Firebase origins:

```text
https://archly-prod-123.web.app
https://archly-prod-123.firebaseapp.com
```

### 12.8 Configure Google OAuth

In GCP project `archly-prod-123`:

1. Open **Google Auth Platform → Branding**.
2. Configure the application name, support email, home page, privacy policy,
   terms link, and optional logo.
3. Open **Audience** and use the External audience required for personal Gmail
   accounts.
4. Open **Clients** and select the production Web application client.
5. Add both Firebase origins as Authorized JavaScript origins.
6. Do not add `/api`, a page path, a wildcard, or a trailing slash.
7. Copy only the client ID to GitHub; Archly does not use the client secret for
   its Google ID-token flow.

The client ID is:

```text
222938267134-rcss0fnu7snhe4tmi1c1vlr9htoruif2.apps.googleusercontent.com
```

The backend remains responsible for validating the token, `email_verified`,
the exact `gmail.com` domain, and project ownership. The production development
authentication bypass must remain disabled.

### 12.9 Configure the GitHub production environment

Open:

```text
GitHub -> vkgpt11/archly -> Settings -> Environments -> production
```

Add these under **Environment variables**:

| Variable | Exact value |
| --- | --- |
| `GCP_PROJECT_ID` | `archly-prod-123` |
| `GCP_REGION` | `asia-east1` |
| `CLOUD_RUN_SERVICE` | `archly-api` |
| `FIREBASE_PROJECT_ID` | `archly-prod-123` |
| `FIREBASE_HOSTING_ORIGIN` | `https://archly-prod-123.web.app` |
| `GOOGLE_CLIENT_ID` | `222938267134-rcss0fnu7snhe4tmi1c1vlr9htoruif2.apps.googleusercontent.com` |

Add these under **Environment secrets**:

| Secret | Exact value or format |
| --- | --- |
| `GCP_SERVICE_ACCOUNT` | `archly-deployer@archly-prod-123.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` |

The provider path uses the numeric GCP project number. It is a resource name,
not an HTTPS URL. Keep these settings in the protected `production`
environment because the deployment job explicitly uses that environment.

### 12.10 Verify Workload Identity Federation

The provider must map GitHub token claims and restrict trust to the intended
GitHub owner and repository. An unrelated public repository must not satisfy
the provider condition. The GitHub federated principal needs Workload Identity
User permission on the deployer account.

The workflow requests only:

```yaml
permissions:
  contents: read
  id-token: write
```

`google-github-actions/auth` exchanges GitHub's short-lived OIDC token and
impersonates the deployer account. Do not create a downloadable service-account
JSON key.

### 12.11 Run the deployment workflow

1. Push the latest tested code to `main`.
2. Open **GitHub → Actions → Deploy to GCP**.
3. Select **Run workflow**, choose `main`, and start the run.
4. Approve the protected environment if approval is configured.
5. Confirm the `verify` job passes before deployment begins.
6. Observe the backend build, Cloud Run deployment, API URL resolution, UI
   build, and Firebase deployment.
7. Record the workflow URL, Git commit, and Cloud Run revision.

The deployment is intentionally manual. Pushing to `main` alone does not deploy
production. The Cloud Run URL is discovered automatically and supplied to the
Vite build as `<service-url>/api`.

Stage diagnosis:

| Failed stage | Check first |
| --- | --- |
| GitHub authentication | WIF provider path, repository condition, ID-token permission, and environment secrets |
| Cloud Build submission | Enabled APIs and deployer build/service-usage permissions |
| Docker push | Artifact Registry repository, region, and writer permission |
| Cloud Run deployment | Cloud Run Admin, Service Account User, secret references, and container startup logs |
| API URL resolution | Project, region, service name, and successful Cloud Run revision |
| UI build | Node build and production environment variables |
| Firebase deployment | Firebase initialization and deployer Hosting/Storage permissions |

### 12.12 Inspect the deployed service

Use read-only commands:

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

Logs must not contain database passwords, OAuth tokens, complete share tokens,
or sensitive request bodies.

### 12.13 Configuration change rules

- A GitHub variable change requires a new deployment workflow run.
- A Neon credential rotation requires a new Secret Manager version and a new
  Cloud Run revision or controlled instance restart.
- A Firebase UI change requires rebuilding `ui/dist` before deployment.
- An OAuth origin change happens in Google Auth Platform and can take time to
  propagate.
- Production changes must not replace or weaken local-development settings.
- Secret values must never be added to `.env` examples, Markdown, workflows,
  screenshots, issues, or commits.

## 13. Post-deployment verification

After the workflow succeeds, verify:

1. Open `https://archly-prod-123.web.app` in a private browser window.
2. Confirm Google sign-in works for a verified personal Gmail account.
3. Confirm an unsupported account receives the Gmail-only message.
4. Create, edit, save, reload, duplicate, and delete a project.
5. Confirm document and canvas data survive reload.
6. Verify sharing, revocation, PNG, SVG, Markdown, and source export.
7. Confirm the browser console has no CORS, OAuth, or API errors.
8. Check Cloud Run logs without exposing request credentials or share tokens.
9. Confirm Cloud Run has no more than two instances and Neon connections stay
   within the configured pool limit.

Record the UI URL, API URL, Cloud Run revision, Git commit SHA, GitHub workflow
URL, test results, and operator in release notes.

## 14. Cost and safety controls

Before the first deployment:

- Create billing budgets and low-value alert thresholds.
- Keep Cloud Run minimum instances at zero initially.
- Cap Cloud Run maximum instances.
- Set finite Cloud Logging retention.
- Configure Neon usage limits and alerts when available.
- Do not add a NAT Gateway for this initial architecture.
- Keep Firebase Storage deny-by-default.
- Confirm that local authentication bypass is disabled.
- Establish Neon restore and export procedures before storing customer data.

Billing alerts notify operators but do not automatically cap spending. Keep the
Cloud Run maximum instance count and database pool limits enforced in source
configuration.

## 15. Rollback and recovery

### 15.1 Cloud Run

Cloud Run keeps immutable revisions. Route traffic back to the last verified
revision if a new API revision is unhealthy. Check database schema compatibility
before rolling application code back after a migration.

### 15.2 Firebase Hosting

Use Firebase Hosting release history to restore the previous successful UI
release. This does not roll back Cloud Run or Neon.

### 15.3 Neon

Use Neon restore, point-in-time recovery, or a tested export according to the
plan. Restore into a separate branch or database first when practical and
validate it before reconnecting the application.

### 15.4 Compromised credential

1. Rotate the credential at its source.
2. Add a new Secret Manager version.
3. Deploy a new Cloud Run revision.
4. Verify the new revision.
5. Disable the compromised secret version or database credential.
6. Review GitHub, Cloud Build, Cloud Run, and Neon logs for misuse.

## 16. Values safe to share for repository configuration

The following non-secret values may be supplied when tailoring the checked-in
configuration:

```text
GCP Project ID: archly-prod-123
Preferred GCP region: asia-east1
Firebase Project ID: archly-prod-123
Firebase Hosting URL: https://archly-prod-123.web.app
Cloud Run service name: archly-api
Google OAuth client ID: 222938267134-rcss0fnu7snhe4tmi1c1vlr9htoruif2.apps.googleusercontent.com
Custom domain: none
```

Do not share Neon passwords, access tokens, private keys, service-account JSON,
or Secret Manager values.

## 17. Official references

- [Google Cloud: Workload Identity Federation with deployment pipelines](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)
- [Google Cloud: Workload Identity Federation best practices](https://cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation)
- [Google Cloud: Configure Cloud Run secrets](https://cloud.google.com/run/docs/configuring/services/secrets)
- [Google Cloud: Service accounts in deployment pipelines](https://cloud.google.com/iam/docs/best-practices-for-using-service-accounts-in-deployment-pipelines)
- [Firebase Hosting documentation](https://firebase.google.com/docs/hosting)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
