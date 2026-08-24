# Archly V1 Product Requirements

Status: Draft

Version: 1.0

Last updated: 2026-08-24

## 1. Product summary

Archly is a browser-based technical diagramming and documentation tool for creating architecture diagrams, flowcharts, sequence diagrams, and entity-relationship diagrams through a visual canvas or diagram source.

V1 must prove that users can move from an idea to a clean, editable, shareable technical diagram with less manual layout effort than a conventional drawing tool.

## 2. Objectives

- Create and manage diagram projects.
- Build and edit diagrams on an infinite canvas.
- Create diagrams from text with live preview.
- Keep technical notes and diagrams together.
- Save automatically and recover named snapshots.
- Share through read-only links.
- Export diagrams in portable formats.

## 3. Target users

- Software engineers designing and explaining features.
- Software architects maintaining system designs.
- Engineering leads reviewing and sharing technical plans.

## 4. Primary user journeys

### 4.1 Manual diagram

1. Sign in and create a project.
2. Choose a blank canvas or template.
3. Add nodes, connectors, labels, and icons.
4. Adjust styling and layout.
5. Save, share, or export the result.

### 4.2 Diagram from source

1. Select a supported diagram type.
2. Enter diagram source in the editor.
3. See validation errors or a live preview.
4. Edit and save the rendered diagram.

### 4.3 Document and share

1. Write Markdown notes in the project.
2. Embed a project diagram.
3. Create a read-only link.
4. A recipient opens the design without edit access.

## 5. Functional requirements

Priorities are Must, Should, and Could.

Implementation status was audited against the repository on 2026-08-24:

- **Done**: the requirement has an implemented user path and supporting code or tests.
- **Partial**: part of the requirement exists, but behavior, coverage, or verification is incomplete.
- **Not done**: no complete implementation was found.

Functional requirement summary: **30 Done**, **0 Partial**, and **29 Not done**.

### 5.1 Authentication

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| AUTH-001 | Must | Users access Archly only through Google sign-in using an `@gmail.com` account. | Done |
| AUTH-002 | Must | Archly accepts only an identity returned by Google whose verified email ends exactly with `@gmail.com`. | Done |
| AUTH-003 | Must | Google Workspace accounts and all other email domains are rejected with a clear message. | Done |
| AUTH-004 | Must | Archly does not implement registration, passwords, email verification, password reset, account recovery, or account-management features. | Done |
| AUTH-005 | Must | Server-side authorization protects every project operation after identity verification. | Done |

### 5.2 Projects

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| PROJ-001 | Must | Users can create projects. | Done |
| PROJ-002 | Must | The dashboard lists projects by most recent update. | Done |
| PROJ-003 | Must | Users can open, rename, duplicate, and delete projects. | Done |
| PROJ-004 | Must | Deletion requires confirmation. | Done |
| PROJ-005 | Should | Users can search projects by name. | Not done |
| PROJ-006 | Could | Users can organize projects into folders. | Not done |

### 5.3 Canvas

Detailed canvas behavior, visual layout, and acceptance criteria are defined in [V1 canvas requirements](canvas-requirements-v1.md).

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| CAN-001 | Must | The canvas supports pan, zoom, fit-to-screen, and reset view. | Done |
| CAN-002 | Must | Users can add, select, move, duplicate, and delete nodes; node dimensions adjust automatically to visible content. | Done |
| CAN-003 | Must | Users can connect nodes with directional, labeled edges. | Done |
| CAN-004 | Must | Users can select and move multiple elements. | Done |
| CAN-005 | Must | The editor supports undo, redo, copy, and paste. | Done |
| CAN-006 | Must | The canvas provides a grid and snap-to-grid behavior. | Done |
| CAN-007 | Must | Users can change node color, border, icon, and text alignment. | Not done |
| CAN-008 | Must | V1 includes service, database, queue, actor, container, note, text, and group elements. | Done |
| CAN-009 | Must | A searchable initial library contains common cloud and technology icons. | Done |
| CAN-010 | Should | Users can lock elements. | Done |
| CAN-011 | Should | Larger diagrams provide a minimap. | Done |
| CAN-012 | Should | Selected elements can be automatically arranged. | Done |

### 5.4 Diagram types and source

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| DIA-001 | Must | Archly supports flowcharts. | Not done |
| DIA-002 | Must | Archly supports sequence diagrams. | Not done |
| DIA-003 | Must | Archly supports entity-relationship diagrams. | Not done |
| DIA-004 | Must | Archly supports system and cloud architecture diagrams. | Done |
| DIA-005 | Must | Users can edit supported source in a syntax-aware editor. | Not done |
| DIA-006 | Must | The preview updates after source changes without a page reload. | Not done |
| DIA-007 | Must | Invalid source shows an actionable error and preserves the last valid diagram. | Not done |
| DIA-008 | Must | Editable source is retained as source of truth where applicable. | Not done |
| DIA-009 | Should | The source editor provides formatting and examples. | Not done |
| DIA-010 | Should | Supported visual and source edits remain synchronized. | Not done |

