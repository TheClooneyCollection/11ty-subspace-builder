# Subspace Builder — Project Context

Personal blog and digital garden for Nicholas Clooney. Built on Eleventy v3.
- Live site: https://subspace-builder.nicholas.clooney.io
- Repo: TheClooneyCollection/11ty-subspace-builder

## Stack

- **Eleventy 3.x** — static site generator
- **Nunjucks** — primary template language (`.njk`)
- **Tachyons** — utility CSS framework (loaded from CDN)
- **markdown-it** — Markdown renderer with custom plugins (anchors, TOC, syntax highlighting)
- **eleventy-img** — responsive image transforms (AVIF, WebP, JPEG at multiple widths)

## Directory structure

```
posts/subspace/   blog posts (Markdown)
notes/            short-form notes
timeline/         personal timeline / captain's log entries
src/              page templates (njk)
_includes/
  layouts/        base.njk, home.njk + partials
  components/     reusable Nunjucks macros
_data/            site.yaml, sidebarNav.yaml, themes.yaml, me.yaml, series.yaml, projects.yaml
assets/css/       custom CSS (code-embeds, highlight, projects, codex-logbook)
scripts/          OG image generation
```

## Collections

Registered in `eleventy.config.js`:
- `posts` — tagged `post`
- `notes` — tagged `notes`
- `timeline` — tagged `timeline`
- `tagList`, `tagGroups`, `drafts` — computed

`excludedTags`: `all`, `nav`, `post`, `posts`, `notes`, `timeline` — these are content-type tags and do not get tag archive pages.

## Content front matter

**Posts / Notes**
```yaml
title:
date:
tags:
excerpt:        # optional; falls back to first 2 paragraphs
draft: true     # hidden in production, visible in dev
```

**Timeline entries** (`timeline/`)
```yaml
title:          # optional
date:
time:           # required — 24-hour HH:MM (e.g. "15:42")
tags:
  - timeline    # always present (set by timeline/timeline.json)
  - shipped     # green  — something released
  - published   # blue   — post or writing went out
  - thinking    # amber  — idea, musing, planning
  # any other tags are topic tags and get archive pages
```

## Theme system

8 named themes (sun, default, mint, grape, charcoal, deep-blue, midnight, terminal). Switching is runtime via JS — no page reload. Each theme sets:
- Tachyons text/background classes on `<html>`
- `--accent` and `--accent-hover` CSS custom properties

Use `var(--accent)` for theme-aware accent color in custom CSS. Use the `theme-text` and `theme-midtone` classes for text that should follow the active theme.

## Build rules — critical

- **The build validates all internal links.** A link to a page that does not exist fails the build.
- Never add a nav entry to `sidebarNav.yaml` before the target page is built.
- Never add cross-page links before both pages exist.
- Always run `npm run build` to verify before committing.

## Feature-flagged nav items

Nav visibility can be controlled from `site.yaml` without touching templates. Pattern used for timeline:

`site.yaml`:
```yaml
timeline:
  showInNav: false
```

`_includes/layouts/home.njk` checks:
```njk
not (item.id == 'timeline' and not site.timeline.showInNav)
```

New gated nav items follow the same hardcoded pattern (matching how drafts are handled).

## Filters (eleventy.config.js)

| Filter | Usage |
|--------|-------|
| `readableDate` | `April 14, 2026` |
| `machineDate` | `2026-04-14` |
| `filterTags` | strips excluded content-type tags from a tag list |
| `excerpt(n)` | first n paragraphs of rendered HTML |
| `assetUrl` | adds content hash for cache busting |
| `slug` | URL-safe slugify |

## Shortcodes

- `{% github "url" %}` — fetches and syntax-highlights a file or range from GitHub. Collapses at 15 lines, copy button at 10.

## Key data files

| File | Purpose |
|------|---------|
| `_data/site.yaml` | global config, theme settings, feature flags, analytics, comments |
| `_data/sidebarNav.yaml` | nav items with URL, active patterns, optional feature flag |
| `_data/me.yaml` | author profile (`me.profile.name`, contacts, about text) |
| `_data/themes.yaml` | theme definitions (id, label, classes, accent) |
| `_data/series.yaml` | series metadata |

## Active feature branches

- `feature/timeline` — production timeline feed (use this for merging)
- `feature/timeline-exploration` — all layout variants built during exploration; reference only
