# Archly V4 Portability: External Documentation Embeds

Status: Implementation complete locally — production deployment verification pending

Version: 4.0

Last updated: 2026-09-07

Parent: [V4 requirements](requirements_v4.md)

## 1. Objective

Users can render the same Archly diagram in external documentation, including
Notion, supported wikis, and Markdown documents. External rendering is read-only
and follows the latest successfully saved diagram. An explicit action opens the
diagram in Archly for editing, subject to authentication and existing edit access.

This document is the detailed source of truth for external embedding. It extends
V4 portability and existing read-only sharing; it does not replace full-project
backup/import requirements or require rebuilding working share authorization.

## 2. Agreed scope and behavior

- Interactive read-only embeds are used where a documentation platform supports
  external viewers. They support pan, zoom, and fit.
- Markdown uses an externally hosted diagram image linked to Archly.
- Both representations target the latest successfully saved version. Unsaved
  editor content is never published through an embed.
- Interactive viewers refresh automatically while open. Image freshness is
  subject to the destination's caching and image-proxy behavior.
- Viewing uses an explicitly enabled, revocable link: anyone possessing that
  link can view its diagram. A private documentation page does not independently
  protect a copied Archly embed link.
- Editing opens Archly in a separate tab and requires sign-in and existing edit
  permission. Possession of a viewing link does not grant editing rights.
- Pinned-version embeds, login-required private embeds, and automatic updates to
  third-party documentation content are not part of this initial scope.

## 3. User journey

1. An authorized project owner opens **Share → Embed in documentation**.
2. Archly explains that anyone with the link can view the diagram and that saved
   changes will automatically become visible through it.
3. The owner creates or selects an active read-only embed link, previews the
   result, and copies a Notion URL, supported wiki/iframe snippet, or Markdown
   image-and-link snippet.
4. A documentation reader sees the diagram without Archly editing controls or a
   mandatory sign-in for viewing.
5. Saving a diagram change updates the source served by the same embed URL.
6. The reader selects **Open in edit mode**. Archly opens separately, requests
   sign-in if needed, and enables editing only after checking project permission.
7. The owner can revoke the link; subsequent authorized-content requests through
   that link fail. Previously downloaded or third-party-cached images cannot be
   recalled.

## 4. Functional requirements

All requirements below are **Must** for this feature's release unless explicitly
deferred with an owner, rationale, and accepted limitation.

| ID | Requirement |
| --- | --- |
| V4-EMB-001 | Provide an owner-authorized publication action that creates a revocable read-only link for the project's diagram. Enabling external viewing is explicit; projects are not published automatically. |
| V4-EMB-002 | Provide a dedicated interactive embed viewer using the same durable diagram data and rendering semantics as Archly. Preserve supported nodes, edges, labels, icons, boundaries, styling, and managed images without exposing the editing workspace. |
| V4-EMB-003 | The viewer supports pan, zoom, fit, loading/error states, and responsive sizing. Pointer, touch, and keyboard interactions must not alter persisted project state. |
| V4-EMB-004 | Provide copyable destination-specific output: an embed URL for Notion, an iframe/embed snippet for verified supported wikis, and a Markdown image wrapped in a link to Archly. Clearly identify unsupported destination capabilities. |
| V4-EMB-005 | Serve a browser-compatible rendered image, with PNG as the baseline Markdown format, from a stable link-backed URL. Render using the same saved revision and visual semantics as the interactive viewer. |
| V4-EMB-006 | Both viewer and image endpoints resolve to the latest successfully saved diagram rather than a version pinned when the link was created. Failed saves, unsaved drafts, and incomplete revisions must never replace the published rendering. |
| V4-EMB-007 | An interactive viewer checks for newer revisions on initial load, when returning to an active tab, and periodically while visible. The initial target is checking at least every 30 seconds while visible, subject to browser scheduling; show the new revision without requiring the reader to replace the embed URL. |
| V4-EMB-008 | Render each refresh from one consistent saved revision. Preserve the reader's viewport when practical rather than resetting pan/zoom on every update. A failed refresh retains the last valid rendering with a visible stale/error state and retry action. |
| V4-EMB-009 | When Archly directly receives an image request, serve or generate the latest saved revision; revision-aware internal caching must not return an older revision as current. Publish appropriate revalidation headers, but do not promise that third-party proxies obey them or provide instant image updates. |
| V4-EMB-010 | Show concise guidance when copying Markdown: external image caching may delay updates, and opening the linked Archly viewer loads current saved content. Do not require manual URL replacement for ordinary saved changes. |
| V4-EMB-011 | Interactive embeds provide an Open in edit mode action that opens the canonical Archly project route in a separate tab. Preserve the destination through sign-in and check existing edit authorization before enabling mutation. |
| V4-EMB-012 | A signed-in reader without edit permission receives a clear access-denied/read-only outcome. Viewing tokens are never upgraded to editable tokens or accepted as authorization for project mutation. |
| V4-EMB-013 | Markdown snippets include an image link and an adjacent Open in Archly / edit link because plain images cannot provide native editor buttons. Both lead to an access-checked Archly route. |
| V4-EMB-014 | Owners can list and revoke embed links. The copy/preview UI clearly displays active/revoked state and explains that future saved diagram changes are exposed to link holders until revocation. |
| V4-EMB-015 | Use the current saved diagram/view represented by the publication configuration. Make that scope explicit in preview and keep it stable across unrelated editor navigation. If a referenced view is deleted or becomes invalid, show an unavailable state rather than silently exposing a different view. |
| V4-EMB-016 | Image and viewer rendering must support diagrams larger than the initial viewport without clipping off-screen elements. Embed dimensions affect presentation, not which diagram data is saved or shared. |

