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

## Current Status

The suite is partially implemented and already useful.

Current state:
- tooling bootstrap is in place
- data invariants are covered
- contract tests cover the main rendered page types
- snapshot tests cover several reusable components and selected full-body output
- fixture tests cover timeline relationship and negative-path scenarios
- `eleventy.config.js` extraction into `lib/` has started
- unit tests have started alongside extraction work
- Playwright smoke coverage is still planned, not finished

In plan terms:
- phases 1 through 5 are substantially complete
- phase 6 is in progress
- phase 7 is in progress but depends on more phase 6 extraction
- phase 8 is still open

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
- `series.yaml` references resolving to real content

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

Current visible progress:
- `lib/timeline/refs.js` extracted, with `test/unit/timeline-refs.test.js`
- `lib/timeline/dates.js` extracted (shared by sort and archive helpers)
- `lib/timeline/sort.js` extracted, with `test/unit/timeline-sort.test.js` (also covers `dates.js`)
- `lib/timeline/graph.js` extracted, with `test/unit/timeline-graph.test.js`

Planned unit coverage still to add:
- timeline relationship validation
- timeline archive generation
- timeline category resolution
- excerpt generation
- markdown code block behavior
- TODO blockquote transformation
- GitHub embed parsing helpers
- link checking
- excluded-content rules
- asset fingerprinting

### Browser Smoke

A thin Playwright layer is planned for browser-only behavior.

This layer is expected to stay small. It is not intended to become the primary
test strategy for the site.

Planned scope:
- one smoke spec
- only behaviors that require a real browser to prove

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
- use `npm run test:e2e` once the Playwright layer is in place

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
