# V3 canvas verification

This record maps `V3-CAN-001` through `V3-CAN-011` to implementation and
regression evidence. It was last executed on 2026-09-03.

## Mutation audit

Every supported durable mutation records one pre-change snapshot and restores
the complete node and edge arrays through Undo. Redo captures and restores the
corresponding post-change arrays. Continuous text/color editing records at
focus start so a user gesture remains one logical history action.

| Mutation family | Undo/redo evidence |
| --- | --- |
| Create, delete, duplicate, cut, paste | Canvas component tests and shared `remember`/snapshot path |
| Move, keyboard nudge, group movement, container movement | Drag-start snapshot plus group-aware interaction tests |
| Group, ungroup, container assignment | Interaction and persistence tests |
| Align, distribute, connection-aware layout, equal width/height | Pure interaction tests plus shared snapshot path |
| Lock/unlock, z-order, icon, type, title, description, colors, position | Inspector/component tests plus shared snapshot path |
| Connect, reconnect, label, arrows, route, weight, line style, color | Connection regression tests plus complete edge snapshots |
| Diagram-as-code draw | Parser tests plus shared snapshot path; invalid source never records or replaces the valid canvas |
| Container collapse/expand and canvas images | Durable node-data round-trip test plus shared snapshot path |

Selection, minimap visibility, grid visibility, snapping preference, open
panels, and zoom controls are intentionally UI state rather than durable canvas
mutations. Viewport changes persist with the project but do not create an
autosave or history entry by themselves.

## Requirement evidence

| Requirement | Evidence |
| --- | --- |
| `V3-CAN-001` | Central snapshot history and the mutation audit above; canvas tests cover representative actions and coalesced text/format edits. |
| `V3-CAN-002` | Drag-time horizontal/vertical alignment guides coexist with independently configurable 16px React Flow grid snapping. |
| `V3-CAN-003` | Single-node inspectors cover component, text, note, container and image fields; edge inspector covers connection properties; multi-selection inspector covers sizing, fill, locking, duplication and deletion. |
| `V3-CAN-004` | Single selection exposes numeric X/Y controls; automatic sizing remains active unless an explicit manual/equal size is applied. |
| `V3-CAN-005` | Selected edges use an elevated interaction layer; label, routing and arrow state are exercised by component and Playwright export tests, including off-screen diagrams. |
| `V3-CAN-006` | The durable round-trip test covers groups, container membership, collapse state, routing, arrowheads, formatting, z-order, manual sizes, images and viewport. |
| `V3-CAN-007` | Recent components are stored under an authenticated-user-scoped key and deduplicated to eight entries. |
| `V3-CAN-008` | Containers collapse/expand without removing descendants and show their direct hidden-content count. |
| `V3-CAN-009` | Multi-selection exposes equal-width and equal-height actions; manual sizing prevents title autosizing from reversing the result. |
| `V3-CAN-010` | Text, note, container and image creation are grouped in an accessible More menu. |
| `V3-CAN-011` | PNG, JPEG and WebP canvas image elements support a 5 MiB input limit, alternative text, sizing, persistence and export through the canvas model. |

## Verification results

- ESLint with zero warnings: passed.
- Vitest: 108 tests passed.
- TypeScript and Vite production build: passed.
- Playwright: 24 tests passed across Chromium, Firefox and WebKit.
- The Playwright suite includes the 300-component/500-connection benchmark,
  SVG/PNG export fidelity, off-screen and selection exports, nested regions,
  core project journeys and axe checks.