### 5.5 Technical document

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| DOC-001 | Must | Every project has one rich-text document. | Done |
| DOC-002 | Must | The rich-text editor supports headings, bold, italic, strikethrough, text colors, highlight colors, lists, links, blockquotes, highlighted inline code, syntax-highlighted multiline code snippets, undo, and redo. | Done |
| DOC-003 | Must | Users can choose document, canvas, or split view. | Done |
| DOC-004 | Must | Project diagrams can be embedded in the document. | Not done |
| DOC-005 | Must | Rendered content is sanitized. | Done |
| DOC-006 | Should | Selecting an embed focuses its canvas location. | Not done |

### 5.6 Saving and history

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| SAVE-001 | Must | Canvas and document changes save automatically. | Done |
| SAVE-002 | Must | The UI displays saving, saved, and failed states. | Done |
| SAVE-003 | Must | Stale updates cannot silently overwrite newer content. | Done |
| SAVE-004 | Must | Users can create named snapshots. | Not done |
| SAVE-005 | Must | Users can view and restore recent snapshots. | Not done |
| SAVE-006 | Should | At least the latest 20 snapshots are retained per project. | Not done |

### 5.7 Templates

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| TPL-001 | Must | Users can begin from a template or blank canvas. | Done |
| TPL-002 | Must | V1 includes at least 10 templates across supported types. | Not done |
| TPL-003 | Must | Template use creates independent project content. | Not done |

### 5.8 Sharing

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| SHR-001 | Must | Projects are private by default. | Done |
| SHR-002 | Must | Owners can create and revoke read-only links. | Not done |
| SHR-003 | Must | Read-only visitors cannot call mutation APIs. | Not done |
| SHR-004 | Should | Shared projects can be viewed without an account. | Not done |
| SHR-005 | Could | Owners can create editable links. | Not done |

### 5.9 Export

| ID | Priority | Requirement | Implementation status |
| --- | --- | --- | --- |
| EXP-001 | Must | Users can export a canvas as PNG. | Not done |
| EXP-002 | Must | Users can export a canvas as SVG. | Not done |
| EXP-003 | Must | Users can export documents as Markdown. | Not done |
| EXP-004 | Must | Users can download editable diagram source. | Not done |
| EXP-005 | Should | The full canvas or selected elements can be exported. | Not done |
| EXP-006 | Should | Rendered diagrams can be copied to the clipboard. | Not done |

## 6. Data requirements

V1 must persist User, Project, Document, Diagram, DiagramSnapshot, ShareLink, and Template records. User-owned records need stable identifiers and creation and update timestamps. Diagrams must retain structured canvas data, source when applicable, type, and a revision number for concurrency control.

## 7. Non-functional requirements

### 7.1 Performance and reliability

- The dashboard should become usable within 2 seconds under normal conditions.
- A typical project should become interactive within 3 seconds.
- Common canvas actions should remain responsive near 60 frames per second.
- V1 should support at least 300 nodes and 500 edges on a supported laptop browser.
- Autosave should begin within 2 seconds after editing stops.
- Failed saves must remain visible and retry without discarding local work.
- Update APIs must use revision checks or equivalent optimistic concurrency control.
- Invalid parsed content must never replace the last valid diagram.

### 7.2 Security and privacy

- Production traffic uses HTTPS.
- Every project operation has server-side authorization.
- OAuth tokens are never stored in client code or source control.
- Markdown, labels, uploads, and generated SVG are treated as untrusted input.
- Sharing and export endpoints are rate-limited.
- Sensitive project content is excluded from general application logs.
- Share tokens are high-entropy, revocable, and securely stored.

### 7.3 Accessibility

- Primary workflows are keyboard accessible.
- Controls have accessible names and visible focus indicators.
- Text and controls target WCAG 2.1 AA contrast.
- Errors and selection state never rely on color alone.

### 7.4 Browser support

V1 supports the latest two stable versions of Chrome, Edge, Firefox, and Safari on desktop. Mobile editing is excluded, but read-only shared views should remain readable on common mobile screens.

### 7.5 Observability

- Backend requests have correlation identifiers.
- Errors are captured without exposing private project content.
- Metrics cover latency, error rates, save failures, and exports.
- Health and readiness endpoints support deployment checks.

## 8. Technical constraints

- React and TypeScript UI.
- Java and Spring Boot backend.
- PostgreSQL primary database.
- Modular-monolith backend for V1.
- Canvas content is stored as structured data, not only as an image.
- APIs are documented through OpenAPI.
- Database changes use versioned migrations.

## 9. V1 acceptance criteria

V1 is ready for prototype testing when:

