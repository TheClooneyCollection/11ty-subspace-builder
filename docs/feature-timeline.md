# Timeline Feature

This document describes the timeline feature implemented in `11ty-subspace-builder`.

If you change timeline behavior, timeline routes, timeline collections, timeline templates, timeline validation, or timeline content conventions, update this document in the same change.

## Purpose

The timeline is a chronological personal log under `/timeline/`.

It supports:
- a main timeline feed
- topic tag archive pages
- month archive pages
- month-banded week archive pages
- ISO calendar week archive pages
- parent/child relationships between timeline entries

## Source Content

Timeline entries live in `timeline/` as Markdown files.

Base data comes from:
- `timeline/timeline.json`
- `timeline/timeline.11tydata.js`
- `_data/timeline.yaml`

Timeline entries always carry the `timeline` tag through `timeline/timeline.json`.
Timeline page copy, archive labels, relationship labels, featured tags, and
category metadata are configured in `_data/timeline.yaml`.

## Timeline Entry Front Matter

Expected front matter:

```yaml
title:
date: "YYYY-MM-DD"
time: "HH:MM"
parent: "/timeline/example-entry/"
tags:
  - timeline
  - shipped
  # one optional category tag from _data/timeline.yaml
  # any other tags are topic tags and get archive pages
```

Rules:
- `date` must be a quoted string.
- `time` must be a quoted string.
- `parent` is optional, but when present it must be a valid `/timeline/.../` URL.
- Timeline parent URLs must use trailing slashes.

## Timeline Data Model

`_data/timeline.yaml` is the source of truth for timeline presentation and
category behavior.

It currently defines:
- page and archive titles/descriptions
- breadcrumb and section labels
- empty-state copy
- relationship and thread labels
- featured timeline tags
- category metadata

Category metadata is declared as an ordered `categories` array. Each item
includes:
- `id`
- `tag`
- `label`
- `color`

The order of `categories` defines precedence if an entry carries more than one
category tag.

## Collection Model

Timeline collections are defined in `eleventy.config.js`.

### `collections.timeline`

Sorted ascending by combined `date` + `time`.

Used by:
- `/timeline/`
- individual entry relationship rendering
- archive pages

### `collections.timelineTagArchives`

Builds topic archives from non-reserved timeline tags.

Route pattern:
- `/timeline/{tag-slug}/`

Reserved or excluded tags are not promoted into topic archives. That includes content-type tags like `timeline` and timeline status tags like `shipped`, `published`, `wip`, `idea`, and `thinking`.
Those reserved category tags are read from `_data/timeline.yaml` rather than
being hardcoded in the templates.

### `collections.timelineMonths`

Builds month archives keyed as `YYYYMM`.

Route pattern:
- `/timeline/months/{monthKey}/`

Each month archive includes:
- `entries`
- `label`
- `weeks`

The `weeks` array is for month-banded week-of-month pages, not ISO calendar weeks.
Each month-banded week item also includes `entryCount` so templates do not need to join against `collections.timelineWeeks`.

### `collections.timelineWeeks`

Builds month-banded week archives.

These are week-of-month groupings derived from entry dates inside a single calendar month.

Route pattern:
- `/timeline/weeks/{monthKey}W{weekOfMonth}/`

Example:
- `/timeline/weeks/202604W3/`

### `collections.timelineCalendarWeeks`

Builds ISO calendar week archives.

Route pattern:
- `/timeline/weeks/{isoYear}-W{isoWeek}/`

Example:
- `/timeline/weeks/2026-W16/`

Each archive includes:
- `entries`
- `weekStartDate`
- `startMonthKey`
- `endMonthKey`

`startMonthKey` and `endMonthKey` let `/timeline/weeks/` group ISO weeks by month and show a cross-month ISO week in both months.

## Route Structure

Implemented routes:
- `/timeline/` main timeline feed
- `/timeline/months/` timeline month index
- `/timeline/weeks/` timeline week index
- `/timeline/weeks/{monthKey}W{weekOfMonth}/` month-banded week page
- `/timeline/weeks/{isoYear}-W{isoWeek}/` ISO calendar week page
- `/timeline/months/{monthKey}/` month archive page
- `/timeline/{tag-slug}/` topic tag archive page

## Templates

Timeline templates currently live in `src/`:
- `src/timeline.njk` main timeline feed
- `src/timeline-tags.njk` topic archives
- `src/timeline-months-index.njk` month index page
- `src/timeline-months.njk` month archives
- `src/timeline-weeks.njk` month-banded week archives
- `src/timeline-calendar-weeks.njk` ISO calendar week archives
- `src/timeline-weeks-index.njk` week index page

Shared timeline entry rendering lives in:
- `_includes/components/timeline-entry.njk`

Shared week pill rendering lives in:
- `_includes/components/timeline-week-pill.njk`

`_includes/components/timeline-entry.njk` reads category ids and colors from
`_data/timeline.yaml`.

## Social Preview Images

The Open Graph image pipeline generates cards for:
- `/timeline/` as `/assets/og/timeline.png`
- each Markdown timeline entry in `timeline/`

The `/timeline/` card text is configured in `_data/site.yaml` under `ogImage.staticEntries`.
Timeline entry pages resolve generated cards through `timeline/timeline.11tydata.js`.
Timeline archive pages do not currently get generated cards.

## Week Index Behavior

`/timeline/weeks/` is the index for all generated week pages.

It groups by month and shows two sections per month:
- month-banded weeks
- ISO calendar weeks

Rules:
- all listed week links show entry counts
- ISO calendar weeks that span two months appear in both months
- month-banded weeks stay within a single calendar month

## Validation Rules

Timeline validation is implemented in `eleventy.config.js`.

Current validation guarantees:
- timeline entries are sorted using quoted `date` and `time` values
- `parent` references must resolve to existing timeline entries
- parent references may not create cycles
- invalid topic archive slugs are rejected when they would collide with reserved timeline routes or entry URLs
- category tags excluded from topic archives are taken from `_data/timeline.yaml`

## Navigation and Discoverability

Current discoverability points:
- `/timeline/` is the main landing page
- `/timeline/months/` indexes all generated month pages
- `/timeline/weeks/` indexes all generated week pages
- `/timeline/months/{monthKey}/` links to that month’s month-banded week pages
- month archive pages link back to `/timeline/months/`
- ISO calendar week pages link back to `/timeline/weeks/`

## Update Rule

Always update `docs/feature-timeline.md` when any timeline implementation changes.

That includes changes to:
- entry front matter requirements
- tag handling
- `_data/timeline.yaml` copy or category structure
- collection shapes
- route patterns
- page templates
- week or month grouping logic
- relationship validation
- navigation between timeline pages
