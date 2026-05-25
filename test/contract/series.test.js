import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  ensureSiteBuilt,
  sitePathExists,
} from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const loadSeries = () =>
  yaml.load(fs.readFileSync(path.resolve('_data/series.yaml'), 'utf8'));
const DEV_MODE = { mode: 'dev' };

describe('/series/', () => {
  let indexDoc;
  let series;
  let mixedSeries;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: indexDoc } = parsePage('/series/'));
    series = loadSeries();
    mixedSeries = series.find((item) => item.id === 'subspace-surfaces');
  });

  it('renders one card per declared series', () => {
    const visibleSeries = series.filter((item) => !item.devOnly);
    const heads = selectAll(indexDoc, 'a[href^="/series/"]').filter(
      (a) =>
        /^\/series\/[^/]+\/$/.test(a.getAttribute('href') || '') &&
        textOf(a).length > 0,
    );
    const uniqueHrefs = new Set(heads.map((a) => a.getAttribute('href')));
    expect(uniqueHrefs.size).toBeGreaterThanOrEqual(visibleSeries.length);
    for (const s of visibleSeries) {
      expect(uniqueHrefs.has(`/series/${s.id}/`)).toBe(true);
    }
    expect(uniqueHrefs.has('/series/subspace-surfaces/')).toBe(false);
  });

  describe('a series page', () => {
    let seriesDoc;
    let seriesDef;

    beforeAll(() => {
      seriesDef = mixedSeries;
      ({ document: seriesDoc } = parsePage(`/series/${seriesDef.id}/`, DEV_MODE));
    });

    it('has a non-empty title matching the series definition', () => {
      const h1 = seriesDoc.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(textOf(h1)).toContain(seriesDef.title);
    });

    it('renders entries in the order declared in _data/series.yaml', () => {
      const seriesLinks = selectAll(seriesDoc, 'a[href]').map((a) =>
        a.getAttribute('href'),
      );
      const declaredOrder = seriesDef.entries;
      // Filter links down to first occurrence of each declared entry.
      const seen = new Set();
      const ordered = [];
      for (const href of seriesLinks) {
        if (declaredOrder.includes(href) && !seen.has(href)) {
          seen.add(href);
          ordered.push(href);
        }
      }
      expect(ordered).toEqual(declaredOrder);
    });

    it('renders mixed-content entries on the generalized series page', () => {
      const hrefs = new Set(
        selectAll(seriesDoc, 'a[href]').map((a) => a.getAttribute('href')),
      );
      for (const href of seriesDef.entries) {
        expect(hrefs.has(href)).toBe(true);
      }
    });
  });

  describe('series backlinks', () => {
    it('renders the series membership box on a post detail page in dev', () => {
      const { document } = parsePage('/posts/v1.13-1.20-roundup/', DEV_MODE);
      const text = document.body?.textContent || '';
      expect(text).toContain('Part of a series');
      expect(text).toContain('Subspace Surfaces');
    });

    it('renders the series membership box on a note detail page in dev', () => {
      const { document } = parsePage('/notes/testing-the-notes-collection/', DEV_MODE);
      const text = document.body?.textContent || '';
      expect(text).toContain('Part of a series');
      expect(text).toContain('Subspace Surfaces');
    });

    it('renders the series membership box on a timeline detail page in dev', () => {
      const { document } = parsePage('/timeline/2026-04-14-shipped-timeline/', DEV_MODE);
      const text = document.body?.textContent || '';
      expect(text).toContain('Part of a series');
      expect(text).toContain('Subspace Surfaces');
    });

    it('does not emit the dev-only series page in production', () => {
      expect(sitePathExists('/series/subspace-surfaces/')).toBe(false);
    });
  });
});