1. A user with a verified `@gmail.com` Google account can enter Archly and create a project, while Google Workspace and other domains are rejected.
2. Canvas elements and edges survive a reload.
3. All four diagram types have a working creation path.
4. Valid source updates its preview; invalid source preserves the last valid render.
5. Markdown notes can embed a project diagram.
6. Autosave communicates failures and prevents silent stale overwrites.
7. A named snapshot can be created and restored.
8. A revoked share link can no longer open the project.
9. A read-only visitor cannot modify a project through the UI or API.
10. PNG, SVG, source, and Markdown exports work.
11. Automated tests cover authentication, authorization, persistence, concurrency, and sharing.
12. No release-blocking accessibility, security, or data-loss defect remains open.

## 10. Success metrics

- First-diagram completion rate.
- Median time from project creation to a useful diagram.
- Save failure rate.
- Export and sharing completion rates.
- Seven-day project editing return rate.
- User rating for diagram quality and ease of editing.

## 11. Out of scope for V1

- Real-time multiplayer editing, comments, mentions, and notifications.
- Git synchronization and full-repository analysis.
- Automated codebase monitoring.
- Image-to-diagram generation.
- Visio, draw.io, and BPMN compatibility.
- Enterprise SSO, audit logs, and billing.
- Native mobile or desktop applications.
- Public APIs, webhooks, plugins, and MCP support.
- AI-assisted diagram generation, AI-assisted documentation, and follow-up AI refinement.

## 12. Open decisions

- Whether Mermaid is sufficient for all source-driven V1 diagrams.
- How visual and source edits synchronize without data loss.
- Whether anonymous read-only sharing is enabled by default.
- Icon library and licensing.
- Snapshot retention and storage limits.
- Whether PDF export is needed before public beta.

## 13. V1 implementation audit

### 13.1 Data, non-functional, and technical coverage

| Area | Status | Evidence or remaining gap |
| --- | --- | --- |
| Data requirements | Partial | Projects persist owner, document HTML, structured canvas JSON, revision, and timestamps. Separate User, Document, Diagram, DiagramSnapshot, ShareLink, and Template records are not implemented. |
| Performance and reliability | Partial | Autosave, revision control, and responsive canvas interactions exist, but the documented load-time, frame-rate, and 300-node/500-edge targets have not been measured. |
| Security and privacy | Partial | Google JWT validation and owner-scoped project access exist. Rate limiting, production HTTPS verification, security testing, and explicit content sanitization coverage are incomplete. |
| Accessibility | Partial | Main controls have accessible names and keyboard support, but complete keyboard workflow and WCAG 2.1 AA audits have not been performed. |
| Browser support | Not done | The latest two versions of Chrome, Edge, Firefox, and Safari have not been tested and recorded. |
| Observability | Partial | Health endpoints and Spring operational logging exist. Correlation identifiers and the specified product metrics are not implemented. |
| React and TypeScript UI | Done | The UI is implemented with React and TypeScript. |
| Java and Spring Boot backend | Done | The API is implemented with Java and Spring Boot. |
| PostgreSQL primary database | Partial | PostgreSQL deployment configuration exists, while local development defaults to file-backed H2 in PostgreSQL compatibility mode. |
| Modular-monolith backend | Done | The current backend is a single Spring Boot application organized by project and configuration packages. |
| Structured canvas persistence | Done | Nodes and edges are stored as structured JSON rather than only as an image. |
| OpenAPI documentation | Done | Springdoc OpenAPI and Swagger UI are configured. |
| Versioned database migrations | Done | Flyway manages the initial project schema migration. |

### 13.2 V1 acceptance criteria status

| Criterion | Status | Evidence or remaining gap |
| --- | --- | --- |
| 1. Verified personal Gmail authentication and rejection of other domains | Partial | Google JWT audience, verified-email, and `@gmail.com` validation exist, but the rejected-domain experience is not fully covered by an end-to-end test. |
| 2. Canvas elements and edges survive reload | Done | Project canvas JSON is saved through the API and restored when the project opens. |
| 3. All four diagram types have a working creation path | Not done | Only the manual architecture canvas is implemented. |
| 4. Valid source updates preview and invalid source preserves the last valid render | Not done | No diagram source editor or renderer is implemented. |
| 5. Document notes can embed a project diagram | Not done | Document and canvas views exist, but diagram embedding is not implemented. |
| 6. Autosave communicates failures and prevents stale overwrites | Done | Saving, saved, offline, conflict, and failed states are visible; stale revisions are rejected, both versions are preserved locally, and users can retry or explicitly choose a version. |
| 7. A named snapshot can be created and restored | Not done | Snapshot storage and UI are not implemented. |
| 8. A revoked share link can no longer open the project | Not done | Share links are not implemented. |
| 9. A read-only visitor cannot modify a project through the UI or API | Not done | Anonymous or link-based read-only access is not implemented. |
| 10. PNG, SVG, source, and Markdown exports work | Not done | Export actions and endpoints are not implemented. |
| 11. Automated tests cover authentication, authorization, persistence, concurrency, and sharing | Partial | UI and project API tests exist, but the complete authentication, cross-owner authorization, concurrency, and sharing matrix is not covered. |
| 12. No release-blocking accessibility, security, or data-loss defect remains | Not done | Formal accessibility, security, supported-browser, and data-loss release audits have not been completed. |
