# RACOON v2 Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, with TDD before each implementation task and verification before completion.

**Goal:** Transform the existing static RACOON radar into a modular, local-first, verifiable anime library with five views, safe PWA updates, source provenance, and backward-compatible backups.

**Architecture:** Keep Cloudflare Pages static and load the interface from native browser modules under `public/js/`. Pure domain modules for time, evidence, schedules, storage, backups, and providers will be importable by Node tests; the UI module will compose them without a framework. Personal tracking will be isolated from official catalog observations so remote refreshes cannot overwrite user decisions.

**Tech Stack:** HTML, CSS, native ES modules, Web APIs (`localStorage`, `fetch`, Service Worker, `Intl`), Node.js built-in `node:test`; no runtime dependencies or paid services.

**Spec:** `docs/superpowers/specs/2026-10-13-racoon-v2-wizard-design.md`

## Global Constraints

- Preserve `anime-radar-otono-2026-v1` and import the existing JSON formats.
- Keep the public deployment static on the existing Cloudflare Pages project `racoon-radar-klymapo`.
- Publish only `public/`; do not deploy `functions/` or `schema.sql`.
- Do not add authentication, D1, a permanent backend, paid APIs, or public secrets.
- Store progress, custom series, preferences, source cache, and update metadata locally.
- Never infer confirmed episode counts by adding weekly intervals.
- Distinguish Japanese broadcast time from Mexican streaming availability and label unverified fields.
- Keep manual corrections intact while allowing future source refreshes.
- Work only on `codex/racoon-v2-wizard`; integrate through Pull Request, never directly to `main`.
- Run `node --test tests/*.test.mjs` after each task and before claiming completion.

## Review Focus

- A corrupt or quota-limited local store must leave the last valid personal state usable; test in Task 2.
- A remote update must not reduce a manually edited `seen`, `aired`, `total`, or status value; test in Task 2 and Task 5.
- Ambiguous or contradictory source evidence must not render as a confirmed episode count; test in Task 1 and Task 7.
- Date conversion across source zones and daylight-saving transitions must not move an event to the wrong Mexico date; test in Task 1 and Task 6.
- A waiting Service Worker must not reload or delete local data until the user accepts an update; test in Task 8.

## File Map

- Create `public/js/model.mjs`: shared schemas, constants, ID helpers, and catalog normalization.
- Create `public/js/time.mjs`: zoned date/time conversion and Mexico formatting.
- Create `public/js/evidence.mjs`: observations, confidence, conflict detection, and field resolution.
- Create `public/js/schedule.mjs`: published/announced/scheduled event semantics.
- Create `public/js/storage.mjs`: state defaults, validation, migrations, safe writes, and legacy preservation.
- Create `public/js/backup.mjs`: backup envelopes, import preview, merge/replace, and CSV serialization.
- Create `public/js/catalog.mjs`: the existing 25-title seed catalog normalized to stable legacy IDs plus regression fixtures.
- Create `public/js/providers/anilist.mjs`: public AniList search/detail adapter with timeout and normalization.
- Create `public/js/pwa.mjs`: version checks, Service Worker update handshake, and refresh status.
- Create `public/js/app.mjs`: application composition, event delegation, view state, and rendering.
- Create `public/styles.css`: Wizard tokens, responsive layout, accessible controls, and state styling.
- Modify `public/index.html`: semantic shell for the five tabs, dialogs, live regions, and module entry point.
- Modify `public/sw.js`: versioned cache, network-first navigation, update waiting, and `SKIP_WAITING` handling.
- Modify `public/manifest.webmanifest`: Wizard colors, names, and custom icon assets.
- Create `public/version.json`: published version and change summary consumed by the app.
- Create `public/icons/racoon-wizard.svg`: original mascot/logo source.
- Create `public/icons/racoon-wizard-192.png` and `public/icons/racoon-wizard-512.png`: PWA icon exports.
- Modify `tests/racoon.test.mjs`: static/PWA regression assertions adapted to modular files.
- Create `tests/data-engine.test.mjs`: time, evidence, and schedule tests.
- Create `tests/storage.test.mjs`: migration and safe-state tests.
- Create `tests/backup.test.mjs`: import/export tests.
- Create `tests/provider.test.mjs`: AniList normalization and failure tests.
- Create `tests/pwa.test.mjs`: update protocol tests with browser doubles.
- Modify `.github/workflows/racoon.yml`: test all modules and preserve static-only publication safeguards.
- Modify `README.md` and `docs/PUBLICACION.md`: owner guide, limitations, rollback, and backup instructions.

