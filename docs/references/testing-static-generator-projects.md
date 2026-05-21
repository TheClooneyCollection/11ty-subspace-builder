# Testing Static Generator Projects

Future implementation research note for adding tests to this Eleventy project.

## Goal

Test the generated contract of the site, not Eleventy internals. The most useful
tests should catch broken rendered output, invalid data, and regressions in local
generator logic.

## Recommended Layers

1. Build test

   Keep `npm run build` as the first gate. It catches template syntax errors,
   invalid data access, generator failures, and this repo's existing timeline
   validation failures.

2. Generated HTML contract tests

   Build `_site`, parse important generated pages, and assert visible behavior:

   - `/projects/` has project cards.
   - project cards with `url` render non-empty `Link` anchors.
   - project cards with `repo` render non-empty `GitHub` anchors.
   - timeline pages render category color rules.
   - timeline archive pages exist.
   - pagination titles are stable.
   - feature-flagged nav items appear or disappear correctly.
   - no empty anchors like `<a href="..."></a>`.
   - no unresolved template output like `{{ ... }}`.

   Prefer a DOM parser such as `cheerio`, `linkedom`, or `jsdom` over broad raw
   string matching.

3. Data schema tests

   Validate `_data/*.yaml` directly:

   - `_data/timeline.yaml.categories[]` requires `tag`, `label`, and `color`.
   - timeline category tags are unique.
   - `featuredTags` is an array of strings.
   - `ui.pages.timeline.*` required copy keys exist.
   - project entries include required fields such as `name`, `summary`, and
     `tech`.
   - color values match the expected hex format.

4. Unit tests for local helpers

   Test local generator logic without booting Eleventy where possible:

   - timeline sorting
   - topic tag filtering
   - category tag exclusion
   - parent/child tree building
   - archive key generation
   - date/week/month grouping
   - slug collision detection
   - custom filters with real logic

   If helpers remain embedded in `eleventy.config.js`, consider extracting them
   into small modules before adding focused unit tests.

5. Fixture builds

   Use tiny fixture sites for complex generator behavior:

   - one timeline entry
   - parent/child timeline entries
   - invalid parent reference
   - tag/category collision
   - multiple archive pages

   Eleventy has a programmatic API that can write output with `.write()` or
   inspect generated output with `.toJSON()`.

6. Targeted snapshots

   Use snapshots only when they are small and easy to review:

   - normalized project card fragment
   - normalized timeline entry fragment
   - archive-generation JSON
   - computed route list

   Avoid snapshotting the whole `_site` or large full-page HTML output.

7. Browser smoke tests

   Use Playwright for a small number of integrated checks:

   - homepage loads
   - projects page shows link labels
   - theme toggle works
   - timeline page renders entries
   - timeline detail pages show relationship sections
   - key pages render at mobile and desktop widths

8. Visual regression tests

   Use sparingly for stable, high-value surfaces:

   - project cards
   - timeline entry layout
   - homepage shell
   - theme controls

   Keep baselines deterministic and expect some OS/browser/font sensitivity.

9. Accessibility and HTML quality

   Add a small post-build pass over key pages:

   - axe checks through Playwright
   - generated HTML validation
   - image `alt` checks
   - heading-order checks
   - link checks if not already covered by build validation

## First Tests To Add Here

1. Contract tests for `/projects/`, `/timeline/`, a timeline detail page, and
   paginated home.
2. Data schema tests for `_data/ui.yaml`, `_data/timeline.yaml`, and
   `_data/projects.yaml`.
3. Unit tests for timeline archive/category/relationship helpers.
4. A Nunjucks macro import audit: any component macro that references global
   data such as `ui`, `timeline`, or `me` must be imported `with context`.
5. One Playwright smoke suite for homepage, projects, timeline, and theme mode.

## References

- Eleventy Programmatic API: https://www.11ty.dev/docs/programmatic/
- Eleventy Configuration Events: https://www.11ty.dev/docs/events/
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots
- Playwright accessibility testing: https://playwright.dev/docs/accessibility-testing
- Jest snapshot testing best practices: https://jestjs.io/docs/snapshot-testing
