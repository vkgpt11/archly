# Archly V3 Diagram-as-Code Requirements

Status: Five feature implementations complete locally; release verification pending

Version: 3.0

Last updated: 2026-09-03

Parent roadmap: [Archly V3 requirements](requirements-v3.md)

User guide: [Diagram as code](diagram-as-code.md)

## 1. Objective and current baseline

This document is the implementation-ready specification for the remaining
diagram-as-code roadmap. The objective is to evolve Archly's architecture DSL
from a text-to-canvas feature into a reusable, analyzable, interoperable
architecture modelling system.

The first roadmap requirement, bidirectional editing, was completed in commit
`6911d4b`. Canvas additions, deletions, moves, renames, connections, and styling
changes update the source. Code-driven rendering preserves the user's exact
source until a subsequent visual mutation, and `position` directives preserve
node coordinates. The requirements below cover roadmap items 2 through 14.

Priorities are **Must**, **Should**, and **Could**. A Must requirement blocks
completion of its roadmap item unless it is explicitly deferred with an
accepted risk.

## 2. Reusable groups and templates

Implementation status: **Partial**. The local implementation now supports
template declarations, required/defaulted named string parameters, deterministic
instance namespaces, nested calls, recursion and expansion limits, and
definition/call-site diagnostics (TPL-001 through TPL-005). The editor can insert
a working example. Changing template source and drawing updates its instances.
Selection extraction, a managed library, and preserving linked template calls
after visual canvas edits remain outstanding. This status is not a production
deployment claim.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-TPL-001 | Must | The DSL supports named templates containing components, nested boundaries, connections, styles, and template calls. |
| V3-DAC-TPL-002 | Must | A template declares typed or string parameters and a call supplies validated values or documented defaults. |
| V3-DAC-TPL-003 | Must | Every template expansion generates deterministic, collision-free component and connection identifiers. |
| V3-DAC-TPL-004 | Must | Template calls may be nested, but direct or indirect recursive expansion is rejected with the complete call chain. |
| V3-DAC-TPL-005 | Must | Parser errors identify the source line of both the invalid template declaration and the failing call when applicable. |
| V3-DAC-TPL-006 | Should | Users can extract selected canvas content into a template and insert an existing template from the editor. |
| V3-DAC-TPL-007 | Should | Editing a template definition updates its instances without discarding instance-level parameter values. |
| V3-DAC-TPL-008 | Could | A maintained project template library exposes previews, categories, version information, and compatibility metadata. |

## 3. Environment variants

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-ENV-001 | Must | A source file can define a base architecture and named variants such as development, staging, and production. |
| V3-DAC-ENV-002 | Must | A variant can override component type, label, icon, style, metadata, replica count, and connection properties without duplicating the base definition. |
| V3-DAC-ENV-003 | Must | A variant can add or remove components and connections explicitly. |
| V3-DAC-ENV-004 | Must | The editor provides an accessible variant selector and clearly identifies the active variant on the canvas and in exports. |
| V3-DAC-ENV-005 | Must | Saving and reopening a project preserves every variant and the last active variant. |
| V3-DAC-ENV-006 | Must | An invalid override or reference reports its variant and exact source line while retaining the last valid rendering. |
| V3-DAC-ENV-007 | Should | Users can compare two variants visually using the version-comparison capability in Section 12. |

## 4. Rich styling

Implementation status: **Done — Must requirements STY-001–005**, plus reusable
classes (STY-006). Tested in `diagramAdvanced.test.ts` and the advanced browser
journey. Theme-token/automatic contrast support (STY-007) remains a follow-up;
explicit colours are preserved, not automatically contrast-corrected.

