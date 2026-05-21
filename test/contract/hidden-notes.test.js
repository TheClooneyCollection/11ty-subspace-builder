import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import {
  ensureSiteBuilt,
  sitePathExists,
} from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

// In this project, hidden notes are served at /notes/hidden/ (the src/hidden-notes.njk
// page has permalink: /notes/hidden/). The collection `hiddenNotes` is populated
// from notes/hidden/ (which inherits hidden:true). In production builds, drafts
// are excluded from collections, so any hidden note that is ALSO a draft will
// not appear in the index even though its individual page is still rendered.

const sidebarNav = yaml.load(
  fs.readFileSync(path.resolve('_data/sidebarNav.yaml'), 'utf8'),
);

const collectHiddenNotesOnDisk = () => {
  const root = path.resolve('notes/hidden');
  if (!fs.existsSync(root)) return [];
  const items = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const full = path.join(root, entry.name);
    const parsed = matter(fs.readFileSync(full, 'utf8'));
    items.push({
      slug: entry.name.replace(/\.md$/, ''),
      draft: !!parsed.data.draft,
      title: parsed.data.title,
    });
  }
  return items;
};

describe('contract — hidden notes index', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('hidden notes index page is built at /notes/hidden/', () => {
    expect(sitePathExists('notes/hidden/index.html')).toBe(true);
  });

  it('renders a heading and no unresolved template syntax', () => {
    const { document } = parsePage('/notes/hidden/');
    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1).length).toBeGreaterThan(0);
    expect(document.body.innerHTML).not.toMatch(/\{\{[^}]*\}\}/);
  });

  it('listing matches non-draft hidden notes on disk (production build)', () => {
    // In production, drafts are excluded from collections, so the index lists
    // only hidden notes that are NOT drafts. Each non-draft hidden note must
    // be linked from the index.
    const hidden = collectHiddenNotesOnDisk();
    const listed = hidden.filter((n) => !n.draft);
    const { document } = parsePage('/notes/hidden/');
    const articles = selectAll(document, 'article');
    expect(articles.length).toBe(listed.length);
    const hrefs = selectAll(document, 'article a[href]').map((a) =>
      a.getAttribute('href'),
    );
    for (const note of listed) {
      const expectedUrl = `/notes/hidden/${note.slug}/`;
      expect(hrefs).toContain(expectedUrl);
    }
  });

  it('individual hidden note pages still render even when collection excludes them', () => {
    // Hidden notes that are drafts are excluded from collections in production,
    // but their pages still render at their direct URL.
    const hidden = collectHiddenNotesOnDisk();
    for (const note of hidden) {
      expect(
        sitePathExists(`notes/hidden/${note.slug}/index.html`),
        `expected page for ${note.slug}`,
      ).toBe(true);
    }
  });

  it('the hidden-notes URL is NOT present in sidebarNav.yaml main nav', () => {
    const navUrls = sidebarNav.map((item) => item.url);
    expect(navUrls).not.toContain('/notes/hidden/');
    // The `notes` nav entry should be `/notes/` (visible notes).
    expect(navUrls).toContain('/notes/');
  });
});
