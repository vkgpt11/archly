# Archly V4 Requirements

Status: Draft — implementation backlog and release criteria

Version: 4.0

Last updated: 2026-09-07

Audit baseline: `main` at `391141c`. Baseline statements below come from a
repository and documentation review, not a new test run or live deployment
verification. Historical completion labels are not proof of current release
readiness.

## 1. Objective and scope

V4 completes data portability, AI reliability, managed assets, recoverable
project history, and documentation integration before further product expansion.
It also closes verification gaps between local implementations and a dependable
production release.

This document consolidates the outstanding work identified across:

- [V1 requirements](requirements-v1.md)
- [V2 requirements](requirements-v2.md)
- [V1 canvas requirements](canvas-requirements-v1.md)
- [V3 requirements](requirements-v3.md)
- [Analytics and administration](V3_product-analytics-and-administration.md)
- [Diagram-as-code requirements](requirements_v3_diagramascode.md)
- [AI generation requirements](requirements-ai-diagram-generation.md)
- [Deployment requirements](deployment-requirements-gcp.md)

Existing behavior remains the baseline. V4 does not require rebuilding canvas
interactions, container collapse, alignment guides, sharing and revocation,
administrator analytics, DSL variants/views/rules, visual comparison, or existing
Mermaid/PlantUML/D2 exports. Changes must preserve these capabilities.

Priorities:

- **Must** blocks the applicable V4 milestone unless explicitly deferred with
  an owner, rationale, accepted risk, and follow-up milestone.
- **Should** is relevant follow-up work after Must requirements in its milestone.
- **Could** requires a separate scope decision before implementation.

Requirements describe target behavior, not implementation completion. A feature
is complete only with a working user path, persistence compatibility, relevant
automated coverage, documentation, and recorded release evidence.

## 2. Current gaps and delivery order

| Order | Area | Audited baseline | Target milestone |
| --- | --- | --- | --- |
| 1 | Editable export/import | Export dialog reconstructs an incomplete canvas payload; no complete project-import user path found. | M1: portability and AI safety |
| 2 | AI reliability and cost | Per-request timeouts and retries exist; overall deadline, result replay, model-specific pricing, complete repair accounting, and external alerting need completion. | M1 |
| 3 | Managed images | Documentation embeds Base64 images; managed project-owned storage is missing. | M2: recoverable content |
| 4 | Project snapshots | Named diagram comparison snapshots exist, capped at 20; complete project capture and restore are missing. | M2 |
| 5 | Document integration | Internal component links, synchronized embeds, and broken-link handling are missing. | M3: connected documentation |
| 6 | Rich documents and PDF | Tables, checklists, callouts, explicit code language, Markdown import, and document PDF export need implementation. | M3 |
| 7 | Ownership migration | Internal ownership column is staged; project authorization still queries by email. | M2, before new ownership-dependent APIs |
| 8 | Staging and quality gates | Tests and production operations evidence exist, but full live-service, recovery, browser, accessibility, performance, and container scan evidence is incomplete. | Every milestone |
| 9 | Infrastructure import and DSL refinements | Infrastructure adapters and several template/editor follow-ups remain outstanding. | M4: architecture workflow expansion |

Staging, automated checks, and operational verification are prerequisites for
promotion throughout delivery, not a final cleanup phase. M4 starts after M1–M3
Must requirements are accepted or explicitly deferred.

## 3. Lossless editable project export and import

Implementation notes and local verification (2026-09-08):
[Editable project backup and import](project-backup-import.md).
Staging/production acceptance remains separate.

Traceability: V2-EXP-002, V3-EXP-003, V3-SAVE-004–005, V3-DAC-QA-001–006.

### Requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-PORT-001 | Must | Full-project export uses the canonical durable project representation rather than reconstructing a reduced node/edge payload. It includes document content, nodes, edges, grouping, containers, styles, viewport, exact DSL source, modules and versions, variants, active view, per-view state, snapshots, links, and asset references supported by the project schema. |
| V4-PORT-002 | Must | The package has an explicit format identifier and schema version. Import validates both, migrates supported older versions, and rejects unsupported versions with an actionable message without mutating a project. |
| V4-PORT-003 | Must | Users can choose a file, see a preview with project name, content counts, asset/snapshot presence, compatibility warnings, and validation failures, then import or cancel. |
| V4-PORT-004 | Must | The default import creates an independent project owned by the authenticated user. IDs that must be unique across projects are regenerated, and all references are remapped consistently. Stable semantic IDs may be retained only where their scope permits it. |
| V4-PORT-005 | Must | Replacing an existing project requires explicit confirmation, revision checking, and preservation of the pre-import version through the available recovery mechanism. Failure leaves the existing project unchanged. |
| V4-PORT-006 | Must | Import treats every field as untrusted: enforce file/decompressed size, nesting, element, module, snapshot, and asset limits; sanitize document HTML and URLs; reject dangling or invalid references and executable payloads. |
| V4-PORT-007 | Must | Imported ownership, share tokens, credentials, analytics identities, and server authorization metadata never grant access or overwrite trusted server values. Active share links and secrets are excluded from exports. |
| V4-PORT-008 | Must | Once managed assets exist, full backup packages include authorized image binaries and a manifest or provide an explicitly documented equivalent portable bundle. Import must not depend on expiring URLs or access to the original project. |
| V4-PORT-009 | Must | Selection-only export is clearly labelled as partial. It includes required internal references or reports omissions before download and never represents itself as a complete project backup. |
| V4-PORT-010 | Must | Export captures a consistent current editor state, including unsaved supported content, and does not silently substitute an older server revision. Export failures do not mark the project saved. |
| V4-PORT-011 | Should | Large package operations expose progress and cancellation, perform bounded work, and avoid freezing the editor. |

### Acceptance criteria

1. Export a fixture containing documentation, nested containers, rich edges,
   exact DSL text, multiple modules, variants, views, and snapshots; import it into
   a new project and compare normalized durable content.
2. After managed assets and links are delivered, extend that same fixture to
   prove offline package portability and correctly remapped references.
3. Save and reload the imported project; edit it without changing the original.
4. Corrupt, oversized, unsafe, and newer-version inputs fail without creating a
   misleading empty project or changing existing content.
5. Cancellation and a concurrent server edit cannot silently discard work.

## 4. AI reliability, budgets, and operational controls

Traceability: AI-PROV-001/007, AI-REL-001–010, AI-ADM-002–006,
AI-TST-005/008–012. Existing encrypted credentials, preview, explicit application,
undo, settings, and distributed rate-limit implementations remain required.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-AI-001 | Must | One configurable end-to-end deadline covers provider calls, retries, backoff, response parsing, and repair. Each operation uses only the remaining time. The deadline is shorter than browser and upstream request timeouts with a documented margin. |
| V4-AI-002 | Must | Retry only documented transient failures using bounded exponential backoff with jitter. Honor valid Retry-After values within the remaining deadline. Authentication, invalid-model, validation, and definitive quota errors are not blindly retried. |
| V4-AI-003 | Must | Cancel or close aborts the browser request and propagates cancellation to backend work and the active provider transport. Stop queued retries/repair and release resources. Clearly document any provider-side limit on stopping token consumption. |
| V4-AI-004 | Must | Idempotency is scoped to the authenticated user and a canonical request fingerprint. Concurrent matching requests execute at most one application generation operation; completed requests replay a bounded stored result. Reusing a key with different input fails safely. |
| V4-AI-005 | Must | Idempotency records have bounded retention and explicit in-progress, completed, failed, and expired behavior. A different user's key or result cannot be read, reused, or inferred through the API. |
| V4-AI-006 | Must | Input characters/tokens, output tokens/bytes, generated nodes/edges, parsing complexity, and total duration have server-enforced limits shared with user-facing validation. |
| V4-AI-007 | Must | Cost estimates use configurable provider/model-specific input, cached-input, and output prices with a recorded pricing version. Unknown models are rejected or use an explicitly configured fallback. |
| V4-AI-008 | Must | Usage accounting includes initial calls, retries where usage is available, repair, and connection tests where billable. Distinguish estimated, reported, and unknown usage; never report unknown consumption as confidently zero. |
| V4-AI-009 | Must | Enforce configured user/system throughput and daily/monthly budgets under concurrent instances. Reserve or otherwise bound in-flight spend, reconcile actual usage, and document the maximum possible budget overshoot. |
| V4-AI-010 | Must | Provider authentication, model, quota, throttling, timeout, cancellation, refusal, incomplete output, malformed output, repair failure, and outage have distinct safe application outcomes. Raw provider payloads and credentials never reach errors or telemetry. |
| V4-AI-011 | Must | Record content-free provider/model metrics for total/provider latency, retries, timeout, throttling, cancellation, tokens, generated element counts, outcome, and estimated cost. Final outcome reflects validation/repair success, not merely receipt of an HTTP response. |
| V4-AI-012 | Must | Configurable external alerts cover budgets, elevated provider failures/timeouts/throttling, decrypt failures, and unusual request volume. Test delivery through the approved operations channel; a dashboard boolean alone is insufficient. |
| V4-AI-013 | Must | Administrators can inspect aggregate usage and configure enablement, allowed models, pricing, rate/payload limits, and budgets through an authorized configuration path. Changes are auditable without exposing prompts or keys. |
| V4-AI-014 | Must | Generation uses a provider-neutral contract with transport, error mapping, usage extraction, and cancellation isolated from diagram conversion. OpenAI remains supported; additional adapters are separately scoped. |
| V4-AI-015 | Must | Live staging checks prove cancellation, deadline behavior, key rotation/recovery, credential/account deletion, secret-free logs, idempotency, and budget enforcement under expected and peak concurrency. |

