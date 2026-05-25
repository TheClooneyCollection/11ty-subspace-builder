import { computeContentSeries } from '../lib/series.js';

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
      const { ogImage, page } = data;
      if (ogImage) return ogImage;

      const inputPath = page?.inputPath || '';
      const slug = inputPath
        .split(/[\\/]/)
        .filter(Boolean)
        .pop()
        ?.replace(/\.md$/, '');
      if (!slug) return undefined;

      return `/assets/og/timeline--${slug}.png`;
    },
    contentSeries: computeContentSeries,
  },
};
