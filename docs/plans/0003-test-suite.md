# 0003 - Test Suite

**Status:** In Progress
**Approach:** Layered tests (data invariants, contract, fixtures, snapshots, unit, smoke)

---

## Current state (handoff snapshot)

Latest commit: `test(e2e): add Playwright smoke spec for theme, code blocks, and navigation` (Phase 8 landed) on top of the categories/code-block/todo-blockquote/github-embed extractions.

- **37 test files, 216 vitest tests passing.** Single shared `_site` build via vitest `globalSetup`. Run `npm test`.
- Phases **1, 2, 3, 4, 5 complete** on the working branch.
- Phase **6 refactor + Phase 7 unit tests in progress** — extracted so far: `lib/timeline/refs.js`, `lib/timeline/dates.js`, `lib/timeline/sort.js`, `lib/timeline/graph.js`, `lib/timeline/validate.js`, `lib/timeline/categories.js`, `lib/markdown/code-block.js`, `lib/markdown/todo-blockquote.js`, `lib/markdown/github-embed.js`, each with a matching `test/unit/*` file. Remaining extractions: `lib/timeline/archives.js`, `lib/assets/fingerprint.js`, `lib/build/link-check.js`, `lib/eleventy/excluded-content.js`.
- Phase **8 Playwright implemented** as a single `test/e2e/smoke.spec.js` (chromium only) with `playwright.config.js` and a `webServer` that serves prebuilt `_site` via `npx http-server`. Run `npm run test:e2e` (after `npm run test:e2e:install` to fetch Chromium and after `npm test` or `npm run build` to populate `_site`).

### Conventions for follow-up agents

- **Linear git history only.** Bring worktree work in via `git cherry-pick` from `main` (not from the worktree). Never `git merge` a branch into main.
- **No "Phase X" or plan numbering in commit subject lines.** They are meaningful only inside this plan. The plan number can appear in the body if it adds context, but the subject describes the change.
- **Phase 6 must stay sequential.** Every extraction edits `eleventy.config.js`; parallel agents will conflict. Extract one module at a time. Refactor + its unit tests can land in the same commit if tightly coupled.
- **Phase 7 unit tests** live in `test/unit/<module-name>.test.js` and import from `lib/...` — never from `eleventy.config.js`.
- **Phase 8 Playwright** is one small spec file at the end; no benefit from parallelizing.
- The shared `_site` build is performed once in `test/helpers/global-setup.js`. Test files should never spawn their own build; the existing `ensureSiteBuilt()` in `test/helpers/build-once.js` is preserved as a no-op for backward compatibility with `beforeAll(...)` blocks that still call it.

### Quirks worth knowing

- **`/all-tags/` permalinks to `/tags/`** — both `tags.test.js` and `all-tags.test.js` target `/tags/`.
- **Calendar week archives** live under `/timeline/weeks/<YYYY-Www>/`, not `/timeline/calendar-weeks/`. Month-banded weeks use `YYYYMMWn`.
- **Timeline category badge** is `data-type` + a CSS custom property, not visible text.
- **`feed.xml` must be parsed via linkedom's `DOMParser` (XML mode)**, not `parseHTML`, because `<link>` is treated as a void element otherwise.
- **Hidden notes URL** is `/notes/hidden/`, not `/hidden-notes/`.
- **Production builds exclude `testing`-tagged content and drafts** via `eleventyExcludeFromCollections`; many relational fixture-like real entries are tagged `testing` and won't appear in `_site`.
- **`series.yaml`** uses the `posts:` key, not `entries:`.
- **Eleventy does not clean `_site` between builds.** `global-setup.js` `rmRf`s it first to avoid stale pages (e.g. an orphaned `/page/2/` from a prior build).

---

## Overview

The project has grown without an engineering test baseline. Before refactoring
`eleventy.config.js` into smaller modules and continuing to add features, we
want a layered test suite that locks in current behavior, catches regressions
in rendered output and relational data, and stays cheap to maintain.

Tests are organized by what they verify, not by what they import:

- **data invariants** — checks the build itself won't catch
- **contract** — assertions on real built HTML for every page type
- **fixtures** — tiny Eleventy sites for relational and negative-path scenarios
- **snapshots** — small, normalized HTML fragments for reusable components
- **unit** — pure-function tests on helpers extracted from `eleventy.config.js`
- **e2e smoke** — a thin Playwright layer for things only a real browser sees

Current rollout status:

- Phases 1 through 5 are substantially complete.
- Phase 6 is in progress.
- Phase 7 is blocked on further Phase 6 extraction work.
- Phase 8 (Playwright smoke) is implemented.