### Task 1: Build the pure data engine first

**Files:**
- Create: `public/js/model.mjs`
- Create: `public/js/time.mjs`
- Create: `public/js/evidence.mjs`
- Create: `public/js/schedule.mjs`
- Create: `public/js/catalog.mjs`
- Create: `tests/data-engine.test.mjs`

**Interfaces:**
- `zonedDateTimeToEpoch(dateYmd: string, timeHm: string, timeZone: string): number`
- `formatInTimeZone(epochMs: number, timeZone: string, locale?: string): string`
- `resolveFieldObservations(observations: Observation[]): { value, confidence, candidates, latestConfirmed }`
- `resolveEpisodeAvailability(observations: EpisodeObservation[]): { available, confidence, candidates, reason }`
- `scheduleEvent(input: ScheduleInput, nowMs: number): ScheduleResult`
- `stableId(kind: string, sourceId: string): string`
- `normalizeLegacyCatalog(raw: LegacyCatalogEntry[]): CatalogEntry[]`

- [ ] **Step 1: Write failing tests** for Mexico conversion, DST, source conflicts, and event semantics. Use the exact regression inputs: The Vermilion Mask episode 1 on `2026-10-10`, candidates 2 and 3 on `2026-10-17`, first cour total 12, and second cour announced for `2027-04`.
- [ ] **Step 2: Run `node --test tests/data-engine.test.mjs`** and verify the new imports/functions fail before implementation.
- [ ] **Step 3: Implement `time.mjs`** using `Intl.DateTimeFormat` iteration to resolve a wall-clock time in a named zone without using the machine's local timezone; include a stable formatter for `America/Mexico_City`.
- [ ] **Step 4: Implement `evidence.mjs`** so incompatible episode candidates return `confidence: "contradictory"` and `available: null`, while preserving every source URL and the latest confirmed observation.
- [ ] **Step 5: Implement `schedule.mjs`** so published counts come only from published evidence; announced/scheduled events remain labeled and never increment `available`.
- [ ] **Step 6: Implement `model.mjs` and `catalog.mjs`** with stable IDs, season/media-type distinctions, the 25 existing titles, and source metadata. Preserve the old series keys as `legacy:<id>`.
- [ ] **Step 7: Run the focused tests again** and verify all data-engine assertions pass, including the Vermilion contradiction.
- [ ] **Step 8: Commit** `feat: add verified anime data engine`.

### Task 2: Add versioned local state and migration

**Files:**
- Create: `public/js/storage.mjs`
- Create: `tests/storage.test.mjs`

**Interfaces:**
- `LEGACY_STATE_KEY: string`
- `STATE_KEY: string`
- `createDefaultState(catalog: CatalogEntry[]): RacoonState`
- `migrateLegacyTrack(track: object, catalog: CatalogEntry[]): RacoonState`
- `loadState(storage: StorageLike, catalog: CatalogEntry[]): { state, migrated, repaired }`
- `saveState(storage: StorageLike, state: RacoonState): void`
- `validateState(value: unknown): RacoonState`

- [ ] **Step 1: Write failing tests** for an old v1 track containing favorites, `seen`, `aired`, `total`, `grade`, and `changedAt`; assert the new state keeps all values, maps IDs to `legacy:*`, preserves the old key, and is schema version 3.
- [ ] **Step 2: Add tests** for malformed JSON, invalid numeric fields, an unavailable storage implementation, and remote catalog updates that must not change personal fields.
- [ ] **Step 3: Run `node --test tests/storage.test.mjs`** and verify failure.
- [ ] **Step 4: Implement state defaults and validation** with bounded episode numbers, allowed status values, catalog separation, and update metadata.
- [ ] **Step 5: Implement migration and safe writes**. Read but never delete the legacy key; validate before replacing the active state and retain the previous valid in-memory state on write failure.
- [ ] **Step 6: Run focused storage tests** and verify all migration and failure tests pass.
- [ ] **Step 7: Commit** `feat: preserve local library with versioned storage`.