The 30-second check interval is an initial product target, not a guarantee of
instant propagation or a bound on third-party image caching. Measure render and
refresh latency in release verification and document any accepted limits.

## 5. Authorization, privacy, and lifecycle

| ID | Requirement |
| --- | --- |
| V4-EMB-SEC-001 | Every public viewer, revision-check, rendered-image, and asset request validates the active viewing link and its project scope. Apply existing expiration behavior where configured and reject revoked, expired, invalid, or deleted-project links. |
| V4-EMB-SEC-002 | Limit public responses to data necessary to render the selected diagram. Do not expose project documentation, private snapshots, unrelated views/modules, ownership identities, credentials, or share-management information. |
| V4-EMB-SEC-003 | Use high-entropy tokens stored securely, preferably reusing the existing hashed-token sharing implementation. Redact complete tokens from application/proxy logs, analytics, error reports, and referrer leakage. |
| V4-EMB-SEC-004 | Grant framing permission to the dedicated read-only embed route as needed for supported hosts. Preserve protections on authentication, administration, and editing routes; do not relax application-wide framing or cross-origin security indiscriminately. |
| V4-EMB-SEC-005 | Rate-limit public rendering and revision checks, bound diagram/image dimensions and processing time, and cache renders by authorized project revision without crossing permission boundaries. |
| V4-EMB-SEC-006 | After revocation, no new origin request returns diagram content through the revoked token. Active viewers clear the diagram when their next check reports revocation. Document that already viewed, downloaded, or externally cached copies cannot be withdrawn. |
| V4-EMB-SEC-007 | Managed images embedded in the diagram inherit the diagram's viewing authorization. Asset access must not reveal other project images or rely on the recipient's owner session. |
| V4-EMB-SEC-008 | The publication UI explicitly states that anyone with the embed link can view and that protection of the destination page does not protect a copied link. It must not imply organization-private access enforcement. |

## 6. Compatibility and accessible presentation

| Destination | Required initial experience | Limitation to communicate |
| --- | --- | --- |
| Notion | Paste an Archly embed URL and render a read-only viewer; verify web, desktop, and mobile behavior. | External embed compatibility must be tested; login-required external embeds have platform limitations. |
| Supported wiki | Interactive embed where the product/configuration allows it; otherwise Markdown/image-and-link fallback. | Wiki support is product- and configuration-specific, not universal. Name tested products and required settings/extensions. |
| Markdown renderer | Remote PNG image plus an ordinary Archly link, where remote images are supported. | Static Markdown cannot execute the viewer's refresh logic; proxies, caching, offline mode, and external-image restrictions can delay or prevent display. |

| ID | Requirement |
| --- | --- |
| V4-EMB-COMP-001 | Publish a tested compatibility matrix naming destination product, version/environment where applicable, embed method, setup, refresh behavior, and known limitations. Do not claim support for every wiki or Markdown renderer. |
| V4-EMB-COMP-002 | At minimum, verify Notion and a named Markdown host; select and verify the first named wiki before claiming wiki integration support. Provide a linked-image fallback when interactive embedding is unsupported. |
| V4-EMB-COMP-003 | Viewer controls have accessible names, visible focus, keyboard operation, and readable contrast. Markdown images include meaningful alternative text; the navigation link remains usable when images are disabled. |
| V4-EMB-COMP-004 | Clearly distinguish loading, unavailable/revoked, rendering failure, and temporarily stale content without disclosing private project existence through invalid links. |

## 7. Acceptance and verification

1. Publish a diagram, embed it, save a visible change, and verify the same viewer
   URL updates on its next successful scheduled check without manual republishing.
   Unsaved changes do not appear.
2. Verify that a new origin image request returns the latest saved revision.
   Separately record observed Markdown-host cache behavior without claiming it
   satisfies the interactive refresh interval.
3. Render nested containers, icons, labels, arrowheads, large off-screen content,
   and managed images; compare appearance with the saved Archly diagram.
4. Verify that embedded interactions and requests cannot create, modify, or delete
   project content. Test mutation attempts using only the viewing token.
5. Open editing as an authorized user, a signed-out user, and a signed-in user
   without permission. Only the authorized user can edit after authentication.
6. Revoke a link and verify the viewer, revision endpoint, image endpoint, and
   assets reject subsequent access. Verify the active viewer clears on its next
   check and that the UI explains third-party cached-copy limitations.
7. Verify no document content, private history, unrelated diagram views, secrets,
   or owner identity appears in public response payloads or telemetry.
8. Test saved-view deletion, failed refresh, render failure, offline recovery,
   image blocking, keyboard navigation, and narrow embed dimensions.
9. Record real destination integration results for the compatibility matrix in
   addition to automated API/viewer tests; local iframe tests alone are insufficient.

## 8. Dependencies and remaining implementation decisions

- Reuse existing sharing lifecycle and server-side authorization where suitable.
- Coordinate with V4 managed assets for safe external image delivery and with
  canonical serialization for consistent saved-revision rendering.
- Select the first wiki product and establish its integration method during
  implementation; no universal wiki support is assumed.
- Choose the rendering mechanism and caching policy after measuring fidelity,
  render latency, and cost. This does not change the agreed latest-saved behavior.
- Keep full-project backup exports separate from the minimal public embed payload.

## 9. Platform references

References checked on 2026-09-07; recheck during integration verification:

- [Notion: embeds, bookmarks, and link mentions](https://www.notion.com/help/embed-and-connect-other-apps) describes external embeds, source updates, and login limitations.
- [GitHub: anonymized image URLs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls?platform=linux) documents image proxy/cache behavior.
- [Confluence Cloud: Widget Connector](https://support.atlassian.com/confluence-cloud/docs/insert-the-widget-connector-macro/) describes platform-specific external-content integration.
