// 11ty Nav
import eleventyNavigationPlugin from '@11ty/eleventy-navigation';
// 11ty RSS
import eleventyPluginRss from '@11ty/eleventy-plugin-rss';
// 11ty Img
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';
import EleventyFetch from '@11ty/eleventy-fetch';
import path from 'node:path';
import fs from 'node:fs';

// Bake our own Markdown anchors
import MarkdownIt from 'markdown-it';
import MarkdownItAnchor from 'markdown-it-anchor';
import MarkdownItFootnote from 'markdown-it-footnote';
import MarkdownItTocDoneRight from 'markdown-it-toc-done-right';
// Use yaml for data
import yaml from 'js-yaml';
import excerpt from './lib/excerpt.js';
import {
  normalizeLanguage,
  highlightCode,
  getNumericSetting,
  renderMarkdownCodeBlock,
} from './lib/markdown/code-block.js';
import { markTodoBlockquotes } from './lib/markdown/todo-blockquote.js';
import {
  parseBlobUrl,
  trimSharedIndent,
  guessLanguageByExt,
} from './lib/markdown/github-embed.js';
import {
  normalizeTimelineRef,
  getTimelineEntryRef,
  getTimelineParentRef,
} from './lib/timeline/refs.js';
import { toIsoDatePart, parseIsoDateAsUtc } from './lib/timeline/dates.js';
import { getTimelineSortKey } from './lib/timeline/sort.js';
import {
  buildTimelineEntryMap,
  buildTimelineChildMap,
  getTimelineEntryByRef,
  getTimelineChildEntries,
  getTimelineAncestorEntries,
  getTimelineEarlierThreadEntries,
  getTimelineDescendantCount,
  getTimelineDescendantTree,
} from './lib/timeline/graph.js';
import {
  getTimelineEntryLabel,
  validateTimelineEntryRelationships,
  validateTimelineEntryDateTimeQuotes,
} from './lib/timeline/validate.js';
import {
  TIMELINE_RESERVED_ARCHIVE_SLUGS,
  extractCategoryTagSet,
  getEntryType,
  filterTopicTags,
} from './lib/timeline/categories.js';
import {
  buildTimelineTagArchives,
  buildTimelineMonthArchives,
  buildTimelineWeekArchives,
  buildTimelineCalendarWeekArchives,
} from './lib/timeline/archives.js';
import { slugify } from './lib/slugify.js';
import {
  buildAssetUrl,
  emitFingerprintedAssets,
} from './lib/assets/fingerprint.js';
import { sortCollectionByDateAndTime } from './lib/content/sort.js';
import { assertNoBrokenInternalLinks } from './lib/build/link-check.js';
import {
  filterTagList,
  isExcludedFromCollections,
} from './lib/eleventy/excluded-content.js';

const OG_FORCE_ENV = process.env.OG_FORCE === 'true';
const ELEVENTY_FETCH_CACHE_DIR = path.resolve('.cache');
const ELEVENTY_IMAGE_CACHE_DIR = path.resolve('.cache/@11ty/img');
const ELEVENTY_IMAGE_URL_PATH = '/img/';
const SITE_DATA_URL = new URL('./_data/site.yaml', import.meta.url);
const TIMELINE_DATA_URL = new URL('./_data/timeline.yaml', import.meta.url);
const siteDataCache = {
  mtimeMs: null,
  data: {},
};
const timelineDataCache = {
  mtimeMs: null,
  data: {},
};

const getCodeBlockCopyLineThreshold = () =>
  getNumericSetting(loadSiteData()?.codeBlock?.copyButtonLineThreshold, 10);

const getCodeBlockCollapseLineThreshold = () =>
  getNumericSetting(loadSiteData()?.codeBlock?.collapseLineThreshold, 0);

const getTimelineData = () =>
  loadYamlData(TIMELINE_DATA_URL, timelineDataCache);

const getTimelineCategories = () => {
  const categories = getTimelineData()?.categories;
  return Array.isArray(categories) ? categories : [];
};

const getTimelineTypeTags = () =>
  extractCategoryTagSet(getTimelineCategories());

