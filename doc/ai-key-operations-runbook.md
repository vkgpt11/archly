# AI credential key operations

Archly encrypts user-supplied provider credentials with AES-256-GCM. Ciphertext is authenticated against the user subject, provider, and encryption-key version, preventing credential records from being copied between accounts or providers.

## Production configuration

Production must use Google Secret Manager. Create a secret containing a comma-separated key ring such as `1:<base64-32-byte-key>,2:<base64-32-byte-key>`. Grant only `roles/secretmanager.secretAccessor` to the runtime service account and set:

- `ARCHLY_AI_ENCRYPTION_KEY_SECRET=projects/PROJECT/secrets/archly-ai-key-ring/versions/latest`
- `ARCHLY_AI_ENCRYPTION_KEY_VERSION=2`

Keep old versions in the ring until every credential has been lazily rotated. Production startup fails when the secret cannot be read or the selected version is absent/invalid. Never put key material in source control, images, logs, support tickets, or deployment manifests.

## Backup and recovery

Enable Secret Manager replication appropriate to the recovery policy, version retention, audit logging, and deletion protection. Export neither plaintext keys nor user credentials. Test restoration in an isolated project by granting a temporary runtime identity access to an existing secret version and verifying a credential can be decrypted.

If the current version is unavailable, restore/enable that exact Secret Manager version. Do not generate a replacement under the same numeric version: GCM authentication will reject it. Retain database backups and key versions under the same retention schedule.

## Rotation

1. Generate 32 cryptographically random bytes and base64-encode them.
2. Add a new numeric version to the key-ring secret without removing previous versions.
3. Deploy with `ARCHLY_AI_ENCRYPTION_KEY_VERSION` set to the new number.
4. Verify startup, connection tests, audit events, and decrypt-failure alerts.
5. Credentials rotate automatically on their next use. Run a controlled batch rotation before retiring an old key when required.
6. Confirm no credential rows reference the old version, retain it for the recovery window, then disable and later destroy it under two-person approval.

## Incident procedure

If key material or credential ciphertext may be exposed: enable the global `ARCHLY_AI_ENABLED=false` switch, preserve audit evidence, revoke affected provider keys, rotate the master key ring, notify security owners, and assess database/key access logs. Restore service only after new credentials are configured and monitoring shows no unexplained usage. Never include API keys or prompts in incident artifacts.

Alert on budget threshold, repeated decrypt failures, invalid-key spikes, provider outages, and abnormal per-user request volume. Credential audit events intentionally contain metadata only.