Existing fill, border, text colour, description, dashed-line, and routing
directives are the baseline for this section.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-STY-001 | Must | The DSL supports block-style declarations in addition to the existing single-line syntax without breaking stored source. |
| V3-DAC-STY-002 | Must | Component styles support fill, border colour, border width, text colour, icon, shape, opacity, and documented size constraints. |
| V3-DAC-STY-003 | Must | Connection styles support colour, width, solid/dashed/dotted patterns, routing, start marker, and end marker. |
| V3-DAC-STY-004 | Must | Style values are validated against allowlisted formats and safe numeric ranges before rendering. |
| V3-DAC-STY-005 | Must | Visual styling changes round-trip between canvas and source without losing supported values. |
| V3-DAC-STY-006 | Should | Named style classes can be reused by multiple components or connections, with explicit local values taking precedence. |
| V3-DAC-STY-007 | Should | Theme-aware values remain legible in light and dark themes and in SVG and PNG exports. |

## 5. Automatic layout controls

Implementation status: **Done — LAY-001–008**. Deterministic four-direction
layout, spacing/routing DSL, explicit-position precedence, nested containment,
scoped preview/cancel/apply and undo integration are implemented. Covered by
`diagramAdvanced.test.ts`, `DiagramLayoutPanel.test.tsx` and browser tests.

Existing `direction right` and `direction down` directives are the baseline for
this section.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-LAY-001 | Must | The DSL supports a layout block containing direction, horizontal spacing, vertical spacing, rank separation, and routing strategy. |
| V3-DAC-LAY-002 | Must | Supported directions include right, left, down, and up. |
| V3-DAC-LAY-003 | Must | Routing options include straight, curved, smooth-step, and orthogonal where the renderer supports them. |
| V3-DAC-LAY-004 | Must | The same valid source and layout-engine version produce deterministic positions. |
| V3-DAC-LAY-005 | Must | Explicit `position` directives take documented precedence over automatic layout and are not silently discarded. |
| V3-DAC-LAY-006 | Must | Layout applies correctly inside nested regions and containers without placing descendants outside their owning boundary. |
| V3-DAC-LAY-007 | Should | Users can re-run layout for the whole canvas, a boundary, or the current selection. |
| V3-DAC-LAY-008 | Should | A layout preview can be accepted or cancelled as one undoable operation. |

## 6. Cloud and platform boundaries

Implementation status: **Done — Must requirements BND-001–005**. Semantic
boundary types, provider inheritance/validation, persistence, descendant-aware
move/delete and fitting are implemented. Provider-specific appearance defaults
(BND-006) and architecture-rule integration (BND-007) remain follow-ups.

Generic nested regions and containers are the baseline. The remaining work adds
explicit architectural semantics.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-BND-001 | Must | The DSL has first-class boundary types for cloud account/subscription/project, region, availability zone, VPC/VNet, subnet, Kubernetes cluster, and namespace. |
| V3-DAC-BND-002 | Must | Boundary nesting rules are validated, including provider-specific parent-child constraints where they are unambiguous. |
| V3-DAC-BND-003 | Must | Every boundary retains semantic type, provider, identifier, label, and parent membership through code/canvas round-trips and persistence. |
| V3-DAC-BND-004 | Must | Moving or deleting a boundary handles all descendants predictably and as one undoable action. |
| V3-DAC-BND-005 | Must | Boundaries resize to contain descendants while respecting explicit minimum size and padding. |
| V3-DAC-BND-006 | Should | Provider-aware defaults supply recognizable labels and appearance without preventing custom styling. |
| V3-DAC-BND-007 | Should | Architecture rules can query boundary semantics, for example to detect a public database or cross-region dependency. |

## 7. Connection semantics

Implementation status: **Done — Must requirements CON-001–005**. Named stable
connection IDs, validated metadata, inspector editing and durable serialization
are implemented. Optional metadata badges (CON-006) and architecture-rule
integration (CON-007) remain follow-ups.

Existing labels, explicit ports, colour, line style, and routing are the
baseline for this section.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-CON-001 | Must | Connections support protocol, port or port range, synchronous/asynchronous mode, encryption state, direction, and free-text description. |
| V3-DAC-CON-002 | Must | Connection metadata is editable from both source and the properties inspector and round-trips without loss. |
| V3-DAC-CON-003 | Must | Protocol, port, encryption, and async values use validated enums or bounded formats and report line-specific errors. |
| V3-DAC-CON-004 | Must | Multiple connections between the same component pair retain separate stable identities and metadata. |
| V3-DAC-CON-005 | Must | Connection metadata survives reconnection, duplication, grouping, save/reload, snapshots, and export. |
| V3-DAC-CON-006 | Should | The canvas can optionally display selected metadata as compact connection badges or labels. |
| V3-DAC-CON-007 | Should | Architecture rules can inspect connection metadata, including TLS, public exposure, and asynchronous-boundary policies. |