### Task 3: Implement complete backup compatibility

**Files:**
- Create: `public/js/backup.mjs`
- Create: `tests/backup.test.mjs`

**Interfaces:**
- `createBackup(state: RacoonState, exportedAt?: string): BackupEnvelope`
- `parseBackup(input: unknown): ImportPreview`
- `mergeBackup(current: RacoonState, incoming: BackupEnvelope): RacoonState`
- `replaceWithBackup(incoming: BackupEnvelope): RacoonState`
- `stateToCsv(state: RacoonState, catalog: CatalogEntry[]): string`

- [ ] **Step 1: Write failing tests** for direct v1 objects, the existing `{version:2, exportedAt, track}` envelope, and the new full envelope; assert preview counts and no silent acceptance of invalid IDs.
- [ ] **Step 2: Add tests** for merge conflict resolution, explicit replacement, favorites/preferences/custom series, and CSV escaping of titles containing quotes or commas.
- [ ] **Step 3: Run `node --test tests/backup.test.mjs`** and verify failure.
- [ ] **Step 4: Implement parsing and preview** without mutating the current state, including counts, dates, invalid records, and conflict summaries.
- [ ] **Step 5: Implement merge/replace and CSV serialization**. Personal fields resolve by latest valid `changedAt`; catalog evidence merges without erasing newer local evidence.
- [ ] **Step 6: Run focused backup tests** and verify pass.
- [ ] **Step 7: Commit** `feat: add full local backups and legacy import`.

### Task 4: Replace the monolithic page with the Wizard shell and visual system

**Files:**
- Create: `public/styles.css`
- Create: `public/icons/racoon-wizard.svg`
- Create: `public/icons/racoon-wizard-192.png`
- Create: `public/icons/racoon-wizard-512.png`
- Modify: `public/index.html`
- Modify: `public/manifest.webmanifest`
- Modify: `tests/racoon.test.mjs`

**Interfaces:**
- The HTML exposes five buttons/tabs with IDs `home`, `calendar`, `progress`, `add`, and `backups`.
- The HTML exposes view containers, a global live region, update dialog, import dialog, and hidden file input.
- `index.html` loads `/js/app.mjs` with `type="module"` and contains no old inline application script.

- [ ] **Step 1: Extend static tests** to assert all five tabs, Wizard color tokens, manifest icons, module entry, no public credentials, and no `/api/progress` call.
- [ ] **Step 2: Run `node --test tests/racoon.test.mjs`** and verify the structural assertions fail against the current monolithic page.
- [ ] **Step 3: Create the original mascot SVG** with transparent background, recognizable raccoon mask/ears/tail, purple star hat, and icon-safe silhouette; export 192 and 512 PNG files using an available local converter.
- [ ] **Step 4: Replace the HTML shell** with semantic header, tablist, five view regions, dialogs, import input, and accessible labels/live regions.
- [ ] **Step 5: Add `styles.css`** with exact palette tokens, responsive breakpoints, cards, progress bars, focus states, empty/error/loading states, and no forced horizontal overflow.
- [ ] **Step 6: Update manifest metadata** to the Wizard identity and custom icons.
- [ ] **Step 7: Run static tests and inspect `git diff --check`**; verify structural tests pass without requiring a browser.
- [ ] **Step 8: Commit** `feat: introduce racoon wizard shell and visual tokens`.

### Task 5: Integrate storage, dashboard, and personal progress

**Files:**
- Create: `public/js/app.mjs`
- Modify: `public/js/model.mjs`
- Modify: `public/styles.css`
- Create/modify: `tests/ui-state.test.mjs`

**Interfaces:**
- `createApp({ document, storage, fetch, now }): AppController`
- Controller methods: `selectView(viewId)`, `setTracking(id, patch)`, `render()`, `destroy()`.
- Personal controls: `+1`, `-1`, `Al corriente`, status select, favorite toggle, and manual numeric editors.

