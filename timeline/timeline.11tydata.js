export default {
  eleventyComputed: {
    permalink: (data) => {
      const tags = Array.isArray(data?.tags) ? data.tags : [data?.tags];
      const isTestingEntry = tags.some(
        (tag) => typeof tag === 'string' && tag === 'testing',
      );

      return isTestingEntry && process.env.ELEVENTY_ENV === 'production'
        ? false
        : undefined;
    },
    ogImage: (data) => {
      const { ogImage, ogImages, page } = data;
      if (ogImage) return ogImage;

      const key = page?.filePathStem;
      if (key && ogImages?.[key]) return ogImages[key];

      const slug = page?.fileSlug;
      if (!slug || !ogImages) return undefined;

      return ogImages[slug];
    },
  },
};
