import fs from 'node:fs';
import yaml from 'js-yaml';
import { I18nPlugin } from '@11ty/eleventy';
import {
  filterTagList,
  isExcludedFromCollections,
} from '../eleventy/excluded-content.js';
import { sortCollectionByDateAndTime } from '../content/sort.js';
import { computeContentSeries, sortSeriesEntries } from '../series.js';
import seriesIndexData from '../../src/series/index.11tydata.js';
import seriesPageData from '../../src/series/series-page.11tydata.js';
import { rewriteTranslatedHrefs } from './href-fallback.js';

export function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override))
    return base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    result[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? deepMerge(base?.[key], value)
        : value;
  }
  return result;
}

export function normalizeI18n(site = {}) {
  const config = site.i18n || {};
  const defaultLanguage = config.defaultLanguage || 'en';
  const languages = config.languages || [{ code: defaultLanguage }];
  const seen = new Set();
  for (const language of languages) {
    if (
      !language ||
      !/^[A-Za-z][A-Za-z0-9-]*$/.test(language.code) ||
      seen.has(language.code)
    ) {
      throw new Error(
        '[11ty/i18n] Language codes must be unique URL-safe language identifiers.',
      );
    }
    seen.add(language.code);
  }
  if (config.enabled && !seen.has(defaultLanguage)) {
    throw new Error('[11ty/i18n] languages must include defaultLanguage.');
  }
  return {
    enabled: config.enabled === true,
    defaultLanguage,
    languages: languages.map((language) => ({
      ...language,
      shortLabel:
        language.shortLabel || language.label || language.code.toUpperCase(),
      label: language.label || language.code,
      htmlLang: language.htmlLang || language.code,
    })),
  };
}

export const isTranslation = (item) => Boolean(item?.data?.i18nTranslation);

export function collectionExclusions(data, production) {
  if (isExcludedFromCollections(data, production)) return true;
  return data.i18nTranslation ? ['all', ...(data.tags || [])] : false;
}

