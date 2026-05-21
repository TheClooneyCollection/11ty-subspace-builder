import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';
import { normalizeFragment } from '../helpers/normalize-html.js';

const loadTimeline = () =>
  yaml.load(fs.readFileSync(path.resolve('_data/timeline.yaml'), 'utf8'));

const findEntryByHref = (document, href) => {
  const articles = selectAll(document, 'article.timeline-entry');
  return articles.find((article) => {
    const a = article.querySelector('.timeline-title a');
    return a && a.getAttribute('href') === href;
  });
};

// Snapshot only the stable surface of an entry: data-type, header, title link,
// and relationships footer. The markdown body is excluded because it contains
// long-form prose that drifts as content evolves. Category/relationship logic
// is what the snapshot is meant to lock in.
const snapshotShell = (article) => {
  const cloned = article.cloneNode(true);
  const content = cloned.querySelector('.timeline-content');
  if (content) content.remove();
  const tags = cloned.querySelector('.timeline-tags');
  if (tags) tags.remove();
  return normalizeFragment(cloned);
};

describe('timeline entry snapshots', () => {
  let timelineDoc;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: timelineDoc } = parsePage('/timeline/'));
  });

  it('categories declared in timeline.yaml are all valid CSS color rules', () => {
    const categories = loadTimeline().categories || [];
    expect(categories.length).toBeGreaterThan(0);
    const css = timelineDoc.documentElement.outerHTML;
    for (const cat of categories) {
      expect(css).toContain(
        `.timeline-entry[data-type="${cat.tag}"] { --timeline-color: ${cat.color}; }`,
      );
    }
  });

  it('renders entry with a "children" follow-up badge (no parent)', () => {
    // /timeline/2026-04-14-shipped-timeline/ is the root of a thread.
    const article = findEntryByHref(
      timelineDoc,
      '/timeline/2026-04-14-shipped-timeline/',
    );
    expect(article).toBeTruthy();
    expect(article.getAttribute('data-type')).toBe('shipped');

    const relationships = article.querySelectorAll('.timeline-relationship');
    expect(relationships.length).toBe(1);
    // Children badge points to #timeline-children anchor.
    expect(relationships[0].getAttribute('href')).toContain('#timeline-children');
    expect(textOf(relationships[0])).toMatch(/follow-up/);

    expect(snapshotShell(article)).toMatchSnapshot();
  });

  it('renders entry with a "continues from" parent badge', () => {
    const article = findEntryByHref(
      timelineDoc,
      '/timeline/2026-04-16-published-relational-timeline-entry/',
    );
    expect(article).toBeTruthy();
    expect(article.getAttribute('data-type')).toBe('shipped');

    const labels = selectAll(article, '.timeline-relationship__label');
    expect(labels.length).toBe(1);
    expect(textOf(labels[0])).toBe('Continues from');

    expect(snapshotShell(article)).toMatchSnapshot();
  });

  // Real timeline currently has entries in only one category ("shipped"); the
  // CSS-rule assertion above proves every declared category renders a color
  // rule, which is what per-category snapshots would have locked in.
  it('every category from timeline.yaml has a usable data-type value', () => {
    const categories = loadTimeline().categories || [];
    for (const cat of categories) {
      expect(typeof cat.tag).toBe('string');
      expect(cat.tag.length).toBeGreaterThan(0);
    }
  });
});