- [ ] **Step 1: Write failing state/UI tests** against a minimal DOM double: the dashboard counts pending/current/new episodes, progress controls update only local tracking, and remote catalog refresh cannot overwrite manual quantities.
- [ ] **Step 2: Run the focused UI-state tests** and verify failure.
- [ ] **Step 3: Implement app composition and view navigation** using `loadState`, `saveState`, and the catalog seed; render a usable Inicio view with freshness status and empty/error states.
- [ ] **Step 4: Implement Mi progreso** with poster/title, watched/available/total, percentage, status, favorite, filters, sorting, `+1`, `-1`, `Al corriente`, and manual quantities.
- [ ] **Step 5: Implement local event delegation** so updates are validated, persisted immediately, and never sent to a server.
- [ ] **Step 6: Run `node --test tests/ui-state.test.mjs tests/storage.test.mjs`** and verify pass.
- [ ] **Step 7: Commit** `feat: add local dashboard and progress library`.

### Task 6: Implement calendar navigation and verified time display

**Files:**
- Modify: `public/js/app.mjs`
- Modify: `public/js/schedule.mjs`
- Modify: `public/styles.css`
- Create: `tests/calendar.test.mjs`

**Interfaces:**
- Calendar state accepts `{ weekStart: string, selectedDay: string, platform: string, status: string }`.
- `buildCalendarModel(catalog, state, options): CalendarModel` returns mobile day agenda and desktop seven-day columns using source confidence labels.

- [ ] **Step 1: Write failing tests** for current week, next-week navigation, Monday-Sunday selection, filters, published vs announced labels, and source-zone to Mexico-date conversion.
- [ ] **Step 2: Run `node --test tests/calendar.test.mjs`** and verify failure.
- [ ] **Step 3: Implement calendar model and controls** with weekly navigation, daily mobile selector, vertical agenda cards, and seven-column desktop markup.
- [ ] **Step 4: Add responsive styles** so mobile does not compress seven columns and desktop shows poster, title, episode, time, platform, status, and source confidence.
- [ ] **Step 5: Run focused calendar and data-engine tests** and verify pass.
- [ ] **Step 6: Commit** `feat: add responsive verified calendar`.

### Task 7: Add AniList search, editable confirmation, custom series, and provenance UI

**Files:**
- Create: `public/js/providers/anilist.mjs`
- Modify: `public/js/app.mjs`
- Modify: `public/js/evidence.mjs`
- Create: `tests/provider.test.mjs`

**Interfaces:**
- `searchAnime(query, { fetch, signal }): Promise<SearchResult[]>`
- `fetchAnimeDetails(id, { fetch, signal }): Promise<CatalogEntry>`
- `normalizeAniListMedia(media): CatalogEntry`
- `saveCatalogEntry(state, entry, edits): RacoonState`

- [ ] **Step 1: Write failing provider tests** for search/detail normalization, permanent IDs, season/year/media-type distinction, missing totals, timeout/network failure, and no secret headers.
- [ ] **Step 2: Run `node --test tests/provider.test.mjs`** and verify failure.
- [ ] **Step 3: Implement the AniList adapter** with public GraphQL requests, abort timeout, response validation, title aliases, poster, synopsis, genres, season/year, airing data, and source records.
- [ ] **Step 4: Implement Agregar series UI** with debounced suggestions, visual results, editable confirmation, pending-verification badges, deduplication by stable ID, and save even when fields are missing.
- [ ] **Step 5: Integrate source/provenance panels** showing source URL, queried/confirmed dates, confidence, and contradictions without blocking manual edits.
- [ ] **Step 6: Run provider, storage, backup, and UI tests** and verify pass with mocked fetch only.
- [ ] **Step 7: Commit** `feat: add local anime search and source evidence`.

### Task 8: Implement safe PWA version updates

**Files:**
- Create: `public/js/pwa.mjs`
- Create: `public/version.json`
- Modify: `public/sw.js`
- Modify: `public/js/app.mjs`
- Create: `tests/pwa.test.mjs`

**Interfaces:**
- `checkPublishedVersion({ fetch, currentVersion, now }): Promise<VersionCheck>`
- `activateWaitingWorker(registration, windowLike): Promise<void>`
- `registerPwa({ navigator, window, fetch, onUpdate }): Promise<PwaController>`

