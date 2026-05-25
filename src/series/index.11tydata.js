import { getVisibleSeriesList } from '../../lib/series.js';

export default {
  eleventyComputed: {
    visibleSeries: (data) =>
      getVisibleSeriesList(data?.series, data?.environment || 'development'),
  },
};
