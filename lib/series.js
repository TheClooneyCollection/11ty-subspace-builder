import { excludedSampleUrls } from './sample-content.js';
import { getCollectionSortKey } from './content/sort.js';

// Build the canonical URL for a series detail page from its id.
const toSeriesUrl = (id) => `/series/${id}/`;

// Keep only well-formed series definition objects from global data.
const normalizeSeriesList = (value) =>
  (Array.isArray(value) ? value : []).filter(
    (item) => item && typeof item === 'object',
  );

// Decide whether a series should be visible in the current environment.
const isSeriesVisible = (seriesItem = {}, environment = 'development') =>
  !(seriesItem.devOnly && environment === 'production');

// Filter the global series list down to items visible for the environment.
const getVisibleSeriesList = (value, environment = 'development', options = {}) => {
  const excluded = excludedSampleUrls(options);
  return normalizeSeriesList(value)
    .filter((item) => isSeriesVisible(item, environment))
    .flatMap((item) => {
      const refs = toSeriesRefs(item);
      const entries = refs.filter((url) => !excluded.has(url));
      if (refs.length && !entries.length) return [];
      return [excluded.size ? { ...item, entries } : item];
    });
};

// Normalize a series membership list into trimmed, non-empty content URLs.
const toSeriesRefs = (seriesItem = {}) =>
  (Array.isArray(seriesItem.entries) ? seriesItem.entries : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

// Build a single URL lookup across all content types that series can include.
const toContentLookup = (collections = {}) => {
  const supportedCollections = [
    ...(Array.isArray(collections.posts) ? collections.posts : []),
    ...(Array.isArray(collections.notes) ? collections.notes : []),
    ...(Array.isArray(collections.timeline) ? collections.timeline : []),
  ];

  return new Map(
    supportedCollections
      .filter((item) => item && typeof item.url === 'string')
      .map((item) => [item.url, item]),
  );
};

// Prefer a human-readable series label in validation and warning messages.
const describeSeries = (seriesItem = {}) =>
  seriesItem.title || seriesItem.id || 'Untitled series';

// Resolve a series's declared URLs into concrete Eleventy content items.
const resolveSeriesEntries = (seriesItem, collections = {}, options = {}) => {
  const excluded = excludedSampleUrls(options);
  const seenUrls = new Set();
  const duplicateUrls = [];
  const draftUrls = [];
  const missingUrls = [];
  const resolvedEntries = [];
  const contentLookup = toContentLookup(collections);

  for (const entryUrl of toSeriesRefs(seriesItem)) {
    if (excluded.has(entryUrl)) continue;
    if (seenUrls.has(entryUrl)) {
      duplicateUrls.push(entryUrl);
      continue;
    }
    seenUrls.add(entryUrl);

    const entry = contentLookup.get(entryUrl);
    if (!entry) {
      missingUrls.push(entryUrl);
      continue;
    }

    if (entry.data?.draft) {
      draftUrls.push(entryUrl);
    }

    resolvedEntries.push(entry);
  }

  return {
    duplicateUrls,
    draftUrls,
    missingUrls,
    entries: resolvedEntries,
  };
};

// Sort ids understood by the series page and assets/js/series-sort.js.
const SERIES_SORTS = ['curated', 'reverse', 'date-asc', 'date-desc'];
const DEFAULT_SERIES_SORT = 'curated';

const isSeriesSort = (value) => SERIES_SORTS.includes(value);

// Pick the initial sort: per-series override, then site.series.defaultSort,
// then curated. Invalid values are reported and skipped.
const resolveSeriesDefaultSort = (seriesItem = {}, siteConfig = {}) => {
  const candidates = [
    { value: seriesItem?.defaultSort, source: `series "${describeSeries(seriesItem)}"` },
    { value: siteConfig?.series?.defaultSort, source: 'site.series' },
  ];
  const invalid = [];

  for (const { value, source } of candidates) {
    if (value === undefined || value === null || value === '') continue;
    if (isSeriesSort(value)) return { sort: value, invalid };
    invalid.push(`${source} defaultSort "${value}"`);
  }

  return { sort: DEFAULT_SERIES_SORT, invalid };
};

// Order resolved entries for a sort id, mirroring assets/js/series-sort.js.
// Date sorts use date plus front matter time and break ties by curated order.
// Returns { entry, curatedIndex } so templates keep the declared position.
const sortSeriesEntries = (entries = [], sort = DEFAULT_SERIES_SORT) => {
  const indexed = entries.map((entry, curatedIndex) => ({
    entry,
    curatedIndex,
    sortKey: getCollectionSortKey(entry),
  }));

  return indexed.sort((first, second) => {
    if (sort === 'reverse') return second.curatedIndex - first.curatedIndex;

    if (sort === 'date-asc' || sort === 'date-desc') {
      const comparison = first.sortKey.localeCompare(second.sortKey);
      if (comparison !== 0) return sort === 'date-asc' ? comparison : -comparison;
    }

    return first.curatedIndex - second.curatedIndex;
  });
};

// Compute the series membership metadata shown on individual content pages.
const computeContentSeries = (data) => {
  const pageUrl = data?.page?.url;
  if (!pageUrl) return [];
  const environment = data?.environment || 'development';

  return getVisibleSeriesList(data?.series, environment, data)
    .map((seriesItem) => {
      const refs = toSeriesRefs(seriesItem);
      const position = refs.indexOf(pageUrl);
      if (position === -1) return null;

      return {
        id: seriesItem.id,
        title: seriesItem.title || seriesItem.id,
        intro: seriesItem.intro,
        url: toSeriesUrl(seriesItem.id),
        position: position + 1,
        total: refs.length,
      };
    })
    .filter(Boolean);
};

export {
  DEFAULT_SERIES_SORT,
  SERIES_SORTS,
  computeContentSeries,
  describeSeries,
  getVisibleSeriesList,
  isSeriesVisible,
  normalizeSeriesList,
  resolveSeriesDefaultSort,
  resolveSeriesEntries,
  sortSeriesEntries,
  toSeriesRefs,
  toSeriesUrl,
};
