# Archly V3 Requirements

Status: Draft

Version: 3.0

Last updated: 2026-08-29

V3 builds on the deployed Archly V1/V2 product. Its objective is to make the
production service observable, secure, recoverable, measurable, and dependable
before adding broader diagram formats or real-time collaboration. V1 and V2
remain separate historical requirement documents.

Priorities are **Must**, **Should**, and **Could**. A Must requirement blocks the
V3 production-readiness milestone unless it is explicitly deferred with an
accepted risk.

## 1. Product analytics and administration

Detailed groomed requirements: [V3 Product Analytics and Administration Requirements](V3_product-analytics-and-administration.md)

This area establishes privacy-conscious user and diagram metrics, a
backend-authorized administrator dashboard, bounded analytics APIs, retention
controls, and automated reconciliation and access testing. The detailed document
is the single source of truth for this area.

## 2. Canvas editor completion

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-CAN-001 | Must | A regression audit proves that every supported canvas mutation is reversible through Undo and Redo as one logical action. |
| V3-CAN-002 | Must | Alignment guides appear while components are moved and do not interfere with grid snapping. |
| V3-CAN-003 | Must | The properties inspector presents relevant controls for components, connections, text, notes, containers, and multi-selection. |
| V3-CAN-004 | Must | Supported elements expose accurate editable position values without breaking automatic component sizing. |
| V3-CAN-005 | Must | Connection selection, labels, arrowheads, routing, and exports remain correct when elements overlap. |
| V3-CAN-006 | Must | Groups, container membership, routing, formatting, z-order, and viewport state survive save and reload. |
| V3-CAN-007 | Should | The component library remembers recently used components per user. |
| V3-CAN-008 | Should | Containers can be collapsed and expanded and display a summary of hidden contents. |
| V3-CAN-009 | Should | Selected compatible elements can be made equal width or equal height. |
| V3-CAN-010 | Should | Secondary creation actions are organized in a compact More menu. |
| V3-CAN-011 | Could | Users can place managed image elements directly on the canvas. |

## 3. Documentation and canvas integration

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DOC-001 | Must | A document heading can be linked to one or more canvas components. |
| V3-DOC-002 | Must | Users can navigate from a component to its linked documentation and from documentation to the component. |
| V3-DOC-003 | Must | Users can embed a full diagram or selected diagram region in the document. |
| V3-DOC-004 | Must | New documentation images are uploaded through an authenticated asset API instead of being embedded as Base64 HTML. |
| V3-DOC-005 | Must | Image assets are stored in Firebase Storage with project ownership enforced by the backend. |
| V3-DOC-006 | Must | Upload validation enforces approved file signatures, media types, byte limits, pixel dimensions, and project authorization. |
| V3-DOC-007 | Must | Image resizing, alternative text, ordering, and stable references survive save, reload, export, and restoration. |
| V3-DOC-008 | Must | Existing Base64 images can be migrated without losing document content or presentation. |
| V3-DOC-009 | Must | Unreferenced assets are deleted only after the documented recovery period. |
| V3-DOC-010 | Should | The editor supports tables, checklists, callouts, and a code-block language selector. |
| V3-DOC-011 | Should | Markdown import and export preserve all supported rich-text structures. |
| V3-DOC-012 | Should | Diagram embeds remain synchronized with their source and support captions. |
| V3-DOC-013 | Should | Broken internal document-to-canvas links are visibly identified. |

## 4. Diagram formats

These capabilities materially expand the product beyond architecture diagramming
and require a separate scope decision before implementation.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DIA-001 | Could | Archly supports flowcharts with a complete creation and editing path. |
| V3-DIA-002 | Could | Archly supports sequence diagrams with a complete creation and editing path. |
| V3-DIA-003 | Could | Archly supports entity-relationship diagrams with a complete creation and editing path. |
| V3-DIA-004 | Could | Archly provides a syntax-aware Mermaid source editor and live preview. |
| V3-DIA-005 | Could | Invalid source displays an actionable error while preserving the last valid rendering and source. |
| V3-DIA-006 | Could | Source and visual editing remain synchronized for formats that support both modes. |

## 5. Project management and snapshots

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-PROJ-001 | Must | Search, sort, duplicate, archive, restore, and permanent deletion pass production end-to-end tests. |
| V3-PROJ-002 | Must | Archly provides maintained architecture templates with previews and categories. |
| V3-PROJ-003 | Must | Creating a project from a template produces independent editable content with new identifiers. |
| V3-PROJ-004 | Must | Users can create named project snapshots. |
| V3-PROJ-005 | Must | Users can preview and restore a snapshot without silently destroying the current version. |
| V3-PROJ-006 | Must | Snapshot retention and storage limits are documented and enforced. |
| V3-PROJ-007 | Should | The dashboard provides a recently opened projects section. |
| V3-PROJ-008 | Should | Folder organization is introduced only if search and archive are insufficient. |

