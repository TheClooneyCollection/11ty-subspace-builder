# Changelog

## Unreleased

### Fixes

* **og:** normalize unsupported typographic spacing and hyphens, report missing font glyphs with source pages, and fit English and Chinese titles to their actual layout space without silent clipping.
* **theme:** use `0.7s` duration and `8px` blur when fade settings are omitted, matching the sample configuration.

### Features

* **og:** change the default share card to light Retro sci-fi. Downstream sites can keep the previous v3 design with `ogImage.style: classic` in `_data/site.yaml`. Add eight selectable styles, page `ogStyle` overrides, series selection through `ogSeries`, and separate Chinese cards.
* **og:** add development-only `/og/` gallery and draft style comparison post; production builds omit the showcase and its rendering work.
* **og:** invalidate generated cards when their normalized data, template sources, fonts or renderer versions change. See [OG images](docs/og-images.md) for configuration, font licenses and reference rendering costs.

## [1.42.0](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.41.0...v1.42.0) (2026-11-16)


### Features

* **brand:** add the Subspace Builder favicon set ([7a16716](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/7a16716729244318721c935c00d8ae2daddebca9))
* **content:** make bundled samples optional without changing page URLs ([278d614](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/278d61448fc6d6ac39642a90ef72be276377c9b4))
* **og:** add selectable card templates and packaged fonts ([866d188](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/866d188eeed2d96188225dac7eb665831d6e4c39))
* **og:** derive localized card data and stable cache keys ([81ea2c0](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/81ea2c0ab6f9b7a607bffd9e4c2f64667201d099))
* **og:** integrate localized cards and development previews ([9a82e93](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/9a82e93aef2c687fef8815da84ed76879126bbfa))
* **skills:** add a subspace-setup skill for new sites and upstream updates ([47da6c0](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/47da6c04b5e04589f6f01f5fbb56579221ce94bc))
* **theme:** add brutalist theme ([cf09d37](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/cf09d3716d6d0534f8b5fe6b7902864c0724f333))
* **theme:** add development-only theme share links ([ce69492](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/ce69492c03cd0e4e32704e23fc4acaf05b34d54d))
* **theme:** add glass theme ([2fdd320](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/2fdd3200f97075eb5f22a835d524bd21e8a2a874))
* **theme:** add holo theme ([233266c](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/233266c492cc2ff25aa48613134b838ab669cebf))
* **theme:** add liquid-glass-dark theme ([65d5d9d](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/65d5d9d65a06d706dc6a420423f6ed71e6fc6ded))
* **theme:** add liquid-glass-light theme ([76c7012](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/76c70122db76cf4e00faa03a45802e220bfd49a6))
* **theme:** add paper theme ([81b29aa](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/81b29aa4abfe0016d622ec4f8727542f1e8f20fd))
* **theme:** add reader picker and persistent Simple and Fun defaults ([0f42d61](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/0f42d6137e1a60280b6761be86d199e888d1a0d4))
* **theme:** add region hooks and decorative slots to the home layout ([db898b9](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/db898b97ec33fcb4a516f6ebf67077804ce6aa5d))
* **theme:** add retro-futurist theme ([8726de9](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/8726de957a57094c7b27b1d00c974c8fa06a7557))
* **theme:** add starship theme ([b918463](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/b918463083edf4763f0265ce57af0ecc67a4c981))
* **theme:** add swiss theme ([4527d75](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/4527d75fc4929dbca200d67a5873bbeb12884f6c))
* **theme:** add zine theme ([1ba5e67](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/1ba5e67125bab3d6f231e50a0c1c066b3c134516))
* **theme:** default to Fun with Soft Glass ([1b9a3c8](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/1b9a3c85daaa84843c344ff2ecd5452ae63da706))
* **theme:** expose data-scheme and replace dark theme id lists ([904f391](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/904f3914aa637ae1a9415eff97a255fb3074c031))
* **theme:** hide v1 themes and map legacy ids ([0df1e02](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/0df1e022a1be8868c464aa02993721925217da25))
* **theme:** load only the active theme css and store theme + mode ([cf4ff4a](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/cf4ff4a8085ba31c4aa7a126ed2acc9e4c48b2c7))
* **theme:** make the theme crossfade length configurable ([fde2189](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/fde21893792d6217cba9ad22268e6bbd09b881d6))
* **theme:** optional blur at the crossfade midpoint ([8a70204](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/8a70204bfe5d19814af3428e99c02dfc78364667))
* **theme:** peek preview panel replaces hover preview ([4cf51fd](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/4cf51fdd6ee33a5c0fddffd791902c56c994ce27))
* **theme:** select immediately and revert to the opening preference ([a6bd1e2](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/a6bd1e2c3094abdc1f72078565115f3aaf6639f9))
* **theme:** v2 theme schema and token-driven critical css ([eed1050](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/eed1050135dd97a2935c15897d835e50ad3afecb))


