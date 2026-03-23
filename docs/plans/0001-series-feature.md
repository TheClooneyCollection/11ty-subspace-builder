# 0001 - Series Feature

**Status:** Planned
**Approach:** Option A - Pure YAML Data + 11ty Pagination

---

## Overview

Add a "Series" root navigation item that presents curated collections of existing posts. Each series has an introduction and supports client-side sorting. The default order is hand-curated, with options to reverse it or sort by date.

---

## Goals

- New `/series/` listing page showing all defined series
- Individual `/series/[id]/` pages showing curated post lists
- Sorting: curated (default), reverse curated, date ascending, date descending
- No changes required to existing posts
- Uses only existing 11ty primitives (no new plugins)

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `_data/series.yaml` | Create | Series definitions + curated post slug lists |
| `src/series/index.njk` | Create | `/series/` listing page |
| `src/series/series-page.njk` | Create | Individual series pages via 11ty pagination |
| `_data/sidebarNav.yaml` | Edit | Add "Series" nav item |
| `eleventy.config.js` | Edit | Add `getPost` filter (~3 lines) |

---

## Data Structure

### `_data/series.yaml`

```yaml
- id: getting-started
  title: "Getting Started with Subspace Builder"
  intro: |
    This series walks you through the core concepts...
  posts:
    - slug: my-first-post
    - slug: configuring-your-build
    - slug: advanced-patterns

- id: release-notes
  title: "Release Notes"
  intro: |
    A curated log of notable releases and what changed.
  posts:
    - slug: v1-12-0-roundup
    - slug: some-other-release
```

Slugs correspond to post filenames (without extension) in `posts/subspace/`.

---

## How Individual Series Pages Are Generated

`src/series/series-page.njk` uses 11ty's native pagination to generate one page per series entry:

```yaml
---
pagination:
  data: series
  size: 1
  alias: seriesItem
permalink: "/series/{{ seriesItem.id }}/"
---
```

No custom plugin needed. This is standard 11ty.

---

## Post Lookup

Add one filter to `eleventy.config.js`:

```js
eleventyConfig.addFilter("getPost", (posts, slug) =>
  posts.find(p => p.fileSlug === slug)
);
```

Use in the series page template:

```njk
{% for postSlug in seriesItem.posts %}
  {% set post = collections.posts | getPost(postSlug) %}
  {# render post card with post.data.title, post.data.date, post.url, etc. #}
{% endfor %}
```

---

## Navigation

Add to `_data/sidebarNav.yaml`:

```yaml
- id: series
  label: Series
  url: /series/
  activePatterns:
    - type: startsWith
      value: /series/
```

---

## Sorting

Each post card rendered in the series page gets data attributes at build time:

```html
<li data-curated="0" data-date="2025-10-29">...</li>
```

Four buttons at the top of the series page:

```
[Default] [Reverse] [Oldest First] [Newest First]
```

A small inline `<script>` (roughly 20 lines of vanilla JS) handles button clicks and reorders the list in-place. No page reload. No framework.

- **Default**: DOM order as rendered (YAML curated order)
- **Reverse**: Reverse DOM order
- **Oldest First**: Sort ascending by `data-date`
- **Newest First**: Sort descending by `data-date`

---

## Tradeoffs

### Pros
- No changes to any existing post files
- Curation is centralized in one YAML file, easy to edit
- Uses 11ty's native pagination (no new dependencies)
- Follows existing data-file patterns (`projects.yaml`, `themes.yaml`, etc.)
- Minimal new code

### Cons
- Posts don't "know" they belong to a series (no back-link on post pages)
- If a post file is renamed, the YAML slug reference must be updated manually

### Future Extension (Option C / Hybrid)
If back-links from individual post pages become desirable ("Part of: [Series Name]"), add `series: series-id` to relevant post front matter. No structural changes needed, just a template addition and some front matter edits.

---

## Alternatives Considered

### Option B: Front Matter + Custom Collection
Add `series: series-id` and `seriesOrder: N` to each post's front matter. Custom 11ty collection groups posts by series.
- Pro: Posts self-describe membership, easy to query
- Con: Must edit every existing post, ordering via numbers is tedious to maintain

### Option C: Hybrid (YAML metadata + front matter membership)
`series.yaml` defines metadata and order. Posts also carry `series: id` for back-links. Most flexible but most maintenance overhead.
