# 0002 - Home Page Pagination

**Status:** Planned
**Approach:** Option A - Native 11ty Pagination for `/`

---

## Overview

Paginate the home page only. Keep page 1 at `/`, generate later pages at
`/page/2/`, `/page/3/`, and so on, and show posts in newest-first order.

This stays intentionally narrow:

- No tag pagination yet
- No series pagination yet
- No new global pagination system yet

The main implementation constraint is ordering. The current home page renders
`collections.posts` through a shared macro, and that macro reverses items at
render time. That is fine for a single page, but incorrect once we paginate,
because page boundaries would be computed before the reverse happens.

---

## Goals

- Paginate the home page at build time
- Keep the first page canonical at `/`
- Show newest posts first on every home page
- Add simple previous/next navigation
- Keep the Blog sidebar item active on paginated home routes
- Avoid over-engineering while we only need pagination on one page

---

## Non-Goals

- Paginating tag pages
- Paginating series pages
- Paginating drafts or projects
- Adding search, infinite scroll, or client-side pagination

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `src/index.njk` | Edit | Add build-time pagination and pager UI for the home page |
| `_includes/components/post-list.njk` | Edit | Add optional `reverse` parameter so callers control ordering |
| `_data/sidebarNav.yaml` | Edit | Keep the Blog nav state active on `/page/[n]/` routes |

---

## Proposed Routing

- `/` = page 1
- `/page/2/` = page 2
- `/page/3/` = page 3

Page 1 should not emit `/page/1/`.

This keeps the first page clean and canonical while preserving obvious URLs for
later pages.

---

## Page Size

Start with **10 posts per page**.

Reasoning:

- Large enough that the home page still feels substantial
- Small enough to keep page length under control as posts accumulate
- Easy to adjust later if real content volume suggests a different cutoff

Hardcode `size: 10` directly in `src/index.njk`. 11ty's `pagination.size` in frontmatter must be a literal integer at parse time, so data references like `site.pagination.home.size` are not available when the pagination block is processed. A comment in the template pointing to the value is enough documentation.

---

## Ordering Strategy

We need the home page data to be newest-first **before** pagination slices are
created.

Current behavior:

- `collections.posts` is oldest-first by default
- `post-list.njk` reverses the list during rendering via `| reverse`

Problem:

If `post-list.njk` reverses at render time, pagination slices are computed
before the reverse happens. Page 1 would contain the oldest chunk of posts,
not the newest.

Required change:

- The pagination block in `index.njk` sets `reverse: true` so 11ty produces
  newest-first slices before the template runs
- `post-list.njk` gains an optional `reverse` parameter (default `true`) that
  controls whether it applies `| reverse` internally
- The home page passes `reverse=false` since the data is already ordered
- All other callers (tag pages, series pages, drafts) continue to pass nothing,
  getting the existing `reverse=true` default and keeping their current behavior

This prevents page 1 from accidentally containing the oldest chunk of posts,
and avoids silently breaking ordering on every other page that uses the macro.

---

## Home Page Behavior

`src/index.njk` becomes a paginated template whose current page receives only
its own slice of posts plus pagination metadata.

Expected behavior:

- The heading remains "Latest Posts"
- The list renders only the posts for the current page
- Pagination controls appear only when there is more than one page
- Page 2+ gets a distinct page title, e.g. `Home · Page 2`

For the pager UI, v1 should be intentionally simple:

- Previous link when a previous page exists
- Next link when a next page exists
- A small `Page X of Y` indicator

Numbered pagination links are optional for later. They are not required for the
first implementation.

---

## Navigation State

The Blog nav item currently matches `/` and `/posts/`, but not `/page/2/`.

Update the Blog item in `_data/sidebarNav.yaml` so paginated home routes still
show Blog as active.

Expected matching:

- `/`
- `/page/2/`
- `/page/3/`
- `/posts/...`

---

## Metadata

Page metadata should remain stable and unambiguous.

- `/` keeps the existing home title
- `/page/2/` and later pages get an explicit page suffix in the title
- The canonical URL should resolve to the current page URL, not always `/`

The existing layout stack already builds canonical URLs from `page.url`, so this
should fall out naturally once routing is correct.

---

## Why This Approach

### Pros

- Uses standard 11ty behavior instead of custom runtime code
- Limits changes to four files
- Produces stable, crawlable URLs
- Keeps the current post list component reusable
- Leaves room to extract a shared pager later if tags and series need the same UI

### Cons

- `post-list.njk` grows a parameter, though it defaults to existing behavior so
  no existing callers need to change
- If we later paginate more list pages, we may want to refactor pager markup
  into a shared include

---

## Verification Checklist

- Build succeeds in development
- Build succeeds in production
- `/` shows the newest posts
- `/page/2/` exists when enough posts are present
- No `/page/1/` route is generated
- Previous/next links point to the correct pages
- Pager is hidden when only one page exists
- Blog nav remains active on paginated home routes
- Draft filtering in production still yields correct page counts

---

## Follow-On Work

If home-page pagination works well, the same pattern can later be extended to:

- `/drafts/`
- `/tags/[tag]/`
- `/series/[id]/`

At that point it will likely be worth extracting:

- A shared pager include
- Shared list-page title conventions
