# 0002 - Multi-Stream Timeline System

**Status:** Parked
**Approach:** YAML-configured per-folder stream definitions

---

## Overview

Generalize the current `timeline/` feature into a reusable stream system so the
site can support multiple independent timeline-style sections such as
`/timeline/`, `/logs/`, or future activity feeds.

Each stream should be defined by YAML config in its own content folder. Eleventy
should treat only explicitly configured folders as streams.

---

## Goals

- Support multiple independent timeline-style content sections
- Keep each stream self-contained in its own folder
- Use YAML, not JSON, for stream configuration
- Generate the same archive structure for each stream:
  - root feed
  - month index and month archive pages
  - week index and week archive pages
  - topic/tag archive pages
- Allow per-stream labels, featured tags, category tags, and category colors
- Scope parent/child validation, reserved routes, and topic archives per stream

---

## Non-Goals

- Do not auto-detect arbitrary folders with Markdown content
- Do not merge topic tags across streams
- Do not implement cross-stream threading or shared archive pages
- Do not change the current URL structure unless a stream explicitly opts into it

---

## Recommended Content Shape

Example folders:

```text
timeline/
  stream.yaml
  timeline.json
  2026-04-14-shipped-timeline.md

logs/
  stream.yaml
  logs.json
  2026-05-01-infra-log.md
```

The important part is the YAML stream config. The directory data file can remain
small and only handle local Eleventy defaults like tags/layout if needed.

I would make `stream.yaml` the source of truth for stream behavior.

---

## Recommended Stream Config

Example `logs/stream.yaml`:

```yaml
id: logs
title: Logs
description: Build notes and operational updates.
permalinkBase: /logs/
entryTag: logs
featuredTags:
  - release
  - infra

labels:
  root: Logs
  months: Months
  weeks: Weeks

categories:
  - id: shipped
    tag: shipped
    label: Shipped
    color: "#27ae60"
  - id: note
    tag: note
    label: Note
    color: "#2980b9"
```

This keeps category detection, labels, and styling local to the stream.

---

## Discovery Rule

Do not scan every top-level folder and guess.

Only folders that contain an explicit `stream.yaml` should be treated as
timeline-style streams. That keeps the build predictable and avoids accidental
route generation.

---

## Routing Model

For a stream with `permalinkBase: /logs/`, generate:

- `/logs/`
- `/logs/months/`
- `/logs/months/{monthKey}/`
- `/logs/weeks/`
- `/logs/weeks/{monthKey}W{weekOfMonth}/`
- `/logs/weeks/{isoYear}-W{isoWeek}/`
- `/logs/{tag-slug}/`

Each stream owns its own topic namespace. That means `/logs/shipped/` and
`/timeline/shipped/` can both exist without conflict.

---

## Validation Rules

Validation should be scoped per stream:

- entries must carry the stream’s `entryTag`
- parent refs must resolve only within the same stream
- category tags reserved by a stream should be excluded from that stream’s topic archives
- topic archive slugs should be checked only against that stream’s own reserved routes and entry URLs

This avoids one stream’s category definitions leaking into another.

---

## Implementation Plan

1. Extract the current timeline archive builders in `eleventy.config.js` into
   generic stream-aware helpers.
2. Add stream discovery from explicit `stream.yaml` files.
3. Build a stream registry that Eleventy can use to generate per-stream
   collections and archive pages.
4. Refactor the current timeline templates into generic stream-aware templates
   that receive a `stream` object.
5. Migrate the existing `timeline/` feature to the new model first, keeping its
   current URLs unchanged.
6. After the migration is stable, add a second stream such as `logs/` as the
   proof that the abstraction is real.

---

## Template Direction

The current `src/timeline*.njk` family should eventually become generic stream
templates. The rendering layer should read:

- stream title/description
- stream labels
- stream category config
- stream featured tags
- stream archive copy

from stream data instead of relying on timeline-specific literals.

---

## Open Decisions

1. Exact filename for stream config:
   - `stream.yaml` is my preferred option
   - alternatives would be `_stream.yaml` or `{folder}.stream.yaml`

2. Where shared default copy lives:
   - global `_data` defaults with per-stream overrides
   - or fully self-contained per-stream copy in each `stream.yaml`

3. Whether a stream should be able to opt into nav automatically or whether nav
   remains explicit in `_data/sidebarNav.yaml`

4. Whether homepage or other pages should aggregate entries across all streams
   later

---

## Recommendation

When this gets implemented, start conservative:

- explicit `stream.yaml`
- per-stream topic archives
- per-stream category config
- no cross-stream aggregation
- keep nav explicit

That gives the flexibility you want without making the build behavior obscure.
