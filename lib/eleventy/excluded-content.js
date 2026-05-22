export const BLOG_EXCLUDED_TAGS = new Set([
  'all',
  'nav',
  'post',
  'posts',
  'notes',
  'timeline',
  'testing',
]);

export const filterTagList = (tags = [], excludedSet = BLOG_EXCLUDED_TAGS) =>
  (Array.isArray(tags) ? tags : [tags])
    .map((tag) => (typeof tag === 'string' ? tag : null))
    .filter((tag) => tag && !excludedSet.has(tag));

export const hasTag = (data, targetTag) =>
  (Array.isArray(data?.tags) ? data.tags : [data?.tags]).some(
    (tag) => typeof tag === 'string' && tag === targetTag,
  );

export const isTestingOnlyContent = (data, isProduction) =>
  Boolean(isProduction) && hasTag(data, 'testing');

export const isExcludedFromCollections = (data, isProduction) =>
  isTestingOnlyContent(data, isProduction) ||
  Boolean(data?.draft && isProduction);