export function createUrlResolver(config) {
  let urls = new Set();
  let normalizedUrls = new Set();
  const normalize = (url) => url.replace(/\/+$/, '') || '/';
  const secondary = config.languages.filter(
    (language) => language.code !== config.defaultLanguage,
  );
  const split = (url) => {
    const language = secondary.find((language) =>
      url.startsWith(`/${language.code}/`),
    );
    return {
      code: language?.code || config.defaultLanguage,
      base: language ? url.slice(language.code.length + 1) : url,
    };
  };
  const target = (base, code) =>
    code === config.defaultLanguage ? base : `/${code}${base}`;
  return {
    update(values) {
      urls = new Set(values.filter((url) => typeof url === 'string'));
      normalizedUrls = new Set([...urls].map(normalize));
    },
    fallback(url, pageUrl) {
      if (
        !config.enabled ||
        typeof url !== 'string' ||
        typeof pageUrl !== 'string' ||
        !url.startsWith('/') ||
        url.startsWith('//')
      )
        return url;
      const { code } = split(pageUrl);
      if (code === config.defaultLanguage || !url.startsWith(`/${code}/`))
        return url;
      const [, pathname, suffix] = url.match(/^([^?#]*)(.*)$/);
      const { base } = split(pathname);
      return !normalizedUrls.has(normalize(pathname)) &&
        normalizedUrls.has(normalize(base))
        ? base + suffix
        : url;
    },
    url(url, code = config.defaultLanguage) {
      if (
        !config.enabled ||
        typeof url !== 'string' ||
        !url.startsWith('/') ||
        url.startsWith('//')
      )
        return url;
      const [, pathname, suffix] = url.match(/^([^?#]*)(.*)$/);
      const { base } = split(pathname);
      const candidate = target(base, code);
      return (
        (urls.has(candidate) ? candidate : urls.has(base) ? base : pathname) +
        suffix
      );
    },
    links(url) {
      if (!config.enabled || typeof url !== 'string' || !urls.has(url))
        return [];
      const { base } = split(url);
      const links = config.languages
        .map((language) => ({ ...language, url: target(base, language.code) }))
        .filter((language) => urls.has(language.url));
      return links.length > 1 ? links : [];
    },
    switchLinks(url) {
      if (
        !config.enabled ||
        config.languages.length < 2 ||
        typeof url !== 'string' ||
        !url.startsWith('/') ||
        url.startsWith('//')
      )
        return [];
      const { code, base } = split(url);
      return config.languages
        .filter((language) => language.code !== code)
        .map((language) => {
          const counterpart = target(base, language.code);
          const home = target('/', language.code);
          return {
            ...language,
            url: urls.has(counterpart) ? counterpart : home,
          };
        })
        .filter((language) => urls.has(language.url));
    },
  };
}

function localizedCollections(items, code) {
  const all = items.filter(
    (item) => item.data.lang === code && item.data.i18nTranslation,
  );
  const tagged = (tag) =>
    sortCollectionByDateAndTime(
      all.filter((item) => item.data.tags?.includes(tag)),
    );
  const tags = new Map();
  for (const item of all)
    for (const tag of filterTagList(item.data.tags)) {
      if (!tags.has(tag)) tags.set(tag, []);
      tags.get(tag).push(item);
    }
  const tagList = [...tags.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  const counts = new Map();
  for (const tag of tagList) {
    const count = tags.get(tag).length;
    if (!counts.has(count)) counts.set(count, []);
    counts.get(count).push(tag);
  }
  return {
    ...Object.fromEntries(tags),
    all,
    posts: tagged('posts'),
    notes: tagged('notes').filter((item) => !item.data.hidden),
    hiddenNotes: tagged('notes').filter((item) => item.data.hidden),
    drafts: all.filter((item) => item.data.draft),
    tagList,
    tagGroups: [...counts]
      .sort(([a], [b]) => b - a)
      .map(([count, tags]) => ({ count, tags })),
  };
}

function localeData(data, language) {
  const locale = data.locales?.[language.code] || {};
  data.lang = language.code;
  data.htmlLang = language.htmlLang;
  data.ui = deepMerge(data.ui, locale.ui);
  data.site = deepMerge(
    data.site,
    Object.fromEntries(
      ['title', 'description']
        .filter((key) => locale.site?.[key] !== undefined)
        .map((key) => [key, locale.site[key]]),
    ),
  );
  data.sidebarNav = (data.sidebarNav || []).map((item) => ({
    ...item,
    label: locale.nav?.[item.id] ?? item.label,
  }));
  data.series = (data.series || []).map((item) => ({
    ...item,
    ...Object.fromEntries(
      ['title', 'intro']
        .filter((key) => locale.series?.[item.id]?.[key] !== undefined)
        .map((key) => [key, locale.series[item.id][key]]),
    ),
  }));
}

export function configureI18n(eleventyConfig, site) {
  const config = normalizeI18n(site);
  const resolver = createUrlResolver(config);
  eleventyConfig.addFilter('i18nUrl', resolver.url);
  eleventyConfig.addFilter('i18nLinks', resolver.links);
  eleventyConfig.addFilter('i18nSwitchLinks', resolver.switchLinks);
  const secondary = config.languages.filter(
    (language) => language.code !== config.defaultLanguage,
  );
  if (!config.enabled) {
    // Configured translation source trees remain dormant until explicitly enabled.
    for (const language of secondary)
      eleventyConfig.ignores.add(`${language.code}/**`);
    return;
  }
  eleventyConfig.addPlugin(I18nPlugin, {
    defaultLanguage: config.defaultLanguage,
    errorMode: 'never',
  });
  eleventyConfig.on('eleventy.contentMap', ({ urlToInputPath }) =>
    resolver.update(Object.keys(urlToInputPath)),
  );
  eleventyConfig.on('eleventy.before', () => resolver.update([]));
  eleventyConfig.addTransform('i18n-href-fallback', function (content) {
    const outputPath = this.page?.outputPath;
    if (typeof outputPath !== 'string' || !outputPath.endsWith('.html'))
      return content;
    return rewriteTranslatedHrefs(content, {
      pageUrl: this.page.url,
      resolver,
    });
  });
  eleventyConfig.addPreprocessor('i18n', '*', function (data) {
    const input = this.inputPath.replace(/^\.\//, '');
    const language =
      config.languages.find((language) => language.code === data.i18nLocale) ||
      secondary.find((language) => input.startsWith(`${language.code}/`)) ||
      config.languages.find(
        (language) => language.code === config.defaultLanguage,
      );
    localeData(data, language);
    if (language.code === config.defaultLanguage) return;
    data.sectionUrls = { ...data.sectionUrls };
    for (const section of ['blog', 'notes']) {
      if (data.sectionUrls[section])
        data.sectionUrls[section] =
          `/${language.code}${data.sectionUrls[section]}`;
    }
    data.sidebarNav = data.sidebarNav.map((item) => ({
      ...item,
      url: ['blog', 'notes', 'tags', 'series', 'drafts'].includes(item.id)
        ? data.sectionUrls[item.id] || `/${language.code}${item.url}`
        : item.url,
    }));
    if (!data.i18nLocale) {
      const relative = input.slice(language.code.length + 1);
      if (!/^(posts|notes)\/.+\.md$/.test(relative)) return false;
      const type = relative.startsWith('posts/') ? 'posts' : 'notes';
      data.i18nTranslation = true;
      data.tags = [
        ...new Set([
          ...(Array.isArray(data.tags)
            ? data.tags
            : data.tags
              ? [data.tags]
              : []),
          type,
        ]),
      ];
      data.layout = 'layouts/home.njk';
      data.showPostHeader = true;
      if (relative.startsWith('notes/hidden/')) data.hidden = true;
      data.permalink = `/${language.code}/${type}/${type === 'notes' && relative.startsWith('notes/hidden/') ? 'hidden/' : ''}{{ page.fileSlug }}/`;
      data.eleventyComputed = {
        ...data.eleventyComputed,
        contentSeries: (value) =>
          computeContentSeries({
            ...value,
            page: {
              ...value.page,
              url:
                typeof value.page.url === 'string'
                  ? value.page.url.replace(`/${language.code}/`, '/')
                  : undefined,
            },
          }),
        ogImage: (value) =>
          value.ogImage || value.ogImages?.[`${language.code}:${value.page.filePathStem.replace(new RegExp(`^/${language.code}/`), '')}`],
      };
    }
  });
  for (const language of secondary) {
    const key = `i18n_${language.code.replaceAll('-', '_')}`;
    eleventyConfig.addCollection(key, (api) =>
      localizedCollections(api.getAllSorted(), language.code),
    );
    addLocalizedTemplates(eleventyConfig, language, key, site);
  }
}

function addLocalizedTemplates(eleventyConfig, language, collectionKey, site) {
  const sources = [
    'blog',
    'notes',
    'hidden-notes',
    'drafts',
    'all-tags',
    'tags',
    'series/index',
    'series/series-page',
  ];
  for (const source of sources) {
    const text = fs.readFileSync(
      new URL(`../../src/${source}.njk`, import.meta.url),
      'utf8',
    );
    const [, frontmatter, body] = text.match(
      /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/,
    );
    const extra =
      source === 'series/index'
        ? seriesIndexData
        : source === 'series/series-page'
          ? seriesPageData
          : {};
    const data = deepMerge(extra, yaml.load(frontmatter));
    data.i18nLocale = language.code;
    data.eleventyComputed = { ...data.eleventyComputed };
    if (data.pagination?.data?.startsWith('collections.')) {
      data.pagination = {
        ...data.pagination,
        data: data.pagination.data.replace(
          'collections.',
          `collections.${collectionKey}.`,
        ),
      };
    }
    const originalPermalink = data.eleventyComputed.permalink || data.permalink;
    const localizedPermalink = `/${language.code}${originalPermalink}`;
    if (data.eleventyComputed.permalink)
      data.eleventyComputed.permalink = localizedPermalink;
    else data.permalink = localizedPermalink;
    if (source === 'series/series-page') {
      const resolve = extra.eleventyComputed.resolvedSeries;
      data.eleventyComputed.resolvedSeries = (value) => {
        const translated = value.collections[collectionKey];
        const entries = new Map(
          (translated?.all || [])
            .filter((item) => typeof item.url === 'string')
            .map((item) => [item.url.replace(`/${language.code}/`, '/'), item]),
        );
        const result = resolve(value);
        result.entries = result.entries.map(
          (item) => entries.get(item.url) || item,
        );
        result.sortedEntries = sortSeriesEntries(
          result.entries,
          result.defaultSort,
        );
        return result;
      };
    }
    let content = body
      .replaceAll('collections.', `collections.${collectionKey}.`)
      .replaceAll('collections[tag]', `collections.${collectionKey}[tag]`);
    eleventyConfig.addTemplate(
      `src/i18n-${language.code}-${source.replaceAll('/', '-')}.njk`,
      content,
      data,
    );
    // A timeline homepage stays English; localized home shows the translated blog.
    if (source === 'blog' && site.home?.target === 'timeline') {
      const home = {
        ...data,
        eleventyComputed: {
          ...data.eleventyComputed,
          permalink: `/${language.code}/{% if pagination.pageNumber > 0 %}page/{{ pagination.pageNumber + 1 }}/{% endif %}`,
        },
      };
      eleventyConfig.addTemplate(
        `src/i18n-${language.code}-home.njk`,
        content,
        home,
      );
    }
  }
}
