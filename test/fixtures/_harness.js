/**
 * Fixture test harness.
 *
 * Why this approach:
 *
 *   The plan asked for fixture sites built via Eleventy's programmatic API,
 *   reusing the real eleventy.config.js. In practice the real config:
 *
 *     - reads _data/* yaml from the project root (timeline categories,
 *       site settings)
 *     - reads _includes/* layouts from the project root
 *     - registers an `eleventy.before` hook that always runs an OG image
 *       generation pass against the real posts/notes/timeline content
 *     - registers an `eleventy.after` link-checker that fails the build on
 *       any broken /timeline/ or /tags/ href
 *
 *   A 3-file fixture site that points configPath at the real config can't
 *   satisfy all of those at once without invasive scaffolding. Rather than
 *   either (a) ship a complete duplicate of _data + _includes per fixture
 *   or (b) extract timeline helpers into lib/ (constraints forbid
 *   modifying eleventy.config.js), we run the real config's registration
 *   function against a recording mock and then invoke the captured
 *   collection callbacks, filters, and lifecycle hooks directly with
 *   in-memory entry objects.
 *
 *   This exercises the real production code paths for:
 *
 *     - validateTimelineEntryRelationships (via the `timeline` collection)
 *     - buildTimelineTagArchives (via the `timelineTagArchives` collection)
 *     - getTimelineDescendantTree, getTimelineEarlierThreadEntries,
 *       getTimelineAncestorEntries (via captured filters)
 *     - getTimelineEntryType (via the `timelineEntryType` filter)
 *     - validateTimelineEntryDateTimeQuotes (via the `eleventy.before`
 *       hook, with cwd chdir'd into a fixture that has a timeline/ dir)
 *
 *   Compromise: we do not run a full Eleventy build per fixture and do
 *   not assert rendered HTML via linkedom. Rendered HTML assertions are
 *   already covered by the contract suite against the real build
 *   (Phase 3 of the plan). This file focuses on the relational and
 *   negative-path behavior the plan called out.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_URL = new URL('../../eleventy.config.js', import.meta.url);

/**
 * Build a chainable recording mock of Eleventy's config object. The real
 * eleventy.config.js calls many registration methods (addFilter,
 * addPlugin, addCollection, on, addAsyncShortcode, addDataExtension,
 * addPassthroughCopy, setLibrary, addGlobalData, ...). We just capture
 * the values we care about and no-op the rest.
 */
const createRecordingConfig = () => {
  const collections = new Map();
  const filters = new Map();
  const shortcodes = new Map();
  const events = new Map();
  const globalData = new Map();

  const noop = () => recorder;
  const recorder = {
    addCollection(name, fn) {
      collections.set(name, fn);
      return recorder;
    },
    addFilter(name, fn) {
      filters.set(name, fn);
      return recorder;
    },
    addAsyncFilter(name, fn) {
      filters.set(name, fn);
      return recorder;
    },
    addShortcode(name, fn) {
      shortcodes.set(name, fn);
      return recorder;
    },
    addAsyncShortcode(name, fn) {
      shortcodes.set(name, fn);
      return recorder;
    },
    addPairedShortcode: noop,
    addPairedAsyncShortcode: noop,
    addNunjucksFilter: noop,
    addNunjucksShortcode: noop,
    addLiquidFilter: noop,
    addJavaScriptFunction: noop,
    addTransform: noop,
    addLinter: noop,
    addPlugin(plugin, options) {
      // Plugins might register their own stuff. Try calling them but swallow
      // failures so a strict plugin (e.g. eleventy-img) does not abort.
      try {
        if (typeof plugin === 'function') plugin(recorder, options);
      } catch {
        /* ignore plugin-side errors in test harness */
      }
      return recorder;
    },
    addDataExtension: noop,
    addPassthroughCopy: noop,
    addWatchTarget: noop,
    addTemplateFormats: noop,
    setLibrary: noop,
    setDataDeepMerge: noop,
    setQuietMode: noop,
    setUseGitIgnore: noop,
    setIncludesDirectory: noop,
    setLayoutsDirectory: noop,
    setInputDirectory: noop,
    setOutputDirectory: noop,
    setDataDirectory: noop,
    addGlobalData(name, value) {
      globalData.set(name, value);
      return recorder;
    },
    on(event, fn) {
      if (!events.has(event)) events.set(event, []);
      events.get(event).push(fn);
      return recorder;
    },
    once: noop,
    versionCheck: noop,
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };

  return { recorder, collections, filters, shortcodes, events, globalData };
};

let cachedHarness = null;

/**
 * Load eleventy.config.js once and return the captured registrations.
 */
export const loadHarness = async () => {
  if (cachedHarness) return cachedHarness;
  const mod = await import(CONFIG_URL.href);
  const configure = mod.default;
  const { recorder, collections, filters, events, shortcodes, globalData } =
    createRecordingConfig();
  configure(recorder);
  cachedHarness = {
    collections,
    filters,
    shortcodes,
    events,
    globalData,
  };
  return cachedHarness;
};

/**
 * Build entry objects (the shape Eleventy passes to collection callbacks)
 * from the markdown files in a fixture directory. Each fixture file's
 * front matter becomes `entry.data`; the URL is derived from the file
 * slug to mirror Eleventy's default permalink for the timeline collection.
 */
export const loadFixtureEntries = (fixtureName, { subdir = '' } = {}) => {
  const dir = path.join(__dirname, fixtureName, subdir);
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'));

  return files.map((file) => {
    const inputPath = path.join(dir, file.name);
    const raw = fs.readFileSync(inputPath, 'utf8');
    const parsed = matter(raw);
    const slug = path.basename(file.name, '.md');
    const url = `/timeline/${slug}/`;
    const data = parsed.data || {};

    return {
      url,
      inputPath,
      page: { url, fileSlug: slug, inputPath },
      fileSlug: slug,
      data,
      date: data.date,
    };
  });
};

/**
 * Build a fake collectionApi that returns the given entries via
 * getFilteredByTag('timeline'). That's the only collectionApi method the
 * captured callbacks use.
 */
export const makeCollectionApi = (entries) => ({
  getFilteredByTag(tag) {
    if (tag === 'timeline') return entries;
    return [];
  },
  getAll: () => entries,
  getFilteredByGlob: () => [],
});

export const fixtureDir = (fixtureName) => path.join(__dirname, fixtureName);

export const projectRoot = () => PROJECT_ROOT;