- [ ] **Step 1: Write failing tests** for newer/same/failed version checks, deferred update, `SKIP_WAITING`, one-time `controllerchange` reload, and local-state readability before reload.
- [ ] **Step 2: Run `node --test tests/pwa.test.mjs`** and verify failure.
- [ ] **Step 3: Add version metadata and cache naming** tied to the published version; use network-first navigation with offline fallback and delete only obsolete caches.
- [ ] **Step 4: Implement the update handshake** so install/waiting state opens the Spanish dialog, «Más tarde» leaves the worker waiting, and «Actualizar ahora» sends the message then reloads once after control changes.
- [ ] **Step 5: Add manual update controls** to Respaldos/Ajustes and connect update status to Inicio without deleting state.
- [ ] **Step 6: Run PWA, static, storage, and backup tests** and verify pass.
- [ ] **Step 7: Commit** `feat: add safe user-controlled PWA updates`.

### Task 9: Finish export UI, scheduled refresh behavior, workflow, and documentation

**Files:**
- Modify: `public/js/app.mjs`
- Modify: `public/js/storage.mjs`
- Modify: `public/js/backup.mjs`
- Modify: `public/styles.css`
- Modify: `.github/workflows/racoon.yml`
- Modify: `README.md`
- Modify: `docs/PUBLICACION.md`
- Modify: `tests/racoon.test.mjs`

**Interfaces:**
- Backups view exposes `exportBackup`, `importBackup`, `merge`, `replace`, `exportCsv`, and count/date summaries through the UI.
- Refresh metadata distinguishes completed, failed, stale, and unavailable providers; refresh occurs on load if stale, every four hours while visible, and manually on demand.

- [ ] **Step 1: Write failing integration/static tests** for backup preview/confirmation, merge/replacement, CSV download hooks, four-hour freshness, API failure fallback, and static-only workflow deployment.
- [ ] **Step 2: Run the full suite** and verify the new integration assertions fail before wiring.
- [ ] **Step 3: Implement the Respaldos view** with JSON/CSV actions, preview dialog, counts/date, merge/replacement confirmation, preferences, and custom-series coverage.
- [ ] **Step 4: Implement refresh orchestration** with cached source data, four-hour visibility interval, manual refresh, stale age labels, and last-confirmed fallback; never clear personal data on provider failure.
- [ ] **Step 5: Update the workflow** to run all tests, copy only `public/` to a temporary deploy directory, reject forbidden server artifacts, and retain the existing Pages project name logic. Do not add a scheduled job that fabricates data.
- [ ] **Step 6: Update owner documentation** with normal use, backups, limitations, PWA update behavior, publication, and rollback instructions.
- [ ] **Step 7: Run `node --test tests/*.test.mjs`, `git diff --check`, and the workflow's shell checks locally**; verify all pass.
- [ ] **Step 8: Commit** `feat: complete racoon v2 backup and refresh workflows`.

### Task 10: Perform browser QA, capture evidence, and prepare the Pull Request

**Files:**
- Modify only files required by QA fixes.
- Create: `docs/QA-RACOON-V2.md`
- Create: `artifacts/qa/racoon-mobile.png`
- Create: `artifacts/qa/racoon-desktop.png`

- [ ] **Step 1: Serve `public/` locally** with a static server and inspect the app at a narrow mobile viewport and a desktop viewport.
- [ ] **Step 2: Verify manually** navigation, calendar day/week modes, progress edits, Add series failure/loading states, backup preview, update dialog, installability metadata, keyboard focus, long titles, and no horizontal overflow.
- [ ] **Step 3: Capture real mobile and desktop screenshots** showing the new Wizard UI; record viewport dimensions and test date/data source state.
- [ ] **Step 4: Run the complete automated suite** and record command/output in `docs/QA-RACOON-V2.md`.
- [ ] **Step 5: Review `git diff main...HEAD`** for secrets, unintended Functions/D1 deployment, direct main changes, destructive storage behavior, and unrelated repositories.
- [ ] **Step 6: Commit QA evidence and final fixes** with `test: document racoon v2 browser verification`.
- [ ] **Step 7: Run verification-before-completion checks**, then provide the branch, commit list, test evidence, screenshots, known limitations, publication steps, rollback steps, and a Pull Request description. Do not claim a deployed production update unless a reviewed PR has been merged.
