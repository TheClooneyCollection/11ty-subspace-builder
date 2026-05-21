import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const ENTRY_SLUG = '2026-04-14-shipped-timeline';
const ENTRY_TITLE = 'feature: Shipped the timeline page';
const ENTRY_CATEGORY = 'shipped';

describe(`/timeline/${ENTRY_SLUG}/`, () => {
  let document;
  let timelineData;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage(`/timeline/${ENTRY_SLUG}/`));
    timelineData = yaml.load(
      fs.readFileSync(path.resolve('_data/timeline.yaml'), 'utf8'),
    );
  });

  it('renders the entry title in an h1', () => {
    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1)).toContain(ENTRY_TITLE);
  });

  it('has a non-empty body within the timeline entry article', () => {
    const entry = document.querySelector('article.timeline-entry');
    expect(entry).toBeTruthy();
    const body = entry.querySelector('.timeline-content');
    expect(body).toBeTruthy();
    expect(textOf(body).length).toBeGreaterThan(0);
  });

  it('marks the entry with the expected category data-type and CSS color rule', () => {
    const articles = selectAll(document, 'article.timeline-entry');
    expect(articles.length).toBeGreaterThan(0);
    const primary = articles[0];
    expect(primary.getAttribute('data-type')).toBe(ENTRY_CATEGORY);

    const category = (timelineData.categories || []).find(
      (c) => c.tag === ENTRY_CATEGORY,
    );
    expect(category).toBeTruthy();
    const css = document.documentElement.outerHTML;
    expect(css).toContain(
      `.timeline-entry[data-type="${ENTRY_CATEGORY}"] { --timeline-color: ${category.color}; }`,
    );
  });
});
