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
  },
};
