# Configuration reference

Edit the YAML files in `_data/`. This reference describes the settings consumed by the current templates and JavaScript. **Shipped** means the value in this starter; **fallback** means behavior when a setting is missing. They are not always the same. Omitted optional strings have no value unless a fallback is listed. YAML does not validate most settings, so use the types described below.

## Site identity and navigation

All paths in this section are relative to `_data/site.yaml`.

| Setting | Shipped value / fallback | Accepted value and effect |
| --- | --- | --- |
| `title` | `11ty Subspace Builder`; page fallback `metadata.title`, feed fallback `Feed` | Site name string, used in the header, page titles and RSS. |
| `url` | Starter public URL; RSS fallback `http://localhost:8080` | Absolute site origin for canonical, feed and social image URLs. Set your deployment URL. |
| `description` | Omitted; feed falls back to `tagline`, then title | RSS description string; also permitted in locale overrides. Page SEO separately uses page description, excerpt, rendered content, then `metadata.description`. |
| `tagline` | Omitted | RSS description fallback string. |
| `author.name`, `author.email` | Starter author details | Strings retained as author data and used by starter reset. Current page/feed templates do not render them; the About page uses `me.profile`. |
| `home.target` | `blog` / `blog` | `blog`, `notes`, or `timeline` selects the section rendered at `/`. Its matching sidebar item moves first. Other IDs do not create a homepage automatically. |
| `home.intro` | Omitted; first `me.intro.paragraphs` item, then `metadata.description` | Intro text on the blog index. |
| `timeline.showInNav` | `true`; omitted is false-like | Boolean controlling the timeline sidebar item, not page generation. |
| `series.defaultSort` | `curated` / `curated` | `curated`, `reverse`, `date-asc`, `date-desc`. Per-series setting takes precedence. Invalid values warn and fall through to the next valid setting. |
| `mastodon.relMe.enabled` | `true`; omitted is false-like | Boolean enabling a verification link when URL is also present. |
| `mastodon.relMe.url` | Starter profile URL; no fallback | Profile URL for `<link rel="me">`. |

`metadata.title`, `metadata.description`, and `metadata.language` are legacy template fallbacks. This starter ships no `metadata` data file; configure that object explicitly if you rely on it. RSS language is currently fixed to `en`.

### Sidebar: `_data/sidebarNav.yaml`

An ordered array of navigation objects, with no implicit entries. `id` is the stable string used by home routing and locale labels; `label` is displayed text; `url` is the destination. `hidden: true` suppresses an item (default false). `activePatterns` is an optional array of `{type, value}`; `type` accepts `equals` or `startsWith`, and `value` is a URL path. If omitted, the rule is exact equality to the item's URL. Unknown rule types never match.

The `drafts` ID is hidden in production. The `timeline` ID additionally requires `site.timeline.showInNav`. There is no generic feature-flag field. Internal destinations must exist or link validation fails.

## Theme settings

These settings live under `site.theme`. See [Theme system](theme-system.md) for CSS, migration and reader preferences. Reader choices in localStorage and URL overrides can supersede site defaults.