### Bug Fixes

* **assets:** track theme preview webp files with git lfs ([fa9f91c](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/fa9f91ccf697d4a16a9769c56668294c106b2b9f))
* **ci:** pin the test runner to Ubuntu 24.04 for Playwright ([4a98d1b](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/4a98d1bd2bdc56ec33d9fac3b0622bc99665e6a4))
* **og:** measure title layout before shrinking or ellipsizing ([73f5e53](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/73f5e53086b6f3e09bf9dc532db6100aec164085))
* **og:** normalize typography and warn about missing glyphs ([4b885c6](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/4b885c6192e8f404ca5da06174042af57fdf00e9))
* **starter:** limit sample cleanup to reserved content folders ([9a92f1e](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/9a92f1eba8dbe4d59a6a717466805736d7c73e2b))
* **theme:** align fade fallbacks with sample configuration ([d31a85e](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/d31a85e9f47db2adc96983b0c6c727ba4e83e07f))
* **theme:** bundle all theme CSS so a switch never flashes ([97f7d62](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/97f7d62c357d3f29183b37d489748cf884751e27))
* **theme:** keep home introductions first and zine navigation readable ([0555883](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/0555883a6f0e7df5071177b06b35faec6052fc4a))
* **theme:** make picker chrome follow the page scheme ([44d6e61](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/44d6e61ed650804aefc67d99adeb2747320d36c2))
* **theme:** save preview choices without replaying visual effects ([f9b1c3f](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/f9b1c3f4d0d27f177e8298dd245087100a2400a5))
* **theme:** slower eased crossfade and keep taps working during it ([a9c10ca](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/a9c10ca001b22493fa752df6c5ee84a50ba94013))

## [1.41.0](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.40.1...v1.41.0) (2026-10-04)


### Features

* **i18n:** add opt-in localized content and navigation: `site.i18n` config, second languages under `/<code>/` (posts, notes, listings, tags, series), `_data/locales/<code>.yaml` UI overrides ([bbeafa7](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/bbeafa7c513ad207691122f624ec5324bacb6095))
* **i18n:** add translation notices and missing-link fallback: `translatedBy: ai` notice linking to the original, untranslated `/<code>/` links fall back to the default-language page ([c90ae51](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/c90ae5169489d222d50c7c77e4e7858eec0ae3ee))
* **i18n:** add header language controls and preserve notice line breaks ([6df6c61](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/6df6c610099d1a7c119c2305a0c1b30fd5643e9d))


### Bug Fixes

* **i18n:** handle templates without output paths ([3358dc5](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/3358dc572a4cac54acc235bfc8e5a5c96dcf687e))


### Documentation

* require linear git history ([d456dac](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/d456dacb62616b42a6dbd5a9b100cec4e29116e1))
* add i18n plan, content contract and downstream guide (`docs/feature-i18n.md`) ([805bac8](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/805bac874902fd7a6c91a1fee317e991925d2b53))

