---
title: 用中文标题验证 OG 图片生成
date: 2026-04-13
tags:
  - eleventy
  - og-images
  - drafts
  - testing
draft: true
ogImage: /assets/og/posts--samples--draft-chinese-og-check.png
excerpt: |
  A draft post that exists purely to verify our OG image pipeline can render Chinese text without dropping glyphs.
---

This draft is here to prove the Open Graph card pipeline can render Chinese text end to end.

The page metadata should use the same generated image referenced below, so if this post renders correctly in development we have both the page-level OG tags and the in-body preview covered.

![Generated OG image for this draft](/assets/og/posts--samples--draft-chinese-og-check.png)

## What to verify

- The page title renders in Chinese in the article header.
- The in-body image loads from `/assets/og/posts--samples--draft-chinese-og-check.png`.
- The generated social card keeps the Chinese title visible instead of showing missing-glyph boxes.