### Acceptance criteria

- A slow provider plus retries and repair cannot exceed the configured overall
  deadline beyond the documented cancellation tolerance.
- Simultaneous identical requests from one user produce one result; replay
  returns it without another generation. Another user cannot access it.
- A repair operation contributes to usage and final outcome. Pricing fixtures
  verify multiple models and cached-input treatment.
- Cancellation prevents subsequent retries and repair and terminates active
  transport where supported; live evidence records provider limitations.
- Budget races, provider outage, and emergency disable leave ordinary project
  editing functional. External alerts are received and acknowledged in staging.

## 5. Managed documentation and canvas image assets

Traceability: V2-ASSET-001–012, V3-DOC-004–009, V3-CAN-011, DEP-GCP-005.
Firebase Storage is the V4 production target, superseding the older V2
S3-compatible production assumption. Local development must remain isolated;
use a documented local storage adapter or emulator without production credentials.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-ASSET-001 | Must | New documentation and canvas image uploads use an authenticated project-owned asset API rather than embedding new Base64 binaries in saved content. |
| V4-ASSET-002 | Must | Asset metadata stores stable ID, project owner, storage key, media type, byte size, dimensions, content hash, creator, lifecycle state, and timestamps. Object keys and URLs alone grant no project access. |
| V4-ASSET-003 | Must | Backend validation checks decoded signatures, approved PNG/JPEG/WebP types, byte/pixel limits, malformed images, and project/user quotas before accepting an asset. Browser validation supplements rather than replaces it. |
| V4-ASSET-004 | Must | Read, upload, replace, and delete operations enforce the same owner/share permissions as the project. Public read-only sharing can display authorized project images without permitting uploads or leaking unrelated assets. |
| V4-ASSET-005 | Must | Saved documents and canvas elements contain stable asset references and presentation metadata, not temporary signed URLs. Resize, alt text, order, and captions survive reload, export/import, duplication, and snapshot restoration. |
| V4-ASSET-006 | Must | Delivery uses authorized streaming or short-lived signed URLs issued only after access checks, with appropriate content, cache, and security headers. Revocation behavior and any signed-URL validity window are documented and tested. |
| V4-ASSET-007 | Must | Failed/cancelled uploads and interrupted saves have recoverable states. A cleanup process removes abandoned uploads and objects without deleting assets referenced by current projects or retained snapshots. |
| V4-ASSET-008 | Must | Asset removal first removes the reference. Physical deletion occurs only after a documented recovery period and reference analysis across retained history; project/account deletion follows the documented retention policy. |
| V4-ASSET-009 | Must | An idempotent, resumable migration converts existing Base64 images while preserving content, order, alt text, dimensions, and history. Provide dry-run counts, bounded batches, failure reporting, verification, and rollback without logging private content. |
| V4-ASSET-010 | Must | Duplication and import establish valid independent ownership and reference counts so deleting the original cannot break a retained copy. |
| V4-ASSET-011 | Should | Processing strips unnecessary metadata, corrects orientation, and creates appropriate display variants without materially degrading screenshot text. |
| V4-ASSET-012 | Should | Content-hash deduplication reduces storage while preserving project-level authorization and correct retention accounting. |