## 6. Sharing and collaboration

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-SHR-001 | Must | Anonymous read-only links work in production without exposing editing operations. |
| V3-SHR-002 | Must | Read-only permission, expiration, revocation, and project access are enforced for every request by the backend. |
| V3-SHR-003 | Must | Share creation and public access are rate-limited and active links per project are bounded. |
| V3-SHR-004 | Must | Complete share tokens never appear in application, proxy, analytics, or audit logs. |
| V3-SHR-005 | Must | Expired and revoked share records are cleaned up according to a documented retention policy. |
| V3-SHR-006 | Could | Explicitly authorized editable links can be introduced after a dedicated security review. |
| V3-SHR-007 | Could | Comments, mentions, notifications, workspaces, and real-time multiplayer editing are supported in a later collaboration milestone. |

## 7. Export and import

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-EXP-001 | Must | PNG and SVG exports preserve arrowheads, labels, connections, icons, bounds, and theme colors. |
| V3-EXP-002 | Must | Export tests cover light and dark themes, large off-screen diagrams, solid and transparent backgrounds, and selection-only exports. |
| V3-EXP-003 | Must | Versioned editable JSON survives export and import as a lossless round trip. |
| V3-EXP-004 | Must | Markdown export does not embed unbounded Base64 data and safely handles nested lists, code fences, languages, and Markdown control characters. |
| V3-EXP-005 | Should | Documentation can be exported to PDF with diagrams, images, links, and code blocks. |
| V3-EXP-006 | Should | Clipboard image export is verified across supported browsers. |
| V3-EXP-007 | Could | Supported Mermaid diagrams can be imported and exported. |

## 8. Saving, recovery, and data integrity

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-SAVE-001 | Must | Real-browser concurrent-tab tests prove that stale content cannot silently overwrite a newer revision. |
| V3-SAVE-002 | Must | Conflict recovery preserves both the local draft and current server version until the user resolves the conflict. |
| V3-SAVE-003 | Must | Offline and failed-save recovery survives refresh and provides an explicit retry path. |
| V3-SAVE-004 | Must | Corrupt, truncated, oversized, or unsupported canvas content produces a recovery error rather than an empty diagram. |
| V3-SAVE-005 | Must | Durable serialization preserves every supported node, edge, group, container, and viewport property. |
| V3-SAVE-006 | Must | Database backup, retention, point-in-time recovery, and restoration procedures are documented. |
| V3-SAVE-007 | Must | A Neon recovery drill is executed and its recovery time and recovery point are recorded. |
| V3-SAVE-008 | Should | Local recovery drafts expire, handle browser quota failures, and can be reviewed or removed by the user. |

## 9. Authentication, authorization, and security

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-SEC-001 | Must | Production browser tests cover a verified personal Gmail account and rejection of Workspace, unverified, malformed, and incomplete identities. |
| V3-SEC-002 | Must | Cross-owner authorization tests cover read, update, organize, duplicate, delete, snapshots, assets, and share management. |
| V3-SEC-003 | Must | Maven and container dependencies are scanned for known vulnerabilities in CI. |
| V3-SEC-004 | Must | Sensitive and public endpoints have documented rate and payload limits. |
| V3-SEC-005 | Must | Production responses use appropriate CSP, transport, framing, MIME, referrer, and permissions security headers. |
| V3-SEC-006 | Must | Secret rotation, incident response, and credential revocation procedures are documented and tested. |
| V3-SEC-007 | Must | OAuth tokens, database credentials, complete share tokens, and private project content never enter logs. |
| V3-SEC-008 | Must | A formal pre-release security audit finds no unresolved release-blocking issue. |
| V3-SEC-009 | Should | Google subject identifiers become the stable internal identity while email remains a changeable verified attribute. |
| V3-SEC-010 | Should | Security-relevant events are audited without storing tokens or diagram/document content. |

## 10. Performance and scalability

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-PERF-001 | Must | A 300-component and 500-connection diagram is measured against documented interaction and rendering targets. |
| V3-PERF-002 | Must | Canvas movement, selection, zoom, editing, and layout remain responsive near 60 frames per second on the supported reference device. |
| V3-PERF-003 | Must | Autosave payload size, latency, memory use, and failure behavior are measured with large projects. |
| V3-PERF-004 | Must | Dashboard pagination and project summaries remain bounded as project and asset counts grow. |
| V3-PERF-005 | Must | API latency, request sizes, database connections, and timeouts are monitored. |
| V3-PERF-006 | Should | Large component-library lists are virtualized if measurement shows a user-visible bottleneck. |
| V3-PERF-007 | Should | Secondary editor, icon, syntax, and export features are loaded on demand. |

