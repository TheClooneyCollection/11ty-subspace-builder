# OG images

Share cards are 1200 by 630 PNGs generated during the Eleventy build. The default is **Retro sci-fi light**. This visibly changes share images on downstream sites when they upgrade. To keep the previous v3 design, set the site configuration property `ogImage.style: classic`:

```yaml
# _data/site.yaml
ogImage:
  style: classic
```

## Choose a design

| Style ID | Appearance |
| --- | --- |
| `retro` | Default light Retro sci-fi, bold type and orbit artwork. |
| `retro-dark` | Dark Retro sci-fi. |
| `swiss` | Light grid layout with red metadata. |
| `swiss-dark` | Dark Swiss layout. |
| `glass-dark` | Dark glass with a blurred gradient background. |
| `glass-light-b` | Light Glass variant B. |
| `glass-light-c` | Light Glass variant C. |
| `classic` | Previous v3 title-and-excerpt card. |

These are share-image styles, separate from the website's reader theme. A card is a static image; the reader's light/dark preference does not change it. `glass` alone is not a valid style ID.

```yaml
# _data/site.yaml
ogImage:
  style: retro
  siteName: example.com
```

`siteName` is optional and defaults to the host of `site.url`. Keep existing `staticEntries` alongside these settings. See the [configuration reference](configuration.md#open-graph-images) for static entry fields and filename rules.

A content page can override the style:

```yaml
---
title: Building a small observatory
date: "2026-11-16"
ogStyle: swiss-dark
---
```

Invalid styles fail the build with the complete allowed list.

## Content, series and Chinese cards

Post, note, timeline and configured static page cards derive their labels from content type. A timeline card uses the first known status tag in entry tag order (`shipped`, `thinking`, `wip`, `idea`, `published`). It removes a leading `word:` or `word(scope):` from the title only when such a status is present. Without one, the label is `Timeline` or `时间线`, and the title is unchanged. A resolved timeline parent contributes its title as a caption in Swiss and Glass; the approved Retro layout does not display that caption.

Series metadata comes from `_data/series.yaml`, using `entries` or the OG resolver's legacy `posts` fallback. Declared URL order determines the part number and total, independent of the series page's sort choice. The first matching series is selected when a page belongs to several. Set front matter `ogSeries: observatory` to choose another matching series ID, or `ogSeries: false` to omit series information. An invalid ID or nonmember series fails the build and lists the IDs valid for that entry.

New series designs say **Part N of M**. Retro puts progress dots above the site footer without a large part numeral; Swiss uses a red progress line without a bar; Glass places the series name above the title and progress beside the footer site name. Classic preserves the previous title-and-excerpt layout.

Chinese posts and notes have separate generated cards with their Chinese titles, `文章`/`笔记` labels, Chinese date formatting and `第 N 篇，共 M 篇` progress. Series titles use `_data/locales/zh.yaml` at `series.<id>.title`, falling back to the base series title or ID. Glass uses narrower completed progress marks for Chinese series. This localized card behavior specifically targets `zh`; it does not promise equivalent card translations for every configured locale.

## Fonts and licenses

The renderer loads font files from npm packages, never from the operating system. All five families are distributed under **SIL Open Font License 1.1**. Their package `LICENSE` files accompany the installed font software. Newsreader is the newly added dependency; the implementation was checked with `@fontsource/newsreader` 5.3.0.

| Styles | Loaded font files and weights |
| --- | --- |
| Swiss | Inter 400, 500, 700, 800; Noto Sans SC 400, 700, 900. |
| Retro | Lexend 500, 800; Noto Sans SC 400, 700, 900. |
| Glass | Inter 400, 500, 700; Newsreader 400, 700; Noto Sans SC 400, 700. |
| Classic | Lexend 700; Inter 400, 500; Noto Sans SC and Noto Sans TC 400, 500, 700. |

Glass titles use Newsreader for Latin and Noto Sans SC for Chinese. The Chinese title alias reuses the 400-weight file; it is not an additional font package. The renderer registers the SC 900-weight file as weight 800 for the bold Swiss/Retro title stack. Font assets use `.woff`, since this Satori path does not read WOFF2.

A browser CSS stack containing Georgia does not make Georgia available to Satori: Satori only uses font files explicitly supplied to it, and Linux build hosts do not inherit a developer's system fonts. System font redistribution also needs its own license permission. The packaged OFL fonts keep rendering portable without copying Georgia or other system font files. Preserve the packages' license notices when redistributing their font files.

## Typography and long titles

Card text normalizes nonbreaking hyphens and typographic hyphens to `-`, nonbreaking spaces to ordinary spaces, and removes soft hyphens and zero-width characters. Figure dashes become en dashes and horizontal bars become em dashes. Curly quotes and en/em dashes remain intact. This applies to titles, excerpts, parent captions, series titles and site names, without changing source content or URL identities.

Every build checks the text emitted by each template against the cmap tables of its loaded font files, including cached cards. Missing characters produce a warning naming the source page, style and Unicode code point; they do not stop the build. This checks character coverage, not every shaping or emoji-composition behavior. Classic's older font set can still lack emoji and some symbols. Unsupported characters are reported rather than silently replaced.

The initial title sizes preserve the selected design. Before rasterization, Satori measures a copy of the layout without decorative paint, reserving space for metadata, series progress and the footer. Titles that fit retain their exact layout. Oversized titles shrink in steps to the design's minimum; if still too long, they end in an ellipsis within the available area instead of being clipped. The same fitting applies to English and Chinese titles, and to the main excerpt on static page cards. Extremely long words can break within the clamped text.

## Cache and reproducibility

The build runner uses `lib/og/card-data.js` to normalize card inputs, one pure template module per design family, and `lib/og/render.js` to render with Satori and Resvg. `lib/og/cache-key.js` computes a full SHA-256 key from:

- The complete normalized card data, including style, variant, language, kind, title, excerpt, formatted date, parent title, series metadata, site name and dimensions.
- Hashes of template source and shared helper source supplied by the runner.
- Hashes of the font files loaded for the selected design.
- Satori and Resvg versions, plus the manual `TEMPLATE_VERSION` override.

Object keys are sorted, text is NFC-normalized, line endings are normalized, and source identifiers use relative POSIX paths. Dates use UTC getters for Date objects or components of the source date string, avoiding machine-local timezone formatting.

Adding a series entry changes its total and invalidates affected cards. Changing a parent's title invalidates child captions. Changing an unrelated tag does not invalidate a card if the normalized card data is unchanged; changing a timeline status can change that data. Template and font edits also invalidate the appropriate cards.

Generated files live under `assets/og/`, lookup data in `_data/ogImages.json`, and the cache manifest in `.cache/og/manifest.json`. A matching cache key is reusable only while its PNG exists. Chinese entries have separate identities and outputs. Cache/output files are generated, not a source of editorial truth. A fresh hosted checkout must render again when generated assets and cache are unavailable. There is no local-render deployment mode in this implementation.

## Development previews

Run the normal development site and open `/og/` to inspect the generated English and Chinese cards, with their titles, page links and image links. It links to the draft comparison post at `/posts/draft-og-card-styles/`.

The draft shows the same neutral samples across all eight styles: a post, a long title, Chinese content, a series entry, a timeline entry and a static page. Each variant is labelled with its `ogImage.style` value. Sample images are generated under `assets/og/showcase/`.

The gallery, draft comparison post and showcase sample images are development-only. In this starter, `draft: true` alone hides content from production collections but does not prevent page rendering. The comparison post has its own production `permalink: false` gate. Existing drafts keep their previous OG generation behavior. With `ELEVENTY_ENV=production`, the gallery, comparison post and sample images are neither rendered nor emitted; the production renderer does no showcase work. Normal published-content share cards still render in production.

## Build cost

The following are **user-provided reference measurements from a Mac design renderer**, after warm-up, not benchmarks of this Builder checkout. They describe the design versions used as the implementation reference. Hardware, title mix, cold font loading and hosted environments affect total time.

| Design | Reference time per card | Approximate 311-card rendering time |
| --- | --- | --- |
| Swiss | 66 ms | 21 seconds |
| Retro | 71 ms | 22 seconds |
| Glass | 700 to 770 ms | 3.6 to 4 minutes |

Glass spends much of its time on the blurred background. Chinese font use did not materially change these reference measurements. Cache hits avoid rendering unchanged cards; fresh hosted builds may render every card. Treat the numbers as a planning reference, not a guaranteed deployment duration.

Any benchmark from this Builder's smaller sample site should be reported separately, with environment, card count, cold/warm cache state and whether development showcase cards were included. No Builder benchmark is claimed by the table above.

Possible future Glass optimizations include pre-rendering a background once per variant and using a worker pool. These are proposals, not enabled features; background reuse has not been validated here. Local-render deployment and CJK subsetting also remain outside this implementation.
