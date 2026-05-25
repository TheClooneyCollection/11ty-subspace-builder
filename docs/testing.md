# Testing

This document describes the test strategy for `11ty-subspace-builder`: what we
test, how we test it, and what parts of the planned suite are still in flight.

If you add a new test layer, change what a suite is responsible for, or change
how tests are run, update this document in the same change.

## Purpose

The site now has a layered test strategy intended to protect behavior before
and during the ongoing refactor of `eleventy.config.js`.

The testing goals are:
- lock in current site behavior before structural refactors
- catch regressions in built output, relational timeline data, and reusable rendering
- keep failures reviewable and deterministic
- prefer the cheapest test layer that can prove the behavior

## At a Glance

If you only read one section, read this one. What we test, and how:

| Layer | What it proves | How |
| --- | --- | --- |
| **Build gate** | Templates compile, data loads, timeline parents resolve, internal links resolve, timeline date/time front matter is quoted | `npm run build` — fails the whole pipeline if any of these break |
| **Data invariants** | Hand-edited YAML stays internally consistent: timeline category tags unique, color hex shape, `featuredTags` is `string[]`, `series.yaml` refers to real posts/notes/timeline entries | [`test/data/invariants.test.js`](../test/data/invariants.test.js) |
| **Contract tests** | Every page type the site renders actually has the right shape in `_site/`: home + pagination, about, notes, hidden notes, drafts, projects, timeline index + entry, month/week/calendar-week archives, topic-tag archives, tag indexes, paginated tag archive, series, feed.xml; no unresolved `{{ }}` left in any HTML; no empty anchors anywhere | [`test/contract/`](../test/contract/) (19 files) running against the real built site |
| **Snapshots** | Small reusable fragments render the same shape over time: project cards, tag chips, timeline entries (per-category color + parent/children badges), week pills, post list items, plus one full timeline entry body and one full post body with TOC + code blocks + GitHub embeds | [`test/snapshots/`](../test/snapshots/) |
| **Fixtures** | Timeline relational logic and build-time failures, in isolation from real content: linear / branching / deep-tree threads, "earlier in thread" ordering, multi-category precedence; plus negative paths — orphan parent, cycle, self-parent, tag/entry slug collision, reserved slug, unquoted date | [`test/fixtures.test.js`](../test/fixtures.test.js) driving 11 tiny content sets in [`test/fixtures/`](../test/fixtures/) through the real [`eleventy.config.js`](../eleventy.config.js) via a recording harness |
| **Unit tests** | Pure helpers extracted from `eleventy.config.js`: timeline refs / dates / sort / graph / validate / categories / archives, excerpt, slugify, markdown code-block / TODO blockquote / GitHub embed, asset fingerprint, link-check, content exclusion rules | [`test/unit/`](../test/unit/) (one per [`lib/`](../lib/) module) |
| **Browser smoke** | Behavior only a real browser proves: homepage loads with no console errors or failed requests, theme toggle persists across reload, collapsible code-block Expand/Wrap toggles flip state, project card link is reachable, timeline detail page renders relationship sections | [`test/e2e/smoke.spec.js`](../test/e2e/smoke.spec.js) via Playwright (chromium only) |

**Headline number:** 42 vitest files, 296 tests passing, plus the Playwright smoke spec. One shared `_site` build per `npm test` run.

What we deliberately do **not** test: visual regression, OG image pixels, full accessibility sweep, full HTML validation, schema for data files the build already catches (`me.yaml`, `themes.yaml`, `sidebarNav.yaml`, `site.yaml`).

## Current Status

The suite is partially implemented and already useful.

Current state:
- tooling bootstrap is in place
- data invariants are covered
- contract tests cover the main rendered page types
- snapshot tests cover several reusable components and selected full-body output
- fixture tests cover timeline relationship and negative-path scenarios
- `eleventy.config.js` has been split into focused modules under `lib/`
- unit tests cover every extracted module
- Playwright smoke coverage is implemented as a single `test/e2e/smoke.spec.js` spec

