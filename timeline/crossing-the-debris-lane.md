---
title: Fixed OG images for Chinese text
date: 2026-04-12
tags:
  - timeline
  - shipped
  - eleventy
---

The canvas renderer was silently falling back to a font with no CJK glyphs - you'd get blank rectangles instead of characters. Registered Noto Sans SC explicitly before the render pass and it sorted itself out.

Patched and released as v1.21.1.