| Setting | Shipped / fallback | Accepted value and effect |
| --- | --- | --- |
| `showSelectors` | `true` / `true` | Boolean showing the header theme controls. |
| `defaultStrategy` | `fun` / `fun` | `simple` uses `defaultId`; `fun` chooses from weekday/weekend pools and remembers each roll. Only exact `simple` selects simple behavior. |
| `defaultId` | `glass` / `glass` when available, otherwise first theme | Existing theme ID. The runtime falls back to the first theme for an unknown ID. |
| `defaultMode` | `auto` / `auto` | `auto`, `light`, `dark`. Auto follows the operating system. Paired fixed-scheme themes can switch to their partner. |
| `weekdayThemes` | Omitted / `[glass, liquid-glass-dark, starship, holo]` | Array of eligible theme IDs for Monday through Friday in the reader's local time. |
| `weekendThemes` | Omitted / `[zine, retro-futurist, brutalist]` | Array of eligible theme IDs for Saturday and Sunday. Invalid, migrated or retired IDs are filtered; an empty pool uses the default. |
| `transitionDuration` | `0.5s` / `0.35s` | CSS time for background/text color transitions. |
| `transitionTimingFunction` | `ease-in-out` / `ease` | CSS timing function, such as `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, or `cubic-bezier(...)`. |
| `fadeDuration` | `0.7s` / `0.7s` | CSS time for supported View Transition crossfades; reduced-motion users skip them. |
| `fadeBlur` | `8px` / `8px` | Nonnegative CSS length for crossfade blur. Use `0px` to disable blur. |

Legacy `autoLightId` and `autoDarkId` are still read into HTML attributes but do not control the current runtime. `previewResetDelay` is assigned a template fallback of `200` but unused; `previewHoverDelay` is not read. Do not use these retired settings to configure the picker.

### Theme definitions: `_data/themes.yaml`

An ordered array, not a map. No entry is synthesized when the file is empty. Visible themes need existing preview images or the build fails.

| Field | Default / accepted value | Effect |
| --- | --- | --- |
| `id` | Required unique string | Theme key and optional `assets/css/themes/<id>.css` filename. |
| `label` | Supply display string | Picker name. |
| `description` | Omitted | Picker description string. |
| `scheme` | Supply `light`, `dark`, or `both` | Supported color schemes. |
| `tokens.light`, `tokens.dark` | Supply supported scheme maps | CSS values keyed by token name. Supply `bg`, `ink`, `muted`, `accent`, `rule`, `surface`; all additional keys become CSS custom properties. |
| `tokens.font.body`, `.display`, `.mono` | Supply CSS font stacks | Font custom properties. Preserve CJK fallbacks. Additional roles also become `--font-<role>`. |
| `tokens.radius` | Supply CSS length | `--radius`. |
| `shots.light`, `shots.dark` | Required for each visible supported scheme | Existing `/assets/` image URLs; fingerprinted in the manifest. |
| `hidden` | `false` | Hide from picker but keep available as a default. |
| `retired` | `false` | Hide and reject saved reader preference restoration. |
| `family` | Omitted | Family string for related skins. |
| `pair` | Omitted | Partner theme ID for fixed light/dark themes. |
| `replaces` | `[]` | Old ID strings or `{id, mode}` objects; optional mode is `auto`, `light`, or `dark`. Migrates stored preferences. |
| `palettes` | No palettes | Ordered `{id, label, tokens}` objects; first ID is default. Token map overrides CSS values. Runtime exposes palette IDs; current picker labels the known Aurora/Indigo IDs itself. |
| `paletteShots` | Required for visible themes with palettes | Map of palette ID to existing `/assets/` preview URL. |
| `bodyFont` | Omitted | Optional self-hosted WOFF2 URL preloaded only while active. |
| `accent` | Template fallback `#00449E` | Legacy accent value before scheme tokens override it. |
| `midtoneClass` | Template fallback `mid-gray` | Legacy template value; current midtone styling uses the accent token. |
| `classes`, `project.tagActiveColor` | Legacy supplied data | Retained in old presets, not consumed by the current theme renderer. Use tokens and scoped CSS. |

Current visible IDs are `paper`, `swiss`, `brutalist`, `zine`, `glass`, `liquid-glass-light`, `liquid-glass-dark`, `starship`, `retro-futurist`, and `holo`. Hidden legacy entries are `sun`, `default`, `mint`, `grape`, `charcoal`, `deep-blue`, `midnight`, and retired `terminal`. Token values are design data, not a fixed enum: bundled extras include `code`, `red`, `blue`, `coral`, `mint`, `yellow`, `paper`, `pink`, `rim`, `selected`, `field-one`, `field-two`, `glass-rgb`, `opaque`, and `feature-end`.

## Code blocks and GitHub embeds

| Site setting | Shipped / fallback | Behavior |
| --- | --- | --- |
| `codeBlock.collapseLineThreshold` | `15` / `0` | Collapse fenced code only when line count exceeds a positive threshold; zero or negative disables collapsing. |
| `codeBlock.copyButtonLineThreshold` | `10` / `10` | Show the fenced-code copy button when line count exceeds the threshold. |
| `githubEmbed.collapseLineThreshold` | `15` / `0` | Collapse GitHub embeds only above a positive threshold. GitHub embed copy controls are separate from fenced-code settings. |

Use integer line counts. Finite numeric values are accepted; strings are parsed with `parseInt`, and invalid values use the fallback.

## Analytics and comments

`site.umami.source` is a script URL and `site.umami.id` is its website ID. Both must be truthy to load analytics. The starter supplies its own values; remove the block to disable analytics or replace both for your site. Analytics are suppressed in `development` and on theme preview pages.

`site.giscus` accepts the following string fields:

