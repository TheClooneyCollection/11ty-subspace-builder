import { describe, it, expect, beforeAll } from 'vitest';
import { ensureSiteBuilt, walkSiteHtml } from '../helpers/build-once.js';
import { parseFile, selectAll } from '../helpers/parse.js';
import path from 'node:path';

// Some anchors are intentionally rendered with non-textual content (e.g. an
// <img>, <svg>, an <object>, or carry an explicit aria-label). For those we
// don't require visible text. Otherwise, every `<a>` must have at least some
// visible text in its descendants.

const SITE_DIR = path.resolve('_site');

const hasAccessibleAltContent = (anchor) => {
  if (anchor.getAttribute('aria-label')?.trim()) return true;
  if (anchor.getAttribute('title')?.trim()) return true;
  // Image with alt is OK.
  const imgs = anchor.querySelectorAll('img');
  for (const img of imgs) {
    if ((img.getAttribute('alt') || '').trim().length > 0) return true;
  }
  // Inline SVG with a title or aria-label.
  const svgs = anchor.querySelectorAll('svg');
  for (const svg of svgs) {
    if (svg.getAttribute('aria-label')?.trim()) return true;
    if (svg.querySelector('title')) return true;
  }
  return false;
};

describe('contract — no empty anchors in _site/', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('every <a> in built HTML has visible text or accessible alt content', () => {
    const offenders = [];
    for (const { absolutePath, relativePath } of walkSiteHtml()) {
      // Skip the feed (it's actually XML — only .html is walked anyway).
      const relativeUnderSite = path.relative(SITE_DIR, absolutePath);
      const { document } = parseFile(relativeUnderSite);
      const anchors = selectAll(document, 'a');
      for (const a of anchors) {
        const text = (a.textContent || '').replace(/\s+/g, '').trim();
        if (text.length > 0) continue;
        if (hasAccessibleAltContent(a)) continue;
        const href = a.getAttribute('href') || '(no href)';
        offenders.push(`${relativePath}: empty <a href="${href}">`);
      }
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([]);
  });
});