---

## Goals

- Lock in current behavior before refactoring `eleventy.config.js`.
- Cover every page type the site renders, not just timeline/projects.
- Verify timeline parent/child relational rendering without Playwright.
- Keep tests fast, deterministic, and easy to review on failure.
- Make snapshots small enough to read in a PR diff.

## Non-Goals

- Schema tests for data files whose breakage the build already surfaces
  (`me.yaml`, `themes.yaml`, `sidebarNav.yaml`, `site.yaml`).
- Visual regression testing.
- Full accessibility sweep (axe) and HTML validator passes.
- OG image pixel comparisons.

---

## Tooling

- **Test runner:** `vitest` (snapshot UX, watch mode, fast).
- **DOM parsing:** `linkedom` (lighter than jsdom for static HTML).
- **Eleventy fixtures:** Eleventy programmatic API
  (`new Eleventy(input, output, { configPath }).toJSON()`).
- **Browser:** Playwright, one spec file.
- Existing `npm run build` remains the first CI gate.

---

## Directory layout

```
test/
  data/
    invariants.test.js
  unit/
    timeline-refs.test.js
    timeline-graph.test.js
    timeline-validate.test.js
    timeline-archives.test.js
    timeline-categories.test.js
    excerpt.test.js
    code-block.test.js
    todo-blockquote.test.js
    github-embed.test.js
    link-check.test.js
    excluded-content.test.js
    fingerprint.test.js
  contract/
    home.test.js
    about.test.js
    notes.test.js
    hidden-notes.test.js
    drafts.test.js
    projects.test.js
    timeline-index.test.js
    timeline-entry.test.js
    timeline-months.test.js
    timeline-weeks.test.js
    timeline-calendar-weeks.test.js
    timeline-tag-archive.test.js
    tags.test.js
    all-tags.test.js
    tag-pagination.test.js
    series.test.js
    feed.test.js
    no-unresolved-templates.test.js
    no-empty-anchors.test.js
  fixtures/
    timeline-linear-thread/
    timeline-branching/
    timeline-deep-tree/
    timeline-earlier-thread/
    timeline-orphan-parent/
    timeline-cycle/
    timeline-self-parent/
    timeline-tag-collision/
    timeline-reserved-slug/
    timeline-unquoted-date/
    timeline-multi-category/
  fixtures.test.js
  snapshots/
    project-card.test.js
    tag-chip.test.js
    timeline-entry.test.js
    timeline-week-pill.test.js
    post-list-item.test.js
    timeline-entry-body.test.js
    post-body.test.js
  e2e/
    smoke.spec.js
  helpers/
    build-once.js
    normalize-html.js
    parse.js
playwright.config.js
vitest.config.js
```

---

## Helper extraction plan (for unit tests)

The unit layer assumes `eleventy.config.js` is split into focused modules. The
extraction should preserve current behavior — contract, fixtures, and snapshot
tests provide the safety net.

- `lib/timeline/refs.js` — `normalizeTimelineRef`, `getTimelineEntryRef`, `getTimelineParentRef`
- `lib/timeline/graph.js` — `buildTimelineEntryMap`, `buildTimelineChildMap`, ancestors, earlier-thread, descendant count, descendant tree
- `lib/timeline/validate.js` — `validateTimelineEntryRelationships`, date/time quoting check
- `lib/timeline/sort.js` — `getTimelineSortKey`, sorted-entries helper
- `lib/timeline/archives.js` — month/week/calendar-week/tag archive builders, `getTimelineTopicTags`, reserved/excluded tag rules
- `lib/timeline/categories.js` — `getTimelineEntryType`, `getTimelineTypeTags`
- `lib/markdown/code-block.js` — `renderMarkdownCodeBlock`, `highlightCode`, `normalizeLanguage`, `countCodeLines`
- `lib/markdown/todo-blockquote.js` — `markTodoBlockquotes`
- `lib/markdown/github-embed.js` — `parseBlobUrl`, `trimSharedIndent`, `guessLanguageByExt`
- `lib/assets/fingerprint.js` — `buildAssetUrl`, `emitFingerprintedAssets`
- `lib/build/link-check.js` — the `eleventy.after` broken-link scanner
- `lib/eleventy/excluded-content.js` — `isTestingOnlyContent` + draft exclusion logic

---

## Execution order

1. Bootstrap tooling (vitest, linkedom, scripts, helpers).
2. Data invariants.
3. Contract tests against the real build (largest single value add).
4. Snapshots (reuse the same build).
5. Fixture-based relational + negative-path tests.
6. Refactor `eleventy.config.js` into `lib/` modules. Existing layers must stay green.
7. Unit tests written alongside each extraction.
8. Playwright smoke layer.

