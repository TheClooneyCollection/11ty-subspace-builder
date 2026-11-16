---
title: Testing Collapsed GitHub Embed Long Line Scrolling
date: 2026-05-07
draft: true
excerpt: Draft page for testing horizontal scrolling in collapsed GitHub code embeds with long lines.
---

This draft verifies that collapsed GitHub code embeds keep horizontal scrolling available when a snippet contains long lines.

{% github
"https://github.com/NicholasClooney/ProjectSpire/blob/2b50e8c3ea9843588a7873004a89f3e6c2c76b39/Documentation/Plans/0002%20-%20Neow%27s%20Cafe%20Card%20Catalog%20Integration.md#L7-L25"
%}

The fenced Markdown code block below should wrap by default, with a control to switch back to horizontal scrolling.

```md
This is a deliberately long Markdown code line for testing the code block wrap toggle: Neow's Cafe card catalog integration needs to keep dense implementation notes readable on narrow screens without forcing the entire page layout wider than the content column.
```
