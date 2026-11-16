---
title: Testing Collapsible Markdown Code Blocks
date: 2026-04-17
draft: true
excerpt: Draft page for testing long fenced Markdown code blocks with expand and collapse controls.
---

This draft exists to verify that long fenced Markdown code blocks now collapse the same way the GitHub shortcode embeds do.

Short blocks should stay fully expanded.

```js
export const greeting = (name) => `hello, ${name}`;

console.log(greeting('world'));
```

Longer blocks should render with a collapsed preview and an expand button.

```js
const lines = [
  'line 01',
  'line 02',
  'line 03',
  'line 04',
  'line 05',
  'line 06',
  'line 07',
  'line 08',
  'line 09',
  'line 10',
  'line 11',
  'line 12',
  'line 13',
  'line 14',
  'line 15',
  'line 16',
  'line 17',
  'line 18',
  'line 19',
  'line 20',
];

for (const line of lines) {
  console.log(line);
}
```

The copy button should still work on the long block while it is collapsed or expanded.
