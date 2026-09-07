# Archly AI Diagram Generation Requirements

Status: Draft

Version: 1.0

Last updated: 2026-09-04

This document is the source of truth for Archly's user-configured LLM providers,
natural-language diagram generation, iterative refinement, credential security,
cost control, quality, testing, and operations. It is a separately approved
expansion to the V3 scope.

Priorities are **Must**, **Should**, and **Could**. Must requirements block a
production release unless explicitly deferred with an accepted, documented risk.

## 1. Credential security and lifecycle

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-SEC-001 | Must | Personal provider credentials are encrypted at rest with authenticated encryption and are never returned by an API, written to logs, analytics, traces, errors, or client storage. |
| AI-SEC-002 | Must | Ciphertext is bound to the user identity and provider using authenticated additional data so records cannot be exchanged between users. |
| AI-SEC-003 | Must | Encrypted records store a key version; the service supports current and previous decryption keys and an auditable re-encryption workflow. |
| AI-SEC-004 | Must | Encryption keys are stored in Google Secret Manager, injected into Cloud Run with least privilege, backed up securely, and never stored in repository or GitHub variables. |
| AI-SEC-005 | Must | Deployment fails before serving traffic when required credential encryption configuration is missing or malformed. |
| AI-SEC-006 | Must | Documented and tested procedures cover encryption-key creation, backup, rotation, re-encryption, rollback, loss, incident response, and credential revocation. |
| AI-SEC-007 | Must | Users can replace and delete their credential; deleted users' credentials are removed according to the account-retention policy. |
| AI-SEC-008 | Must | Database constraints enforce supported providers, bounded model names, non-empty ciphertext, unique ownership, and valid timestamps. |
| AI-SEC-009 | Should | Users can choose encrypted persistent storage or session-only credentials that disappear at logout. |
| AI-SEC-010 | Should | Credential-change audit events record configuration, replacement, removal, and actor identity without secret values. |
| AI-SEC-011 | Must | Custom provider endpoints remain administrator-controlled unless the dedicated SSRF controls in AI-PROV-006 are implemented. |
| AI-SEC-012 | Must | Automated secret-leak regression tests scan API payloads, serialized entities, logs, traces, and error bodies. |

## 2. Provider configuration and profile experience

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-PROF-001 | Must | Profile settings provide provider, model, credential status, save, replace, and remove controls. |
| AI-PROF-002 | Must | Settings display only safe metadata: configured status, last four characters where supported, update time, last successful use, and sanitized last error. |
| AI-PROF-003 | Must | Users can test a provider connection and model before or while saving configuration. |
| AI-PROF-004 | Must | Loading, testing, saving, saved, replacing, removing, unavailable, and failure states are distinct and accurately labelled. |
| AI-PROF-005 | Must | Removing a credential requires confirmation and generation becomes unavailable immediately after removal. |
| AI-PROF-006 | Should | Newly entered credentials have a show/hide control; an already stored credential can never be revealed. |
| AI-PROF-007 | Must | The settings experience is a dedicated responsive dialog or page rather than an oversized menu and contains Profile, Appearance, AI Provider, Privacy and Usage, and Account Security sections as applicable. |
| AI-PROF-008 | Must | Forms provide correct dialog/form semantics, labels, descriptions, field-associated errors, focus trapping, Escape handling, keyboard operation, and screen-reader announcements. |
| AI-PROF-009 | Should | Configuration changes in another tab invalidate and refresh cached settings. |
| AI-PROF-010 | Must | Attempting generation without configuration offers a direct action to open AI Provider settings. |

## 3. Provider architecture and compatibility

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-PROV-001 | Must | Diagram generation depends on a provider-neutral interface; provider transport and response parsing do not leak into canvas conversion. |
| AI-PROV-002 | Must | OpenAI Responses API remains a supported provider with structured output and response storage disabled. |
| AI-PROV-003 | Should | Azure OpenAI, Google Gemini, Anthropic, Ollama/local models, and approved OpenAI-compatible gateways can be added through isolated adapters. |
| AI-PROV-004 | Should | Provider-specific settings support organization, project, deployment, API version, and other required metadata with appropriate secret classification. |
| AI-PROV-005 | Should | Model discovery is used where supported; otherwise the UI validates bounded model identifiers and administrators can restrict allowed models. |
| AI-PROV-006 | Must | Any user-selectable custom endpoint requires HTTPS, redirect blocking, DNS and resolved-address validation, private/loopback/link-local blocking, an administrator allowlist, and validation on every request. |
| AI-PROV-007 | Must | Provider authentication, invalid model, quota, throttling, timeout, outage, refusal, incomplete response, and malformed output are mapped to distinct safe application errors. |

