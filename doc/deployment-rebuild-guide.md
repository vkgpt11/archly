# Archly production environment rebuild guide

This guide recreates the Archly production environment from an empty or
replacement cloud project. It captures the order, commands, validation checks,
and deployment failures encountered during the first production setup.

Use Google Cloud Shell for the commands in this document. It runs Bash, so use
`\` for line continuation. Do not paste PowerShell backticks into Cloud Shell.

Never place database passwords, OAuth tokens, service-account keys, or complete
credential-bearing database URLs in this document, GitHub variables, command
history, screenshots, or commits.

## 1. Target architecture

```text
GitHub Actions --Workload Identity Federation--> GCP deployer identity
       |
       +--> Cloud Build --> Artifact Registry --> Cloud Run Java API
       |
       +--> Vite build --> Firebase Hosting
       |
       +--> Firebase Storage deny-all rules

Browser --> Firebase Hosting --> Cloud Run --> Neon PostgreSQL
                    |               |
                    |               +--> Google Secret Manager
                    +--> Google OAuth
```

Production values used by the initial environment:

| Setting | Value |
| --- | --- |
| GCP and Firebase project ID | `archly-prod-123` |
| GCP project number | `222938267134` |
| Region | `asia-east1` |
| Cloud Run service | `archly-api` |
| Artifact Registry repository | `archly` |
| Firebase Hosting origin | `https://archly-prod-123.web.app` |
| Firebase Storage bucket | `archly-prod-123.firebasestorage.app` |
| Runtime identity | `archly-runtime@archly-prod-123.iam.gserviceaccount.com` |
| Deployment identity | `archly-deployer@archly-prod-123.iam.gserviceaccount.com` |
| GitHub repository | `vkgpt11/archly` |

When rebuilding in a new project, replace every project-specific value
consistently in checked-in deployment configuration and GitHub variables.

## 2. Preparation

1. Create or select the GCP project.
2. Link a billing account.
3. Confirm the Firebase project uses the Blaze plan before provisioning a new
   default Storage bucket.
4. Install or open Google Cloud Shell.
5. Confirm access to the GitHub repository and Neon project.

Select and verify the project:

```bash
gcloud config set project archly-prod-123
gcloud config get-value project
gcloud projects describe archly-prod-123 --format="value(projectNumber)"
```

The expected project number is `222938267134`. GCP error messages may show the
numeric project number instead of the project ID; they identify the same
project.

## 3. Enable all required APIs first

Enable the complete service set before attempting deployment:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  firebasestorage.googleapis.com \
  storage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  logging.googleapis.com \
  --project=archly-prod-123
```

Verify the list:

```bash
gcloud services list --enabled --project=archly-prod-123
```

Do this with an administrator identity. Do not grant the GitHub deployer
Service Usage Admin merely so that it can enable APIs during deployment.

## 4. Create Artifact Registry

Create the regional Docker repository:

```bash
gcloud artifacts repositories create archly \
  --project=archly-prod-123 \
  --location=asia-east1 \
  --repository-format=docker \
  --description="Archly production containers"
```

Verify:

```bash
gcloud artifacts repositories describe archly \
  --project=archly-prod-123 \
  --location=asia-east1
```

The backend image path is:

```text
asia-east1-docker.pkg.dev/archly-prod-123/archly/backend:IMAGE_TAG
```

## 5. Configure Neon PostgreSQL

1. Create a Neon project and production branch.
2. Choose a region reasonably close to Cloud Run.
3. Create the database and application role.
4. Open **Connect** and enable **Connection pooling**.
5. Confirm the hostname contains `-pooler`.
6. Copy the hostname, database, username, and password separately.
7. Rotate any password exposed in chat, logs, screenshots, or shell history.

Store the JDBC URL without embedded credentials:

```text
jdbc:postgresql://NEON-POOLED-HOST/NEON-DATABASE?sslmode=require&channelBinding=require
```

Keep username and password in separate secrets. Configure Neon usage alerts,
backups, and restore procedures before storing important customer data.

## 6. Create Secret Manager entries

Create the secret containers:

```bash
gcloud secrets create archly-neon-jdbc-url --replication-policy=automatic
gcloud secrets create archly-neon-username --replication-policy=automatic
gcloud secrets create archly-neon-password --replication-policy=automatic
```

Add their values using **Google Cloud Console → Security → Secret Manager** so
the password is not written into terminal history.

Verify versions exist without reading values:

```bash
gcloud secrets versions list archly-neon-jdbc-url
gcloud secrets versions list archly-neon-username
gcloud secrets versions list archly-neon-password
```

## 7. Create service accounts

```bash
gcloud iam service-accounts create archly-runtime \
  --display-name="Archly Cloud Run runtime"

gcloud iam service-accounts create archly-deployer \
  --display-name="Archly GitHub deployment"
```

Verify:

```bash
gcloud iam service-accounts describe \
  archly-runtime@archly-prod-123.iam.gserviceaccount.com

