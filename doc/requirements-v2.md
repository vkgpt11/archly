# Archly V2 Improvement Requirements

Status: Draft

Version: 2.0

Last updated: 2026-08-24

V2 builds on the validated V1 prototype. Its primary objective is to make diagram editing dependable and efficient for larger, frequently edited architecture projects. Reliability and complete canvas interactions take priority over expanding the component library or adding AI features.

Priorities remain Must, Should, and Could.

## 1. Canvas selection and component editing

| ID | Priority | Requirement |
| --- | --- | --- |
| V2-CAN-001 | Must | A single click selects a component without entering text-edit mode. |
| V2-CAN-002 | Must | A double click or Enter on a selected component enters title-edit mode. |
| V2-CAN-003 | Must | Escape or loss of focus exits title-edit mode without losing valid text. |
| V2-CAN-004 | Must | Clicking a connection, its label, or its selection area clears component selection and opens the connection toolbar. |
| V2-CAN-005 | Must | Users can select multiple components with Shift-click or a drag-selection rectangle. |
| V2-CAN-006 | Must | Users can move, duplicate, delete, lock, and unlock a multi-selection as one operation. |
| V2-CAN-007 | Should | Users can align and evenly distribute selected components horizontally or vertically. |
| V2-CAN-008 | Should | Component title changes retain the existing automatic sizing and title-length rules. |

## 2. Connection editing

| ID | Priority | Requirement |
| --- | --- | --- |
| V2-CON-001 | Must | Users can reconnect either endpoint of the selected connection to any compatible component handle. |
| V2-CON-002 | Must | Users can add, move, and remove connection waypoints without disconnecting the connection from its components. |
| V2-CON-003 | Must | Only the selected connection responds to waypoint, endpoint, label, and formatting changes when connections overlap. |
| V2-CON-004 | Must | Users can move a connection label along its path. |
| V2-CON-005 | Must | The line is visually interrupted behind its label so that line and text do not overlap. |
| V2-CON-006 | Must | Connection labels use compact spacing and remain readable in light and dark themes. |
| V2-CON-007 | Should | Automatic routing avoids component bodies and reduces connection crossings where possible. |
| V2-CON-008 | Should | Users can reset a connection to its automatically calculated route. |
| V2-CON-009 | Should | Selected connections are visually distinct without enlarging visible endpoint handles excessively. |

## 3. Undo, clipboard, and organization

| ID | Priority | Requirement |
| --- | --- | --- |
| V2-EDT-001 | Must | Undo and redo cover component creation, deletion, movement, title editing, locking, and styling. |
| V2-EDT-002 | Must | Undo and redo cover connection creation, deletion, reconnection, routing, labels, waypoints, and formatting. |
| V2-EDT-003 | Must | Copy, cut, paste, and duplicate preserve connections whose two endpoints are included in the copied selection. |
| V2-EDT-004 | Should | Diagram content can be copied between Archly projects. |
| V2-EDT-005 | Must | Containers can own components, and moving a container moves its contained components. |
| V2-EDT-006 | Should | Containers can be collapsed and expanded without losing their contents or connections. |

## 4. Layout and navigation

| ID | Priority | Requirement |
| --- | --- | --- |
| V2-LAY-001 | Must | Users can apply horizontal, vertical, and hierarchical automatic layouts to a selection or full diagram. |
| V2-LAY-002 | Must | Applying automatic layout is a single undoable operation. |
| V2-LAY-003 | Should | Users can preview and cancel an automatic layout before committing it. |
| V2-NAV-001 | Must | Users can search components by their complete title and focus a selected search result on the canvas. |
| V2-NAV-002 | Must | A Zoom to selection action fits the selected diagram elements in the viewport. |
| V2-NAV-003 | Should | Users can enable or disable the grid and snap-to-grid independently. |
| V2-NAV-004 | Should | Nested containers provide a visible navigation path or breadcrumb. |

## 5. Autosave and recovery

| ID | Priority | Requirement |
| --- | --- | --- |
| V2-SAVE-001 | Must | Selection, hover, viewport, toolbar, and edit-focus changes do not trigger project autosave or increment its revision. |
| V2-SAVE-002 | Must | Autosave exposes Saved, Saving, Offline, Conflict, and Save failed states. |
| V2-SAVE-003 | Must | Unsaved local changes survive a page refresh or temporary network failure. |
| V2-SAVE-004 | Must | A stale browser tab cannot silently overwrite newer server content. |
| V2-SAVE-005 | Must | A conflict presents recovery choices that preserve both the local draft and latest server version. |
| V2-SAVE-006 | Must | Failed saves can be retried without discarding subsequent edits. |
| V2-SAVE-007 | Should | Users receive a warning before closing a page containing changes that are neither saved remotely nor stored locally. |

## 6. Documentation and diagram integration

| ID | Priority | Requirement |
| --- | --- | --- |
| V2-DOC-001 | Must | A documentation heading can be linked to one or more canvas components. |
| V2-DOC-002 | Must | Activating a component link in the document focuses and selects the associated canvas component. |
| V2-DOC-003 | Must | Users can embed either the full diagram or a selected diagram region in the document. |
| V2-DOC-004 | Should | Embedded diagrams remain synchronized with their canvas source and support captions. |
| V2-DOC-005 | Should | The rich-text editor supports tables, checklists, and callouts. |
| V2-DOC-006 | Should | Multiline code blocks provide an explicit language selector for syntax highlighting. |
| V2-DOC-007 | Should | Documentation can be imported from and exported to Markdown without losing supported formatting. |

