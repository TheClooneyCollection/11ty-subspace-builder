import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  ensureSiteBuilt,
  sitePathExists,
} from '../helpers/build-once.js';
import { parsePage, selectAll } from '../helpers/parse.js';

const POPULAR_TAG = 'subspace';

const RESERVED_TAGS = [
  'all',
  'nav',
  'post',
  'posts',
  'notes',
  'timeline',
  'testing',
];

describe('/timeline/<tag>/', () => {
  let document;
  let timelineData;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage(`/timeline/${POPULAR_TAG}/`));
    timelineData = yaml.load(
      fs.readFileSync(path.resolve('_data/timeline.yaml'), 'utf8'),
    );
  });

  it('renders multiple timeline entries for a popular topic tag', () => {
    const entries = selectAll(document, 'article.timeline-entry');
    expect(entries.length).toBeGreaterThan(1);
  });

  it('does not generate timeline archive pages for reserved tags', () => {
    for (const tag of RESERVED_TAGS) {
      expect(sitePathExists(`timeline/${tag}/index.html`)).toBe(false);
    }
  });

  it('does not generate timeline archive pages for category tags', () => {
    for (const category of timelineData.categories || []) {
      expect(sitePathExists(`timeline/${category.tag}/index.html`)).toBe(false);
    }
  });
});
