# 0004 - Generalized Series Feature

**Status:** Approved
**Approach:** URL-driven mixed-content series

---

## Summary

Generalize the series feature from post-only to mixed-content series that
support posts, notes, and timeline entries. The implementation switches
`_data/series.yaml` from `posts:` to `entries:` as the canonical list of member
URLs, resolves series members from a unified content pool, and renders the
existing "Part of a series" box on all supported detail pages.

This remains a URL-driven model. It does not introduce front matter membership,
new collections, or project-page support in this pass.

---

## Key Changes

### Data model and resolution

- Change series definitions in `_data/series.yaml` from `posts:` to `entries:`.
- Treat each entry as a canonical output URL such as `/posts/.../`,
  `/notes/.../`, or `/timeline/.../`.
- Resolve series members from a unified lookup built from
  `collections.posts`, `collections.notes`, and `collections.timeline`.
- Keep current validation behavior:
  - skip duplicate URLs within one series and warn once
  - warn in non-production when a series includes draft content that will
    disappear in production
  - fail production builds when a referenced URL does not resolve
- Return neutral computed data such as `resolvedSeries.entries` rather than
  `resolvedSeries.posts`.

### Rendering and shared page behavior

- Update `/series/` index and `/series/[id]/` detail pages to render mixed
  content entries without assuming "post".
- Keep existing sort modes and behavior:
  - curated order
  - reverse curated
  - oldest first
  - newest first
- Use each resolved entry's existing metadata for title, date, tags, excerpt or
  content preview, and URL.
- Generalize backlink computation out of `posts/posts.11tydata.js` into a
  shared computed-data helper used by posts, notes, and timeline entries.
- Replace `postSeries` with a neutral property, `contentSeries`.
- Render the "Part of a series" box on all supported detail pages, not just
  `/posts/.../`.

### Copy, contracts, and docs

- Replace post-specific UI copy on series pages with neutral entry/content
  wording where counts or empty states are shown.
- Update README and project docs so series is described as mixed-content rather
  than curated post lists.
- Record this work as a new plan document rather than rewriting the original
  series plan.

---

## Public Interface Changes

- `_data/series.yaml`
  - canonical field changes from `posts: string[]` to `entries: string[]`
- Computed template data
  - `resolvedSeries.posts` becomes `resolvedSeries.entries`
  - `postSeries` becomes `contentSeries`
- Series-related UI text
  - count and empty-state labels become content-neutral

No URL structure changes are planned for `/series/` or for any content pages.

---

## Test Plan

- Update data invariant tests to require `entries:` and verify every referenced
  URL resolves to a real supported source item.
- Update series contract tests to verify:
  - `/series/` index renders all declared series
  - a mixed-content series page preserves declared curated order
  - series detail pages render non-post URLs correctly
  - sort controls still reorder by date for mixed content
- Add coverage that posts, notes, and timeline detail pages each render the
  series membership box when included in a series.
- Add at least one fixture series containing one post, one note, and one
  timeline entry.
- Run `npm run build` and the relevant test suite to confirm no broken links,
  correct resolution, and no production-only failures.

---

## Assumptions

- First-pass supported types are exactly posts, notes, and timeline entries.
- Timeline entries participate fully, including backlinks on detail pages.
- The migration is immediate rather than compatibility-based: `entries:` is the
  supported key after the change.
- Projects and other non-collection pages remain out of scope for this pass.
- Existing series sorting stays date-based and uses the already-rendered page
  date and time metadata without introducing a new explicit per-entry type
  field.
