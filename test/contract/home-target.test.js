import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import yaml from 'yaml';
import {
  ensureSiteBuilt,
  sitePathExists,
} from '../helpers/build-once.js';
import { parsePage, selectAll } from '../helpers/parse.js';

const HOME_ELIGIBLE = {
  blog: '/blog/',
  timeline: '/timeline/',
  notes: '/notes/',
};

const readHomeTarget = () => {
  const raw = fs.readFileSync(path.resolve('_data/site.yaml'), 'utf8');
  const parsed = yaml.parse(raw) || {};
  return parsed.home?.target || 'blog';
};

describe('contract — site.home.target', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  const target = readHomeTarget();

  it('renders the configured target at /', () => {
    expect(HOME_ELIGIBLE[target]).toBeDefined();
    expect(sitePathExists('index.html')).toBe(true);
  });

  it('does not also emit the target at its canonical path', () => {
    const canonical = HOME_ELIGIBLE[target].replace(/^\/+|\/+$/g, '');
    expect(sitePathExists(`${canonical}/index.html`)).toBe(false);
  });

  it('keeps non-target home-eligible sections at their canonical paths', () => {
    for (const [id, canonicalUrl] of Object.entries(HOME_ELIGIBLE)) {
      if (id === target) continue;
      const canonical = canonicalUrl.replace(/^\/+|\/+$/g, '');
      expect(
        sitePathExists(`${canonical}/index.html`),
        `${id} should be emitted at ${canonicalUrl}`,
      ).toBe(true);
    }
  });

  it('sidebar nav lists the target item first', () => {
    const { document } = parsePage('/');
    const navLinks = selectAll(document, 'nav#sidebar a[href]');
    expect(navLinks.length).toBeGreaterThan(0);
    const firstHref = navLinks[0].getAttribute('href');
    expect(firstHref).toBe('/');
  });

  it('sidebar nav points the target item at / and others at their canonical urls', () => {
    const { document } = parsePage('/');
    const navLinks = selectAll(document, 'nav#sidebar a[href]');
    const hrefById = new Map();
    for (const a of navLinks) {
      const text = (a.textContent || '').trim().toLowerCase();
      hrefById.set(text.split(/[\s:]/)[0], a.getAttribute('href'));
    }
    expect(hrefById.get(target)).toBe('/');
    for (const [id, canonicalUrl] of Object.entries(HOME_ELIGIBLE)) {
      if (id === target) continue;
      if (!hrefById.has(id)) continue;
      expect(hrefById.get(id)).toBe(canonicalUrl);
    }
  });
});