Acceptance requires integration tests for uploads, sharing, cross-owner denial,
invalid/oversized images, quotas, migration retries, duplication, save/reload,
portable export, snapshot retention, and orphan cleanup. Firebase rules remain
deny-by-default outside the explicitly authorized application access path.

## 6. Complete project snapshots and restoration

Traceability: V3-PROJ-004–006, V3-SAVE-005, V3-DAC-DIF-001.
Existing diagram comparison snapshots are useful but do not satisfy complete
project recovery.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-SNAP-001 | Must | Users can create a named snapshot of a consistent complete project: document, diagram, DSL, modules, variants, views, links, asset references, and relevant project metadata. |
| V4-SNAP-002 | Must | Snapshots have immutable IDs, schema versions, creation time, source revision, creator, name, and size metadata. Renaming does not replace a different snapshot merely because names match. |
| V4-SNAP-003 | Must | Users can list, preview, compare, and restore an authorized snapshot. Preview never mutates the current editor or marks content saved. |
| V4-SNAP-004 | Must | Restoration checks the current revision, explicitly confirms replacement, and preserves the current project version before applying the snapshot as a new revision. Concurrent edits trigger conflict recovery. |
| V4-SNAP-005 | Must | Retention count, age, and storage limits are documented and server-enforced. Before eviction or refusal, explain the policy; retained snapshots keep required assets alive. |
| V4-SNAP-006 | Must | Snapshot APIs enforce owner permissions; public read-only shares expose only explicitly shared current content, not private history. Deletion and account cleanup follow defined lifecycle rules. |
| V4-SNAP-007 | Must | Existing diagram-only snapshots remain readable and are clearly identified as partial history. They are not silently presented as full project backups. |
| V4-SNAP-008 | Should | Users can delete selected snapshots and see their storage contribution without exposing private content in operational metrics. |

Acceptance: capture a document-and-diagram fixture, change both, restore, and
verify all durable properties and images after reload. The displaced version
remains recoverable. Unauthorized, expired, incompatible, or conflicting restores
fail without partial mutation.

## 7. Documentation and diagram linking and embeds

Traceability: V2-DOC-001–004, V3-DOC-001–003/012–013, DCI-001–006.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-LINK-001 | Must | Headings have durable identities independent of visible text. Users can link a heading to one or more canvas components and a component to relevant headings. |
| V4-LINK-002 | Must | Activating a document reference selects and focuses its component; activating linked documentation from a component opens and focuses the heading. Navigation works in Document, Split, and Canvas modes. |
| V4-LINK-003 | Must | Components support safe external documentation/source URLs with validated protocols, editable labels, and accessible open actions. |
| V4-LINK-004 | Must | Users can embed the full diagram, a named view, or a selected region in documentation. The embed records a stable source reference and supports a caption and alternative description. |
| V4-LINK-005 | Must | Live embeds reflect their source after supported edits/save/reload. Snapshot previews and exported documents use a consistent captured version; users are informed if an embed cannot be rendered. |
| V4-LINK-006 | Must | Renaming, moving, duplication, import, and restore preserve or remap links predictably. Deleted targets produce visible broken-link states and repair/remove actions rather than silent deletion. |
| V4-LINK-007 | Must | Shared views, Markdown/PDF export, and full project packages handle links and embeds safely without exposing unshared projects or private history. |
| V4-LINK-008 | Must | All linking, navigation, embed configuration, and repair actions are keyboard accessible and expose appropriate labels and focus/status feedback. |

Acceptance: create links in both directions, rename headings/components, switch
views, reload, duplicate, and restore. Verify correct targets, synchronized embeds,
and intentional broken-link behavior after target deletion.

## 8. Rich documentation, Markdown, and PDF

