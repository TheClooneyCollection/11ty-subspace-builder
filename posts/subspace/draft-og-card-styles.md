---
title: Choose a sharing card style
date: 2026-04-14
tags:
  - subspace
draft: true
templateEngineOverride: njk,md
excerpt: Compare eight Open Graph styles using the same small set of sample cards.
---

Open Graph cards travel with your links. Compare these styles using the same post, long title, Chinese series, series entry, timeline update, and page description.

Set `ogImage.style` in `_data/site.yaml`, or use `ogStyle` in a page's front matter. Retro is the default; `classic` keeps the previous card.

[See the cards generated for this site](/og/).

{% for sample in ["post", "long", "zh", "series", "timeline", "page"] %}
<h2>{{ sample | capitalize }}</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:20px;margin-bottom:32px">
{% for card in ogGallery.showcase %}{% if card.sample == sample %}
<figure style="margin:0;min-width:0">
<img eleventy:ignore src="{{ card.image }}" width="1200" height="630" alt="{{ card.label }} in {{ card.style }} style" style="display:block;width:100%;height:auto" loading="lazy">
<figcaption><code>ogImage.style: {{ card.style }}</code></figcaption>
</figure>
{% endif %}{% endfor %}
</div>
{% endfor %}
