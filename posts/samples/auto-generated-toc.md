---
title: Auto-Generated TOCs Land in Subspace Builder
date: 2025-09-27
tags:
  - eleventy
  - automation
  - table-of-contents
eleventyNavigation:
  key: auto-generated-toc
excerpt: |
  Adding Markdown-driven tables of contents means fewer manual edits, consistent anchors, and faster publishing all around.
---

## Why I Care About Tables of Contents

TOCs act as a quick schematic for each post. They give readers an immediate sense of the terrain and let them jump to the section they want without scrolling forever. When you are writing walkthroughs, release notes, or deep dives (which is most of what I do here), that high-level map keeps people oriented.

## Table of Contents

[[toc]]

## The Pain: Manual ChatGPT TOCs

Before today I would pop each draft into ChatGPT in the browser, ask it for a Markdown TOC, and paste the result back into the post. It was fine until it was not. The assistant occasionally slugified headings differently than our site expects, which meant the generated links pointed nowhere. Fixing those mismatches added tedious editing rounds that made me question whether a TOC was worth the effort.

## Expectation vs. Reality

I assumed automating TOCs inside the project would take at least an hour—some custom parsing, maybe extra filters, and plenty of testing. Reality: it was a ten-minute change. `markdown-it-toc-done-right` slid into the existing Eleventy markdown pipeline alongside `markdown-it-anchor`, and everything just worked.

## Under the Hood

The config change lives in `eleventy.config.js`. We now share a single `slugify` helper between the anchor plugin and `markdown-it-toc-done-right`, so every heading ID and TOC link stays in sync. Authors can drop `[[toc]]` anywhere in a Markdown file and Eleventy renders a `<ul>` of headings automatically. No extra shortcodes and no post-processing scripts required.

```js
const md = new MarkdownIt({ html: true, linkify: true })
  .use(MarkdownItAnchor, {
    slugify,
    permalink: MarkdownItAnchor.permalink.ariaHidden({
      class: 'header-anchor',
      placement: 'before',
    }),
  })
  .use(MarkdownItTocDoneRight, {
    containerClass: 'toc',
    listType: 'ul',
    level: [2, 3],
    slugify,
  });
```

## Shipping the Update

The new flow is simple: add `[[toc]]` where you want the outline, hit build, and let Eleventy do the rest. No more copy-pasting from a chatbot, no more broken anchors, and my readers get the structured overview I always wanted to provide. Sometimes the best developer experience upgrades are the ones that take less time than you budgeted.
