import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const loadSeries = () =>
  yaml.load(fs.readFileSync(path.resolve('_data/series.yaml'), 'utf8'));

describe('/series/', () => {
  let indexDoc;
  let series;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: indexDoc } = parsePage('/series/'));
    series = loadSeries();
  });

  it('renders one card per declared series', () => {
    const heads = selectAll(indexDoc, 'a[href^="/series/"]').filter(
      (a) =>
        /^\/series\/[^/]+\/$/.test(a.getAttribute('href') || '') &&
        textOf(a).length > 0,
    );
    const uniqueHrefs = new Set(heads.map((a) => a.getAttribute('href')));
    expect(uniqueHrefs.size).toBeGreaterThanOrEqual(series.length);
    for (const s of series) {
      expect(uniqueHrefs.has(`/series/${s.id}/`)).toBe(true);
    }
  });

  describe('a series page', () => {
    let seriesDoc;
    let seriesDef;

    beforeAll(() => {
      seriesDef = series[0];
      ({ document: seriesDoc } = parsePage(`/series/${seriesDef.id}/`));
    });

    it('has a non-empty title matching the series definition', () => {
      const h1 = seriesDoc.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(textOf(h1)).toContain(seriesDef.title);
    });

    it('renders entries in the order declared in _data/series.yaml', () => {
      const postLinks = selectAll(seriesDoc, 'a[href^="/posts/"]').map((a) =>
        a.getAttribute('href'),
      );
      const declaredOrder = seriesDef.posts;
      // Filter postLinks down to first occurrence of each declared post.
      const seen = new Set();
      const ordered = [];
      for (const href of postLinks) {
        if (declaredOrder.includes(href) && !seen.has(href)) {
          seen.add(href);
          ordered.push(href);
        }
      }
      expect(ordered).toEqual(declaredOrder);
    });
  });
});