## 8. Variables and imports

String variables within one source file already exist. The remaining work adds
safe composition across sources.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-IMP-001 | Must | Variables support documented string, number, boolean, colour, and list values with type-safe substitution. |
| V3-DAC-IMP-002 | Must | The DSL supports imports from project-owned diagram modules using stable project-relative identifiers rather than arbitrary filesystem paths. |
| V3-DAC-IMP-003 | Must | Imports can expose selected templates, variables, styles, and component contracts while keeping unexported declarations private. |
| V3-DAC-IMP-004 | Must | Missing imports, duplicate symbols, incompatible versions, and import cycles produce actionable errors with the full dependency chain. |
| V3-DAC-IMP-005 | Must | Imported content is authorized with the same project ownership and sharing rules as other project data. |
| V3-DAC-IMP-006 | Must | External network URLs and local filesystem traversal are rejected unless a future explicitly secured import policy allows them. |
| V3-DAC-IMP-007 | Should | The editor offers go-to-definition and reference discovery across imported project modules. |
| V3-DAC-IMP-008 | Should | A project records the exact compatible module version used for reproducible rendering. |

## 9. Sequence and data-flow views

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-VIEW-001 | Must | A project can define multiple named views over a shared component model without duplicating component definitions. |
| V3-DAC-VIEW-002 | Must | A data-flow view can include or exclude components and connections and can annotate data classification, store, processing step, and trust boundary. |
| V3-DAC-VIEW-003 | Must | A sequence view supports participants, ordered messages, return messages, synchronous/asynchronous calls, activation, notes, and grouped alternatives. |
| V3-DAC-VIEW-004 | Must | Renaming a shared symbol updates or safely refactors references in every view. |
| V3-DAC-VIEW-005 | Must | Each view retains an independent layout and viewport while sharing semantic component metadata. |
| V3-DAC-VIEW-006 | Must | Invalid cross-view references identify both the declaration and referencing view and preserve the last valid render. |
| V3-DAC-VIEW-007 | Should | Users can create a derived view from the current selection or from rule-based filters. |
| V3-DAC-VIEW-008 | Should | Exports identify the view name and active environment variant. |

## 10. Validation and architecture rules

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-RUL-001 | Must | The DSL supports built-in architecture rules with documented identifiers, severity, scope, and configuration. |
| V3-DAC-RUL-002 | Must | Initial rules include no-public-database, services-must-use-tls, no-cross-boundary-connection-without-encryption, and no-orphan-component. |
| V3-DAC-RUL-003 | Must | Rule violations appear in an accessible problems panel, on the relevant source range, and on affected canvas elements. |
| V3-DAC-RUL-004 | Must | A violation contains rule ID, severity, message, affected symbols, source location, and remediation guidance. |
| V3-DAC-RUL-005 | Must | Validation runs after a bounded debounce and cannot replace or corrupt the last valid canvas. |
| V3-DAC-RUL-006 | Must | Projects can configure rule severity or an explicit, documented suppression with a reason. |
| V3-DAC-RUL-007 | Must | CI can validate exported source headlessly and return a non-zero status for configured blocking violations. |
| V3-DAC-RUL-008 | Should | Safe deterministic corrections are exposed as editor quick fixes and one undoable canvas operation. |
| V3-DAC-RUL-009 | Could | Administrators can publish versioned organization rule packs without accessing project contents. |

## 11. Code intelligence