| Field | Shipped / fallback | Effect |
| --- | --- | --- |
| `repo` | Starter public repository; no fallback | GitHub `owner/repository`; its presence enables comments. |
| `repoId` | Starter repository ID; no fallback | Giscus repository node ID. |
| `category` | `Announcements`; no fallback | Discussion category name. |
| `categoryId` | Starter category ID; no fallback | Discussion category node ID. |
| `mapping` | `og:title` / `pathname` | Passed verbatim to Giscus as `data-mapping`; no local validation. |

Generate matching repository/category values using Giscus setup. Remove the block to disable comments. Comments render only on post/note detail pages, with page front matter `comments` defaulting to true; `comments: false` suppresses them. Theme preview pages never load the widget. `lang`, `strict`, reactions, metadata emission, input position and widget theme are not site settings: the template fixes them to `en`, `0`, `1`, `0`, `top` and `preferred_color_scheme` respectively.

## Internationalization

Optional `site.i18n` is omitted in the starter, so translations are disabled.

| Setting | Fallback / accepted value | Effect |
| --- | --- | --- |
| `enabled` | `false`; boolean | Only exact `true` enables localization. |
| `defaultLanguage` | `en`; language code | Default unprefixed locale. |
| `languages` | `[{code: defaultLanguage}]` | Array of language objects. Codes must be unique and match `^[A-Za-z][A-Za-z0-9-]*$`; when enabled the default must be included. |
| `languages[].code` | Required | Locale identifier and URL/source directory prefix. |
| `languages[].label` | Code | Full display label. |
| `languages[].shortLabel` | Label, then uppercase code | Compact display label. |
| `languages[].htmlLang` | Code | HTML language attribute. |
| `translationNotice.default` | Omitted | Only `ai` displays the AI notice. Per-page `translatedBy` overrides it; other values suppress the notice. |

Add optional `_data/locales/<code>.yaml` files. `ui` deep-merges the UI copy object; arrays are replaced, not appended. `site.title` and `site.description` override only those site fields. `nav.<id>` overrides the matching navigation label. `series.<id>.title` and `.intro` override series copy. Unspecified values inherit base data; other locale site/series fields are ignored.

Translated Markdown lives in `<code>/posts/` and `<code>/notes/`, using corresponding file slugs. The code builds localized blog, notes, hidden notes, drafts, tags and series pages. Missing translated links fall back to existing originals. A timeline homepage gets a translated blog homepage; timeline, projects and About remain original-language destinations. Configured secondary source trees are ignored while localization is disabled. `i18nLocale`, `i18nTranslation`, `lang`, and `htmlLang` are set by the localization preprocessor.

## Series: `_data/series.yaml`

An array of objects. `id` is the URL segment under `/series/`; `title` is display text (membership labels fall back to ID); `intro` is optional editorial copy. `entries` defaults to an empty list and contains ordered canonical content URLs, including trailing slashes, for posts, notes or timeline entries. Current page membership reads `entries`, not a legacy `posts` key. Blank/non-string refs are discarded; duplicate and missing references are reported by validation.

`devOnly` defaults to false; truthy values exclude a series in production. `defaultSort` accepts the same four values as `site.series.defaultSort` and overrides it. Display sorts never change declared part numbers. Date sorting uses date plus front matter time (missing time is `00:00`), with declared order breaking ties.

## Timeline: `_data/timeline.yaml`

`featuredTags` is an array of topic tag strings, default empty, linked above the timeline. The starter includes `timeline-page`. `categories` is an ordered array of `{tag, label, color}`. `tag` is a nonempty tag string, `label` is category metadata, and `color` is a CSS color. Current entry chips display the tag itself, not `label`. The first configured category matching an entry's tags determines its type, otherwise `default` is used. Category tags are excluded from topic archives.

Shipped categories are `shipped` (`#27ae60`), `published` (`#2980b9`), `wip` (`#8e44ad`), `idea` (`#f1c40f`) and `thinking` (`#e67e22`). An absent categories list is empty. `months` and `weeks` are reserved archive slugs. Entry front matter requires quoted `date: "YYYY-MM-DD"` and `time: "HH:MM"`; optional `parent` must resolve to an existing entry URL without cycles. See [Timeline](feature-timeline.md) for authoring and archives.

## Author: `_data/me.yaml`