const getTimelineArchiveExcludedTags = () =>
  new Set([
    'all',
    'nav',
    'post',
    'posts',
    'notes',
    'timeline',
    'testing',
    ...getTimelineTypeTags(),
  ]);

const getSortedTimelineEntries = (collectionApi) => {
  const timelineEntries = collectionApi.getFilteredByTag('timeline');
  validateTimelineEntryRelationships(timelineEntries);

  return [...timelineEntries].sort((a, b) =>
    getTimelineSortKey(a).localeCompare(getTimelineSortKey(b)),
  );
};

const getSortedCollectionEntries = (
  collectionApi,
  tag,
  predicate = () => true,
) =>
  sortCollectionByDateAndTime(
    collectionApi.getFilteredByTag(tag).filter(predicate),
  );

const getTimelineTopicTags = (tags = []) =>
  filterTopicTags(tags, getTimelineArchiveExcludedTags());

const getTimelineEntryType = (entry) =>
  getEntryType(entry, getTimelineCategories());

const loadYamlData = (fileUrl, cache) => {
  try {
    const stats = fs.statSync(fileUrl);
    if (cache.mtimeMs === stats.mtimeMs) {
      return cache.data;
    }
    const file = fs.readFileSync(fileUrl, 'utf8');
    const data = yaml.load(file);
    cache.mtimeMs = stats.mtimeMs;
    cache.data = data && typeof data === 'object' ? data : {};
    return cache.data;
  } catch {
    return {};
  }
};

const loadSiteData = () => loadYamlData(SITE_DATA_URL, siteDataCache);

const isEleventyFetchMetadataFile = (entryName) =>
  typeof entryName === 'string' &&
  entryName.startsWith('eleventy-fetch-') &&
  path.extname(entryName) === '';

const isEleventyFetchCacheParseError = (error) =>
  error instanceof SyntaxError &&
  typeof error.message === 'string' &&
  error.message.includes('after JSON');

const looksLikeGitCommitRef = (value) =>
  typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);

const removeCorruptEleventyFetchCacheEntries = (
  cacheDir = ELEVENTY_FETCH_CACHE_DIR,
) => {
  if (!fs.existsSync(cacheDir)) return [];

  const removed = [];
  const entries = fs.readdirSync(cacheDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !isEleventyFetchMetadataFile(entry.name)) {
      continue;
    }

    const metadataPath = path.join(cacheDir, entry.name);
    try {
      JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch {
      removed.push(entry.name);

      for (const sibling of fs.readdirSync(cacheDir)) {
        if (sibling === entry.name || sibling.startsWith(`${entry.name}.`)) {
          fs.rmSync(path.join(cacheDir, sibling), { force: true });
        }
      }
    }
  }

  return removed;
};

const fetchTextWithCacheRecovery = async (url, options = {}, context = {}) => {
  try {
    try {
      return await EleventyFetch(url, {
        ...options,
        type: 'text',
      });
    } catch (error) {
      if (!isEleventyFetchCacheParseError(error)) {
        throw error;
      }

      const removed = removeCorruptEleventyFetchCacheEntries();
      if (removed.length === 0) {
        throw error;
      }

      console.warn(
        `[11ty/github] Removed corrupt eleventy-fetch cache entries: ${removed.join(', ')}`,
      );

      return EleventyFetch(url, {
        ...options,
        type: 'text',
      });
    }
  } catch (error) {
    if (
      looksLikeGitCommitRef(context.gitRef) &&
      typeof error?.message === 'string' &&
      error.message.includes('Bad response')
    ) {
      console.warn(
        `[11ty/github] Failed to fetch GitHub content for commit ${context.gitRef}. Do you have commits not in the remote?`,
      );
    }

    throw error;
  }
};

const isProductionBuild = process.env.ELEVENTY_ENV === 'production';
const isServeMode = process.env.ELEVENTY_RUN_MODE === 'serve';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(code, language) {
    return highlightCode(code, normalizeLanguage(language));
  },
})
  .use(MarkdownItFootnote)
  .use(MarkdownItAnchor, {
    slugify,
    permalink: MarkdownItAnchor.permalink.ariaHidden({
      class: 'header-anchor',
      placement: 'before',
    }),
  })
  .use(MarkdownItTocDoneRight, {
    containerClass: 'toc',
    listType: 'ul',
    level: [2, 3],
    slugify,
  });