Existing line numbers, searchable component reference, component insertion, and
line-specific parser errors are the baseline for this section.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-IDE-001 | Must | The diagram editor provides syntax highlighting for keywords, identifiers, strings, numbers, comments, properties, and invalid tokens. |
| V3-DAC-IDE-002 | Must | Context-aware autocomplete suggests valid declarations, component shorthands, symbols, properties, enum values, templates, and imports. |
| V3-DAC-IDE-003 | Must | Hover information describes symbols and properties and shows resolved component or template metadata. |
| V3-DAC-IDE-004 | Must | Go-to-definition and find-references work for components, templates, variables, styles, views, and imported symbols. |
| V3-DAC-IDE-005 | Must | Rename-symbol updates valid references atomically and does not alter matching text in comments or string values. |
| V3-DAC-IDE-006 | Must | Format-document and format-selection produce deterministic output while preserving comments. |
| V3-DAC-IDE-007 | Must | Diagnostics and quick fixes are keyboard accessible and remain responsive on the documented large-source target. |
| V3-DAC-IDE-008 | Should | Bracket matching, folding, indentation, comment toggling, and multi-cursor editing use familiar platform shortcuts. |
| V3-DAC-IDE-009 | Should | The editor exposes a command palette for diagram-language actions. |

## 12. Visual version comparison

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-DIF-001 | Must | Users can compare the current diagram with a named snapshot or project revision without modifying either version. |
| V3-DAC-DIF-002 | Must | The comparison identifies added, removed, moved, renamed, restyled, reparented, and metadata-changed components and connections. |
| V3-DAC-DIF-003 | Must | Source comparison and canvas comparison use stable semantic identities so movement is not misreported as deletion and addition. |
| V3-DAC-DIF-004 | Must | The UI provides an accessible change list linked bidirectionally to highlighted source and canvas elements. |
| V3-DAC-DIF-005 | Must | Colours are supplemented with labels, icons, or patterns so comparison does not rely on colour alone. |
| V3-DAC-DIF-006 | Must | Large comparisons are bounded, cancellable, and do not mutate autosave state. |
| V3-DAC-DIF-007 | Should | Users can filter by change type, component type, boundary, and severity of affected validation rules. |
| V3-DAC-DIF-008 | Could | A comparison can be exported as a read-only report with source revision identifiers. |

## 13. Infrastructure import

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-INF-001 | Must | Archly imports supported Terraform plan/state JSON, Kubernetes YAML, AWS CloudFormation, and OpenAPI documents into a reviewable intermediate model. |
| V3-DAC-INF-002 | Must | Import is preview-first: users review detected resources, relationships, warnings, and unsupported constructs before changing a project. |
| V3-DAC-INF-003 | Must | Users can create a new diagram or merge into an existing diagram with an explicit conflict-resolution strategy. |
| V3-DAC-INF-004 | Must | Imported resources receive deterministic provenance identities so a repeated import updates matches instead of creating duplicates. |
| V3-DAC-INF-005 | Must | Import never evaluates Terraform, executes templates, contacts declared endpoints, or applies infrastructure changes. |
| V3-DAC-INF-006 | Must | Secret values, credentials, Kubernetes Secrets, and provider-sensitive fields are redacted before persistence, logs, diagnostics, and analytics. |
| V3-DAC-INF-007 | Must | File type, size, nesting, document count, and processing time are bounded; malformed input fails safely without changing the project. |
| V3-DAC-INF-008 | Must | The import result reports mapped, ignored, unsupported, and redacted constructs. |
| V3-DAC-INF-009 | Should | Users can save mapping choices for repeat imports within the same project. |
| V3-DAC-INF-010 | Should | Import adapters are versioned and covered by sanitized fixture-based compatibility tests. |

## 14. Export compatibility

Implementation status: **Done — Must requirements EXP-001–007**, plus
copy/download (EXP-008), for the documented subset in the user guide. Text
exports preserve all durable data in embedded metadata, with a pre-download
loss warning. Tests recover this metadata without loss; native destination
syntax is not an Archly import format (EXP-009 remains unimplemented).

Independent local conformance checks on 2026-09-03: Mermaid 11.17.2 parser,
PlantUML 1.2026.7 syntax checker, and D2 0.8.2 SVG compiler accepted a generated
fixture covering nested boundaries, custom fill, Unicode/escaped labels,
parallel connections and directed/bidirectional/undirected connections.

