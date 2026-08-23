# Archly V1 Canvas Requirements

Status: Draft

Version: 1.0

Last updated: 2026-08-24

## 1. Purpose

The Archly canvas is a focused technical-architecture diagram editor. It must help users create clear, structured diagrams without the complexity of a general-purpose design tool.

This document expands the canvas requirements summarized in `requirements-v1.md` and defines the intended V1 tools, layout, interactions, and acceptance criteria.

## 2. Design principles

- Keep the canvas spacious and place tools around its edges.
- Show advanced controls only when they are relevant to the current selection.
- Prefer recognizable icons with accessible labels and tooltips.
- Make common actions available through both controls and keyboard shortcuts.
- Use consistent component shapes and connection behavior for readable diagrams.
- Preserve equivalent usability and contrast in light and dark themes.

## 3. Canvas layout

The canvas screen contains the following regions:

| Region | Location | Purpose |
| --- | --- | --- |
| View selector | Top center | Switch between Document, Split, and Canvas views. |
| Creation toolbar | Floating on the left | Select, pan, create, connect, and delete elements. |
| Component library | Collapsible left panel | Search and add architecture components. |
| Canvas | Center | Create and manipulate the diagram on an infinite surface. |
| Properties inspector | Collapsible right panel | Edit the selected element's content and appearance. |
| Context toolbar | Near the selection | Provide high-frequency actions relevant to the selection. |
| Navigation controls | Bottom right | Control zoom, fit, minimap, and fullscreen mode. |

The canvas uses a subtle dotted grid that remains visible without competing with diagram content. Side panels must be collapsible, and the canvas must resize to use the released space.

## 4. Functional requirements

Priorities are Must, Should, and Could.

### 4.1 Main toolbar

| ID | Priority | Requirement |
| --- | --- | --- |
| CTB-001 | Must | The floating toolbar provides Select, Pan, Add component, Add text, Add note, Connect, Add container, and Delete actions. |
| CTB-002 | Must | Each toolbar action uses an icon, accessible name, and tooltip. |
| CTB-003 | Must | The active tool has a visible selected state that does not rely on color alone. |
| CTB-004 | Must | Users can return to the Select tool by pressing Escape. |
| CTB-005 | Should | Less frequently used creation actions are available from a More menu. |
| CTB-006 | Could | Users can add an image to the canvas. |

### 4.2 Architecture component library

| ID | Priority | Requirement |
| --- | --- | --- |
| LIB-001 | Must | A searchable component library opens from the Add component action. |
| LIB-002 | Must | The library includes user/actor, web application, mobile application, service/API, database, cache, queue/event bus, file storage, external system, container, and custom component types. |
| LIB-003 | Must | Users can add a component by clicking it or dragging it onto the canvas. |
| LIB-004 | Must | Components use a consistent card design containing an icon, title, and optional subtitle. |
| LIB-005 | Must | Users can edit a component's icon, title, description, type, and colors. |
| LIB-006 | Should | The library remembers the user's recently used components. |
| LIB-007 | Could | Provider-specific AWS, Azure, GCP, and Kubernetes libraries can be added after the generic V1 library. |

### 4.3 Nodes and content

| ID | Priority | Requirement |
| --- | --- | --- |
| NOD-001 | Must | Users can add, select, move, duplicate, and delete nodes. |
| NOD-001A | Must | Node dimensions adjust automatically to visible title and subtitle content; manual resizing is not provided. |
| NOD-002 | Must | Users can edit node text directly and through the properties inspector. |
| NOD-003 | Must | Text and note elements support multiline content. |
| NOD-004 | Must | Nodes expose connection handles when selected or when the Connect tool is active. |
| NOD-005 | Must | Selection outlines remain clearly visible in both themes. |
| NOD-006 | Should | Users can lock a node to prevent accidental movement. |
| NOD-007 | Should | Users can bring a node forward or send it backward. |

### 4.4 Connections

| ID | Priority | Requirement |
| --- | --- | --- |
| CON-001 | Must | Users can create a connection by dragging between node handles. |
| CON-002 | Must | Connections support arrow direction and an editable label. |
| CON-003 | Must | Users can reconnect either endpoint without recreating the connection. |
| CON-004 | Must | Connections support straight, curved, and stepped routing. |
| CON-005 | Must | Connections support solid and dashed line styles and selectable colors. |
| CON-006 | Must | Connection labels can describe protocols or relationships such as REST, Kafka, or SQL. |
| CON-007 | Should | Users can add and move intermediate bend points. |
| CON-008 | Should | Selecting a connection opens a compact contextual toolbar. |

