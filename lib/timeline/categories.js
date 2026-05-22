export const TIMELINE_RESERVED_ARCHIVE_SLUGS = new Set(['months', 'weeks']);

export const extractCategoryTagSet = (categories = []) =>
  new Set(
    (Array.isArray(categories) ? categories : [])
      .map((category) => {
        if (!category || typeof category !== 'object') return null;
        if (typeof category.tag === 'string' && category.tag.trim()) {
          return category.tag.trim();
        }
        return null;
      })
      .filter(Boolean),
  );

export const getEntryType = (entry, categories = []) => {
  const tags = Array.isArray(entry?.data?.tags)
    ? entry.data.tags
    : [entry?.data?.tags].filter(Boolean);

  for (const category of Array.isArray(categories) ? categories : []) {
    if (!category || typeof category !== 'object') continue;
    const categoryTag =
      typeof category.tag === 'string' && category.tag.trim()
        ? category.tag.trim()
        : null;

    if (categoryTag && tags.includes(categoryTag)) {
      return categoryTag;
    }
  }

  return 'default';
};

export const filterTopicTags = (tags = [], excludedTagSet = new Set()) =>
  (Array.isArray(tags) ? tags : [tags])
    .map((tag) => (typeof tag === 'string' ? tag : null))
    .filter((tag) => tag && !excludedTagSet.has(tag))
    .filter((tag, index, values) => values.indexOf(tag) === index);