## 4. Request reliability and cost control

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-REL-001 | Must | Provider clients enforce bounded connection and response timeouts plus a strict end-to-end provider-call deadline, including all retries and repair attempts, shorter than the upstream browser timeout. |
| AI-REL-002 | Must | Input characters, input tokens, output tokens, node count, edge count, response bytes, and generation duration have enforced limits. |
| AI-REL-003 | Must | A distributed rate limiter applies configurable per-user and system-wide throughput limits consistently across Cloud Run instances and deployments. |
| AI-REL-004 | Must | Administrators can configure per-user and system-wide requests per minute/day, monthly token or cost budgets, maximum diagram size, and an emergency generation disable switch. |
| AI-REL-005 | Must | Transient timeouts, selected 5xx responses, and throttling receive bounded exponential-backoff retries with jitter; `Retry-After` is honored within the total deadline, while authentication and validation errors are never retried. |
| AI-REL-006 | Must | Closing or cancelling generation aborts the browser request, backend work, and active upstream provider call; cancellation releases resources and does not continue consuming provider tokens where the provider transport supports termination. |
| AI-REL-007 | Must | Idempotency prevents duplicate provider calls caused by double-clicks, reconnection, retry, or simultaneous requests, stores the bounded completed result, and replays that result for the same authenticated user and request fingerprint. |
| AI-REL-008 | Should | One bounded structured-response repair attempt may run before a malformed result is rejected. |
| AI-REL-009 | Must | Provider degradation never prevents non-AI project editing and communicates a clear recoverable state. |
| AI-REL-010 | Must | Token-cost estimation uses administrator-configurable, model-specific input, cached-input, and output pricing rather than fixed global rates; unknown models are rejected or use an explicitly configured fallback. |

## 5. Generation workflow and data safety

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-UX-001 | Must | Generated diagrams are previewed before mutation with summary, node count, edge count, Replace, Insert/Merge, and Cancel actions. |
| AI-UX-002 | Must | Replacing or merging a generated diagram is one undoable editor-history action. |
| AI-UX-003 | Must | A non-empty or unsaved diagram receives explicit replacement confirmation and is never silently destroyed. |
| AI-UX-004 | Must | The generated summary is shown and can be inserted into project documentation rather than being discarded. |
| AI-UX-005 | Should | Users can replace the canvas, insert generated components, merge with the existing architecture, or generate only a selected subsystem. |
| AI-UX-006 | Should | Iterative prompts can add, remove, replace, secure, scale, explain, or reorganize the current diagram using a bounded canonical diagram representation. |
| AI-UX-007 | Should | Users may explicitly include project documentation as generation context and can see what content will be sent. |
| AI-UX-008 | Should | Prompt history is user-controlled, bounded, removable, and disabled when requested. |

## 6. Diagram quality and architecture intelligence

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-QUAL-001 | Must | Structured output is validated before conversion and cannot introduce unsupported node, edge, identifier, position, or style values. |
| AI-QUAL-002 | Should | Generation can select from Archly's complete supported component and icon catalogue, including cloud, Kubernetes, data, messaging, observability, and AI components. |
| AI-QUAL-003 | Should | Generated diagrams support regions, accounts, VPCs, clusters, availability zones, architectural layers, containers, and trust boundaries. |
| AI-QUAL-004 | Must | Automatic layout uses the supported layout engine to respect flow direction, hierarchy, label size, container membership, spacing, and minimal edge crossings instead of a fixed square grid. |
| AI-QUAL-005 | Should | Generated connections express direction, label, protocol, synchronous/asynchronous semantics, event name, security classification, and routing where justified. |
| AI-QUAL-006 | Should | Architecture presets cover web applications, event-driven systems, data pipelines, microservices, AI/RAG, Kubernetes, multi-region, zero-trust, and C4 levels. |
| AI-QUAL-007 | Should | Guided prompts collect cloud provider, scale, regions, availability, compliance, data sensitivity, technologies, and cost priority without requiring expert prompt writing. |
| AI-QUAL-008 | Should | Post-generation analysis identifies orphaned components, missing persistence/authentication/observability, single points of failure, unsafe traffic, unbounded queues, and cross-region data risks. |

