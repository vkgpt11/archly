# Archly deployment frequently asked questions

This document records recurring production deployment and cloud-operations
questions for GCP, Firebase, Neon, Google OAuth, and GitHub Actions. Never
include passwords, access tokens, service-account keys, or credential-bearing
connection URLs in an FAQ entry.

### Why does deployment fail with `Cloud Build API has not been used`?

The GitHub workflow can authenticate successfully but cannot submit the backend
build when `cloudbuild.googleapis.com` is disabled in GCP project
`archly-prod-123`. Typical output includes:

```text
PERMISSION_DENIED: Cloud Build API has not been used in project 222938267134
before or it is disabled.
reason: SERVICE_DISABLED
```

Project number `222938267134` identifies the same project as
`archly-prod-123`; its appearance in the error does not indicate that the
workflow selected a different project.

#### Resolution using Google Cloud Console

1. Sign in with a project administrator account.
2. Open the Cloud Build API page for project `archly-prod-123`:
   `https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=archly-prod-123`
3. Select **Enable**.
4. Wait several minutes for the change to propagate.
5. Rerun the complete **Deploy to GCP** workflow from GitHub Actions.

#### Resolution using Google Cloud Shell

Google Cloud Shell uses Bash. Run as a project administrator:

```bash
gcloud config set project archly-prod-123

gcloud services enable cloudbuild.googleapis.com \
  --project archly-prod-123
```

It is preferable to enable the complete required service set before the first
deployment so the workflow does not fail at the next cloud integration:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  storage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project archly-prod-123
```

Verify Cloud Build is enabled:

```bash
gcloud services list --enabled \
  --project archly-prod-123 \
  --filter="name:cloudbuild.googleapis.com"
```

The result should include `cloudbuild.googleapis.com`.

#### Should the GitHub deployer enable APIs automatically?

No. API activation is a one-time administrative action. Do not grant the
GitHub deployer broad Service Usage Admin permission merely to make deployment
enable APIs. Keep deployment permissions limited, enable required APIs through
an administrator, and rerun the entire workflow after propagation.

The message about files excluded by the default `.gcloudignore` is
informational and is not the cause of this failure.

### Why does Cloud Run deployment fail with `Permission denied to enable service run.googleapis.com`?

This failure occurs after the backend container has built and been pushed to
Artifact Registry, but before Cloud Run can create a revision. Typical output
includes:

```text
The following APIs are not enabled on project [archly-prod-123]:
run.googleapis.com
Permission denied to enable service [run.googleapis.com]
permission: serviceusage.services.enable
reason: AUTH_PERMISSION_DENIED
```

The successful Docker push proves that Cloud Build and Artifact Registry are
working. The deployer account correctly lacks permission to enable arbitrary
Google APIs. API activation is a one-time administrator responsibility and
must not be solved by granting Service Usage Admin to the deployment pipeline.

In Google Cloud Shell, authenticate as a project administrator and enable the
Cloud Run API:

```bash
gcloud services enable run.googleapis.com --project=archly-prod-123
```

To prevent another sequential API failure, enable the complete required set:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com firebase.googleapis.com firebasehosting.googleapis.com storage.googleapis.com cloudresourcemanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project=archly-prod-123
```

Verify Cloud Run is enabled:

```bash
gcloud services list --enabled --project=archly-prod-123 --filter="name:run.googleapis.com"
```

The result should include `run.googleapis.com`.

The deployer should be allowed to consume enabled project services, without
being allowed to enable or disable them:

```bash
gcloud projects add-iam-policy-binding archly-prod-123 --member="serviceAccount:archly-deployer@archly-prod-123.iam.gserviceaccount.com" --role="roles/serviceusage.serviceUsageConsumer"
```

It also needs Cloud Run deployment access:

```bash
gcloud projects add-iam-policy-binding archly-prod-123 --member="serviceAccount:archly-deployer@archly-prod-123.iam.gserviceaccount.com" --role="roles/run.admin"
```

The deployer must separately retain Service Account User permission on
`archly-runtime@archly-prod-123.iam.gserviceaccount.com`. The runtime account,
not the deployer, reads the three Neon secrets.

Wait several minutes for API and IAM propagation, then rerun the complete
deployment workflow. The container image pushed by the failed run is valid but
unused; a new workflow run will create a new image tag.

### Why does Google Cloud Shell report `--project: command not found`?

Google Cloud Shell runs Bash. A backtick is PowerShell's line-continuation
character, but Bash interprets backticks as command substitution. Pasting a
PowerShell command into Cloud Shell can therefore split flags such as
`--project`, `--location`, `--member`, and `--role` into invalid commands.

In Bash, use a backslash (`\`) as the final character on each continued line,
with no spaces after it. A single-line command is safest when copying from
documentation.

Create the Artifact Registry repository using this Cloud Shell command:

```bash
gcloud artifacts repositories create archly --project=archly-prod-123 --location=asia-east1 --repository-format=docker --description="Archly production containers"
```

Grant the deployment account permission to push images:

```bash
gcloud artifacts repositories add-iam-policy-binding archly --project=archly-prod-123 --location=asia-east1 --member="serviceAccount:archly-deployer@archly-prod-123.iam.gserviceaccount.com" --role="roles/artifactregistry.writer"
```

Verify the repository:

```bash
gcloud artifacts repositories describe archly --project=archly-prod-123 --location=asia-east1
```

Verify the repository IAM policy:

```bash
gcloud artifacts repositories get-iam-policy archly --project=archly-prod-123 --location=asia-east1
```

Expected policy membership includes:

```text
serviceAccount:archly-deployer@archly-prod-123.iam.gserviceaccount.com
roles/artifactregistry.writer
```

Use PowerShell backticks only in a PowerShell terminal. Use Bash backslashes or
single-line commands in Google Cloud Shell, Linux terminals, and GitHub Actions
shell steps.

For the complete deployment procedure, see
[GCP deployment configuration](gcp-deployment-configuration.md).
