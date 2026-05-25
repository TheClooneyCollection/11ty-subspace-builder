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
const getVisibleSeriesList = (value, environment = 'development') =>
  normalizeSeriesList(value).filter((item) => isSeriesVisible(item, environment));

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
const resolveSeriesEntries = (seriesItem, collections = {}) => {
  const seenUrls = new Set();
  const duplicateUrls = [];
  const draftUrls = [];
  const missingUrls = [];
  const resolvedEntries = [];
  const contentLookup = toContentLookup(collections);

  for (const entryUrl of toSeriesRefs(seriesItem)) {
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

// Compute the series membership metadata shown on individual content pages.
const computeContentSeries = (data) => {
  const pageUrl = data?.page?.url;
  if (!pageUrl) return [];
  const environment = data?.environment || 'development';

  return getVisibleSeriesList(data?.series, environment)
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
  computeContentSeries,
  describeSeries,
  getVisibleSeriesList,
  isSeriesVisible,
  normalizeSeriesList,
  resolveSeriesEntries,
  toSeriesRefs,
  toSeriesUrl,
};
