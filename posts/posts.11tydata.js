const toSeriesUrl = (id) => `/series/${id}/`;

const normalizeSeriesList = (value) =>
  (Array.isArray(value) ? value : []).filter(
    (item) => item && typeof item === 'object',
  );

export default {
  eleventyComputed: {
    ogImage: (data) => {
      const { ogImage, ogImages, page } = data;
      if (ogImage) return ogImage;

      const key = page?.filePathStem;
      if (key && ogImages?.[key]) return ogImages[key];

      const slug = page?.fileSlug;
      if (!slug || !ogImages) return undefined;

      return ogImages[slug];
    },
    postSeries: (data) => {
      const pageUrl = data?.page?.url;
      if (!pageUrl) return [];

      return normalizeSeriesList(data?.series)
        .map((seriesItem) => {
          const posts = Array.isArray(seriesItem.posts) ? seriesItem.posts : [];
          const position = posts.indexOf(pageUrl);
          if (position === -1) return null;

          return {
            id: seriesItem.id,
            title: seriesItem.title || seriesItem.id,
            intro: seriesItem.intro,
            url: toSeriesUrl(seriesItem.id),
            position: position + 1,
            total: posts.length,
          };
        })
        .filter(Boolean);
    },
  },
};
