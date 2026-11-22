# vinext-starter

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git and `tar` (including Windows `tar.exe`) are required for publishing; portable publication does not require Bash

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

Publish archives outside the source checkout or under its ignored `outputs/` directory. Local `.env*`, `.dev.vars*`, TypeScript build state, and tool runtime directories are ignored; keep the hosting manifest, migrations, and authored scripts in source control.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For managed Linux browser QA, follow the Sites skill's managed preview reference. The daemon runs the project's Vite dev script with `--host 0.0.0.0 --port 4173 --strictPort`; use the CLI's returned URL. The ignored local profile survives the daemon's cleared environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `worker/index.ts` is the production Worker entrypoint and preserves request-scoped connector bindings
- `scripts/vite/` contains the maintained Vite integrations and the vendored Sites plugin license
- `scripts/connector-preview/` contains the local connector preview Worker and session helpers
- the remaining `scripts/` files select execution profiles and run installation, development, and builds; the plugin's helpers orchestrate the Sites lifecycle
- `dist/` contains generated deployment output; `.vinext/`, `.wrangler/`, and `.sites-runtime/` contain ignored local tool state
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)


## Life planning and daily tracking
- Life areas can be added and renamed per account but cannot be removed. Any areas hidden by older versions can still be restored. Stable IDs preserve existing goal links.
- A goal uses `areaIds` (one or more); a habit uses `goalIds` (zero or more until goals exist).
- Habits support daily, weekly, selected weekdays, every two weeks, and monthly schedules. Weekly/every two weeks repeat on the start date’s weekday. Monthly dates 29–31 clamp to the last day of shorter months.
- Schedule and target history is retained in `plans`, effective from the date edited. Legacy habits remain daily. Dates use Asia/Riyadh.
- Daily plan defaults to due habits; uncheck the scheduled-only filter to see unscheduled habits. Missing entries stay unlogged. Recorded below-target values are in progress today and not achieved on past days. Explicit skipped entries mean not achieved.
- Links describe contribution; they do not automatically increment a goal’s numeric measurement. Due-day consistency and streaks exclude unscheduled days.
- Existing review approvals and account isolation remain in place. Records are stored in the existing D1 JSON record table; this change requires no schema migration.
- Run `node scripts/test-tracker.mjs` for account isolation, review workflow, all recurrence types, leap/month boundaries, historical plans, many-to-many links, daily states, and streak checks.

## Source repository
The user-facing source repository is https://github.com/iamqasimrasool/lifetrackingapp. Hosted releases continue through the existing Sites project. A GitHub commit by itself does not deploy the site. Keep tested source changes synchronized with the Sites source before publication.

## North Star & Journal release
- Life direction is the default screen. Set a North Star statement and choose contributing life areas; goals connect through their selected areas and habits through their goal links.
- Each area shows its goal and unique habit count. Expand an area, goal or habit to inspect its relationships. Overall contributing totals count each record once, even with multiple links. Connections express intent, not measured causation or an automatic North Star percentage.
- Daily journal supports wellbeing, events, goal progress, optional area/goal/habit links, existing daily habit results, reflection, tomorrow's focus and optional deeper reflection. Save one editable entry per date; concurrent edits are protected by versions. The North Star is snapshotted on first save.
- Photos: JPEG/PNG/WebP, up to six retained/new photos per entry, 8 MiB each and 24 MiB new uploads per save. D1 stores metadata; private R2 stores bytes. Authenticated photo routes check the current account and use private/no-store responses. Removing a photo from an entry detaches it; it does not permanently purge storage.
- English, Urdu and Arabic labels, RTL support and mobile layouts. Unsaved journal navigation prompts before discarding text.
- Regression suite also covers direction deduplication, private journal/photo access, stale versions, image validation and limits, snapshots, rollback after storage/database failure, and translation parity.

## Site entry password
The browser site requires a shared entry password before showing the dashboard or reaching data/photo APIs. This is an additional gate; it never replaces ChatGPT sign-in or per-account authorization. Existing authenticated ChatGPT tools at `/mcp` retain their separate account-scoped access.

Configure `SITE_ENTRY_PASSWORD_HASH` (SHA-256 hex of a strong shared password) and `SITE_ENTRY_COOKIE_SECRET` (at least 32 random characters) as hosted secrets. Missing configuration fails closed. Neither the password nor signing secret belongs in source control. Rotate both secrets and redeploy to change the password and invalidate existing sessions.

Entry uses a signed, host-only, Secure/HttpOnly/SameSite=Lax cookie for 12 hours. The header's Lock site action clears it on that browser. Password attempts are limited to 10 per IP per 15-minute window in D1, storing a hashed IP and expiring counter; cross-origin submissions are rejected. Entry pages and protected responses use private/no-store caching. Run `node scripts/test-site-gate.mjs` for gate regression checks.

Entry form compatibility: preserve Origin with strict-origin-when-cross-origin. Older no-referrer entry forms may send a null Origin; these are accepted only with browser-controlled Sec-Fetch-Site: same-origin. Cross-site and unverified null-Origin form submissions remain rejected.

## Journal printing and Word downloads
From Daily journal, select a date and choose Print or save PDF, or Download Word. The private print view supports saved-entry and blank-writing modes in English, Urdu and Arabic. Blank mode keeps the selected date, direction, goal links and scheduled habit names while clearing journal answers, actual results and photos. Save journal edits before exporting.

The printable layout follows a two-page daily spread: North Star and related areas/goals, three priorities, wellbeing, hourly time blocks, quick tasks, notes and scheduled habits; then events, goal progress, reflection, gratitude/learning, tomorrow and photo notes. Long entries and many habits may continue onto extra pages; no saved text or habit is truncated. Browser printing can optionally include saved photos on additional pages; Word includes the attachment count and photo-note space.

Word exports use the same editable master as the downloadable blank document. Masters are generated by `scripts/build-journal-template.py` using python-docx. Runtime exports insert escaped text and private per-user records into those OOXML parts, then create a standard DOCX ZIP without network calls or new dependencies. The server checks the signed-in user for every export and returns private/no-store responses. The existing site password gate protects both the print page and the export API.

Run `node scripts/test-journal-print.mjs` for scheduling, zero/unlogged handling, snapshots, blank-mode privacy, RTL labels, XML escaping, many-habit exports and anonymous rejection. Run `node scripts/export-journal-template.mjs /absolute/path/template.docx` for the English blank form. Exported fixtures go to scratch, never into source control.