## 7. Privacy, analytics, and administration

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-ADM-001 | Must | Privacy documentation explains exactly what prompts, diagrams, and documentation are sent, retention behavior, provider storage settings, credential handling, and deletion controls. |
| AI-ADM-002 | Must | Safe metrics record provider, model, end-to-end latency, provider latency, retry count, throttling, timeout, outcome category, token counts, generated element counts, and estimated cost without prompts, credentials, responses, or project content by default. |
| AI-ADM-003 | Must | Administrator controls cover feature enablement, allowed providers/models, default model, limits, prompt and diagram bounds, budgets, and aggregate usage. |
| AI-ADM-004 | Must | Provider dashboards show latency, errors, retries, timeouts, throttling, token and cost usage, and per-model trends without exposing prompts, project content, or personal credentials. |
| AI-ADM-005 | Must | Production smoke tests verify encryption configuration, profile save, masked reads, successful generation, credential removal, and secret-free logs. |
| AI-ADM-006 | Must | Budget thresholds, provider errors, timeout rates, throttling, and unusual generation traffic trigger configurable external alerts through an approved operations channel; dashboard-only warnings are insufficient. |

## 8. Verification requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| AI-TST-001 | Must | Cipher tests cover round trips, randomized ciphertext, missing/invalid keys, corrupted ciphertext, authenticated context, key versions, and rotation. |
| AI-TST-002 | Must | Settings integration tests cover authentication, ownership isolation, validation, create, read-mask, model-only update, key replacement, deletion, and persistence. |
| AI-TST-003 | Must | Provider contract tests verify authorization, selected model, structured schema, storage disabled, output limits, extraction, refusal, incomplete output, malformed output, and error mapping. |
| AI-TST-004 | Must | Frontend tests cover every profile state, test connection, initial save, model update, key replacement/removal, missing server encryption, validation, errors, and keyboard navigation. |
| AI-TST-005 | Must | End-to-end tests cover configure → generate → preview → apply → undo → autosave → refresh and prove an existing diagram cannot be silently lost. |
| AI-TST-006 | Must | Cross-owner tests prove a user cannot read, mutate, delete, or use another user's settings or credential. |
| AI-TST-007 | Must | Flyway and repository tests run against supported PostgreSQL through Testcontainers in addition to fast local tests. |
| AI-TST-008 | Must | CI blocks release on AI unit, integration, contract, end-to-end, accessibility, secret-leak, dependency, and migration failures. |
| AI-TST-009 | Must | Provider contract tests cover every safe error mapping, including invalid credentials, invalid models, quota exhaustion, throttling, timeout, refusal, incomplete response, malformed response, repair failure, and provider outage. |
| AI-TST-010 | Must | Security tests prove credential ownership isolation and cover corrupted ciphertext, missing key versions, rotation failure and recovery, authenticated-context mismatch, and production startup rejection for missing, invalid, or non-Secret-Manager encryption configuration. |
| AI-TST-011 | Must | A staging release gate runs live smoke tests against OpenAI, Google Secret Manager, and Cloud Run, including generation, request cancellation, account deletion, key rotation, backup recovery, and secret-free operational telemetry. |
| AI-TST-012 | Must | Staging load tests exercise configured per-user and system-wide throughput, simultaneous idempotent requests, retry behavior, budget enforcement, cancellation, and recovery under expected and peak concurrency. |

## 9. Delivery sequence

1. Production secret management, key versioning/rotation, timeouts, safe errors,
   distributed limits, credential tests, and deployment checks.
2. Dedicated accessible settings, test connection, safe credential metadata,
   confirmation, and unconfigured-user routing.
3. Preview, undo, replacement protection, summary use, cancellation, and safe
   usage metrics.
4. Improved layout, full component catalogue, regions, rich connections,
   presets, guided prompts, and architecture validation.
5. Merge/refinement workflows, optional document context, provider adapters,
   model discovery, administration, and advanced budgets.

## 10. Release acceptance criteria

The feature is production-ready only when all Must requirements above pass and:

1. No credential can be recovered from client state, API reads, logs, traces,
   analytics, backups without decryption authority, or another user's account.
2. Encryption keys can be rotated without losing saved credentials.
3. Provider calls have bounded time, tokens, cost, retries, and distributed rate.
4. Users can test configuration, preview results, apply or cancel safely, undo an
   application, remove credentials, and continue using Archly during outages.
5. Generated diagrams use valid Archly data, pass layout and persistence checks,
   and never silently replace existing work.
6. PostgreSQL migration, provider contracts, ownership isolation, accessibility,
   secret-leak, end-to-end, and production smoke suites pass.
7. Staging proves live OpenAI cancellation and deadlines, Google Secret Manager
   rotation/recovery, Cloud Run concurrency, account-deletion cleanup, external
   alerts, and expected/peak load behavior before production promotion.

## 11. Explicitly deferred unless approved

- Autonomous provider tools, web browsing, code execution, or external actions.
- Training or fine-tuning on private Archly projects.
- Organization-wide shared credentials without a separate authorization model.
- Arbitrary user-provided provider URLs without AI-PROV-006.
- Automatic diagram changes without preview and explicit user application.
