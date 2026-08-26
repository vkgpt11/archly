# Changelog

All notable changes to Archly are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning.

## [Unreleased]

### Added

- Added dashboard search, folder filtering, archive/restore, and recently used canvas components.
- Added token-hashed read-only and editable share links with anonymous viewing, server-side permission enforcement, listing, and revocation.
- Added PNG, SVG, Markdown, editable Archly JSON, selection-only, and clipboard diagram exports.
- Completed core canvas interactions: keyboard nudging, persistent container ownership and child movement, and front/back ordering.
- Added undo/redo coverage for the new interactions and expanded canvas interaction tests.
- Completed the remaining V1 canvas requirements with custom components, library drag-and-drop, full component and connection inspectors, contextual selection actions, bulk locking, configurable grid and snapping, six-mode alignment, and persisted viewport state.
- Conflict-aware project saving with local-draft recovery and explicit resolution actions.
- Isolated recovery drafts per browser tab, cross-tab save notifications, clean-tab refresh, and proactive conflict detection that preserves both local and server versions.
- Suppressed autosave for selection-only and viewport-only changes while retaining the latest viewport whenever real content is saved.
- Persistent canvas groups, group duplication, and undo/redo coverage for canvas mutations.
- Architecture templates and project duplication.
- Rich architecture component catalog organized into General, AWS, Azure, and Google Cloud.
- Official or recognizable service icons for common AWS, Azure, Google Cloud, Kubernetes, Docker, Kafka, Redis, PostgreSQL, and Git components.
- General architecture components for monoliths, serverless functions, workers, scheduled jobs, data systems, messaging, networking, security, observability, and delivery pipelines.
- Branded CI/CD, GitOps, infrastructure automation, observability, and incident-response components for DevOps and SRE workflows.
- Communication components for email, SMS, push, webhooks, Slack, Teams, Outlook, Gmail, Twilio, SendGrid, and Discord with recognizable icons.
- Dedicated AI / ML catalog covering architecture concepts, model providers, agent frameworks, vector data, inference runtimes, observability, and cloud-native AI services.
- Screenshot paste, file-picker insertion, and direct image resizing in rich-text documentation with safe inline-image sanitization.
- Gmail-only authentication validation and user-facing rejection responses.
- Rich-text sanitization for documents and safe-link protocol enforcement.
- V2 requirements document and updated V1 implementation statuses.

### Changed

- Consolidated generic components into one General catalog and removed redundant category tabs.
- Organized General components into collapsible architecture groups with a compact icon-grid layout.
- Moved DevOps and SRE tooling into a dedicated Operations - CD/CI catalog category.
- Replaced ambiguous Database, File storage, and Queue / Event bus entries with explicit architecture concepts.
- Renamed Kubernetes to Kubernetes Cluster and assigned unique, persistent icon identifiers throughout the catalog.
- Prevented selection-only canvas changes from creating project revisions.

### Fixed

- Restored reliable connection selection, endpoint reconnection, and canvas history behavior.
- Preserved component title sizing and icon layout through editing, locking, undo, and redo.
- Prevented stale saves from silently overwriting newer project revisions.

### Security

- Rejects non-personal Gmail, unverified-email, malformed-domain, and incomplete identity claims server-side.
- Removes unsafe rich-text attributes and blocks executable link protocols after paste, save, and reload.
