# AI reliability and cost controls

Implementation: 2026-09-09. This addresses priority 2's five audited gaps:
overall deadlines, retry policy, duplicate-result replay, configurable pricing,
and complete repair usage accounting.

## Request lifecycle

`ARCHLY_AI_OVERALL_TIMEOUT` defaults to 50 seconds and must be positive and no
greater than 50 seconds. The browser timeout is 60 seconds. One monotonic deadline
covers provider requests, retry waits, response parsing, diagram validation and
the optional single repair. Each transport call waits for at most the lesser of
the remaining deadline and `ARCHLY_AI_RESPONSE_TIMEOUT` (45 seconds by default).
Response bodies are bounded to 1 MB before parsing. Deadline or thread interruption
cancels the active HTTP future. Small bounded parsing work and database finalization
can add overhead; the ten-second browser margin accommodates that work.

Each initial or repair operation permits three total transport attempts. Retryable
responses are 408, transient 429, 500, 502, 503 and 504; transport failures are also
bounded by this policy. Quota/billing codes are terminal. Authentication, unavailable
model and other client errors are not retried. Exponential jitter starts within
1–250 ms, then 1–500 ms. Valid `Retry-After` seconds or HTTP dates are respected as
a minimum; a delay that cannot fit within the deadline fails immediately.
Initial and repair calls have separate stable provider request keys.

## Result replay

The server hashes the authenticated subject and request key into a scoped identifier.
The fingerprint hashes the deterministic request DTO serialization, including all
context strings. Reusing a key with different content returns 409. Concurrent
matching requests wait for the winning operation and replay its exact result,
including generated node/edge IDs. Waiting/replay does not consume another
generation allowance or record another charge.

Results are encrypted with the existing versioned AES-GCM key ring and bound to
the subject and request ID. Prompts/provider payloads are not stored in replay
records. Completed and failed states are retained for `ARCHLY_AI_REPLAY_RETENTION`
(24 hours by default, configurable from two minutes to seven days). Failed requests
replay their safe failure. Abandoned in-progress leases become expired after the
operation deadline plus ten seconds; they do not automatically restart provider
work. Expired keys return 410 until cleanup removes them, after which key reuse
starts a new operation. Cleanup runs every minute. Storage is capped at 1,000
records per subject and 10,000 globally. Account deletion removes replay records.

## Prices and usage

`ARCHLY_AI_PRICING_JSON` maps exact model identifiers to `input`, `cachedInput`,
and `output` prices in USD per million tokens. `ARCHLY_AI_PRICING_VERSION` is
recorded on every usage event. Prices must be nonnegative, cached input must not
exceed ordinary input, and unpriced models are rejected before a provider call.
Adding an allowed model also requires a corresponding pricing entry.

Default standard text prices, checked 2026-09-09:

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| gpt-4.1-mini | 0.40 | 0.10 | 1.60 |
| gpt-4.1 | 2.00 | 0.50 | 8.00 |
| gpt-5-mini | 0.25 | 0.025 | 2.00 |

Sources: [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini),
[GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1),
[GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini).
Retry semantics follow the [official rate-limit guidance](https://developers.openai.com/api/docs/guides/rate-limits).

Each generation records one final usage event after validation/repair, with all
provider attempts, repair attempts, reported input/cached/output tokens, pricing
version, total duration and final outcome. Connection tests also record usage.
Missing usage is explicitly counted as unknown. A conservative allowance based
on request bytes and the output-token limit contributes to estimated cost; unknown
tokens are not represented as reported zero tokens. The administration dashboard
explains this distinction when unknown usage is present. Provider retries whose
earlier billing cannot be determined can therefore overestimate spend.
Historical events retain their original amounts and `legacy-unversioned` pricing.

## Concurrent budgets

Before calling the provider, an operation reserves a conservative maximum cost
under a database lock. Global monthly and per-user daily/monthly checks include
both recorded costs and outstanding reservations. Generation reserves up to six
calls (three initial plus three repair), each with 8,000 output tokens and an
input bound covering the larger of the original request body or 32,000 bytes for
repair. Connection tests reserve three small calls. Recording usage and releasing
the reservation occur in one transaction.

Thus ordinary concurrent application requests do not oversubscribe these budgets
at configured prices and token bounds. This is not a provider billing cap: changed
prices, provider-side behavior and unknown billing can differ from estimates.
After a crash, an unsettled reservation remains conservatively charged against
its UTC day/month rather than being released as free spend. Stale rows are cleaned
after 90 days. Operators should reconcile such reservations against provider
billing before manually releasing them. Rollout should drain old application
instances, which do not understand reservations, before enabling the new behavior.

## Verification and remaining V4 scope

Automated tests cover transport retry/quota behavior, seconds/date Retry-After,
jitter, slow-body deadline cancellation, model/cache pricing, unknown usage,
initial/repair/test accounting, final outcomes, replay without repeat charging,
concurrent database claims and budgets, encrypted result storage, identity
isolation, conflict/expiry handling and account cleanup.

Migration V11 adds replay/reservation tables and usage metadata; existing project
and credential content is unchanged. Keep encryption key versions available for
the replay retention period. Roll back application code only after draining active
requests; old code does not replay new results or honor budget reservations.

This is local implementation evidence for V4-AI-001/002/004/005/007/008 and the
budget reservation portion of 009. It does not close every requirement in V4's AI
section. Browser abort propagation across application instances, external alert
delivery, a live administrator configuration/audit interface, full provider-neutral
adapters, and live staging/production acceptance remain separate work. Closing
the browser currently stops the browser wait; the backend remains bounded by its
deadline. Provider-side token consumption may continue after transport cancellation.
No live paid-provider or staging validation is claimed by local tests.

Local verification on 2026-09-09: backend suite 62 passed, two PostgreSQL
Testcontainers tests skipped because Docker was unavailable. UI suite: 231 passed
on the first run; the new administrator warning test initially matched the loading
status, then all four administrator tests passed after fixing the test wait.
Production UI build, lint and `git diff --check` passed.