Traceability: V2-DOC-005–007, V2-EXP-003, V3-DOC-010–011, V3-EXP-004–005.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-DOC-001 | Should | The document editor supports tables with header cells and row/column editing, checked/unchecked task lists, and labelled callouts. Supported structures persist and sanitize safely. |
| V4-DOC-002 | Should | Code blocks provide an explicit language selector, including plain text. Language and multiline content survive save/reload and supported export/import. |
| V4-DOC-003 | Must | Markdown export escapes control characters, nested lists, code fences and language identifiers safely and does not emit unbounded Base64 content. Managed assets use the portable export strategy. |
| V4-DOC-004 | Should | Markdown import previews unsupported/lossy structures before application, sanitizes HTML and links, and preserves supported headings, lists, code, images, tables, and checklists under a documented dialect. |
| V4-DOC-005 | Should | PDF export includes diagrams, managed images, captions, code blocks, tables, and safe links with readable page breaks, margins, fonts, and repeated table headers where needed. |
| V4-DOC-006 | Must | Exports report unsupported or omitted content before completion. Failure leaves source content unchanged and produces an actionable retry/download message. |

Acceptance: use fixtures with nested lists, Markdown punctuation, embedded
backticks, multiple languages, wide tables, long code, diagrams, and images.
Round-trip supported Markdown structures and visually inspect multipage PDF
output for clipping, blank images, unreadable scaling, and broken links.

## 9. Stable internal project ownership

Traceability: V3-SEC-009, V3-PRV-008 and analytics ownership migration design.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-ID-001 | Must | Complete migration from owner email to the stable internal user ID linked to verified Google subject. Email remains a verified changeable attribute and administrator-allowlist input. |
| V4-ID-002 | Must | Reconcile missing, duplicate, and ambiguous mappings before switching authorization. Never guess identity ownership or transfer a project solely because an email field changes. |
| V4-ID-003 | Must | Maintain tested read/write compatibility during staged rollout. Switch project, folder, share-management, asset, snapshot, duplicate, and deletion authorization consistently. |
| V4-ID-004 | Must | Add required constraints/indexes only after backfill validation. Document forward recovery and compatibility rollback; do not undo production Flyway migrations destructively. |
| V4-ID-005 | Must | Cross-owner tests cover every operation, changed-email behavior, legacy unmapped records, and account deletion. Analytics failure must not bypass authorization or prevent ordinary editing. |

Acceptance: production-like PostgreSQL migration fixtures reconcile all ownership
records, maintain access for the correct subject, deny other subjects, and pass
mixed-version compatibility checks before the final switch.

## 10. Staging, recovery, and production release evidence

Traceability: V3-SAVE-006–007, V3-SEC-006/008, V3-OPS-003/005,
V3-INF-002–008, AI-TST-011–012, DEP-GCP-004/006.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-OPS-001 | Must | Provide isolated staging UI, API, database, storage, OAuth configuration, and secrets. Staging cannot write production data or use production user credentials. |
| V4-OPS-002 | Must | A clean-checkout workflow deploys and verifies staging before production promotion. Migration, security, integration, accessibility, and smoke failures block promotion. |
| V4-OPS-003 | Must | Run live staging journeys through the actual API/database and approved OpenAI, Secret Manager, and Cloud Run integrations; mocks alone cannot satisfy this gate. |
| V4-OPS-004 | Must | Document backup retention, point-in-time recovery availability, target recovery time/recovery point, responsible owner, and restoration procedure for the selected Neon plan. |
| V4-OPS-005 | Must | Execute an isolated Neon recovery drill and record source/recovered timestamps, elapsed recovery time, observed data loss window, integrity checks, and follow-up actions against approved targets. |
| V4-OPS-006 | Must | Exercise application rollback, failed-migration recovery, key rotation/recovery, and asset restoration where applicable. Verify current project access and retained snapshots after recovery. |
| V4-OPS-007 | Must | Verify existing production dashboards, health checks, notification routes, budgets, least-privilege accounts, security headers, and secret handling; extend coverage for assets, snapshots, database pressure, and AI. Do not treat historical setup evidence as current verification. |
| V4-OPS-008 | Must | Record release commit, workflow, environment, deployed revision, migration state, checks, smoke outcomes, unresolved accepted risks, and approval/promotion result. |
| V4-OPS-009 | Must | Keep rebuild, rollback, incident, credential rotation, backup, asset migration, and retention runbooks synchronized with the implemented deployment. |

No live cloud state was verified by this audit. Existing analytics production
evidence from 2026-09-02 is retained as historical evidence, not reclassified as
missing implementation.

## 11. Quality, performance, accessibility, and security gates

