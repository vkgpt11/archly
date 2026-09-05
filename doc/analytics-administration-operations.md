# Analytics and administration operations

This runbook covers the privacy-conscious V3 analytics subsystem. It stores identifiers and a closed lifecycle-event vocabulary only. Never add project names, document HTML, canvas JSON, component labels, request bodies, OAuth credentials, share tokens, or export contents to events, logs, metrics, audit records, or CSV output.

## Configuration and access

Production reads the `archly-admin-emails` Secret Manager secret into `ARCHLY_ADMIN_EMAILS`. The Cloud Run runtime identity alone receives `roles/secretmanager.secretAccessor` for that secret. An absent or empty value denies every administrator and emits a startup warning without displaying configured values.

Grant or rotate access by adding a new comma-separated, normalized Gmail allowlist as a secret version and deploying a new Cloud Run revision. Verify one configured administrator receives `200` from `/api/admin/metrics/summary`, a normal authenticated user receives `403`, and an unauthenticated request receives `401`. Emergency revocation uses an empty secret version followed by a deployment. Never put the allowlist in source control, GitHub variables, command output, or tickets.

## Collection, retention, and deletion

`ARCHLY_ANALYTICS_ENABLED=false` stops new lifecycle-event collection without affecting project operations. Session and raw-event retention default to 90 days and are configured through `ARCHLY_SESSION_RETENTION_DAYS` and `ARCHLY_ANALYTICS_RETENTION_DAYS`. The daily cleanup deletes at most 5,000 rows of each type per transaction and publishes `archly.analytics.cleanup.deleted` and `archly.analytics.cleanup.duration` metrics.

User deletion must remove the `archly_users` row; database cascades remove sessions, events, and admin-audit rows. Before exposing a deletion workflow, confirm retained aggregate reporting is non-identifying. Analytics collection, purposes, retention periods, deletion behavior, and administrator access must appear in the production privacy notice before collection is enabled.

## Dashboards and alerts

Create production charts for request rate, error rate, latency, session establishments, lifecycle events, cleanup duration/deleted rows, database connection pressure, container instance count, and deployed revision. Alerts must cover Cloud Run unavailability, elevated 5xx rate or p95 latency, Neon connection pressure, repeated cleanup failures, deployment failures, and missing Firebase assets. Route alerts to the named incident owner and test each route quarterly.

## Smoke check and reconciliation

After deployment: establish one new browser session, create a project, save content, archive, restore, duplicate, and delete the duplicate. Confirm each operation succeeds independently of the admin dashboard. Compare project-table totals to the summary API, lifecycle events to time-series totals, and ensure a repeated session identifier does not increment login count. Export CSV and confirm it contains aggregates only. Capture headers to verify `Cache-Control: no-store` and `X-Correlation-ID`.

Search application, proxy, audit, and deployment logs for the test email, Google subject, bearer token, project name, document text, canvas JSON fragment, and share token. Any match beyond the intentionally masked administrator user response blocks release.

## Rollback

Set `ARCHLY_ANALYTICS_ENABLED=false`, publish an empty administrator allowlist version, and deploy the previous application image. Leave additive Flyway tables intact; never reverse a production Flyway migration during an incident. Validate project read/edit/save/export after rollback, preserve correlation IDs and timestamps, then correct the fault through a forward migration.