gcloud iam service-accounts describe \
  archly-deployer@archly-prod-123.iam.gserviceaccount.com
```

Do not generate downloadable JSON service-account keys.

## 8. Grant runtime permissions

Grant the runtime account read access independently on the three Neon secrets:

```bash
for SECRET in archly-neon-jdbc-url archly-neon-username archly-neon-password; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:archly-runtime@archly-prod-123.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

The runtime identity should not receive Cloud Build, Artifact Registry writer,
Firebase deployment, or project-administration permissions.

## 9. Grant deployer permissions

Grant project-level responsibilities required by the current pipeline:

```bash
for ROLE in \
  roles/cloudbuild.builds.editor \
  roles/run.admin \
  roles/logging.logWriter \
  roles/serviceusage.serviceUsageConsumer \
  roles/firebase.admin; do
  gcloud projects add-iam-policy-binding archly-prod-123 \
    --member="serviceAccount:archly-deployer@archly-prod-123.iam.gserviceaccount.com" \
    --role="$ROLE"
done
```

Grant Artifact Registry write access at repository scope:

```bash
gcloud artifacts repositories add-iam-policy-binding archly \
  --project=archly-prod-123 \
  --location=asia-east1 \
  --member="serviceAccount:archly-deployer@archly-prod-123.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

Allow the deployer to attach the runtime identity to Cloud Run:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  archly-runtime@archly-prod-123.iam.gserviceaccount.com \
  --member="serviceAccount:archly-deployer@archly-prod-123.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

Verify the deployer roles:

```bash
gcloud projects get-iam-policy archly-prod-123 \
  --flatten="bindings[].members" \
  --filter="bindings.members:archly-deployer@archly-prod-123.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

## 10. Configure Workload Identity Federation

Create one pool and one GitHub OIDC provider. Record the chosen IDs because the
full provider resource name becomes a GitHub environment secret.

At minimum, map:

```text
google.subject=assertion.sub
attribute.repository=assertion.repository
attribute.repository_owner=assertion.repository_owner
```

Restrict the provider condition to the intended owner and repository. An
unrelated public GitHub repository must not be able to impersonate the
deployer.

Grant the repository principal Workload Identity User on the deployer account.
The resulting provider name has this form:

```text
projects/222938267134/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
```

GitHub Actions requests short-lived credentials using OIDC. No permanent GCP
key is stored in GitHub.

## 11. Initialize Firebase Hosting

Add Firebase to the existing GCP project, then verify the default site:

```bash
npx --yes firebase-tools@15.28.2 hosting:sites:list \
  --project=archly-prod-123
```

Expected site:

```text
archly-prod-123 -> https://archly-prod-123.web.app
```

If the site exists but the URL says `Site Not Found`, Hosting has no successful
release yet. Do not recreate the site; complete the deployment workflow.

## 12. Provision the default Firebase Storage bucket

Check whether the bucket is already linked:

```bash
curl --silent --show-error \
  --header "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://firebasestorage.googleapis.com/v1alpha/projects/archly-prod-123/defaultBucket"
```

If the response is `404 NOT_FOUND`, create and link it:

```bash
curl --fail-with-body --silent --show-error \
  --request POST \
  --header "Authorization: Bearer $(gcloud auth print-access-token)" \
  --header "Content-Type: application/json" \
  --data '{"location":"asia-east1"}' \
  "https://firebasestorage.googleapis.com/v1alpha/projects/archly-prod-123/defaultBucket"
```

Expected result:

```text
Bucket: archly-prod-123.firebasestorage.app
Location: ASIA-EAST1
Storage class: STANDARD
```

Verify:

```bash
gcloud storage buckets describe gs://archly-prod-123.firebasestorage.app
```

Do not make the bucket public. Archly deploys deny-all Storage rules until the
backend-mediated image flow is implemented.

## 13. Configure production Google OAuth

1. Open Google Auth Platform in `archly-prod-123`.
2. Configure Branding and the External audience.
3. Create a Web application OAuth client.
4. Add Authorized JavaScript origins:

   ```text
   https://archly-prod-123.web.app
   https://archly-prod-123.firebaseapp.com
   ```

5. Do not include paths, `/api`, wildcards, or trailing slashes.
6. Store only the client ID in GitHub. Archly does not need the client secret
   for its ID-token flow.

## 14. Configure the GitHub production environment

Create **Settings → Environments → production**.

Environment variables:

| Variable | Value |
| --- | --- |
| `GCP_PROJECT_ID` | `archly-prod-123` |
| `GCP_REGION` | `asia-east1` |
| `CLOUD_RUN_SERVICE` | `archly-api` |
| `FIREBASE_PROJECT_ID` | `archly-prod-123` |
| `FIREBASE_HOSTING_ORIGIN` | `https://archly-prod-123.web.app` |
| `GOOGLE_CLIENT_ID` | Production OAuth Web client ID |

