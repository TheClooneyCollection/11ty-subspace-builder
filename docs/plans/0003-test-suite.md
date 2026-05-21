# 0003 - Test Suite

**Status:** Proposed
**Approach:** Layered tests (data invariants, contract, fixtures, snapshots, unit, smoke)

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

- [ ] Add `vitest` and `linkedom` to devDependencies.
- [ ] Add `test`, `test:watch`, `test:e2e` scripts to `package.json`.
- [ ] Create `vitest.config.js` (node environment, include `test/**`).
- [ ] Add `test/helpers/build-once.js` (runs `npm run build` once per suite, caches result).
- [ ] Add `test/helpers/parse.js` (linkedom wrapper for built HTML by URL).
- [ ] Add `test/helpers/normalize-html.js` (strip asset fingerprints, today's date, OG filenames).
- [ ] Wire CI to run `npm run build && npm test`.

### Phase 2 — Data invariants

- [ ] `test/data/invariants.test.js`:
  - [ ] timeline category `tag` values are unique
  - [ ] timeline category `color` matches `/^#[0-9a-f]{6}$/i`
  - [ ] `featuredTags` is an array of strings (if present)
  - [ ] `series.yaml` entries reference real post/note slugs

### Phase 3 — Contract tests (against real build)

- [ ] `home.test.js` — page 1 + page 2 render; post list items present; prev/next pagination works; titles stable.
- [ ] `about.test.js` — `me.yaml` fields render; no unresolved template output.
- [ ] `notes.test.js` — non-hidden notes listed; hidden notes absent.
- [ ] `hidden-notes.test.js` — hidden notes listed; not present in `sidebarNav.yaml` nav.
- [ ] `drafts.test.js` — drafts page exists in dev; (optionally) absent/empty in production.
- [ ] `projects.test.js` — cards present; `Link` and `GitHub` anchors non-empty where data provides `url`/`repo`; no empty anchors.
- [ ] `timeline-index.test.js` — entries render; category color rules applied; pagination titles stable.
- [ ] `timeline-entry.test.js` — title/body/category badge for a known entry.
- [ ] `timeline-months.test.js` — `/timeline/months/` index + a known month archive; entry counts match.
- [ ] `timeline-weeks.test.js` — `/timeline/weeks/` index + a known week archive.
- [ ] `timeline-calendar-weeks.test.js` — ISO week labels; year-boundary case if present.
- [ ] `timeline-tag-archive.test.js` — topic-tag archive renders entries; reserved/excluded tags produce no archive.
- [ ] `tags.test.js` — tag groups render with sane counts; excluded tags absent.
- [ ] `all-tags.test.js` — full tag list renders.
- [ ] `tag-pagination.test.js` — paginated tag archive for a known tag.
- [ ] `series.test.js` — `/series/` index + a series page; declared entry order respected.
- [ ] `feed.test.js` — `/feed.xml` is valid XML; latest N entries present; URLs absolute.
- [ ] `no-unresolved-templates.test.js` — scan every generated HTML file; assert no literal `{{ ... }}` output.
- [ ] `no-empty-anchors.test.js` — scan every generated HTML file; assert no `<a href="..."></a>` empties.

### Phase 4 — Snapshots

- [ ] `project-card.test.js` — variants: `url`+`repo`, `url` only, `repo` only, neither.
- [ ] `tag-chip.test.js` — plain, featured, with count.
- [ ] `timeline-entry.test.js` — one per category for color coverage; one with parent badge; one with children badge.
- [ ] `timeline-week-pill.test.js` — single week + multi-week range.
- [ ] `post-list-item.test.js` — note variant, post variant, with/without excerpt.
- [ ] `timeline-entry-body.test.js` — representative entry with parent + children + earlier-thread.
- [ ] `post-body.test.js` — post with TOC, footnote, code block (collapsed + uncollapsed), `> TODO` blockquote, GitHub embed shortcode.

### Phase 5 — Fixtures (Eleventy programmatic API)

- [ ] `timeline-linear-thread/` — A → B → C. Assert ancestors of C, descendants of A.
- [ ] `timeline-branching/` — A with children B, C. Assert sibling sort order.
- [ ] `timeline-deep-tree/` — exercises `maxDepth=2` and the `continues` flag.
- [ ] `timeline-earlier-thread/` — "earlier in thread" section content + ordering.
- [ ] `timeline-orphan-parent/` — build throws with expected message.
- [ ] `timeline-cycle/` — build throws.
- [ ] `timeline-self-parent/` — build throws.
- [ ] `timeline-tag-collision/` — tag whose slug matches an entry slug; build throws.
- [ ] `timeline-reserved-slug/` — tag named `months`/`weeks`; build throws.
- [ ] `timeline-unquoted-date/` — `validateTimelineEntryDateTimeQuotes` throws.
- [ ] `timeline-multi-category/` — entry with two category tags; first-match-wins.
- [ ] `test/fixtures.test.js` — runs each fixture via programmatic API; asserts positive cases via DOM, negative cases via thrown error message.

### Phase 6 — Refactor eleventy.config.js

- [ ] Extract `lib/timeline/refs.js`.
- [ ] Extract `lib/timeline/graph.js`.
- [ ] Extract `lib/timeline/validate.js`.
- [ ] Extract `lib/timeline/sort.js`.
- [ ] Extract `lib/timeline/archives.js`.
- [ ] Extract `lib/timeline/categories.js`.
- [ ] Extract `lib/markdown/code-block.js`.
- [ ] Extract `lib/markdown/todo-blockquote.js`.
- [ ] Extract `lib/markdown/github-embed.js`.
- [ ] Extract `lib/assets/fingerprint.js`.
- [ ] Extract `lib/build/link-check.js`.
- [ ] Extract `lib/eleventy/excluded-content.js`.
- [ ] Confirm contract + snapshot + fixture suites stay green after each extraction.

### Phase 7 — Unit tests (alongside each extraction)

- [ ] `timeline-refs.test.js` — trailing slash, absolute URL, relative, empty, non-string.
- [ ] `timeline-graph.test.js` — linear, branching, deep tree with `maxDepth`/`continues`, missing parent ref.
- [ ] `timeline-validate.test.js` — valid passes; self-parent, cycle, missing target, non-`/timeline/` ref, non-string each throw with useful messages.
- [ ] `timeline-archives.test.js` — month/week keys; ISO week year-boundary; reserved slugs rejected; tag/entry slug collision rejected.
- [ ] `timeline-categories.test.js` — first match wins; no match returns `default`.
- [ ] `excerpt.test.js` — empty, plain prose, prose with code, length limits.
- [ ] `code-block.test.js` — copy button threshold; collapse threshold; language class normalization; unknown language fallback.
- [ ] `todo-blockquote.test.js` — production vs dev class; only blockquotes containing `TODO` tagged; case-insensitive.
- [ ] `github-embed.test.js` — blob URL with `#L10`, `#L10-L20`, no range; indent trimming preserves blank lines.
- [ ] `link-check.test.js` — detects broken internal links; ignores `mailto:`, hash-only, external, files with extensions.
- [ ] `excluded-content.test.js` — testing-tagged content excluded in production, included in dev; drafts excluded in production.
- [ ] `fingerprint.test.js` — stable hash for unchanged file; new hash on size/mtime change; query/hash preserved.

### Phase 8 — Playwright smoke

- [ ] Add `playwright` devDependency + `playwright.config.js` (uses `webServer` against pre-built `_site`).
- [ ] `e2e/smoke.spec.js`:
  - [ ] homepage loads; zero failed network requests; no console errors.
  - [ ] theme toggle flips `data-theme` and persists across reload via localStorage.
  - [ ] code block above collapse threshold shows Expand; click toggles `aria-expanded` + visible height.
  - [ ] code block Wrap toggle flips `aria-pressed` and class.
  - [ ] project card `Link` anchor navigates to expected URL.
  - [ ] timeline detail page renders parent + child relationship sections.

---

## References

- Research note: `docs/references/testing-static-generator-projects.md`
- Eleventy Programmatic API: https://www.11ty.dev/docs/programmatic/
- Playwright: https://playwright.dev/
- linkedom: https://github.com/WebReflection/linkedom
- vitest: https://vitest.dev/
