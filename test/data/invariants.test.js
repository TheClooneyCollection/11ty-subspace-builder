import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const readYaml = (relativePath) => {
  const full = path.resolve(relativePath);
  return yaml.load(fs.readFileSync(full, 'utf8'));
};

const COLOR_RE = /^#[0-9a-f]{6}$/i;

describe('data invariants — timeline.yaml', () => {
  const timeline = readYaml('_data/timeline.yaml');

  it('categories list is present and non-empty', () => {
    expect(Array.isArray(timeline.categories)).toBe(true);
    expect(timeline.categories.length).toBeGreaterThan(0);
  });

  it('every category tag is unique', () => {
    const tags = timeline.categories.map((c) => c.tag);
    const unique = new Set(tags);
    expect(unique.size).toBe(tags.length);
  });

  it('every category tag is a non-empty string', () => {
    for (const cat of timeline.categories) {
      expect(typeof cat.tag).toBe('string');
      expect(cat.tag.length).toBeGreaterThan(0);
    }
  });

  it('every category color matches /^#[0-9a-f]{6}$/i', () => {
    for (const cat of timeline.categories) {
      expect(cat.color, `category ${cat.tag} color`).toMatch(COLOR_RE);
    }
  });

  it('featuredTags, if present, is a string[]', () => {
    if (timeline.featuredTags === undefined) return;
    expect(Array.isArray(timeline.featuredTags)).toBe(true);
    for (const t of timeline.featuredTags) {
      expect(typeof t).toBe('string');
    }
  });
});

describe('data invariants — series.yaml', () => {
  const series = readYaml('_data/series.yaml');

  it('series.yaml is an array', () => {
    expect(Array.isArray(series)).toBe(true);
    expect(series.length).toBeGreaterThan(0);
  });

  // Series entries are referenced by URL path (e.g. /posts/foo/) under the
  // `posts` key. Resolve each to the underlying markdown file in posts/ or
  // notes/ — every referenced item must exist as a real source file.
  const findSourceForUrl = (url) => {
    // strip leading/trailing slashes
    const trimmed = url.replace(/^\/+/, '').replace(/\/+$/, '');
    // /posts/<slug>/ or /notes/<slug>/
    const parts = trimmed.split('/');
    if (parts.length < 2) return null;
    const kind = parts[0]; // posts | notes
    const slug = parts[parts.length - 1];

    if (kind === 'posts') {
      const candidates = [];
      // posts/<slug>.md
      candidates.push(path.resolve('posts', `${slug}.md`));
      // posts/<any subdir>/<slug>.md — walk one level
      const postsRoot = path.resolve('posts');
      if (fs.existsSync(postsRoot)) {
        for (const entry of fs.readdirSync(postsRoot, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            candidates.push(path.join(postsRoot, entry.name, `${slug}.md`));
          }
        }
      }
      return candidates.find((c) => fs.existsSync(c)) || null;
    }

    if (kind === 'notes') {
      const candidates = [];
      candidates.push(path.resolve('notes', `${slug}.md`));
      const notesRoot = path.resolve('notes');
      if (fs.existsSync(notesRoot)) {
        for (const entry of fs.readdirSync(notesRoot, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            candidates.push(path.join(notesRoot, entry.name, `${slug}.md`));
          }
        }
      }
      return candidates.find((c) => fs.existsSync(c)) || null;
    }

    return null;
  };

  for (const item of series) {
    describe(`series "${item.id}"`, () => {
      it('has an id and title', () => {
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(typeof item.title).toBe('string');
      });

      it('every posts entry resolves to a real markdown file', () => {
        const refs = item.posts || [];
        expect(Array.isArray(refs)).toBe(true);
        for (const ref of refs) {
          const resolved = findSourceForUrl(ref);
          expect(
            resolved,
            `series "${item.id}" references "${ref}" but no matching markdown file was found under posts/ or notes/`,
          ).toBeTruthy();
        }
      });
    });
  }
});