### 6.1 Future image asset storage

The prototype stores PNG, JPEG, and WebP screenshots as Base64 data URLs inside the document HTML. This keeps local development self-contained but increases document, database, revision, and browser-storage size. Before production use, image binaries must move to managed object storage.

| ID | Priority | Status | Requirement |
| --- | --- | --- | --- |
| V2-ASSET-001 | Must | Not started | The UI uploads documentation images through an authenticated asset API instead of embedding new Base64 data URLs in project content. |
| V2-ASSET-002 | Must | Not started | The backend stores image binaries in configurable object storage, with MinIO supported for local development and an S3-compatible production implementation. |
| V2-ASSET-003 | Must | Not started | An asset record stores its ID, owning project, storage key, media type, byte size, content hash, creator, and timestamps. |
| V2-ASSET-004 | Must | Not started | Documents store stable asset references; resizing changes presentation metadata without creating another image binary. |
| V2-ASSET-005 | Must | Not started | Upload validation verifies the decoded file signature, approved PNG/JPEG/WebP type, byte limit, pixel dimensions, and authorization for the owning project. |
| V2-ASSET-006 | Must | Not started | Reading, replacing, or deleting an image requires access to its owning project; asset identifiers and storage keys must not grant access by themselves. |
| V2-ASSET-007 | Should | Not started | Upload processing strips unnecessary metadata, corrects orientation, and creates optimized display variants or thumbnails without materially degrading screenshots. |
| V2-ASSET-008 | Should | Not started | Identical uploads can be deduplicated by a cryptographic content hash while preserving project-level access controls. |
| V2-ASSET-009 | Must | Not started | Removing an image reference does not immediately destroy recoverable project history; an automated retention job removes assets only after they are unreferenced beyond the configured recovery period. |
| V2-ASSET-010 | Must | Not started | Existing Base64 screenshots can be migrated to stored assets without losing order, alternative text, dimensions, project history, or document content. |
| V2-ASSET-011 | Should | Not started | Asset delivery uses short-lived signed URLs or an authenticated streaming endpoint with appropriate cache and content-security headers. |
| V2-ASSET-012 | Must | Not started | Integration tests cover upload, save/reload, resize persistence, unauthorized access, invalid and oversized files, migration, deletion retention, and orphan cleanup. |

## 7. Project management, sharing, and export

| ID | Priority | Requirement |
| --- | --- | --- |
| V2-PROJ-001 | Must | Users can search, sort, duplicate, archive, restore, and permanently delete projects. |
| V2-PROJ-002 | Should | The dashboard provides a recently opened projects section. |
| V2-PROJ-003 | Must | Users can start from maintained architecture templates, including microservices, event-driven, and three-tier designs. |
| V2-EXP-001 | Must | PNG and SVG exports preserve diagram colors, labels, line routing, and light or dark presentation. |
| V2-EXP-002 | Must | Users can export and restore a complete editable project as versioned JSON. |
| V2-EXP-003 | Must | Documents can be exported to PDF with embedded diagrams and code blocks. |
| V2-EXP-004 | Should | Users can import and export supported Mermaid diagrams. |
| V2-SHR-001 | Must | A shareable read-only view displays the document and diagram without exposing editing operations. |

## 8. V2 quality requirements

- Common editing actions remain responsive near 60 frames per second with 300 components and 500 connections.
- Automatic layout for the supported V2 project size completes within 3 seconds on a supported laptop browser.
- Keyboard users can select, edit, connect, delete, undo, and navigate without requiring a pointer.
- Light and dark themes meet WCAG 2.1 AA contrast for text, controls, selection, and connection labels.
- Automated UI tests cover component editing, multi-selection, connection manipulation, undo and redo, autosave recovery, and export.
- Browser testing covers the latest two stable versions of Chrome, Edge, Firefox, and Safari.
- Production builds contain no known release-blocking console errors, React Flow warnings, data-loss defects, or accessibility violations.

## 9. V2 acceptance criteria

V2 is ready for release testing when:

1. Selection and edit mode behave independently for components and connections.
2. A user can reconnect endpoints, edit waypoints, reposition labels, and reset routing on the selected connection.
3. Multi-selection, alignment, duplication, grouping, and container movement preserve diagram integrity.
4. Undo and redo restore every supported canvas mutation without corrupting later history.
5. Selection-only interactions do not cause network saves or revision changes.
6. Offline edits and save conflicts can be recovered without losing either version.
7. Users can search for and navigate to a component in a large diagram.
8. Documentation links and embeds navigate to and accurately represent their canvas sources.
9. PNG, SVG, PDF, JSON, and supported Mermaid import or export paths pass round-trip or visual verification as applicable.
10. Automated tests and supported-browser user journeys pass with no release-blocking console, accessibility, security, or data-loss defect.

## 10. Out of scope for V2

- AI-generated diagrams or documentation.
- Real-time multiplayer editing, comments, mentions, and notifications.
- Enterprise SSO, organization administration, audit logs, and billing.
- Native desktop and mobile editing applications.
- Public plugin, webhook, or MCP platforms.