md.core.ruler.after('block', 'todo-blockquotes', (state) => {
  markTodoBlockquotes(state.tokens, isProductionBuild);
});

const getCodeBlockThresholds = () => ({
  copyLineThreshold: getCodeBlockCopyLineThreshold(),
  collapseLineThreshold: getCodeBlockCollapseLineThreshold(),
});

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  return renderMarkdownCodeBlock(
    token.content,
    token.info,
    getCodeBlockThresholds(),
  );
};

md.renderer.rules.code_block = (tokens, idx) => {
  const token = tokens[idx];
  return renderMarkdownCodeBlock(token.content, '', getCodeBlockThresholds());
};

export default function (eleventyConfig) {
  const productionEnvironment = process.env.ELEVENTY_ENV === 'production';

  eleventyConfig.on('eleventy.after', ({ dir }) => {
    emitFingerprintedAssets(dir?.output || '_site');
  });

  eleventyConfig.addDataExtension('yaml', (contents) => yaml.load(contents));
  eleventyConfig.addFilter('assetUrl', buildAssetUrl);
  eleventyConfig.addFilter('timelineRef', (entryOrRef) =>
    getTimelineEntryRef(entryOrRef),
  );
  eleventyConfig.addFilter('timelineEntryByRef', (ref, entries = []) =>
    getTimelineEntryByRef(ref, entries),
  );
  eleventyConfig.addFilter('timelineParentEntry', (entry, entries = []) => {
    const parentRef = getTimelineParentRef(entry);
    if (!parentRef) return null;
    return getTimelineEntryByRef(parentRef, entries);
  });
  eleventyConfig.addFilter('timelineChildEntries', (entryOrRef, entries = []) =>
    getTimelineChildEntries(entryOrRef, entries),
  );
  eleventyConfig.addFilter(
    'timelineAncestorEntries',
    (entryOrRef, entries = []) =>
      getTimelineAncestorEntries(entryOrRef, entries),
  );
  eleventyConfig.addFilter(
    'timelineEarlierThreadEntries',
    (entryOrRef, entries = []) =>
      getTimelineEarlierThreadEntries(entryOrRef, entries),
  );
  eleventyConfig.addFilter(
    'timelineDescendantCount',
    (entryOrRef, entries = []) =>
      getTimelineDescendantCount(entryOrRef, entries),
  );
  eleventyConfig.addFilter(
    'timelineDescendantTree',
    (entryOrRef, entries = [], maxDepth = 2) =>
      getTimelineDescendantTree(entryOrRef, entries, maxDepth),
  );
  eleventyConfig.addFilter('timelineEntryLabel', (entry) =>
    getTimelineEntryLabel(entry),
  );

  eleventyConfig.addGlobalData(
    'environment',
    process.env.ELEVENTY_ENV || 'development',
  );
  eleventyConfig.addGlobalData('eleventyComputed', {
    eleventyExcludeFromCollections(data) {
      return isExcludedFromCollections(data, productionEnvironment);
    },
    title(data) {
      const prefix = '🚧 DRAFT - ';
      const { draft, title } = data;
      if (!title || !draft) return title;
      return title.startsWith(prefix) ? title : `${prefix}${title}`;
    },
  });

  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(eleventyPluginRss);
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    urlPath: ELEVENTY_IMAGE_URL_PATH,
    outputDir: ELEVENTY_IMAGE_CACHE_DIR,
    formats: ['avif', 'webp', 'jpeg'],
    widths: [320, 640, 960, 1280],
    htmlOptions: {
      imgAttributes: {
        loading: 'lazy',
        decoding: 'async',
        sizes: '(width <= 30em) 100vw, 75vw',
      },
      pictureAttributes: {},
    },
  });

  eleventyConfig.on('eleventy.after', () => {
    if (isServeMode || !fs.existsSync(ELEVENTY_IMAGE_CACHE_DIR)) {
      return;
    }

    // Reuse cached derivatives across builds, then publish them into the final output.
    fs.cpSync(
      ELEVENTY_IMAGE_CACHE_DIR,
      path.join(eleventyConfig.directories.output, ELEVENTY_IMAGE_URL_PATH),
      { recursive: true },
    );
  });

  // Tell 11ty to use our custom Markdown-it
  eleventyConfig.setLibrary('md', md);

  // Copy static assets straight through to the build output
  eleventyConfig.addPassthroughCopy('assets');

  eleventyConfig.addCollection('tagList', (collectionApi) => {
    const tagSet = new Set();
    for (const item of collectionApi.getAllSorted()) {
      const tags = item?.data?.tags;
      if (!tags) continue;
      for (const tag of filterTagList(tags)) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort((first, second) =>
      first.localeCompare(second, undefined, { sensitivity: 'base' }),
    );
  });

  eleventyConfig.addCollection('tagGroups', (collectionApi) => {
    const tagCounts = new Map();
    for (const item of collectionApi.getAllSorted()) {
      const tags = item?.data?.tags;
      if (!tags) continue;
      for (const tag of filterTagList(tags)) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const groups = new Map();
    for (const [tag, count] of tagCounts) {
      if (!groups.has(count)) groups.set(count, []);
      groups.get(count).push(tag);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => b - a)
      .map(([count, tags]) => ({
        count,
        tags: tags.sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' }),
        ),
      }));
  });

  eleventyConfig.addCollection('drafts', (collectionApi) =>
    collectionApi.getAllSorted().filter((item) => item?.data?.draft),
  );

  eleventyConfig.addCollection('posts', (collectionApi) =>
    getSortedCollectionEntries(collectionApi, 'posts'),
  );

  eleventyConfig.addCollection('notes', (collectionApi) =>
    getSortedCollectionEntries(
      collectionApi,
      'notes',
      (item) => !item?.data?.hidden,
    ),
  );

  eleventyConfig.addCollection('hiddenNotes', (collectionApi) =>
    getSortedCollectionEntries(
      collectionApi,
      'notes',
      (item) => item?.data?.hidden,
    ),
  );

  eleventyConfig.addCollection('timeline', (collectionApi) =>
    getSortedTimelineEntries(collectionApi),
  );
  eleventyConfig.addCollection('timelineTagArchives', (collectionApi) =>
    buildTimelineTagArchives(getSortedTimelineEntries(collectionApi), {
      getTopicTags: (entry) => getTimelineTopicTags(entry?.data?.tags || []),
    }),
  );

  eleventyConfig.addCollection('timelineMonths', (collectionApi) =>
    buildTimelineMonthArchives(getSortedTimelineEntries(collectionApi)),
  );

  eleventyConfig.addCollection('timelineWeeks', (collectionApi) =>
    buildTimelineWeekArchives(getSortedTimelineEntries(collectionApi)),
  );

  eleventyConfig.addCollection('timelineCalendarWeeks', (collectionApi) =>
    buildTimelineCalendarWeekArchives(getSortedTimelineEntries(collectionApi)),
  );

  eleventyConfig.addAsyncShortcode(
    'github',
    async function (url, style = 'auto') {
      const meta = parseBlobUrl(url);

      const fetched = await fetchTextWithCacheRecovery(
        meta.raw,
        {
          duration: '1d',
        },
        {
          gitRef: meta.branch,
        },
      );
      const source = typeof fetched === 'string' ? fetched : String(fetched);

      let code = source;
      if (meta.start && meta.end) {
        const lines = source.split('\n');
        code = lines.slice(meta.start - 1, meta.end).join('\n');
      }
      code = trimSharedIndent(code);

      const language = guessLanguageByExt(meta.filePath);
      const normalizedLanguage = normalizeLanguage(language);
      const highlighted = highlightCode(code, language);

      const highlightedLines = highlighted.split('\n');
      const lineCount = highlightedLines.length;

      const numbered = highlightedLines
        .map((line, index) => {
          const content = line.trim().length ? line : ' ';
          const lineNumber = (meta.start || 1) + index;
          const languageAttr = normalizedLanguage
            ? ` class="language-${normalizedLanguage}"`
            : '';
          return `<li value="${lineNumber}"><code${languageAttr}>${content}</code></li>`;
        })
        .join('\n');

      const normalizedStyle =
        typeof style === 'string' ? style.toLowerCase().trim() : '';
      const theme = ['light', 'dark'].includes(normalizedStyle)
        ? normalizedStyle
        : 'auto';
      const languageClass = normalizedLanguage
        ? ` language-${normalizedLanguage}`
        : '';
      const collapseThresholdRaw =
        loadSiteData()?.githubEmbed?.collapseLineThreshold ??
        this?.ctx?.site?.githubEmbed?.collapseLineThreshold ??
        this?.ctx?.data?.site?.githubEmbed?.collapseLineThreshold;
      const collapseThreshold = getNumericSetting(collapseThresholdRaw, 0);
      const shouldCollapse =
        Number.isFinite(collapseThreshold) &&
        collapseThreshold > 0 &&
        lineCount > collapseThreshold;
      const collapseClasses = shouldCollapse
        ? ' gh-embed--collapsible gh-embed--collapsed'
        : '';
      const wrapClass =
        normalizedLanguage === 'markdown' ? ' gh-embed--wrap' : '';
      const shouldWrap = normalizedLanguage === 'markdown';
      const wrapPressed = shouldWrap ? 'true' : 'false';
      const wrapLabel = shouldWrap ? 'Wrapped' : 'Wrap';
      const collapseAttributes = shouldCollapse
        ? ` data-collapse-threshold="${collapseThreshold}" data-line-count="${lineCount}"`
        : '';
      const toggleButton = shouldCollapse
        ? `
\t<button class="gh-embed__toggle" type="button" data-collapse-toggle aria-expanded="false" data-expand-label="Expand" data-collapse-label="Collapse">
\t\tExpand
\t</button>`
        : '';

      return `
<div class="gh-embed gh-embed--${theme}${wrapClass}${collapseClasses}"${collapseAttributes}>
	<div class="gh-embed__meta">
		<a class="gh-embed__file" href="${meta.web}" target="_blank" rel="noopener noreferrer">
			${meta.filePath}
		</a>
		<div class="gh-embed__actions">
			<a class="gh-embed__raw" href="${meta.raw}" target="_blank" rel="noopener noreferrer">view raw</a>
			<button class="gh-embed__wrap gh-embed__copy" type="button" data-wrap-toggle aria-pressed="${wrapPressed}" data-wrap-label="Wrap" data-wrapped-label="Wrapped">${wrapLabel}</button>
			<button class="gh-embed__copy" data-clipboard>Copy</button>
		</div>
	</div>
	<pre class="gh-embed__pre hljs${languageClass}">
		<ol class="gh-embed__ol">${numbered}</ol>
	</pre>
	${toggleButton}
</div>`;
    },
  );

  eleventyConfig.addFilter('readableDate', (dateValue, locale = 'en-US') => {
    if (!dateValue) return '';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    return formatter.format(date);
  });

  eleventyConfig.addFilter('machineDate', (dateValue) => {
    if (!dateValue) return '';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  });

  eleventyConfig.addFilter('excerpt', excerpt);

  eleventyConfig.addFilter('absoluteUrl', (path, base = '') => {
    if (!path) return '';
    try {
      const result = new URL(path, base || 'http://localhost');
      return result.toString();
    } catch (error) {
      return path;
    }
  });

  eleventyConfig.addFilter('filterTags', filterTagList);
  eleventyConfig.addFilter('timelineTopicTags', (tags = []) =>
    getTimelineTopicTags(filterTagList(tags)),
  );
  eleventyConfig.addFilter('timelineEntryType', (entry) =>
    getTimelineEntryType(entry),
  );

  eleventyConfig.addFilter('slug', (value) => {
    if (!value) return '';
    return slugify(value);
  });

  eleventyConfig.on('eleventy.after', ({ results = [] } = {}) => {
    assertNoBrokenInternalLinks(results);
  });

  eleventyConfig.on('eleventy.before', async () => {
    validateTimelineEntryDateTimeQuotes();
    const { generateOgImages } =
      await import('./scripts/generate-og-images.js');
    await generateOgImages({ force: OG_FORCE_ENV });
  });
}