| Field | Fallback / accepted value | Effect |
| --- | --- | --- |
| `profile.name` | Omitted; string | About-page name. |
| `profile.role` | Omitted; string | Optional role beneath the name. |
| `profile.image.src` | Omitted; image URL | Shows portrait when supplied. |
| `profile.image.alt` | Profile name | Portrait alt text. |
| `intro.paragraphs` | `[]`; strings | About intro paragraphs, rendered as trusted HTML; first paragraph also backs the blog intro. |
| `contacts` | `[]` | Ordered objects with `label`, `url`, optional `icon` strings. URL may use `mailto:`. |
| `aboutSite.heading` | `ui.pages.about.siteHeadingFallback` | About-site section heading. |
| `aboutSite.paragraphs` | `[]`; strings | Trusted HTML paragraphs. |

Starter profile and prose are sample content; replace them with your own.

## Projects: `_data/projects.yaml`

`active` and `archive` are ordered arrays, defaulting to empty. `archived` is a compatibility alias used only if `archive` is null or absent. Each project supports:

| Field | Fallback / accepted value | Effect |
| --- | --- | --- |
| `name` | Supply string | Card heading. |
| `summary` | Omitted; string | Card paragraph. |
| `url`, `repo`, `timeline` | Omitted; URLs | Optional links. Heading links to the first present value in that order. |
| `image.src` | Omitted; URL | Optional card image. |
| `image.alt` | Name plus `ui.shared.projectCard.imageAltSuffix` | Image alternative text. |
| `image.fit` | `cover`; `cover` or `contain` | Image fit; only exact `contain` enables contain styling. |
| `tech` | `[]`; array of strings | Technology filter labels; slugs and counts are computed. |

`tags` and `tagSlugs` are derived from `tech`; do not configure them separately.

## Open Graph images

See [OG images](og-images.md) for designs, fonts, caching, build cost and development previews. Settings live under `site.ogImage`:

| Setting | Default / accepted value | Effect |
| --- | --- | --- |
| `style` | `retro` | `retro`, `retro-dark`, `swiss`, `swiss-dark`, `glass-dark`, `glass-light-b`, `glass-light-c`, or `classic`. Unknown values fail the build with allowed values. |
| `siteName` | Host of `site.url`, or empty when no URL exists | Card footer string. An explicitly empty string remains empty. |
| `staticEntries` | `[]` | Array of configured page cards, described below. |

**Upgrade change:** the default card is now light Retro sci-fi. Set `ogImage.style: classic` in the site configuration to retain the previous v3 design.

Static entries need truthy `key`, `slug`, and `title`, plus a string `excerpt` (empty is allowed); malformed entries are skipped. `key` is the lookup key and determines the output filename: leading slashes are removed, path separators become `--`, and other non-filename characters become `-`. For example, `/timeline` produces `timeline.png`. `slug` remains required compatibility metadata, but does not determine the filename. `title` and `excerpt` supply card copy. The shipped entry uses key `/timeline`, slug `timeline`, and title `Timeline`.

The build generates PNGs under `assets/og/` and the derived `_data/ogImages.json` lookup. Do not edit the generated lookup. Chinese posts and notes receive their own cards with translated titles and dates instead of reusing the English image. Explicit page `ogImage` URLs take precedence in page metadata.

### Content front matter for OG cards

| Field | Default / accepted value | Effect |
| --- | --- | --- |
| `ogStyle` | `site.ogImage.style`, then `retro` | Per-page override using the same eight style IDs. Unknown values fail the build. |
| `ogSeries` | First matching series in declaration order | A matching series ID selects that series; boolean `false` suppresses series information. An unknown ID or a series that does not contain the entry fails the build and lists valid IDs for that entry. |
| `ogImage` | Generated image URL | Explicit URL used by page social metadata. This is distinct from the site configuration object. |
| `title`, `excerpt`, `date` | Content data | Card text and date. Dates use UTC components or the source date string. |
| `tags` | Content tags | Timeline cards use the first recognized status in tag order: `shipped`, `thinking`, `wip`, `idea`, `published`. |
| `parent` | Omitted | Timeline parent URL; its resolved title supplies the parent caption. |

For recognized timeline statuses, a leading `word:` or `word(scope):` is removed from the card title. Without a recognized status, the label is `Timeline` (or `时间线` in Chinese) and the title is kept intact. Series progress follows declared membership order, not the series page's display sort. The OG resolver accepts `entries` and falls back to legacy `posts`; the series pages themselves still require `entries`.

## UI copy: `_data/ui.yaml`

Every leaf is a configurable string, with its shipped English value listed below. Preserve template placeholders. Locale overrides inherit omitted leaves; base templates generally do not supply alternate copy for missing leaves. `mainHtml` and `calendarWeeksNoteHtml` contain trusted HTML; most other values are text. Some shipped labels remain compatibility copy even when the current renderer uses fixed labels.