Verification for this five-feature batch: **171 unit/component tests passed;
10 Playwright journeys passed; lint and production build passed**. Browser
coverage includes preview/cancel, saved source reopening, metadata exports,
SVG/PNG, and the existing 300-node/500-edge performance fixture. This is local
implementation completion, not production deployment approval. GCP deployment,
production smoke testing, and release vulnerability review remain outstanding.

Existing SVG and PNG canvas exports are the baseline for this section.

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-EXP-001 | Must | Archly exports the active view to Mermaid, PlantUML, and D2 using valid syntax for the documented supported subset. |
| V3-DAC-EXP-002 | Must | Export reports unsupported or lossy constructs before download and never silently drops semantic metadata. |
| V3-DAC-EXP-003 | Must | Stable component identities, labels, boundaries, connections, and supported styles are preserved where the destination format permits them. |
| V3-DAC-EXP-004 | Must | Archly provides a documented metadata export containing component, boundary, connection, environment, provenance, and validation information suitable for infrastructure tooling. |
| V3-DAC-EXP-005 | Must | Exported text uses UTF-8, deterministic ordering, stable line endings, and safe escaping. |
| V3-DAC-EXP-006 | Must | Export is generated locally when possible; server-side export enforces project authorization and does not retain content beyond the request. |
| V3-DAC-EXP-007 | Must | Round-trip compatibility tests cover every supported destination construct and explicitly document non-round-trippable features. |
| V3-DAC-EXP-008 | Should | Users can copy textual exports to the clipboard or download them with a format-appropriate extension. |
| V3-DAC-EXP-009 | Could | Archly can import its own exported Mermaid, PlantUML, or D2 supported subset after the corresponding parser is approved. |

## 15. Cross-cutting quality requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| V3-DAC-QA-001 | Must | New syntax is backward compatible with saved diagram source or is introduced with an explicit, tested migration. |
| V3-DAC-QA-002 | Must | Parse, format, validate, import, and export failures preserve the last valid source, canvas, and persisted project revision. |
| V3-DAC-QA-003 | Must | Every parser diagnostic contains a stable code, severity, message, and precise source range. |
| V3-DAC-QA-004 | Must | Canvas and source changes participate correctly in Undo and Redo and autosave only semantic changes. |
| V3-DAC-QA-005 | Must | Unit tests cover grammar and semantic validation; component tests cover editor/canvas synchronization; Playwright tests cover save/reload and primary keyboard journeys. |
| V3-DAC-QA-006 | Must | Security tests cover malicious imports, path traversal, oversized input, unsafe URLs, secret redaction, and cross-owner access. |
| V3-DAC-QA-007 | Must | The supported large-source fixture remains responsive and meets the canvas performance target without unbounded recursion or memory growth. |
| V3-DAC-QA-008 | Must | All controls, diagnostics, comparisons, and canvas annotations meet keyboard, focus, screen-reader, contrast, and non-colour accessibility requirements. |
| V3-DAC-QA-009 | Must | User documentation and the in-editor reference are updated in the same change as each grammar addition. |
| V3-DAC-QA-010 | Must | Production deployment requires passing lint, unit/component tests, Playwright journeys, backend verification when applicable, build, vulnerability checks, and the documented production smoke test. |

## 16. Recommended implementation order

1. Code intelligence foundation and a versioned parser/AST.
2. Rich styling and automatic layout controls.
3. Cloud and platform boundary semantics.
4. Connection semantics.
5. Reusable templates, typed variables, and project-owned imports.
6. Environment variants.
7. Architecture validation rules.
8. Multiple sequence and data-flow views.
9. Visual version comparison.
10. Infrastructure import.
11. Mermaid, PlantUML, D2, and metadata export compatibility.

Each stage must satisfy the applicable cross-cutting requirements before the
next stage is considered complete.

## 17. Completion definition

The remaining diagram-as-code roadmap is complete only when requirements 2
through 14 have implemented user paths, automated regression coverage,
documentation, save/reload compatibility, and successful production smoke-test
evidence. A partially implemented baseline called out in this document does not
by itself complete that roadmap item.
