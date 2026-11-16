import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

// Collect public notes recursively, including the bundled sample namespace.
// Each hidden/ directory inherits hidden:true from its directory data.
const collectVisibleNotes = () => {
  const root = path.resolve('notes');
  const visible = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const full = path.join(entry.parentPath, entry.name);
    if (path.relative(root, full).split(path.sep).includes('hidden')) continue;
    const parsed = matter(fs.readFileSync(full, 'utf8'));
    if (parsed.data.hidden) continue;
    if (parsed.data.draft) continue;
    visible.push({
      slug: entry.name.replace(/\.md$/, ''),
      title: parsed.data.title,
    });
  }
  return visible;
};

describe('contract — /notes/', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('lists each visible note with a link to its URL', () => {
    const visible = collectVisibleNotes();
    const { document } = parsePage('/notes/');
    const articles = selectAll(document, 'article');
    expect(articles.length).toBe(visible.length);
    const hrefs = selectAll(document, 'article a[href]').map((a) =>
      a.getAttribute('href'),
    );
    for (const note of visible) {
      const expectedUrl = `/notes/${note.slug}/`;
      expect(hrefs, `notes index should link to ${expectedUrl}`).toContain(
        expectedUrl,
      );
    }
  });

  it('does not list hidden notes', () => {
    const { document } = parsePage('/notes/');
    const hrefs = selectAll(document, 'article a[href]').map((a) =>
      a.getAttribute('href'),
    );
    // No links should point into /notes/hidden/<slug>/
    for (const href of hrefs) {
      expect(href.startsWith('/notes/hidden/')).toBe(false);
    }
  });

  it('renders a heading and no unresolved template syntax', () => {
    const { document } = parsePage('/notes/');
    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1).length).toBeGreaterThan(0);
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/\{\{[^}]*\}\}/);
  });
});