In plan terms, all eight phases are substantially landed. The remaining
follow-ups are optional infrastructure polish rather than missing test-design
work.

## Test Philosophy

Tests are organized by what they verify, not by what they import.

Preferred order:
1. Use the build itself for behavior that is visible in final output.
2. Use fixtures for relational and negative-path cases that are awkward to prove against the full site.
3. Use snapshots for small, reviewable rendering surfaces.
4. Use unit tests for pure helpers once behavior has been extracted from `eleventy.config.js`.
5. Use browser tests only for behavior that a DOM parser or build output cannot prove.

This is intentionally biased away from broad browser automation. Most of the
site is static, so the highest-value coverage comes from asserting built output
and build-time data behavior directly.

## Test Layers

### Build

`npm run build` remains the first quality gate.

The build already catches some failures on its own, including:
- broken internal links
- invalid timeline `date` and `time` quoting
- invalid timeline parent references
- timeline parent cycles

The rest of the suite exists to cover behavior the build does not prove well
enough by itself.

### Data Invariants

Data invariant tests cover low-cost checks on data relationships and conventions
that should fail clearly and early.

Current coverage includes:
- timeline category tag uniqueness
- timeline category color format validation
- `featuredTags` shape
- `series.yaml` references resolving to real supported content

These tests are not meant to duplicate schema failures the build already
surfaces for routine data loading.

### Contract Tests

Contract tests assert behavior against the real built site output.

This is the highest-value integration layer. It proves that actual generated
pages still render the expected structure and content.

Current contract coverage includes:
- home pagination and stable listing behavior
- about page rendering
- notes and hidden notes behavior
- drafts behavior
- projects rendering and non-empty link anchors
- timeline index and individual entry rendering
- timeline month, week, and calendar-week archive rendering
- timeline topic tag archives
- tag indexes and paginated tag archives
- series pages
- feed generation
- whole-site scans for unresolved templates
- whole-site scans for empty anchors

Use contract tests when the behavior is site-visible and best validated against
the actual build, not through helper-level assertions.

### Snapshots

Snapshot tests are used for small, normalized HTML fragments that should remain
easy to review in diffs.

Current snapshot coverage includes:
- project cards
- tag chips
- timeline entries
- timeline week pills
- post list items
- a representative timeline entry body
- a representative post body is planned and partially tracked in the suite plan

Snapshots should stay narrow. If a snapshot becomes noisy or hard to review, it
should be reduced or replaced with a more explicit assertion.

### Fixtures

Fixture tests use tiny Eleventy sites to exercise timeline relationships and
negative-path build behavior in isolation.

Current fixture scenarios include:
- linear parent/child threads
- branching threads
- deep descendant trees
- earlier-in-thread behavior
- orphan parent failures
- cycle failures
- self-parent failures
- tag collision failures
- reserved slug failures
- unquoted date failures
- multi-category precedence behavior

Use fixtures when the full site would make the scenario hard to reason about or
when the expected outcome is a build-time throw.

### Unit Tests

Unit tests are for pure helpers extracted from `eleventy.config.js`.

This layer is intentionally downstream of refactoring work. The suite should not
invent artificial seams just to unit test code that is better covered through
contract, snapshot, or fixture tests.

Current visible progress (Phase 6 + Phase 7 complete):
- `lib/excerpt.js` covered by `test/unit/excerpt.test.js`
- `lib/slugify.js` (small shared helper)
- `lib/timeline/refs.js`, `dates.js`, `sort.js`, `graph.js`, `validate.js`, `categories.js`, `archives.js` — each with a matching `test/unit/timeline-*.test.js`
- `lib/markdown/code-block.js`, `todo-blockquote.js`, `github-embed.js` — each with a matching `test/unit/*.test.js`
- `lib/assets/fingerprint.js` covered by `test/unit/fingerprint.test.js`
- `lib/build/link-check.js` covered by `test/unit/link-check.test.js`
- `lib/eleventy/excluded-content.js` covered by `test/unit/excluded-content.test.js`

`eleventy.config.js` is down from ~1633 lines to ~586 lines, and now mostly wires extracted helpers into Eleventy's plugin, collection, filter, and lifecycle hooks rather than implementing logic inline.

