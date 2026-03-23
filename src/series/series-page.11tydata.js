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

const toPostsByUrl = (posts = []) =>
  new Map(
    posts
      .filter((post) => post && typeof post.url === 'string')
      .map((post) => [post.url, post]),
  );

const toSeriesUrls = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

const describeSeries = (seriesItem = {}) =>
  seriesItem.title || seriesItem.id || 'Untitled series';

export default {
  eleventyComputed: {
    resolvedSeries(data) {
      const seriesItem =
        data && typeof data.seriesItem === 'object' ? data.seriesItem : {};
      const environment = data.environment || 'development';
      const posts = Array.isArray(data.collections?.posts)
        ? data.collections.posts
        : [];
      const postsByUrl = toPostsByUrl(posts);
      const seenUrls = new Set();
      const duplicateUrls = [];
      const draftUrls = [];
      const missingUrls = [];
      const resolvedPosts = [];

      for (const postUrl of toSeriesUrls(seriesItem.posts)) {
        if (seenUrls.has(postUrl)) {
          duplicateUrls.push(postUrl);
          continue;
        }
        seenUrls.add(postUrl);

        const post = postsByUrl.get(postUrl);
        if (!post) {
          missingUrls.push(postUrl);
          continue;
        }

        if (post.data?.draft) {
          draftUrls.push(postUrl);
        }

        resolvedPosts.push(post);
      }

      const seriesLabel = describeSeries(seriesItem);

      if (duplicateUrls.length) {
        reportSeriesIssue(
          `[11ty/series] ${seriesLabel} contains duplicate post URLs: ${duplicateUrls.join(', ')}`,
          { environment },
        );
      }

      if (draftUrls.length && environment !== 'production') {
        reportSeriesIssue(
          `[11ty/series] ${seriesLabel} references draft posts that will disappear in production: ${draftUrls.join(', ')}`,
          { environment },
        );
      }

      if (missingUrls.length) {
        reportSeriesIssue(
          `[11ty/series] ${seriesLabel} references missing post URLs: ${missingUrls.join(', ')}`,
          { environment, failInProduction: true },
        );
      }

      return {
        duplicateUrls,
        draftUrls,
        missingUrls,
        posts: resolvedPosts,
      };
    },
  },
};
