<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo/lockup-dark.svg">
    <img src="docs/assets/logo/lockup-light.svg" alt="11ty Subspace Builder" width="420">
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/TheClooneyCollection/11ty-subspace-builder/actions/workflows/test.yml"><img src="https://github.com/TheClooneyCollection/11ty-subspace-builder/actions/workflows/test.yml/badge.svg" alt="Tests"></a>
  <a href="https://github.com/TheClooneyCollection/11ty-subspace-builder/releases/latest"><img src="https://img.shields.io/github/v/release/TheClooneyCollection/11ty-subspace-builder" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/TheClooneyCollection/11ty-subspace-builder" alt="License"></a>
  <img src="https://img.shields.io/badge/node-20%2B-339933" alt="Node 20+">
  <img src="https://img.shields.io/badge/Eleventy-3-222222" alt="Eleventy 3">
  <a href="https://subspace-builder.nicholas.clooney.io/"><img src="https://img.shields.io/badge/demo-live-0a7ea4" alt="Live demo"></a>
</p>

An Eleventy blog starter with ten switchable themes, multilingual posts, series, a timeline, and share cards that build themselves.

<table>
  <tr>
    <td><img src="assets/images/theme-previews/swiss-light.webp" alt="Swiss theme"></td>
    <td><img src="assets/images/theme-previews/retro-futurist-light.webp" alt="Retro sci-fi theme"></td>
  </tr>
  <tr>
    <td><img src="assets/images/theme-previews/glass-light.webp" alt="Soft Glass theme"></td>
    <td><img src="assets/images/theme-previews/liquid-glass-dark-dark.webp" alt="Liquid Glass dark theme"></td>
  </tr>
</table>

- **Ten themes and a picker**: readers switch skins and light or dark, and Fun mode rolls one for new visitors. [Theme system](docs/theme-system.md)
- **Share cards, built for you**: a 1200x630 card for every post, note, timeline entry and page, in Retro, Swiss, Glass or Classic. [Share cards](#share-cards)
- **Multilingual, opt-in**: translations get their own URLs, labels and share cards, Chinese included. [Multi-language content](docs/feature-i18n.md)
- **Series and timeline**: group posts, notes and timeline entries into series, and log work on a status-tagged timeline. [Timeline](docs/feature-timeline.md)
- **Responsive images and GitHub embeds**: `@11ty/eleventy-img` and a `{% github %}` shortcode. [Writing content](#more)
- **Sample content you can switch off**: the bundled examples stay in the repo, so updates from upstream rebase cleanly. [Configure](#configure)

## Quick start

```bash
git clone https://github.com/TheClooneyCollection/11ty-subspace-builder my-blog
cd my-blog
npm install
npm run dev              # http://localhost:8080
# npm run prod           # production settings with the dev server
# npm run build          # production build into _site/
```

Images are stored in Git LFS: run `git lfs install` before cloning.

Using a coding agent? Ask it to use the `subspace-setup` skill. It walks through setup, configuration, deploying to Cloudflare Pages and staying current with upstream.

## Configure

Every setting, its default and accepted values are in the [configuration reference](docs/configuration.md). The usual first changes, all in `_data/site.yaml`:

- **Site**: `title`, `url` and author ([site identity](docs/configuration.md#site-identity-and-navigation)).
- **Theme**: `theme.defaultStrategy` and `theme.defaultId` ([theme settings](docs/configuration.md#theme-settings)).
- **Share cards**: `ogImage.style` ([Open Graph images](docs/configuration.md#open-graph-images)).
- **Samples**: `sampleContent: false` hides the bundled posts, notes and timeline entries.

## Share cards

The build renders a card for every page with Satori and Resvg, and caches it until the content changes. Pick one style for the site; details are in [OG images](docs/og-images.md).

<table>
  <tr>
    <td><img src="docs/assets/readme/card-post-retro.webp" alt="Retro card"></td>
    <td><img src="docs/assets/readme/card-post-swiss.webp" alt="Swiss card"></td>
    <td><img src="docs/assets/readme/card-post-glass-dark.webp" alt="Glass dark card"></td>
  </tr>
  <tr>
    <td><img src="docs/assets/readme/card-zh-retro.webp" alt="Chinese post card, Retro"></td>
    <td><img src="docs/assets/readme/card-series-swiss.webp" alt="Series card, Swiss"></td>
    <td><img src="docs/assets/readme/card-timeline-retro-dark.webp" alt="Timeline card, Retro dark"></td>
  </tr>
</table>

## More

<details>
<summary><strong>Writing content</strong></summary>

Create a Markdown file in `posts/` with front matter like:

```markdown
---
title: My Next Adventure
date: 2025-02-01
time: '09:30'
eleventyNavigation:
  key: my-next-adventure
  parent: posts
excerpt: |
  A quick teaser paragraph that appears in post lists.
---

Your post content starts here.
```

- Posts pick up the layout from `posts/posts.json`. `time` orders posts or notes published on the same date. Without `excerpt`, the `excerpt` filter trims the rendered HTML.
- Footnotes use `[^1]` references with `[^1]: note text` definitions, or inline `^[note text]`.
- Images go through `@11ty/eleventy-img`; see [the sample post](posts/samples/responsive-images-eleventy-img.md).
- `{% github %}` embeds a file or snippet from GitHub with highlighting, collapsing and copy.
- `{% from "components/post-list.njk" import renderPostList with context %}` renders a styled list of any collection.

</details>

<details>
<summary><strong>Deployment</strong></summary>

`npm run build` writes the static site to `_site/`; deploy it to any static host. On Cloudflare Pages use build command `npm run build`, output directory `_site` and `NODE_VERSION=20`.

Tachyons loads from a CDN, so the host must allow that request, or replace the `<link>` in `base.njk` with a bundled stylesheet.

</details>

<details>
<summary><strong>Docker</strong></summary>

- `compose.yml` uses the stock `node:25-bookworm-slim` image and installs dependencies at container start.
- Default mode, with public ports: `docker compose up -d`. Dev is on `http://127.0.0.1:8080`, prod on `http://127.0.0.1:8090`.
- Shared-edge mode, with no host ports, for a reverse proxy on the `edge` network: `docker network create edge 2>/dev/null || true`, then `docker compose -f compose.yml -f compose.edge.yml up -d`. Point the proxy at the `dev` or `prod` container.

</details>

<details>
<summary><strong>Starter reset</strong></summary>

`npm run starter:reset` clears the starter's personal metadata (site identity, profile, projects and images) on a fresh fork. Each menu accepts `all`, `skip` or numbers like `1 3 5`; skip the sample menus. To hide the sample content, set `sampleContent: false` instead of deleting it: deleted samples conflict with every later update from upstream.

</details>

<details>
<summary><strong>Project structure, releases and testing</strong></summary>

- [Project structure](docs/project-structure.md)
- [Releases](docs/releasing.md)
- [Testing](docs/testing.md)

</details>

<details>
<summary><strong>FAQ</strong></summary>

**The home page says "No posts published yet" even though posts exist.**
The home page renders `collections.posts`, and Eleventy only adds templates tagged `posts`. Set `"tags": ["posts"]` once in `posts/posts.json` so every file under `posts/` inherits it.

**Why are collections ordered oldest-first?**
`collections.posts`, `collections.notes` and `collections.hiddenNotes` stay in ascending order so templates and pagination can reverse them for newest-first views. With `time: "HH:MM"` in front matter, same-day items sort by time first.

</details>

## License

MIT No Attribution. See [`LICENSE`](LICENSE).