## [1.40.1](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.40.0...v1.40.1) (2026-10-03)


### Bug Fixes

* stop rendering CHANGELOG.md as a site page ([a8bf6d1](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/a8bf6d1cdabaa0061e0e5c3965e97c7c8395ebcd))

## [1.40.0](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.39.0...v1.40.0) (2026-10-02)


### Features

* configurable default sort for series pages ([fe2114e](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/fe2114e0a51e6d484356d53ec41a1167c391e322))
* configurable home target via site.home.target ([01072af](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/01072af70da8e516532da50cd418a873e3d032e2))
* support gist URLs in {% github %} shortcode ([ed7540a](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/ed7540afa4a07f3115fd0d509e18819f2283fcda))


### Bug Fixes

* avoid template-path blog pagination links ([8da8752](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/8da8752696cc9816ce41604973aafdf6014f7987))
* clear series data during starter reset ([8178685](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/8178685db831f14b733d04e49cd3848f83eb2a3a))
* harden empty series and home pagination ([fe71092](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/fe71092778e4d328a2541ac7c4bab5da2a6aa372))
* order same-day series entries by front matter time ([9e7d7cb](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/9e7d7cba2531a1519a824731ad1cd8441524d234))
* section styles, internal links, and nav order for home target ([4c09a3e](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/4c09a3ebe5815901a53d6d33f243e0137d6a0161))
* support contain mode for project card images ([eb0df3b](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/eb0df3b89e4e283dbef06f9afcf1d45e08c690ab))

## [1.39.0](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.38.0...v1.39.0) (2026-06-09)


### Features

* add starter reset wizard ([2624240](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/26242404ac70a5e2761ef4bbaac401ce778ed81c))
* support hidden flag on nav items and themes ([de75012](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/de75012ebef2d4ee3d70a872bfb34ea5bc2d2711))

## [1.38.0](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.37.0...v1.38.0) (2026-05-25)


### Features

* add cloudflare pages deployment checker ([f076028](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/f076028b01731c1b27eed2376fc3db1b0f3a3f05))
* animate cloudflare pages dashboard between api polls ([5bb0505](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/5bb05052e070119b90f8762ea7f6a73e2d3e0811))
* redraw cloudflare dashboard in place at 100ms ([6e09b86](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/6e09b86a6ab1bd3df78260a51a95bc855416f953))

## [1.37.0](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.36.1...v1.37.0) (2026-05-25)


### Features

* **series:** generalize series across content types ([f6b24c6](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/f6b24c6825f38caeaf49246741f2a99b309c96b6))


### Bug Fixes

* keep ordering fixtures as drafts ([9e35ff5](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/9e35ff56521f16c74c6cd212df88678e1576e36d))

## [1.36.1](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.36.0...v1.36.1) (2026-05-24)


### Bug Fixes

* **release:** limit release-please to the canonical repo ([c82f48d](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/c82f48d53cab6b21796a549973252726d0bc437b))

## [1.36.0](https://github.com/TheClooneyCollection/11ty-subspace-builder/compare/v1.35.0...v1.36.0) (2026-05-24)


### Features

* add release-please automation ([d00befd](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/d00befd5335f7b7c2dc94a923b5478e8cf8f1499))
* **build:** persist eleventy image cache across builds ([acd35e9](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/acd35e9dd79e9ad2074933de57681256bf46627b))
* order posts and notes by time ([d0f5709](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/d0f57098cc10830096f981a3237c2e7040be5d96))


### Bug Fixes

* make project card titles clickable ([d91324f](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/d91324ff14dd8c97c44ca1b9fabe77faca38eb4b))
* **release:** align release-please tags with repo tags ([ebf4c67](https://github.com/TheClooneyCollection/11ty-subspace-builder/commit/ebf4c670137997544a9506331ce78599181d397a))
