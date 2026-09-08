# Editable project backup and import

Implementation date: 2026-09-08. Scope: V4 requirements, section 3.

## User workflow

In the editor, choose **Export project → Archly source → Complete project backup**.
The downloaded `.archly.json` captures current editor content, including unsaved
documentation and diagram changes. Export does not save the project or clear drafts.

From the dashboard, choose **Import project**, select the file, and review the
name, content counts, document/DSL presence, and compatibility warnings. Validation
runs locally and on the server before the import action becomes available. Cancel
leaves projects unchanged. The default destination creates an independent project
owned by the signed-in account. The imported project opens directly in the editor.

To replace a project, select it as the destination and check the explicit replacement
confirmation. The server checks the revision loaded for that preview. It creates a
separate **Before import** recovery project containing the displaced saved content,
and replaces the destination in the same transaction. A conflict or failure rolls
back both operations. Recovery projects are ordinary private projects visible in
the dashboard and can be opened, exported or imported again. They are retained until
the owner deletes them. Unsaved edits in another tab remain subject to the existing
draft/conflict recovery flow; replacement does not capture another tab's drafts.

## Format and fidelity

The JSON envelope has `format: "archly-project"`, `version: 1`, `scope: "full"`
or `"selection"`, and `project: { name, canvasJson, markdown }`.
`canvasJson` uses the existing durable canvas schema version 1 and serializer.
It preserves nodes, edges, grouping/containers, styles, viewport, exact DSL text,
module sources and versions, active variant/view, per-view positions and viewports,
and existing diagram comparison snapshots. DSL text carries variant/view definitions.
Those existing snapshots remain diagram-only history, not complete project snapshots.

Project identity, owner identity, revision, timestamps, share tokens, and server
authorization state are not imported from files. A new project receives a new
server ID. Node, edge, module and snapshot identifiers are project-local and remain
stable, preserving their internal references and exact DSL source. Folder/archive
organization is not part of this content package; new imports are active/unfiled,
and replacement preserves the destination's organization.

Legacy `archly-diagram` version 1 files migrate to this envelope during preview.
A warning explains that content omitted by old exporters cannot be reconstructed.
Unknown formats, versions and scopes are rejected. Future schema changes must add
explicit migration support rather than silently discard unknown content.

Selection exports are explicitly partial. Selected edge endpoints and ancestor
containers are included; only edges whose endpoints are included are exported.
Documentation, DSL, modules, variants, views and snapshots are omitted, as explained
before download. A selection file can be imported as an independent partial project.

## Validation and assets

Imports accept uncompressed JSON only: 12 MB maximum file/request body, including
chunked requests. Canvas text is limited to 2 million characters and documentation
to 6 million. Server validation enforces canvas depth 20, 5,000 nodes and 10,000
edges per diagram, 100 modules (500,000 source characters each), 100 saved view
states and 20 diagram snapshots. Graphs, snapshot graphs, module identifiers,
container cycles and references, URLs/styles and unsafe object properties are
validated. Existing rich-text sanitation and embedded-image limits apply.

Current embedded document images travel inside the document. Remote image references
remain dependent on their original host and trigger a preview warning. Managed
asset binary bundles (V4-PORT-008) depend on the future managed-asset schema and API;
this change does not claim offline portability for remote images. Credentials and
share-management metadata are not package fields. User-authored source and notes
are preserved as content; backups should be stored with the same care as projects.

## Verification and requirement tracking

| Requirements | Implementation/evidence | Status |
| --- | --- | --- |
| PORT-001, 010 | Canonical current-editor export; rich-content round trip in `projectPortability.test.ts`; browser download/import test | Implemented awaiting verification (local tests recorded) |
| PORT-002, 003 | Version migration, file preview, local/server validation, cancel and error tests | Implemented awaiting verification (local tests recorded) |
| PORT-004, 007 | Authenticated atomic import, new server identity, project-scoped semantic IDs; controller ownership test | Implemented awaiting verification (local tests recorded) |
| PORT-005 | Explicit confirmation, reviewed revision, transactional recovery copy; conflict and recovery controller/UI tests | Implemented awaiting verification (local tests recorded) |
| PORT-006 | Bounded request filter, DTO constraints, graph/module/snapshot validation and rich-text sanitation | Implemented awaiting verification (local tests recorded) |
| PORT-008 | Embedded image preservation; remote-image warning; managed binaries await asset work | Not started for managed assets |
| PORT-009 | Partial scope, omission notice, endpoint/ancestor inclusion test | Implemented awaiting verification (local tests recorded) |
| PORT-011 | Reading/import progress, cancel before commit, bounded input | Partial; parsing is synchronous within limits |

Automated evidence: UI unit/component suite, `ProjectControllerTest`,
`CanvasJsonValidatorTest`, and `e2e/portability.spec.ts`. Build/lint checks accompany
the change. Browser tests use mocked APIs; server tests use the local test database.
Staging/production verification and full live-service browser acceptance remain
release gates; local passing tests do not constitute production sign-off.

Local results on 2026-09-08: 231 UI tests passed; Chromium portability journey passed.
