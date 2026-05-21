import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const loadTimelineData = () =>
  yaml.load(fs.readFileSync(path.resolve('_data/timeline.yaml'), 'utf8'));

describe('/timeline/', () => {
  let document;
  let timelineData;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage('/timeline/'));
    timelineData = loadTimelineData();
  });

  it('renders at least one top-level timeline entry article', () => {
    const entries = selectAll(document, 'article.timeline-entry');
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const type = entry.getAttribute('data-type');
      expect(type && type.length).toBeTruthy();
    }
  });

  it('renders a CSS color rule for each category from timeline.yaml', () => {
    const css = document.documentElement.outerHTML;
    for (const category of timelineData.categories || []) {
      const selector = `.timeline-entry[data-type="${category.tag}"]`;
      expect(css).toContain(selector);
      expect(css).toContain(category.color);
    }
  });

  it('uses the entry data-type values from the configured category tag set', () => {
    const allowed = new Set([
      ...(timelineData.categories || []).map((c) => c.tag),
      'default',
    ]);
    const entries = selectAll(document, 'article.timeline-entry');
    for (const entry of entries) {
      expect(allowed.has(entry.getAttribute('data-type'))).toBe(true);
    }
  });

  it('has a stable, non-empty page title', () => {
    const title = textOf(document.querySelector('title'));
    expect(title.length).toBeGreaterThan(0);
    expect(title.toLowerCase()).toContain('timeline');
  });
});
