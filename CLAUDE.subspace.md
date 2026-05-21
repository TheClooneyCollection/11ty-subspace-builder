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
docs/             feature and planning documentation
src/              page templates (njk)
_includes/
  layouts/        base.njk, home.njk + partials
  components/     reusable Nunjucks macros
 _data/            site.yaml, sidebarNav.yaml, themes.yaml, me.yaml, series.yaml, projects.yaml, timeline.yaml, ui.yaml
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
hidden: true    # notes only: public by URL, omitted from /notes/, listed at /notes/hidden/
```

Notes under `notes/hidden/` inherit `hidden: true` from `notes/hidden/hidden.json`.

**Timeline entries** (`timeline/`)
```yaml
title:          # optional
date: "YYYY-MM-DD" # required; keep quoted so YAML treats it as a string
time: "HH:MM"      # required; keep quoted, 24-hour HH:MM (e.g. "15:42")
parent: "/timeline/2026-04-14-example-entry/" # optional; use the target entry's URL path
tags:
  - timeline    # always present (set by timeline/timeline.json)
  - shipped     # category tags and colors are defined in _data/timeline.yaml
  # any other tags are topic tags and get archive pages
```

Timeline `date` and `time` values must stay quoted strings. Unquoted YAML dates are parsed as JavaScript `Date` objects before Eleventy collection sorting runs, which can break within-day ordering.
Timeline parent references use the entry URL path (`page.url`), including the trailing slash.
Timeline feature documentation lives in `docs/feature-timeline.md`.
If you change any timeline implementation detail, update `docs/feature-timeline.md` in the same change.
Timeline archive indexes currently exist at `/timeline/weeks/` and `/timeline/months/`.
Timeline page copy, relationship labels, and archive labels live in `_data/ui.yaml` under `pages.timeline`.
Timeline featured tags and category metadata live in `_data/timeline.yaml`.

## Theme system

8 named themes (sun, default, mint, grape, charcoal, deep-blue, midnight, terminal). Switching is runtime via JS — no page reload. Each theme sets:
- Tachyons text/background classes on `<html>`
- `--accent` and `--accent-hover` CSS custom properties

Use `var(--accent)` for theme-aware accent color in custom CSS. Use the `theme-text` and `theme-midtone` classes for text that should follow the active theme.

## Build rules — critical

- **The build validates all internal links.** A link to a page that does not exist fails the build.
- **The build validates timeline front matter.** `timeline/*.md` entries must quote `date` and `time`.
- **The build validates timeline parent refs.** `parent` must point at an existing `/timeline/.../` entry URL and may not create cycles.
- Never add a nav entry to `sidebarNav.yaml` before the target page is built.
- Never add cross-page links before both pages exist.
- Always run `npm run build` to verify before committing.

## Commit messages

Use Conventional Commits:

```
type(optional-scope): concise imperative summary
```

Keep the summary lowercase after the colon unless it starts with a proper noun. Prefer the established repo types:

- `feat:` for new user-facing behavior
- `fix:` for bug fixes
- `docs:` for documentation-only changes
- `content:` for post, note, timeline, or copy changes
- `chore:` for maintenance and release work

Use a scope when it adds useful context, as in `feat(theme): ...` or `docs(timeline): ...`.

Concrete examples from recent history:

- `feat: add hidden notes index`
- `fix: wrap long prose links on mobile`
- `docs: update release workflow sync step`
- `feat(theme): add auto/light/dark theme mode control and configurable delayed previews`
- `content: prefix timeline feature titles`
- `chore: release v1.32.1`

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
| `_data/timeline.yaml` | timeline featured tags and category metadata |
| `_data/ui.yaml` | shared UI copy for templates and components, including `pages.timeline` |

## Skills

| Skill | Trigger |
|-------|---------|
| `/release` | Cut a new versioned release — see `.claude/skills/release/SKILL.md` for the full convention (semver, commit format, `gh release` title/body rules). |

## Active feature branches

- `feature/timeline` — production timeline feed (use this for merging)
- `feature/timeline-exploration` — all layout variants built during exploration; reference only