## 11. Accessibility and browser support

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-A11Y-001 | Must | Automated axe checks run for the dashboard, editor, dialogs, sharing, and public views. |
| V3-A11Y-002 | Must | Keyboard users can create, select, edit, connect, move, delete, undo, save, share, and export without a pointer. |
| V3-A11Y-003 | Must | Light and dark themes meet WCAG 2.1 AA contrast requirements. |
| V3-A11Y-004 | Must | Focus order, focus visibility, names, roles, status announcements, and screen-reader behavior are verified. |
| V3-BRW-001 | Must | The latest two stable versions of Chrome, Edge, Firefox, and Safari are tested and recorded. |
| V3-BRW-002 | Must | Browser limitations and unsupported clipboard or export capabilities are clearly communicated. |

## 12. Test and quality engineering

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-TST-001 | Must | Playwright covers authentication, project lifecycle, canvas editing, recovery, sharing, assets, and export journeys. |
| V3-TST-002 | Must | Unexpected browser console errors and React Flow warnings fail end-to-end tests. |
| V3-TST-003 | Must | Visual regression tests cover component, connection, theme, and export rendering. |
| V3-TST-004 | Must | Backend integration tests cover authorization, validation, concurrency, rate limits, analytics, snapshots, assets, and shares. |
| V3-TST-005 | Must | Lint, unit, integration, end-to-end, accessibility, and vulnerability checks block deployment on failure. |
| V3-TST-006 | Must | Production smoke tests verify Hosting, API health, authentication, create/save/reload, sharing, and export. |
| V3-TST-007 | Should | Scheduled cross-browser and performance regression suites run independently of deployments. |
| V3-TST-008 | Should | Reusable test-data factories create large, tangled, nested, and image-heavy projects. |

## 13. Observability and operations

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-OPS-001 | Must | Every API response and structured log entry carries a safe correlation identifier. |
| V3-OPS-002 | Must | Dashboards expose request rate, error rate, latency, saves, conflicts, users, diagrams, and deployment version. |
| V3-OPS-003 | Must | Alerts cover Cloud Run health, elevated errors or latency, Neon connection pressure, and Firebase deployment or asset failures. |
| V3-OPS-004 | Must | Operational metrics and logs never contain private document or canvas content. |
| V3-OPS-005 | Must | Rollback, incident triage, escalation, and service restoration procedures are documented and exercised. |
| V3-OPS-006 | Should | Synthetic monitoring regularly verifies the public site and backend health endpoint. |
| V3-OPS-007 | Should | Alerts identify unusual share traffic, repeated authorization failures, and oversized requests. |

## 14. Deployment and infrastructure

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-INF-001 | Must | The GitHub production workflow succeeds from a clean checkout without manual build artifacts. |
| V3-INF-002 | Must | Local, test, staging, and production configuration remain explicitly separated. |
| V3-INF-003 | Must | GCP, Firebase, and Neon budgets and billing alerts are configured. |
| V3-INF-004 | Must | Runtime and deployment service accounts follow least privilege and are periodically reviewed. |
| V3-INF-005 | Must | Deployment actions, build images, and CLI tools are pinned and upgraded through reviewed changes. |
| V3-INF-006 | Must | Firebase Storage remains deny-by-default and asset access is mediated by authenticated application rules. |
| V3-INF-007 | Must | A staging environment validates risky migrations and releases before production. |
| V3-INF-008 | Must | Deployment, rollback, secret rotation, database recovery, and clean-environment rebuild documentation remains current. |

## 15. Delivery order

V3 should be delivered in the following sequence:

1. Production observability, administrator analytics, budgets, and alerts.
2. Security, authorization, backup, and recovery validation.
3. Export and canvas regression completion.
4. End-to-end, accessibility, browser, and performance coverage.
5. Firebase-backed documentation image assets and Base64 migration.
6. Project snapshots and maintained templates.
7. Documentation and canvas linking and embeds.
8. Optional advanced diagram formats and collaboration capabilities.

## 16. V3 acceptance criteria

V3 is ready for release when:

1. Administrators can see accurate user and diagram metrics without accessing
   private project content.
2. Production alerts, correlation IDs, budgets, rollback, backup, and recovery
   procedures are active and tested.
3. Cross-owner access, authentication rejection, payload limits, and public
   sharing protections pass automated tests.
4. Canvas state, exports, snapshots, offline recovery, and concurrent-tab conflict
   handling pass real-browser journeys without data loss.
5. New images use managed project-owned assets, and existing Base64 images can be
   migrated safely.
6. The supported scale target passes performance testing and project/dashboard
   requests remain bounded.
7. Supported browsers and complete keyboard journeys pass accessibility and
   visual regression checks.
8. The deployment pipeline and production smoke suite pass from a clean checkout
   with no release-blocking console, security, accessibility, or data-loss defect.

## 17. Out of scope unless separately approved

- AI-generated diagrams or documentation, except when separately approved and
  delivered under [AI Diagram Generation Requirements](requirements-ai-diagram-generation.md).
- Real-time multiplayer editing, comments, mentions, and notifications.
- Enterprise SSO, organization administration, billing, and subscriptions.
- Native desktop or mobile editing applications.
- Public plugin, webhook, or MCP platforms.
- Flowchart, sequence, ER, and Mermaid expansion before the product-scope decision.
