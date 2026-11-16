# Theme system

Themes are CSS skins over one shared document. The layout exposes `data-region` hooks for masthead, navigation, sidebar links, main content and footer. `.theme-backdrop` and `.theme-art` (two empty spans) carry decorative CSS; they are hidden from assistive technology. A theme does not replace page templates or duplicate article content.

## Reader preferences

Open the header theme selector and click a card to apply and save it immediately. Arrow keys also select. Closing or Escape keeps the choice. After a change, **Revert to …** restores the theme, palette and mode from when this opening began; reopening establishes a new starting point.

Mode is independent of theme: Auto follows the operating system, Light and Dark are explicit. Fixed-scheme themes disable mode switching unless they have a paired theme. Liquid Glass light/dark are paired; Auto follows the system within that family. The dark member has Aurora (default) and Indigo palettes.

Preferences use `theme`, `themeMode`, and `themePalette` in localStorage. Storage failures do not prevent rendering or in-session switching. `?theme=swiss&mode=dark` is a non-persistent override. Add `preview=1` to hide switching controls and suppress analytics/comments; `palette=indigo` chooses the Liquid Glass dark palette. Override parameters are removed with `history.replaceState` without reloading.

## Theme entries

`_data/themes.yaml` is an array. Each entry has `id`, `label`, `scheme` (`light`, `dark`, or `both`), `replaces`, and `tokens`. Each supported scheme supplies `bg`, `ink`, `muted`, `accent`, `rule`, and `surface`; additional keys become custom properties. Common tokens include `font.body`, `font.display`, `font.mono`, and `radius`.

```yaml
- id: example
  label: Example
  scheme: light
  replaces: []
  tokens:
    light:
      bg: '#ffffff'
      ink: '#151515'
      muted: '#555555'
      accent: '#1247b0'
      rule: '#bbbbbb'
      surface: '#f4f4f4'
    font:
      body: "Arial, 'Noto Sans SC', 'PingFang SC', sans-serif"
      display: "Arial, 'Noto Sans SC', 'PingFang SC', sans-serif"
      mono: "Menlo, 'Noto Sans SC', 'PingFang SC', sans-serif"
    radius: 4px
```

Optional `family` and reciprocal `pair` fields connect fixed light/dark entries. `palettes` is a list of `{id, label, tokens}` overrides; the first is the default. `hidden: true` omits an entry from the picker while keeping it available to a site default. `retired: true` additionally prevents reader preference restoration, falling back to the site default.

Detail styles go in `assets/css/themes/<id>.css`, scoped under `html[data-theme="<id>"]`. Token-only entries need no detail file. Use `[data-scheme="dark"]` instead of hard-coded theme lists. Keep `--accent`, `.theme-text` and `.theme-midtone` compatible with embedded content. Timeline type labels use `.timeline-type` and `--tag-font`; they have a visible `#` prefix.

Set `site.theme.defaultId` (builder default `glass`) and `defaultMode` (`auto|light|dark`) in `_data/site.yaml`. `showSelectors` controls whether readers see switching controls. The theme ID is the only line to change when choosing a new default. The retired `autoLightId`, `autoDarkId`, `previewHoverDelay`, and `previewResetDelay` no longer affect v2.

## Loading and accessibility

All tokens and the shared base CSS are inline, so background and text are correct before painting. Every theme's detail CSS ships in one fingerprinted bundle (`/assets/css/themes.<hash>.css`, built by `lib/theme-bundle.js`), a normal render-blocking stylesheet. Switching only flips `data-theme`, so no frame paints without the new theme's styles; it crossfades inside `document.startViewTransition` where supported, except under `prefers-reduced-motion`. `site.theme.fadeDuration` sets the crossfade length (default `0.7s`) and `fadeBlur` blurs its midpoint (default `8px`). `@font-face` files in a theme's CSS still download only when that theme uses them. The system-dark token rule supports readers without JavaScript.

The header is sticky at every width. Its measured height updates `--header-height` so anchor targets clear the navigation. At 1100px and wider, the article TOC occupies a sticky side column with internal vertical scrolling; narrower screens retain inline navigation. Code and tables scroll inside their containers. Reduced-motion preferences disable decorative motion; glass skins include opaque fallbacks and reduced-transparency rules.