| Key | Shipped English value |
| --- | --- |
| `shared.languageSwitcher.label` | Language |
| `shared.translationNotice.ai.message` | This page was translated by AI. |
| `shared.translationNotice.ai.originalLink` | Read the original |
| `shared.pagination.previous` | Previous |
| `shared.pagination.next` | Next |
| `shared.pagination.page` | Page |
| `shared.pagination.of` | of |
| `shared.pagination.separator` | · |
| `shared.counts.entry.singular` | entry |
| `shared.counts.entry.plural` | entries |
| `shared.counts.post.singular` | post |
| `shared.counts.post.plural` | posts |
| `shared.projectCard.imageAltSuffix` | preview |
| `shared.projectCard.links.external` | Link |
| `shared.projectCard.links.timeline` | Timeline |
| `shared.projectCard.links.repository` | GitHub |
| `shared.postList.emptyDefault` | No entries found. |
| `shared.series.partOf` | Part of a series |
| `shared.series.sectionLabel` | Series |
| `shared.series.read` | Read series |
| `shared.series.backToAll` | Back to all series |
| `shared.series.sortOptions.curated` | Curated |
| `shared.series.sortOptions.reverse` | Reverse |
| `shared.series.sortOptions.dateAsc` | Oldest First |
| `shared.series.sortOptions.dateDesc` | Newest First |
| `shared.theme.previewAriaTemplate` | Preview {theme} theme |
| `shared.theme.modeLabelTemplate` | Theme mode: {mode} |
| `shared.theme.auto` | Auto |
| `shared.theme.custom` | Custom |
| `pages.home.title` | Home |
| `pages.home.heading` | Latest Posts |
| `pages.home.emptyMessage` | No posts published yet. Check back soon. |
| `pages.notes.title` | Notes |
| `pages.notes.description` | Shorter notes, references, and working ideas. |
| `pages.notes.heading` | Latest Notes |
| `pages.notes.emptyMessage` | No notes published yet. Add one in /notes/ to get started. |
| `pages.hiddenNotes.title` | Unlisted Notes |
| `pages.hiddenNotes.description` | Notes that are public by URL but omitted from the main notes index. |
| `pages.hiddenNotes.heading` | Unlisted Notes |
| `pages.hiddenNotes.emptyMessage` | No unlisted notes found. |
| `pages.drafts.title` | Drafts |
| `pages.drafts.heading` | Drafts |
| `pages.drafts.emptyMessage` | No drafts found. Ship something new! |
| `pages.allTags.title` | All Tags |
| `pages.allTags.heading` | All Tags |
| `pages.allTags.emptyMessage` | No tags found. |
| `pages.tags.taggedTitleTemplate` | Tagged "{tag}" |
| `pages.tags.emptyMessage` | No entries found for this tag. |
| `pages.about.title` | About |
| `pages.about.heading` | About |
| `pages.about.siteHeadingFallback` | About this site |
| `pages.projects.title` | Projects |
| `pages.projects.description` | Curated highlights from active builds and past experiments. |
| `pages.projects.heading` | Projects |
| `pages.projects.intro` | A look at current work plus past experiments that still spark ideas. Filter by technology to jump straight to the tools you care about. |
| `pages.projects.filterHeading` | Filter by technology |
| `pages.projects.resetLabel` | All projects |
| `pages.projects.activeHeading` | Active Projects |
| `pages.projects.activeDescription` | Currently maintained and frequently updated. |
| `pages.projects.activeEmptyMessage` | No active projects match that tag yet. |
| `pages.projects.archivedHeading` | Archive & Mentions |
| `pages.projects.archivedDescription` | Earlier builds and experiments that still influence newer work. |
| `pages.projects.archivedEmptyMessage` | No archived projects match that tag yet. |
| `pages.projects.allEmptyMessage` | No projects match that tag yet. Try resetting the filters. |
| `pages.series.title` | Series |
| `pages.series.description` | Curated collections of related content with editorial intros and flexible sorting. |
| `pages.series.heading` | Series |
| `pages.series.intro` | Curated reading paths through related content. Each series starts in my recommended order, and the detail page can switch to reverse or date-based sorting. |
| `pages.series.emptyMessage` | No series published yet. |
| `pages.series.detailEmptyMessage` | This series does not have any published entries yet. |
| `pages.timeline.title` | Timeline |
| `pages.timeline.description` | A personal timeline log, color-coded by entry type. |
| `pages.timeline.labels.root` | Timeline |
| `pages.timeline.labels.months` | Months |
| `pages.timeline.labels.weeks` | Weeks |
| `pages.timeline.featuredTopicsAriaLabel` | Featured timeline topics |
| `pages.timeline.entryCount.singular` | entry |
| `pages.timeline.entryCount.plural` | entries |
| `pages.timeline.relationships.continuesFrom` | Continues from |
| `pages.timeline.relationships.followUpSingularTemplate` | {count} follow-up |
| `pages.timeline.relationships.followUpPluralTemplate` | {count} follow-ups |
| `pages.timeline.thread.earlierInThread` | Earlier in thread |
| `pages.timeline.thread.followUps` | Follow-ups |
| `pages.timeline.thread.continues` | continues... |
| `pages.timeline.emptyMessages.mainHtml` | No entries yet. Add a markdown file to &lt;code&gt;timeline/&lt;/code&gt; to get started. |
| `pages.timeline.emptyMessages.monthsIndex` | No timeline months yet. |
| `pages.timeline.emptyMessages.monthArchive` | No timeline entries for this month. |
| `pages.timeline.emptyMessages.weeksIndex` | No timeline weeks yet. |
| `pages.timeline.emptyMessages.weekArchive` | No timeline entries for this week. |
| `pages.timeline.emptyMessages.calendarWeekArchive` | No timeline entries for this calendar week. |
| `pages.timeline.emptyMessages.tagArchive` | No timeline entries for this topic yet. |
| `pages.timeline.monthsIndex.title` | Timeline Months |
| `pages.timeline.monthsIndex.description` | Timeline entries grouped into monthly archive pages. |
| `pages.timeline.monthsIndex.intro` | Monthly archive pages for the timeline. |
| `pages.timeline.monthArchive.titleTemplate` | Timeline: {label} |
| `pages.timeline.monthArchive.descriptionTemplate` | Timeline entries from {label}. |
| `pages.timeline.monthArchive.countSuffix` | in this month. |
| `pages.timeline.monthArchive.monthBandedWeeksHeading` | Month-banded weeks in this month |
| `pages.timeline.monthArchive.calendarWeeksNoteHtml` | Calendar weeks also live under &lt;code&gt;/timeline/weeks/&lt;/code&gt;, using keys like &lt;code&gt;2026-W16&lt;/code&gt;. |
| `pages.timeline.weeksIndex.title` | Timeline Weeks |
| `pages.timeline.weeksIndex.description` | Timeline entries grouped into both month-banded and ISO calendar weeks. |
| `pages.timeline.weeksIndex.intro` | Month-banded weeks and ISO calendar week pages grouped by month. ISO weeks that cross a month boundary appear in both months. |
| `pages.timeline.weeksIndex.monthBandedWeeksHeading` | Month-banded weeks |
| `pages.timeline.weeksIndex.calendarWeeksHeading` | ISO calendar weeks |
| `pages.timeline.weekArchive.titleTemplate` | Timeline: {label} |
| `pages.timeline.weekArchive.descriptionTemplate` | Timeline entries from {rangeLabel}. |
| `pages.timeline.calendarWeekArchive.titleTemplate` | Timeline: {label} |
| `pages.timeline.calendarWeekArchive.descriptionTemplate` | Timeline entries from {rangeLabel}. |
| `pages.timeline.tagArchive.titleTemplate` | Timeline: {tag} |
| `pages.timeline.tagArchive.descriptionTemplate` | Timeline entries tagged {tag}, in chronological context. |
| `pages.timeline.tagArchive.countSuffix` | following this thread through the timeline. |

## Coverage and source map

The editable data inventory is `site.yaml`, `sidebarNav.yaml`, `themes.yaml`, `me.yaml`, `projects.yaml`, `series.yaml`, `timeline.yaml`, and `ui.yaml`, plus optional `locales/<code>.yaml`. `ogImages.json` is generated. Routing, environment and computed collection fields come from `eleventy.config.js` and content directory data files, not additional site settings.

The reference follows `eleventy.config.js`, `lib/theme-manifest.js`, `lib/theme-bundle.js`, `assets/js/theme-init.js`, `assets/js/theme-picker.js`, `assets/css/theme-base.css`, `lib/i18n/index.js`, `lib/series.js`, `lib/timeline/categories.js`, `lib/markdown/code-block.js`, `scripts/generate-og-images.js`, and the layouts/components and `src/` page templates. Recheck these consumers when adding a setting; a key present in YAML alone does not establish a supported feature.
