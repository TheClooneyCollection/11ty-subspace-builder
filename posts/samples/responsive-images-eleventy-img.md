---
title: Leveling Up Responsive Images with Eleventy Img
date: 2025-09-27
tags:
  - eleventy
  - performance
  - responsive-images
eleventyNavigation:
  key: responsive-images-eleventy-img
excerpt: |
  Walking through the fixes that led us from stretched screenshots to a lean Eleventy Img pipeline, plus a quick primer on how responsive image markup really works.
---

## The problem we started with

I noticed screenshots on small screens looked squashed, even though the assets themselves were crisp. It looked like that...

<img
  alt= "Mobile Screenshot of Stretched Images"
  src="/assets/images/subspace/responsive-images/mobile-screenshot-stretched-image.jpeg"
  eleventy:widths="240"
  eleventy:sizes="240px"
/>

The Markdown posts used plain `<img>` tags that only specified `height="300"`. When the layout narrowed, the browser shrank the width to fit the column (Tachyons’ default `img { max-width: 100%; }` behaviour), but the _attribute-defined_ height remained locked at 300 pixels. Browsers treat explicit HTML attributes as higher priority than the CSS fallback, so the bitmap was stretched vertically to honour that fixed height. Remove the hard-coded height and the distortion disappears.

We wanted a solution that would:

- Keep aspect ratios intact without manual dimensions in Markdown
- Serve smaller files to mobile devices
- Lay the groundwork for modern formats like WebP or AVIF without hand-rolling `<picture>` markup

Enter Eleventy Img.

## Table of Contents

[[toc]]

## Why reach for `@11ty/eleventy-img`

The plugin gives you production-ready responsive images with very little ceremony:

- Generates multiple widths and formats (WebP, JPEG, AVIF when you want it) from a single source
- Compresses at build time so the browser downloads a smaller payload
- Caches the outputs and skips reruns when neither the source nor the config changed
- Emits correct markup—`<picture>`, `srcset`, `sizes`, plus width/height—to preserve intrinsic ratios and reduce layout shift
- Future-proofs the site: flipping on new formats is as simple as adding another entry to the formats array

## How we wired Eleventy Img

We initially replaced the Markdown `<img>` tags with a `{% raw %}{% image %}{% endraw %}` shortcode. That worked, but it required authors to remember a custom tag every time they dropped in a screenshot. The better fit for this project turned out to be Eleventy Img’s HTML transform plugin.

The transform plugin scans rendered HTML, finds every `<img>`, and rewrites it into a fully fledged `<picture>` element. Our config (`eleventy.config.js`) sets:

- `formats: ["avif", "webp", "jpeg"]` so modern browsers get lean files first
- `widths: [320, 640, 960, 1280]` to cover half-, 1×, and 2× representations of our column
- `htmlOptions.imgAttributes` with `loading="lazy"`, `decoding="async"`, and a `sizes` string that mirrors the layout (`(width <= 30em) 100vw, 75vw`)—full width on phones, roughly 75% of the viewport once Tachyons’ `-ns` breakpoint kicks in

During local development Eleventy serves derivatives from the on-demand `/.11ty/image/` endpoint; production builds write the final files to `_site/img/`. Because the transform runs after Markdown renders, content authors can keep writing plain HTML or Markdown images and still benefit from the responsive markup.

## How responsive image markup works

Two attributes do the heavy lifting:

- `srcset` lists candidate files, each with a width descriptor such as `640w`.
- `sizes` tells the browser how wide the image will render in the layout. Without it, the browser assumes `100vw`, which can lead to oversized downloads.

### Classic media query syntax

```html
sizes="(max-width: 600px) 100vw, 600px"
```

Read it left to right: if the viewport is 600px wide or smaller, render the image at the full viewport width; otherwise cap it around 600px.

### Range syntax (Media Queries Level 4)

```html
sizes="(width <= 37.5em) 100vw, 37.5em"
```

The newer range syntax swaps `max-width` for math-like comparisons. Using `em` ties the breakpoint to typography (37.5em ≈ 600px at the default 16px base), which adapts gracefully if users zoom the page.

### Picking the right widths

Once you know the maximum rendered width, generate a few useful derivatives. A simple rule of thumb is 0.5×, 1×, and 2× of that max. With a column that settles around 640px, we produce `[320, 640, 960, 1280]`. Eleventy Img automatically drops any size larger than the source asset, so you can include generous options without worrying about blurry upscales.

When those widths land in `srcset`, the browser chooses the smallest file that still looks sharp for the current device pixel ratio and viewport width. Combined with a good `sizes` string, users download dramatically less data on phones while retina displays still get a crisp result.

## Guardrails that kept aspect ratios honest

- Always pass real alt text—Eleventy Img will throw if you forget, which saves you from shipping broken accessibility.
- Leave the generated `width` and `height` attributes alone; they describe the intrinsic dimensions of the largest derivative so the browser can reserve layout space.
- If a post needs art direction (say, a square crop on mobile), reach for the shortcode so you can specify per-breakpoint sources inside a `<picture>` block. The transform plugin is great for defaults but blunt for those edge cases.
- We added a tiny CSS override (`img { height: auto; }`) so the transform’s explicit height never overrides our responsive layout when images shrink on narrow columns.

## Where we landed

Markdown posts still contain a simple HTML image:

```html
<img
  alt="Example social card generated by the Subspace Builder"
  src="/assets/images/subspace/social-cards/social-cards.png"
/>
```

After the transform plugin runs, Eleventy emits (dev server excerpt shown):

```html
<picture>
  <source
    type="image/avif"
    srcset="
      /img/9NWum2aR9G-320.avif 320w,
      /img/9NWum2aR9G-640.avif 640w,
      /img/9NWum2aR9G-960.avif 960w
    "
    sizes="(width <= 30em) 100vw, 75vw"
  />
  <source
    type="image/webp"
    srcset="
      /img/9NWum2aR9G-320.webp 320w,
      /img/9NWum2aR9G-640.webp 640w,
      /img/9NWum2aR9G-960.webp 960w
    "
    sizes="(width <= 30em) 100vw, 75vw"
  />
  <img
    loading="lazy"
    decoding="async"
    alt="Example social card generated by the Subspace Builder"
    src="/img/9NWum2aR9G-320.jpeg"
    width="960"
    height="504"
    srcset="
      /img/9NWum2aR9G-320.jpeg 320w,
      /img/9NWum2aR9G-640.jpeg 640w,
      /img/9NWum2aR9G-960.jpeg 960w
    "
    sizes="(width <= 30em) 100vw, 75vw"
  />
</picture>
```

Eleventy dropped the 1280px derivative because the source PNG tops out at 1200px wide, which is exactly what we want. Between the transform and the CSS guardrail, the screenshots hold their aspect ratios and download an appropriately sized file on every viewport.

## Recommended reading

- [MDN’s multimedia performance primer](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Multimedia) – excellent grounding in `srcset`, lazy loading, and media formats.
- [Smashing Magazine: Responsive Images Done Right](https://www.smashingmagazine.com/2014/05/responsive-images-done-right-guide-picture-srcset/) – older, but still a great tour through practical `<picture>` strategies.
- [Eleventy Img documentation](https://www.11ty.dev/docs/plugins/image/) – dig into overrides like custom filename formats, `statsOnly`, or on-demand transforms during `--serve`.

If you have an existing Eleventy project, swap one hard-coded `<img>` for the shortcode, rebuild, and inspect the HTML. Seeing the generated `<picture>` markup in context is the quickest way to build intuition for how `srcset` and `sizes` cooperate.