Traceability: V3-PERF-001–005, V3-A11Y-001–004, V3-BRW-001–002,
V3-TST-001–008, V3-SEC-001–008 and applicable AI/DSL verification requirements.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-QA-001 | Must | Add real API/database browser journeys for authentication/rejection, project lifecycle, concurrent tabs, offline recovery, sharing, portable import/export, assets, snapshots, and AI configure/preview/apply/undo/reload. Keep fast mocked tests as complementary coverage. |
| V4-QA-002 | Must | Test supported PostgreSQL migrations and integration behavior, including ownership isolation, transaction failure, concurrency, retention, rate limits, and malformed content. Required suites must not silently skip in release CI. |
| V4-QA-003 | Must | Measure a 300-component/500-connection fixture on a documented reference device/browser. Record frame-time/FPS distributions, movement, selection, zoom, editing, layout time, and load time; a drag-duration assertion alone does not establish near-60-FPS behavior. |
| V4-QA-004 | Must | Before performance sign-off, document numeric pass/fail thresholds and measurement method for the near-60-FPS target, layout within 3 seconds, autosave latency/payload, memory, and failure recovery. Include nested, tangled, and image-heavy fixtures. |
| V4-QA-005 | Must | Measure bounded dashboard/analytics queries on realistic PostgreSQL data and inspect query plans for regressions, avoiding unnecessary project content loading. |
| V4-QA-006 | Must | Record testing for the latest two stable versions of Chrome, Edge, Firefox, and Safari. Playwright Chromium/Firefox/WebKit projects alone do not prove this version/product matrix. Document any explicit accepted exception. |
| V4-QA-007 | Must | Verify complete pointer-free create, select, edit, connect, move, delete, undo, save, share, import, and export journeys, including dialog focus restoration and screen-reader announcements. |
| V4-QA-008 | Must | Run axe across dashboard, editor, dialogs, settings, sharing, and public views; manually verify screen-reader behavior and light/dark contrast against WCAG 2.1 AA. Every release-blocking finding is fixed or explicitly deferred. |
| V4-QA-009 | Must | Visual regressions cover components, overlapping connections, labels/arrows, boundaries, themes, large/off-screen diagrams, selection exports, transparent backgrounds, managed images, and PDF output when available. |
| V4-QA-010 | Must | Scan frontend/backend dependencies and built runtime container images. Deployment blocks on the documented vulnerability policy; exceptions have rationale, owner, and expiry. |
| V4-QA-011 | Must | Unexpected browser errors and React Flow warnings fail journeys. Secret-leak checks cover credentials, share tokens, private document/canvas content, provider responses, and unsafe error bodies. |
| V4-QA-012 | Must | Protect release gates from false success: missing artifacts, skipped required tests, failed scans, or unavailable required staging integrations cannot produce a passing promotion result. |
| V4-QA-013 | Should | Schedule cross-browser, performance, and live-service regression checks independently of deployments, with actionable failure notification. |

## 12. Infrastructure import

Traceability: V3-DAC-INF-001–010. This is a planned M4 capability, not an existing
completed importer. Project-owned DSL module imports are a separate capability.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-INF-001 | Must | Implement versioned adapters for a documented supported subset of Terraform plan/state JSON, Kubernetes YAML, CloudFormation, and OpenAPI. Publish supported versions and resource mappings. |
| V4-INF-002 | Must | Parse into a reviewable intermediate model and preview detected resources, relationships, warnings, unsupported fields, and redaction counts before project mutation. |
| V4-INF-003 | Must | Users can create a new diagram or merge with explicit conflict choices. Deterministic provenance identities let repeat imports update matches without duplicating components. |
| V4-INF-004 | Must | Parsing never executes Terraform/templates, resolves external references over the network, contacts declared endpoints, or applies infrastructure. Reject executable YAML constructs and unsafe references. |
| V4-INF-005 | Must | Redact credentials, Kubernetes Secrets, and provider-sensitive values before any persistence, diagnostics, logs, or analytics. Never reproduce secret values in preview warnings. |
| V4-INF-006 | Must | Bound file size, document count, nesting, aliases, resources, relationships, and processing time. Invalid input and cancellation preserve the last valid project. |
| V4-INF-007 | Must | Applying an import is one undoable logical action and survives save/reload/export. Report mapped, ignored, unsupported, and redacted constructs. |
| V4-INF-008 | Should | Save non-secret mapping choices per project for repeat imports. |