Environment secrets:

| Secret | Value |
| --- | --- |
| `GCP_SERVICE_ACCOUNT` | `archly-deployer@archly-prod-123.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full provider resource name |

Use environment approval rules if available.

## 15. Understand the checked-in Firebase layout

`firebase.json` is stored under `deployment/gcp/`. Firebase CLI resolves paths
from that directory and rejects Hosting content outside it.

The workflow therefore builds to `ui/dist`, then stages a fresh copy:

```bash
rm -rf deployment/gcp/site
cp -R ui/dist deployment/gcp/site
```

The Firebase configuration uses:

```json
{
  "hosting": { "public": "site" },
  "storage": { "rules": "storage.rules" }
}
```

`deployment/gcp/site/` is generated and ignored by Git. Do not change Hosting
back to `../../ui/dist`; Firebase rejects it as outside the project directory.
Do not prefix the rules path with `deployment/gcp/`; that creates a duplicated
path relative to `firebase.json`.

## 16. Run the deployment

1. Push tested configuration to `main`.
2. Open **GitHub → Actions → Deploy to GCP**.
3. Select **Run workflow** and `main`.
4. Approve the `production` environment if required.
5. Observe all stages through Firebase deployment.

Expected flow:

```text
CI -> authenticate -> Cloud Build -> Artifact Registry -> Cloud Run
   -> resolve API URL -> build UI -> stage UI -> Firebase Hosting and rules
```

Do not declare success based on GitHub cleanup messages. Firebase success must
include `Deploy complete!` and the live Hosting URL.

## 17. Verify production

Check Cloud Run:

```bash
gcloud run services describe archly-api \
  --project=archly-prod-123 \
  --region=asia-east1 \
  --format="value(status.url,status.latestReadyRevisionName)"
```

Check Hosting:

```bash
curl --head https://archly-prod-123.web.app
```

Then perform the production smoke test from the root README:

- Gmail sign-in and rejection cases
- Project create, save, reload, duplicate, and delete
- Concurrent-tab conflict recovery
- Share creation, anonymous read-only access, and revocation
- PNG, SVG, Markdown, and source export
- Browser console, CORS, OAuth, and API checks
- Storage access remains denied

Record the Git SHA, workflow URL, UI URL, API URL, Cloud Run revision, and test
result.

## 18. Failure history and immediate diagnosis

| Failure | Meaning | Resolution |
| --- | --- | --- |
| `Cloud Build API has not been used` | API disabled | Administrator enables `cloudbuild.googleapis.com` |
| Docker push fails in build step 1 | Registry missing or writer role absent | Create `archly`; grant repository writer |
| Cannot enable `run.googleapis.com` | Cloud Run API disabled; deployer correctly cannot enable APIs | Administrator enables API; grant deployer Service Usage Consumer |
| Cloud Run deployment denied | Missing Run Admin or runtime `actAs` | Grant Run Admin and Service Account User on runtime |
| Firebase `Site Not Found` | Hosting site exists but no successful release | Complete Firebase deployment; do not recreate site |
| Default bucket returns `404` | Firebase Storage not provisioned | Use `projects.defaultBucket.create` REST endpoint |
| `Error reading rules file` | Rules path duplicated relative to `firebase.json` | Use `storage.rules` |
| `../../ui/dist is outside of project directory` | Firebase blocks Hosting outside config root | Stage UI into `deployment/gcp/site` |
| npm deprecation warnings during Firebase CLI install | Transient CLI dependencies | Use pinned CLI; rely on final exit status |
| `Post job cleanup` appears | Temporary credentials are being removed | Not proof of deployment success |

Detailed error explanations and commands remain in
[deployment-faq.md](deployment-faq.md).

## 19. Rebuild completion checklist

- [ ] Billing enabled and Firebase Blaze plan confirmed
- [ ] Required APIs enabled
- [ ] Artifact Registry repository exists
- [ ] Neon pooled database configured
- [ ] Three Secret Manager values populated
- [ ] Runtime and deployer service accounts created
- [ ] Runtime can access only the required secrets
- [ ] Deployer roles and runtime `actAs` binding verified
- [ ] Workload Identity provider restricted to `vkgpt11/archly`
- [ ] Firebase Hosting site exists
- [ ] Firebase default Storage bucket exists and is private
- [ ] OAuth origins configured
- [ ] GitHub production variables and secrets configured
- [ ] CI and deployment workflow successful
- [ ] Hosting returns Archly rather than `Site Not Found`
- [ ] Cloud Run revision is ready
- [ ] Production smoke test completed
- [ ] Release evidence recorded

## 20. Related documents

- [Deployment configuration and operational runbook](gcp-deployment-configuration.md)
- [Deployment FAQ](deployment-faq.md)
- [GCP deployment requirements](deployment-requirements-gcp.md)
- [Executable deployment configuration](../deployment/gcp/README.md)