### 4.5 Selection and editing

| ID | Priority | Requirement |
| --- | --- | --- |
| SEL-001 | Must | Users can select multiple elements with Shift or a selection rectangle. |
| SEL-002 | Must | Users can copy, cut, paste, duplicate, and delete selected elements. |
| SEL-003 | Must | Users can undo and redo canvas changes. |
| SEL-004 | Must | Arrow keys move selected elements, with a modifier for larger increments. |
| SEL-005 | Must | Users can group and ungroup selected elements. |
| SEL-006 | Must | Keyboard shortcuts do not activate while the user is editing text. |
| SEL-007 | Should | Users can lock selected elements. |
| SEL-008 | Should | Common selection actions appear in a nearby contextual toolbar. |

### 4.6 Containers and boundaries

| ID | Priority | Requirement |
| --- | --- | --- |
| BND-001 | Must | Users can create labeled containers for systems, service groups, networks, clusters, availability zones, team ownership, or custom boundaries. |
| BND-002 | Must | A container supports editable title, background, border, and text colors. |
| BND-003 | Must | Moving a container moves its contained elements while preserving their relative positions. |
| BND-004 | Must | Users can move elements into and out of a container. |
| BND-005 | Should | Containers can be collapsed and expanded. |
| BND-006 | Should | A collapsed container shows a summary of its hidden contents. |

### 4.7 Alignment and layout

| ID | Priority | Requirement |
| --- | --- | --- |
| LAY-001 | Must | The canvas provides a visible grid and optional snap-to-grid behavior. |
| LAY-002 | Must | Alignment guides appear while elements are moved. |
| LAY-003 | Must | Multiple selected elements can be aligned left, center, right, top, middle, or bottom. |
| LAY-004 | Must | Multiple selected elements can be distributed horizontally or vertically. |
| LAY-005 | Should | Selected elements can be made equal width or equal height. |
| LAY-006 | Should | Users can apply automatic horizontal and vertical layouts. |
| LAY-007 | Should | A Tidy diagram action improves spacing without changing diagram meaning. |

### 4.8 Properties inspector

| ID | Priority | Requirement |
| --- | --- | --- |
| PRO-001 | Must | Selecting an element opens a right-side properties inspector. |
| PRO-002 | Must | The inspector changes its controls for nodes, connections, text, notes, containers, and multi-selection. |
| PRO-003 | Must | Node properties include name, type, description, icon, fill, border, and text colors. |
| PRO-004 | Must | Connection properties include label, direction, routing, line style, and color. |
| PRO-005 | Must | Position and size values can be viewed and edited for supported elements. |
| PRO-006 | Must | Duplicate, lock, and delete actions are available where applicable. |
| PRO-007 | Must | Closing the inspector returns its space to the canvas. |

### 4.9 Navigation

| ID | Priority | Requirement |
| --- | --- | --- |
| NAV-001 | Must | Users can pan with the Pan tool, trackpad gestures, or the configured mouse gesture. |
| NAV-002 | Must | Users can zoom in, zoom out, view the current zoom percentage, fit the diagram to the viewport, and reset the view. |
| NAV-003 | Must | Zoom centers on the pointer when performed over the canvas. |
| NAV-004 | Should | Users can toggle a minimap for larger diagrams. |
| NAV-005 | Should | The canvas supports fullscreen mode. |
| NAV-006 | Must | Navigation controls remain available in Canvas and Split views. |

### 4.10 Documentation integration

| ID | Priority | Requirement |
| --- | --- | --- |
| DCI-001 | Must | A canvas component can link to a heading in the project's document. |
| DCI-002 | Must | Users can open linked documentation from the selected component. |
| DCI-003 | Must | Users can assign an external documentation or source-code URL to a component. |
| DCI-004 | Should | Selecting linked document content highlights the corresponding canvas component. |
| DCI-005 | Should | Users can insert a reference to a selected canvas component into the document. |
| DCI-006 | Should | Broken internal links are visibly identified without deleting the link. |