### Browser Smoke

A thin Playwright smoke layer covers behavior that only a real browser can
prove. It is intentionally small and is not the primary test strategy for the
site.

Implemented in `test/e2e/smoke.spec.js` (Chromium only):
- homepage loads with no console errors and no failed network requests
- theme mode toggle flips `data-theme-preference` on `<html>` and persists across reload via `localStorage.themePreference`
- collapsible code block (`.code-block--collapsible.code-block--collapsed`) Expand button flips `aria-expanded` and grows the rendered height
- code block Wrap toggle (`[data-wrap-toggle]`) flips `aria-pressed` and toggles the `code-block--wrap` class on the parent
- project card `Link` anchor on `/projects/` has a reachable href
- timeline detail page renders a parent / earlier-thread relationship section

Configuration lives in `playwright.config.js` at the project root. Playwright's
`webServer` serves the prebuilt `_site` via `npx http-server _site -p 5173` and
the suite navigates against `http://localhost:5173`.

## Tooling

The current and planned test stack is:
- `vitest` as the main test runner
- `linkedom` for parsing static HTML
- Eleventy programmatic builds for fixtures
- Playwright for the smoke layer

Supporting helpers are used to:
- build the site once for suites that inspect `_site`
- parse built HTML by route
- normalize unstable output in snapshots

GitHub Actions restores dedicated caches for Eleventy image derivatives
(`.cache/@11ty/img`), OG image artifacts (`.cache/og`), and `eleventy-fetch`
responses so test runs can reuse build outputs without invalidating unrelated
artifacts on every content edit.

## Test Layout

The suite is organized under `test/`:

```text
test/
  data/
  contract/
  fixtures/
  snapshots/
  unit/
  e2e/
  helpers/
```

Intended responsibility by directory:
- `test/data/` for invariant checks on data conventions and references
- `test/contract/` for assertions against the real built site
- `test/fixtures/` for tiny isolated Eleventy scenarios
- `test/snapshots/` for normalized HTML snapshots
- `test/unit/` for extracted pure helpers
- `test/e2e/` for the future Playwright smoke layer
- `test/helpers/` for shared test utilities

## Running Tests

Expected local workflow:
- run `npm run build` as the first gate
- run `npm test` for the Vitest suite
- use `npm run test:watch` during local iteration
- run `npm run test:e2e` for the Playwright smoke suite

The Playwright suite serves `_site` directly, so the directory must exist
before running `npm run test:e2e`. `npm test` builds `_site` via its
`globalSetup` and `npm run build` produces it directly — either is sufficient.

Browsers are downloaded separately from the npm dependency. Run
`npm run test:e2e:install` once after installing dependencies to fetch the
Chromium build Playwright uses.

While phases 6 through 8 are still underway, some parts of the documented
structure are ahead of the completed implementation. Treat this document and
`docs/plans/0003-test-suite.md` together: this file explains the testing model,
while the plan tracks rollout status in detail.

## Choosing the Right Test

When adding coverage:
- use a contract test if the behavior is visible in built site output
- use a fixture if you need a tiny isolated content graph or an expected build failure
- use a snapshot if the output fragment is stable and easy to review
- use a unit test only after extracting a real helper with a coherent API
- use Playwright only if the behavior genuinely needs a browser

Avoid:
- duplicating behavior across multiple layers without a strong reason
- large unreadable snapshots
- browser tests for behavior that static HTML assertions can already prove
- unit tests that lock in internal implementation details before extraction is justified

## What This Suite Does Not Aim To Do

The current plan does not aim to provide:
- visual regression testing
- pixel-level OG image comparisons
- a full accessibility sweep
- a full HTML validation layer beyond existing build and assertion coverage
- exhaustive schema tests for data files whose breakage the build already makes obvious

## Related Documents

- [Test Suite Plan](./plans/0003-test-suite.md)
- [Testing Static Generator Projects Research](./references/testing-static-generator-projects.md)
- [Timeline Feature](./feature-timeline.md)
