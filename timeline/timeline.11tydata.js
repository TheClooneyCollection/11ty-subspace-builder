import { computeContentSeries } from '../lib/series.js';

export default {
  eleventyComputed: {
    permalink: (data) => {
      const tags = Array.isArray(data?.tags) ? data.tags : [data?.tags];
      const isTestingEntry = tags.some(
        (tag) => typeof tag === 'string' && tag === 'testing',
      );

      if (isTestingEntry && process.env.ELEVENTY_ENV === 'production') return false;
      const inputPath = data.page?.inputPath || '';
      if (inputPath.replaceAll('\\', '/').includes('timeline/samples/')
        && data.permalink === '/timeline/{{ page.fileSlug }}/') {
        return `/timeline/${inputPath.split(/[\\/]/).pop().replace(/\.md$/, '')}/`;
      }
      return data.permalink;
    },
    ogImage: (data) => {
      const { ogImage, ogImages, page } = data;
      if (ogImage) return ogImage;

      const key = page?.filePathStem;
      if (key && ogImages?.[key]) return ogImages[key];

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