---

## Todo

### Phase 1 — Tooling bootstrap

- [x] Add `vitest` and `linkedom` to devDependencies.
- [x] Add `test`, `test:watch`, `test:e2e` scripts to `package.json`.
- [x] Create `vitest.config.js` (node environment, include `test/**`).
- [x] Add `test/helpers/build-once.js` (runs `npm run build` once per suite, caches result).
- [x] Add `test/helpers/parse.js` (linkedom wrapper for built HTML by URL).
- [x] Add `test/helpers/normalize-html.js` (strip asset fingerprints, today's date, OG filenames).
- [ ] Wire CI to run `npm run build && npm test`.

### Phase 2 — Data invariants

- [x] `test/data/invariants.test.js`:
  - [x] timeline category `tag` values are unique
  - [x] timeline category `color` matches `/^#[0-9a-f]{6}$/i`
  - [x] `featuredTags` is an array of strings (if present)
  - [x] `series.yaml` entries reference real post/note slugs

### Phase 3 — Contract tests (against real build)

- [x] `home.test.js` — page 1 + page 2 render; post list items present; prev/next pagination works; titles stable.
- [x] `about.test.js` — `me.yaml` fields render; no unresolved template output.
- [x] `notes.test.js` — non-hidden notes listed; hidden notes absent.
- [x] `hidden-notes.test.js` — hidden notes listed; not present in `sidebarNav.yaml` nav.
- [x] `drafts.test.js` — drafts page exists in dev; (optionally) absent/empty in production.
- [x] `projects.test.js` — cards present; `Link` and `GitHub` anchors non-empty where data provides `url`/`repo`; no empty anchors.
- [x] `timeline-index.test.js` — entries render; category color rules applied; pagination titles stable.
- [x] `timeline-entry.test.js` — title/body/category badge for a known entry.
- [x] `timeline-months.test.js` — `/timeline/months/` index + a known month archive; entry counts match.
- [x] `timeline-weeks.test.js` — `/timeline/weeks/` index + a known week archive.
- [x] `timeline-calendar-weeks.test.js` — ISO week labels; year-boundary case if present.
- [x] `timeline-tag-archive.test.js` — topic-tag archive renders entries; reserved/excluded tags produce no archive.
- [x] `tags.test.js` — tag groups render with sane counts; excluded tags absent.
- [x] `all-tags.test.js` — full tag list renders.
- [x] `tag-pagination.test.js` — paginated tag archive for a known tag.
- [x] `series.test.js` — `/series/` index + a series page; declared entry order respected.
- [x] `feed.test.js` — `/feed.xml` is valid XML; latest N entries present; URLs absolute.
- [x] `no-unresolved-templates.test.js` — scan every generated HTML file; assert no literal `{{ ... }}` output.
- [x] `no-empty-anchors.test.js` — scan every generated HTML file; assert no `<a href="..."></a>` empties.

### Phase 4 — Snapshots

- [x] `project-card.test.js` — variants: `url`+`repo`, `url` only, `repo` only, neither.
- [x] `tag-chip.test.js` — plain, featured, with count.
- [x] `timeline-entry.test.js` — one per category for color coverage; one with parent badge; one with children badge.
- [x] `timeline-week-pill.test.js` — single week + multi-week range.
- [x] `post-list-item.test.js` — note variant, post variant, with/without excerpt.
- [x] `timeline-entry-body.test.js` — representative entry with parent + children + earlier-thread.
- [x] `post-body.test.js` — post with TOC, footnote, code block (collapsed + uncollapsed), `> TODO` blockquote, GitHub embed shortcode.

### Phase 5 — Fixtures (Eleventy programmatic API)

- [x] `timeline-linear-thread/` — A → B → C. Assert ancestors of C, descendants of A.
- [x] `timeline-branching/` — A with children B, C. Assert sibling sort order.
- [x] `timeline-deep-tree/` — exercises `maxDepth=2` and the `continues` flag.
- [x] `timeline-earlier-thread/` — "earlier in thread" section content + ordering.
- [x] `timeline-orphan-parent/` — build throws with expected message.
- [x] `timeline-cycle/` — build throws.
- [x] `timeline-self-parent/` — build throws.
- [x] `timeline-tag-collision/` — tag whose slug matches an entry slug; build throws.
- [x] `timeline-reserved-slug/` — tag named `months`/`weeks`; build throws.
- [x] `timeline-unquoted-date/` — `validateTimelineEntryDateTimeQuotes` throws.
- [x] `timeline-multi-category/` — entry with two category tags; first-match-wins.
- [x] `test/fixtures.test.js` — runs each fixture via programmatic API; asserts positive cases via DOM, negative cases via thrown error message.

### Phase 6 — Refactor eleventy.config.js

- [x] Extract `lib/timeline/refs.js`.
- [x] Extract `lib/timeline/dates.js` (not in original plan; added because `toIsoDatePart` / `parseIsoDateAsUtc` are shared by sort + archives).
- [x] Extract `lib/timeline/sort.js`.
- [x] Extract `lib/timeline/graph.js`.
- [x] Extract `lib/timeline/validate.js`.
- [ ] Extract `lib/timeline/archives.js`.
- [x] Extract `lib/timeline/categories.js`.
- [x] Extract `lib/markdown/code-block.js`.
- [x] Extract `lib/markdown/todo-blockquote.js`.
- [x] Extract `lib/markdown/github-embed.js`.
- [ ] Extract `lib/assets/fingerprint.js`.
- [ ] Extract `lib/build/link-check.js`.
- [ ] Extract `lib/eleventy/excluded-content.js`.
- [ ] Confirm contract + snapshot + fixture suites stay green after each extraction.

### Phase 7 — Unit tests (alongside each extraction)

- [x] `timeline-refs.test.js` — trailing slash, absolute URL, relative, empty, non-string.
- [x] `timeline-sort.test.js` — sort key date/time defaulting, fallback to entry.date, lexicographic ordering invariant; covers `dates.js` helpers too.
- [x] `timeline-graph.test.js` — linear, branching, deep tree with `maxDepth`/`continues`, missing parent ref.
- [x] `timeline-validate.test.js` — valid passes; self-parent, cycle, missing target, non-`/timeline/` ref, non-string each throw with useful messages.
- [ ] `timeline-archives.test.js` — month/week keys; ISO week year-boundary; reserved slugs rejected; tag/entry slug collision rejected.
- [x] `timeline-categories.test.js` — first match wins; no match returns `default`; topic-tag dedup + excluded filtering.
- [ ] `excerpt.test.js` — empty, plain prose, prose with code, length limits.
- [x] `code-block.test.js` — copy button threshold; collapse threshold; language class normalization; unknown language fallback.
- [x] `todo-blockquote.test.js` — production vs dev class; only blockquotes containing `TODO` tagged; case-insensitive.
- [x] `github-embed.test.js` — blob URL with `#L10`, `#L10-L20`, no range; indent trimming preserves blank lines.
- [ ] `link-check.test.js` — detects broken internal links; ignores `mailto:`, hash-only, external, files with extensions.
- [ ] `excluded-content.test.js` — testing-tagged content excluded in production, included in dev; drafts excluded in production.
- [ ] `fingerprint.test.js` — stable hash for unchanged file; new hash on size/mtime change; query/hash preserved.

### Phase 8 — Playwright smoke

- [x] Add `@playwright/test` devDependency + `playwright.config.js` (uses `webServer` against pre-built `_site` via `npx http-server`). Chromium only.
- [x] `e2e/smoke.spec.js`:
  - [x] homepage loads; zero failed network requests; no console errors.
  - [x] theme toggle flips `data-theme-preference` on `<html>` and persists across reload via `localStorage.themePreference`. (Selector: `[data-theme-mode-toggle]`; the persisted preference is the storage source of truth, not `data-theme`.)
  - [x] code block above collapse threshold shows Expand; click toggles `aria-expanded` + visible height.
  - [x] code block Wrap toggle flips `aria-pressed` and class.
  - [x] project card `Link` anchor navigates to expected URL. (All shipped project Link anchors are external; the test asserts the href is reachable rather than driving a cross-origin navigation.)
  - [x] timeline detail page renders parent + child relationship sections. (Target: `/timeline/2026-04-16-published-relational-timeline-entry/`, the one production-built entry with a parent reference; selector `.timeline-thread__branch--parent`.)

Notes:
- Browser binaries are not installed automatically. Run `npm run test:e2e:install` once to fetch the Chromium build Playwright uses.
- The `webServer` block reuses an existing server on `localhost:5173` when present, so iterative runs are quick.

---

## References

- Research note: `docs/references/testing-static-generator-projects.md`
- Eleventy Programmatic API: https://www.11ty.dev/docs/programmatic/
- Playwright: https://playwright.dev/
- linkedom: https://github.com/WebReflection/linkedom
- vitest: https://vitest.dev/
