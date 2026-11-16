---
title: Draft Footnote Rendering Test
date: 2026-05-01
tags:
  - drafts
  - testing
  - markdown
  - footnotes
draft: true
excerpt: |
  Draft post for checking markdown footnote rendering, backlink behavior, and theme styling.
---

## Reference footnote

This sentence has a reference footnote.[^ref]

This second sentence points back to that same reference footnote so the rendered note should receive another backlink.[^ref]

[^ref]: This is the referenced footnote body.

## Inline footnote

This sentence has an inline footnote.^[This is the inline footnote body.]

## Mixed content

Footnotes should work alongside links, code, and normal paragraphs.

For example, here is an [internal link](/posts/github-code-embeds/) and some `inline code` with another footnote.[^mix]

[^mix]: Mixed footnote text for checking layout around other inline elements.

## Long footnote

This sentence points to a deliberately long footnote.[^long]

This follow-up sentence references the same long footnote again to test multiple backlinks on a multi-paragraph note.[^long]

[^long]: This is the first paragraph of a longer footnote. It should wrap naturally across multiple lines, preserve readable spacing, and keep the highlighted target outline close enough to the content that it still feels intentional rather than oversized.

    This is the second paragraph of the same footnote. It exists to check that multi-paragraph footnote bodies keep their spacing without breaking the number alignment or making the backlink feel detached from the note.

    This is the third paragraph of the same footnote. It gives the selected target state enough vertical height to reveal whether the outline, radius, and padding still work when a footnote becomes a small block of prose instead of a single sentence.
