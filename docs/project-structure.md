# Project structure

| Path | Holds |
| --- | --- |
| `_data/` | Site data: `site.yaml` (settings, see [configuration](configuration.md)), `themes.yaml`, `series.yaml`, `me.yaml`, `projects.yaml`, `ui.yaml`. |
| `_includes/layouts/` | Page layouts and partials, including the header, theme picker and `<head>`. |
| `_includes/components/` | Nunjucks macros such as `post-list.njk`. |
| `posts/`, `notes/`, `timeline/` | Your content. Bundled examples live in each folder's `samples/` and are hidden with `sampleContent: false`. |
| `src/` | Listing and index pages: blog, notes, tags, series, timeline archives, feed, projects, about. |
| `assets/` | CSS, scripts, theme previews and images, copied to the output as-is. |
| `lib/` | Build code: Markdown setup, OG cards (`lib/og/`), i18n, series, timeline, theme bundling, sample content. |
| `scripts/` | Command-line tools: OG generation, theme previews, starter reset. |
| `eleventy.config.js` | Eleventy configuration, filters and build hooks. |
| `test/` | Vitest unit, contract and snapshot tests, plus Playwright end-to-end tests. See [testing](testing.md). |
| `docs/` | Feature and configuration docs. |
