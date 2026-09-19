# External diagram embedding operations

Archly external embeds are created from a project's sharing dialog as a
dedicated `EMBED` link. The link is read-only, has its own expiry and revocation
state, and is scoped to the saved view and environment selected when it is
created. It never exposes project documentation, source code, snapshots, or
owner identity.

## Renderer configuration

The interactive viewer works without the image renderer. Markdown image snippets
require the private renderer service:

- `ARCHLY_EMBED_RENDERER_URL` points to the internal HTTPS renderer `/render`.
- `ARCHLY_EMBED_RENDERER_KEY` is a random secret of at least 32 characters.
- The backend sends only the sanitized diagram projection and authenticates with
  the bearer key. It never sends an embed token or owner credential.
- The renderer is reachable only from the backend network. It must not be
  published as a public endpoint.
- The renderer container uses a non-root user, Chromium, a two-render limit,
  bounded request/body/output size, disabled redirects, blocked arbitrary
  network access, and a 20-second request deadline.

For local Docker Compose, start the base stack with
`docker-compose.embed.yml` and set `ARCHLY_EMBED_RENDERER_KEY`. The overlay
provides the internal `embed-renderer` service and injects its URL and key into
the API. Keep these values out of source control and image layers.

## Public behavior

Interactive embeds request the latest saved revision on load, when the frame
becomes visible, on focus, and every 30 seconds while visible. Failed refreshes
keep the last valid diagram and show a retryable stale message. Revocation or
expiry clears the viewer on its next check.

Markdown image URLs use `Cache-Control: no-store` at the Archly origin. External
documentation systems and image proxies may still cache an earlier image. The
copied Markdown always includes an Archly link that opens the current viewer.

## Release checks

Before enabling the feature in production, verify the following in staging:

1. Create an embed for a base diagram, a named view, and an environment variant.
2. Save changes and confirm the interactive viewer updates without a new link.
3. Confirm the old link remains bound to its original view and variant.
4. Verify PNG rendering for icons, labels, arrows, boundaries, large/off-screen
   content, and managed assets.
5. Verify public responses contain no document, source, snapshot, token, or owner
   identity data.
6. Verify read-only mutations fail, edit mode requires sign-in and project
   ownership, and unrelated owner cookies are ignored.
7. Revoke the link and confirm viewer, image, revision, and asset requests fail.
8. Test Notion and the selected wiki integration; record setup and caching
   limitations. Test Markdown on the supported host and record proxy behavior.
9. Run `node ui/scripts/verify-embed-renderer.mjs` with a staging renderer key.

Do not describe external images as instant-update. The guaranteed behavior is
latest saved content at the Archly origin and on the interactive viewer's next
successful refresh.