The bundled skins use system font stacks with CJK fallbacks and have no external font requests. If a downstream adds a webfont, use self-hosted Latin-subset WOFF2 files in `assets/fonts/<family>/`, keep its redistribution licence alongside the files, and declare `@font-face` in the owning theme CSS with `font-display: swap` and a Latin `unicode-range`. Optional `bodyFont` names an active-theme-only preload URL. Do not preload or download CJK webfonts.

## v1 migration

Reader choices migrate once: sun/mint → paper, default → swiss, grape → holo, charcoal → brutalist/dark, deep-blue → starship, midnight → Liquid Glass dark. Terminal and unknown IDs fall back to the configured site default while retaining a stored v2 mode. A legacy `themePreference: auto` becomes default theme plus auto mode. Legacy entries remain hidden and token-converted for one transition release; downstream sites can still pin them as defaults. Remove them in a subsequent release.

For downstream custom themes, convert the entry to scheme/tokens, then move detail CSS to the convention path. For example, `elite-dangerous` becomes a dark-scheme entry with `assets/css/themes/elite-dangerous.css`; remove its old unconditional stylesheet link. Existing scoped selectors remain valid. Move external font declarations to licensed self-hosted assets. No changes to a downstream repository are performed by this migration.

## Validation

Run `npm test`, `npm run build`, then `npm run test:e2e`. Browser checks include storage migration, exactly one active-theme CSS request, a delayed first load in both native and fallback render-blocking paths, preview isolation, and picker interaction. Review each skin at phone and desktop widths, in every supported scheme, including CJK content and long TOCs.

Bundled presets: Warm Paper, Swiss, Brutalist, Retro web / Zine, Soft Glass, Liquid Glass Light, Liquid Glass Dark, Starship, Retro-futurist, and Holo. Paper, Swiss, Brutalist, Zine, Soft Glass, Starship, and Retro-futurist support both schemes. Liquid Glass members are individually fixed and paired; Holo is dark only.

## Reader picker and first-visit defaults

The header contains the theme button and Light / Dark / System controls. Opening
it shows a fixed paper-coloured dropdown; each card shows an actual home capture
for the current scheme. Selecting a card immediately applies and saves the choice. Escape or closing
keeps it. **Revert to …** restores the preference captured when the dropdown
opened, including its mode, palette and whether it was a site default. Reverting
a default does not turn it into a manual choice or replace the stored Fun rolls.
**Use site default** clears the manual choice while retaining the display mode,
Liquid Glass palette and first-visit rolls. Halo uses Starship as its light
partner and returns to Halo when switched back to dark.

`site.theme.defaultStrategy` chooses `fun` (the builder default) or `simple`
(always `defaultId`). With no `defaultId`, the builder falls back to Soft Glass
(`glass`). Fun rolls one entry from `weekdayThemes` and one from
`weekendThemes` on the first visit. Both are stored permanently in that browser;
the local day selects which applies. A manual choice wins. The built-in pools
are Soft Glass, Liquid Glass, Starship and Halo for weekdays, and Zine, Retro
sci-fi and Brutalist for weekends. Swiss and Warm Paper remain manually selectable.
System appearance remains the default unless the reader chooses light or dark.
The pre-paint initializer resolves these choices before loading one detail sheet.

Development builds also show **Copy link** in the selector footer. It copies the
current page on `site.url`, with the selected theme, effective light/dark scheme
and palette. Production builds omit this control. If clipboard access is denied,
the link appears in a selected field for manual copying.

### Maintaining preview shots

The committed `assets/images/theme-previews/*.webp` files are real public home
captures, 600px wide at WebP quality 65. Theme data declares `shots` per supported
scheme and `paletteShots` per palette. The manifest throws if any required asset
is missing; it never substitutes a different scheme. Isolated build fixtures copy
these assets too.

After changing a skin or home layout, run `npm run build`, then
`node scripts/generate-theme-previews.js`, then build again. The capture script
starts and closes its own random-port server for `_site`, uses a 1440×900 browser
viewport, and resizes the screenshots. It does not use or restart a dev server.
Commit the refreshed images with the skin change. A newly added theme needs its
first real home capture checked in before normal builds, because missing shots
are intentionally a build error.