### 4.11 Persistence and error handling

| ID | Priority | Requirement |
| --- | --- | --- |
| PER-001 | Must | All canvas elements, positions, styles, connections, grouping, and viewport settings survive a reload. |
| PER-002 | Must | Canvas changes use the project autosave flow and expose saving, saved, and failed states. |
| PER-003 | Must | Concurrent saves cannot silently overwrite newer local or server content. |
| PER-004 | Must | A failed save retains local canvas changes and offers a retry path. |
| PER-005 | Should | Undo and redo history remains available until the project is closed or reloaded. |

## 5. Keyboard shortcuts

The V1 canvas should provide the following shortcuts while respecting platform conventions:

| Action | Shortcut |
| --- | --- |
| Select all | Ctrl/Cmd+A |
| Copy | Ctrl/Cmd+C |
| Cut | Ctrl/Cmd+X |
| Paste | Ctrl/Cmd+V |
| Duplicate | Ctrl/Cmd+D |
| Undo | Ctrl/Cmd+Z |
| Redo | Ctrl/Cmd+Shift+Z or Ctrl+Y |
| Delete selection | Delete or Backspace |
| Cancel current action | Escape |
| Pan temporarily | Hold Space and drag |
| Zoom in/out | Ctrl/Cmd plus `+` or `-` |
| Fit diagram | Configurable application shortcut |

## 6. Visual and accessibility requirements

- Toolbars use neutral surfaces, compact spacing, and consistent icon sizing.
- The selected tool, selected elements, connection handles, and focus states remain distinguishable in light and dark themes.
- Canvas grid and boundary backgrounds must not reduce text readability.
- Every icon-only control has an accessible name and tooltip.
- All primary canvas workflows are keyboard accessible.
- Color is never the only indicator of selection, errors, connection direction, or locked state.
- Controls and diagram text target WCAG 2.1 AA contrast.
- Reduced-motion preferences are honored for animated panels and viewport transitions.

## 7. Performance requirements

- Common editing interactions should remain responsive near 60 frames per second.
- V1 should support at least 300 nodes and 500 connections on a supported laptop browser.
- Opening or closing a side panel must not reset the viewport.
- Automatic layout operations provide progress feedback when they cannot complete immediately.
- Search in the component library responds without noticeable delay for the V1 library size.

## 8. Recommended delivery sequence

1. Component cards and searchable generic component library.
2. Labeled, styled, reconnectable connections.
3. Multi-selection, clipboard actions, undo/redo, and keyboard shortcuts.
4. Contextual properties inspector.
5. Alignment, distribution, guides, and snap-to-grid.
6. Containers, grouping, and layering.
7. Zoom controls, fit-to-screen, minimap, and fullscreen mode.
8. Links between canvas components and project documentation.

## 9. V1 canvas acceptance criteria

The canvas is ready for V1 prototype testing when:

1. A user can build a recognizable architecture diagram using the generic component library.
2. Nodes can be edited, moved, duplicated, grouped, and connected without losing data after reload, and their dimensions follow visible content.
3. Connections can be labeled, restyled, rerouted, and reconnected.
4. Multi-selection, keyboard shortcuts, undo, redo, alignment, and distribution work consistently.
5. Containers retain membership and move their contained elements correctly.
6. The properties inspector exposes valid controls for every supported selection type.
7. Pan, zoom, fit-to-screen, reset, and snap-to-grid work in Canvas and Split views.
8. The canvas remains usable after either side panel is resized, collapsed, or reopened.
9. Canvas components can link to document headings and external URLs.
10. The canvas remains usable with 300 nodes and 500 connections on a supported laptop browser.
11. Light and dark themes meet the defined visual and accessibility requirements.
12. Automated tests cover persistence, selection, connections, keyboard behavior, autosave conflicts, and documentation links.

## 10. Deferred beyond the first canvas release

- Real-time multiplayer cursors and collaborative editing.
- AI-generated or AI-refined diagrams.
- Full AWS, Azure, GCP, and Kubernetes icon catalogs.
- Import from Visio, draw.io, or other diagram formats.
- Freehand drawing and general-purpose illustration tools.
- Canvas comments, mentions, and review workflows.
- Version-to-version visual diagram comparison.
