# Changelog

All notable changes to Archly are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning.

## [Unreleased]

### Added

- Conflict-aware project saving with local-draft recovery and explicit resolution actions.
- Persistent canvas groups, group duplication, and undo/redo coverage for canvas mutations.
- Architecture templates and project duplication.
- Rich architecture component catalog organized into General, AWS, Azure, and Google Cloud.
- Official or recognizable service icons for common AWS, Azure, Google Cloud, Kubernetes, Docker, Kafka, Redis, PostgreSQL, and Git components.
- General architecture components for monoliths, serverless functions, workers, scheduled jobs, data systems, messaging, networking, security, observability, and delivery pipelines.
- Gmail-only authentication validation and user-facing rejection responses.
- Rich-text sanitization for documents and safe-link protocol enforcement.
- V2 requirements document and updated V1 implementation statuses.

### Changed

- Consolidated generic components into one General catalog and removed redundant category tabs.
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
