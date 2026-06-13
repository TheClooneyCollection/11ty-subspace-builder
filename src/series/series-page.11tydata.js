import {
  describeSeries,
  getVisibleSeriesList,
  resolveSeriesEntries,
} from '../../lib/series.js';

const reportedMessages = new Set();

const reportSeriesIssue = (message, { environment, failInProduction = false }) => {
  if (failInProduction && environment === 'production') {
    throw new Error(message);
  }

  if (reportedMessages.has(message)) {
    return;
  }

  reportedMessages.add(message);
  console.warn(message);
};
export default {
  pagination: {
    data: 'site',
    size: 1,
    alias: 'seriesItem',
    before: (_, data) =>
      getVisibleSeriesList(
        data?.series,
        process.env.ELEVENTY_ENV === 'production'
          ? 'production'
          : 'development',
      ),
  },
  eleventyComputed: {
    resolvedSeries(data) {
      const seriesItem =
        data && typeof data.seriesItem === 'object' ? data.seriesItem : {};
      const environment = data.environment || 'development';
      const { duplicateUrls, draftUrls, missingUrls, entries } =
        resolveSeriesEntries(seriesItem, data.collections);

      const seriesLabel = describeSeries(seriesItem);

      if (duplicateUrls.length) {
        reportSeriesIssue(
          `[11ty/series] ${seriesLabel} contains duplicate entry URLs: ${duplicateUrls.join(', ')}`,
          { environment },
        );
      }

      if (draftUrls.length && environment !== 'production') {
        reportSeriesIssue(
          `[11ty/series] ${seriesLabel} references draft entries that will disappear in production: ${draftUrls.join(', ')}`,
          { environment },
        );
      }

      if (missingUrls.length) {
        reportSeriesIssue(
          `[11ty/series] ${seriesLabel} references missing entry URLs: ${missingUrls.join(', ')}`,
          { environment, failInProduction: true },
        );
      }

      return {
        duplicateUrls,
        draftUrls,
        missingUrls,
        entries,
      };
    },
  },
};
