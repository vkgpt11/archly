# GCP deployment requirements

Status: implementation configuration added; cloud resources not provisioned.

## Scope

Archly production deployment will use Firebase Hosting, Google Cloud Run, Neon
PostgreSQL, and Firebase Storage. These requirements are separate from local
development and must not change the local startup workflow.

## DEP-GCP-001 — Local isolation

- Local UI continues to use Vite on port 5173.
- Local API continues to use Spring Boot on port 8080.
- H2 and the existing local Docker PostgreSQL workflow remain supported.
- Development authentication bypass remains available only through explicit
  local flags and must always be disabled in production.

## DEP-GCP-002 — Firebase Hosting

- Serve the compiled React application through managed HTTPS.
- Support client-side routes through an `index.html` fallback.
- Cache fingerprinted static assets and prevent stale `index.html` caching.
- Inject the production API URL and Google OAuth client ID at build time.

## DEP-GCP-003 — Cloud Run API

- Deploy the existing backend container without application rewrites.
- Scale to zero and cap maximum instances initially to control cost.
- Expose the actuator health endpoint for revision health checks.
- Accept CORS requests only from the configured Firebase Hosting origin.
- Never enable the local authentication bypass.
- Obtain credentials from Secret Manager rather than deployment files.

## DEP-GCP-004 — Neon PostgreSQL

- Use the pooled Neon endpoint with TLS required.
- Keep each Cloud Run instance's JDBC pool small to protect connection limits.
- Apply Flyway migrations during controlled deployments.
- Select a Neon region close to Cloud Run.
- Establish backup/restore expectations before storing production customer data.

## DEP-GCP-005 — Firebase Storage images

- Current embedded images remain unchanged until a dedicated migration is built.
- Default Storage rules must deny all access.
- Future uploads must be mediated by the backend and scoped to project ownership.
- Enforce file type, individual size, user quota and project quota.
- Store only object references in document HTML, never credentials or signed URLs.
- Delete abandoned uploads and project images through a defined lifecycle.
- Provide migration and rollback for existing base64 images.

## DEP-GCP-006 — Cost and operations

- Configure billing budgets and alerts before deployment.
- Limit Cloud Run instances and database connections.
- Set finite application-log retention.
- Monitor API error rate, latency, cold starts and database connection failures.
- Document UI, API and database rollback procedures.