Acceptance requires sanitized fixtures for each adapter, repeated-import tests,
explicit merge conflicts, malicious-input tests, secret-leak checks, and
preview/cancel/apply/undo browser coverage.

## 13. Reusable templates and DSL/editor refinements

Traceability: V3-DAC-TPL-006–008, STY-007, BND-006, CON-006,
IMP-007–008, VIEW-007–008, IDE-008.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-DSL-001 | Should | Extract selected canvas content into a reusable template with validated parameters, scoped identifiers, internal relationships, and explicit handling of external references. |
| V4-DSL-002 | Must | Preserve template definitions/calls and instance parameter values through supported visual edits, or require explicit detachment with a warning when an edit cannot preserve the relationship. Never silently flatten reusable source. |
| V4-DSL-003 | Should | Updating a template refreshes linked instances without losing instance parameters or unrelated changes; application is undoable and persists across reload. |
| V4-DSL-004 | Should | Provide a managed template library with preview, category, version, and compatibility information; inserted content remains independently authorized. |
| V4-DSL-005 | Should | Go-to-definition and reference discovery navigate across authorized imported modules. Record exact resolved module versions for reproducible rendering and report missing/incompatible dependencies. |
| V4-DSL-006 | Should | Add familiar bracket matching, folding, indentation, comment toggling, and multi-cursor editing while preserving accessible keyboard behavior. |
| V4-DSL-007 | Should | Add theme-aware style tokens with predictable light/dark and PNG/SVG output. Preserve explicit user colors and report contrast issues without silently rewriting them. |
| V4-DSL-008 | Should | Add provider-aware boundary appearance defaults and optional compact connection metadata badges without obscuring labels or changing semantic data. |
| V4-DSL-009 | Should | Create derived views from a selection or documented filters; exports identify the active view and environment variant. |
| V4-DSL-010 | Must | Every grammar/editor change preserves backward compatibility, precise diagnostics, last-valid rendering, undo/redo, autosave semantics, and in-editor reference documentation. |

Verify each capability against current behavior before implementation; older DSL
status prose may lag newer rule/view integrations. Do not duplicate working
capabilities simply because a historical section calls them follow-ups.

## 14. Deferred scope

The following remain outside the required V4 milestones unless separately approved:

- Native Mermaid/PlantUML/D2 source import and broader standalone diagram formats
  beyond the current supported architecture/view model.
- Additional AI providers, user-defined provider endpoints, and session-only
  credential storage. Provider abstraction is included; new adapters are not.
- Real-time collaboration, workspaces, comments, mentions, and notifications.
- Enterprise SSO, organization administration, billing, and subscriptions.
- Organization rule packs, public plugin/webhook/MCP platforms, and native apps.
- Autonomous AI actions, private-project training, and silent diagram mutation.

Existing Mermaid/PlantUML/D2 exports and existing sequence/data-flow views remain
supported and are not deferred by this section.

## 15. Documentation and completion tracking

### External documentation embedding extension

The approved, groomed requirements for embedding the latest saved diagram in
Notion, supported wikis, and Markdown are maintained in
[V4 portability: external documentation embeds](requirements_V4_portability.md).
They cover read-only interactive viewers, linked images, destination caching
limits, revocable link-based viewing, and permission-checked opening in edit mode.
This is additional V4 scope; it does not replace lossless backup/import work.

| ID | Priority | Requirement |
| --- | --- | --- |
| V4-TRACK-001 | Must | Maintain requirement-level status as Not started, In progress, Implemented awaiting verification, Verified, or Explicitly deferred, with code/test/release evidence and last-verified date. |
| V4-TRACK-002 | Must | Reconcile stale V1/V2/canvas/DSL status labels against current evidence, retaining historical audit dates. Link to V4 for remaining work rather than maintaining conflicting active backlogs. |
| V4-TRACK-003 | Must | Distinguish implementation evidence, passing local tests, staging evidence, and production evidence. None substitutes automatically for another. |
| V4-TRACK-004 | Must | Every milestone records applicable requirement IDs, accepted exceptions, migration/rollback implications, and verification results before release sign-off. |

V4 is accepted when M1–M3 Must requirements and the cross-cutting release gates
are verified, and M4 is either completed or explicitly deferred as a named
follow-up milestone. No audit summary or historical Done label alone closes a
requirement.
