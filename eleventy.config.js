// 11ty Nav
import eleventyNavigationPlugin from '@11ty/eleventy-navigation';
// 11ty RSS
import eleventyPluginRss from '@11ty/eleventy-plugin-rss';
// 11ty Img
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';
import EleventyFetch from '@11ty/eleventy-fetch';
import hljs from 'highlight.js';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

// Bake our own Markdown anchors
import MarkdownIt from 'markdown-it';
import MarkdownItAnchor from 'markdown-it-anchor';
import MarkdownItTocDoneRight from 'markdown-it-toc-done-right';
// Use yaml for data
import yaml from 'js-yaml';
import excerpt from './lib/excerpt.js';

const OG_FORCE_ENV = process.env.OG_FORCE === 'true';
const ELEVENTY_FETCH_CACHE_DIR = path.resolve('.cache');
const SITE_DATA_URL = new URL('./_data/site.yaml', import.meta.url);
const siteDataCache = {
  mtimeMs: null,
  data: {},
};

const parseBlobUrl = (githubBlobUrl) => {
  const url = new URL(githubBlobUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[2] !== 'blob') throw new Error('URL must be a GitHub blob URL');
  const [user, repo, , branch, ...fileParts] = parts;
  const filePath = fileParts.join('/');
  const rangeHash = (url.hash || '').replace(/^#/, '');
  let start = null;
  let end = null;
  if (rangeHash.startsWith('L')) {
    const [first, last] = rangeHash
      .split('-')
      .map((part) => part.replace(/^L/, ''));
    start = parseInt(first, 10);
    end = last ? parseInt(last, 10) : start;
  }
  const raw = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
  return {
    user,
    repo,
    branch,
    filePath,
    raw,
    web: githubBlobUrl,
    start,
    end,
  };
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const trimSharedIndent = (value) => {
  if (typeof value !== 'string' || value.length === 0) return value;
  const lines = value.split('\n');
  let minIndent = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^[\t ]*/);
    const indentLength = match ? match[0].length : 0;
    if (indentLength === 0) {
      minIndent = 0;
      break;
    }
    minIndent =
      minIndent === null ? indentLength : Math.min(minIndent, indentLength);
  }

  if (!minIndent) return value;

  return lines
    .map((line) => {
      if (!line.trim()) return '';
      const match = line.match(/^[\t ]*/);
      const indentLength = match ? match[0].length : 0;
      if (indentLength === 0) return line;
      const remove = Math.min(indentLength, minIndent);
      return line.slice(remove);
    })
    .join('\n');
};

const guessLanguageByExt = (filePath) => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const map = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'tsx',
    jsx: 'jsx',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    zsh: 'bash',
    bash: 'bash',
    swift: 'swift',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    php: 'php',
    java: 'java',
    kt: 'kotlin',
    css: 'css',
    scss: 'scss',
    html: 'xml',
    xml: 'xml',
    md: 'markdown',
    txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
};

const normalizeLanguage = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .split(/\s+/, 1)[0]
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '');
};

const highlightCode = (code, language) => {
  if (language && hljs.getLanguage(language)) {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return escapeHtml(code);
    }
  }

  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
};

const countCodeLines = (value) => {
  if (typeof value !== 'string' || value.length === 0) return 0;
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  return normalized.length === 0 ? 0 : normalized.split('\n').length;
};

const getNumericSetting = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCodeBlockCopyLineThreshold = () =>
  getNumericSetting(loadSiteData()?.codeBlock?.copyButtonLineThreshold, 10);

const renderMarkdownCodeBlock = (code, language = '') => {
  const normalizedLanguage = normalizeLanguage(language);
  const highlighted = highlightCode(code, normalizedLanguage);
  const lineCount = countCodeLines(code);
  const shouldShowCopy = lineCount > getCodeBlockCopyLineThreshold();
  const languageClass = normalizedLanguage
    ? ` language-${normalizedLanguage}`
    : '';
  const codeClass = `hljs${languageClass}`;
  const pre = `<pre class="code-block__pre"><code class="${codeClass.trim()}">${highlighted}</code></pre>`;

  if (!shouldShowCopy) {
    return pre;
  }

  return `<div class="code-block code-block--copyable">
\t<div class="code-block__actions">
\t\t<button class="code-block__copy gh-embed__copy" type="button" data-clipboard>Copy</button>
\t</div>
\t${pre}
</div>`;
};

const slugify = (value) =>
  encodeURIComponent(String(value).trim().toLowerCase().replace(/\s+/g, '-'));

const toIsoDatePart = (value) => {
  if (typeof value === 'string') {
    return value.split('T')[0];
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  return '';
};

const getTimelineSortKey = (entry) => {
  const date = toIsoDatePart(entry?.data?.date) || toIsoDatePart(entry?.date);
  const time =
    typeof entry?.data?.time === 'string' && entry.data.time.trim()
      ? entry.data.time.trim()
      : '00:00';
  return `${date}T${time}`;
};

const normalizeTimelineRef = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  let pathname = trimmed;
  if (/^[a-z]+:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return '';
    }
  }

  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, '/');

  return pathname.endsWith('/') ? pathname : `${pathname}/`;
};

const getTimelineEntryRef = (entryOrRef) => {
  if (typeof entryOrRef === 'string') {
    return normalizeTimelineRef(entryOrRef);
  }
  return normalizeTimelineRef(entryOrRef?.url || entryOrRef?.page?.url);
};

const getTimelineParentRef = (entry) =>
  normalizeTimelineRef(entry?.data?.parent);

const buildTimelineEntryMap = (entries = []) => {
  const entryMap = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const ref = getTimelineEntryRef(entry);
    if (ref) entryMap.set(ref, entry);
  }

  return entryMap;
};

const getTimelineEntryByRef = (ref, entries = []) => {
  const normalizedRef = getTimelineEntryRef(ref);
  if (!normalizedRef) return null;
  return buildTimelineEntryMap(entries).get(normalizedRef) || null;
};

const buildTimelineChildMap = (entries = []) => {
  const childMap = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const parentRef = getTimelineParentRef(entry);
    if (!parentRef) continue;

    if (!childMap.has(parentRef)) childMap.set(parentRef, []);
    childMap.get(parentRef).push(entry);
  }

  for (const childEntries of childMap.values()) {
    childEntries.sort((a, b) =>
      getTimelineSortKey(a).localeCompare(getTimelineSortKey(b)),
    );
  }

  return childMap;
};

const getTimelineChildEntries = (entryOrRef, entries = []) => {
  const parentRef = getTimelineEntryRef(entryOrRef);
  if (!parentRef) return [];

  const childMap = buildTimelineChildMap(entries);
  return childMap.get(parentRef) || [];
};

const getTimelineAncestorEntries = (entryOrRef, entries = []) => {
  const timelineEntries = Array.isArray(entries) ? entries : [];
  const entryMap = buildTimelineEntryMap(timelineEntries);
  const currentEntry =
    typeof entryOrRef === 'string'
      ? entryMap.get(getTimelineEntryRef(entryOrRef))
      : entryOrRef;

  if (!currentEntry) return [];

  const ancestors = [];
  let parentRef = getTimelineParentRef(currentEntry);

  while (parentRef) {
    const parentEntry = entryMap.get(parentRef);
    if (!parentEntry) break;

    ancestors.push(parentEntry);
    parentRef = getTimelineParentRef(parentEntry);
  }

  return ancestors;
};

const getTimelineDescendantCount = (entryOrRef, entries = []) => {
  const rootRef = getTimelineEntryRef(entryOrRef);
  if (!rootRef) return 0;

  const childMap = buildTimelineChildMap(entries);
  const countDescendants = (parentRef) => {
    const childEntries = childMap.get(parentRef) || [];

    return childEntries.reduce((count, childEntry) => {
      const childRef = getTimelineEntryRef(childEntry);
      return (
        count +
        1 +
        (childRef ? countDescendants(childRef) : 0)
      );
    }, 0);
  };

  return countDescendants(rootRef);
};

const getTimelineDescendantTree = (entryOrRef, entries = [], maxDepth = 2) => {
  const rootRef = getTimelineEntryRef(entryOrRef);
  const normalizedMaxDepth = Number.isFinite(Number(maxDepth))
    ? Math.max(0, Math.floor(Number(maxDepth)))
    : 0;

  if (!rootRef || normalizedMaxDepth < 1) return [];

  const childMap = buildTimelineChildMap(entries);
  const buildNodes = (parentRef, depthRemaining) => {
    const childEntries = childMap.get(parentRef) || [];

    return childEntries.map((childEntry) => {
      const childRef = getTimelineEntryRef(childEntry);
      const directChildren = childRef ? childMap.get(childRef) || [] : [];

      if (depthRemaining <= 1) {
        return {
          entry: childEntry,
          children: [],
          continues: directChildren.length > 0,
        };
      }

      return {
        entry: childEntry,
        children: childRef ? buildNodes(childRef, depthRemaining - 1) : [],
        continues: false,
      };
    });
  };

  return buildNodes(rootRef, normalizedMaxDepth);
};

const getTimelineEntryLabel = (entry) => {
  const title = entry?.data?.title;
  if (typeof title === 'string' && title.trim()) return title.trim();

  return (
    getTimelineEntryRef(entry) ||
    entry?.page?.fileSlug ||
    entry?.fileSlug ||
    'Untitled timeline entry'
  );
};

const getTimelineEntrySource = (entry) =>
  entry?.inputPath
    ? path.relative(process.cwd(), entry.inputPath)
    : getTimelineEntryRef(entry) || '(unknown timeline entry)';

const validateTimelineEntryRelationships = (entries = []) => {
  const timelineEntries = Array.isArray(entries) ? entries : [];
  const entryMap = buildTimelineEntryMap(timelineEntries);
  const failures = [];

  for (const entry of timelineEntries) {
    const rawParent = entry?.data?.parent;
    if (rawParent === undefined || rawParent === null || rawParent === '') {
      continue;
    }

    if (typeof rawParent !== 'string') {
      failures.push(
        `${getTimelineEntrySource(entry)}: parent must be a string URL path like "/timeline/example-entry/"`,
      );
      continue;
    }

    const entryRef = getTimelineEntryRef(entry);
    const parentRef = normalizeTimelineRef(rawParent);

    if (!parentRef) {
      failures.push(
        `${getTimelineEntrySource(entry)}: parent must be a URL path like "/timeline/example-entry/"`,
      );
      continue;
    }

    if (!parentRef.startsWith('/timeline/')) {
      failures.push(
        `${getTimelineEntrySource(entry)}: parent "${rawParent}" must point to a timeline entry URL under /timeline/`,
      );
      continue;
    }

    if (parentRef === entryRef) {
      failures.push(
        `${getTimelineEntrySource(entry)}: parent cannot point to the entry itself (${parentRef})`,
      );
      continue;
    }

    if (!entryMap.has(parentRef)) {
      failures.push(
        `${getTimelineEntrySource(entry)}: parent "${rawParent}" does not match any timeline entry URL`,
      );
    }
  }

  for (const entry of timelineEntries) {
    const seenRefs = new Set();
    let currentEntry = entry;

    while (currentEntry) {
      const currentRef = getTimelineEntryRef(currentEntry);
      if (!currentRef) break;

      if (seenRefs.has(currentRef)) {
        failures.push(
          `${getTimelineEntrySource(entry)}: parent chain creates a cycle at "${currentRef}"`,
        );
        break;
      }

      seenRefs.add(currentRef);

      const parentRef = getTimelineParentRef(currentEntry);
      if (!parentRef) break;

      currentEntry = entryMap.get(parentRef);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Invalid timeline parent relationships:\n  - ${failures.join('\n  - ')}`,
    );
  }
};

const loadSiteData = () => {
  try {
    const stats = fs.statSync(SITE_DATA_URL);
    if (siteDataCache.mtimeMs === stats.mtimeMs) {
      return siteDataCache.data;
    }
    const file = fs.readFileSync(SITE_DATA_URL, 'utf8');
    const data = yaml.load(file);
    siteDataCache.mtimeMs = stats.mtimeMs;
    siteDataCache.data = data && typeof data === 'object' ? data : {};
    return siteDataCache.data;
  } catch {
    return {};
  }
};

const assetFingerprintCache = new Map();
const fingerprintedAssets = new Map();

const splitAssetUrl = (value) => {
  const [withoutHash, hashFragment] = String(value).split('#');
  const [pathname, queryString] = withoutHash.split('?');
  return {
    pathname,
    hash: hashFragment ? `#${hashFragment}` : '',
    query: queryString ? `?${queryString}` : '',
  };
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAssetFingerprint = (assetPath) => {
  const stats = fs.statSync(assetPath);
  const signature = `${stats.size}-${stats.mtimeMs}`;
  const cached = assetFingerprintCache.get(assetPath);
  if (cached && cached.signature === signature) {
    return cached.hash;
  }

  const hash = createHash('sha256')
    .update(fs.readFileSync(assetPath))
    .digest('hex')
    .slice(0, 10);

  assetFingerprintCache.set(assetPath, { signature, hash });
  return hash;
};

const buildFingerprintedAssetPath = (pathname, fingerprint) => {
  const ext = path.extname(pathname);
  if (!ext) {
    return `${pathname}.${fingerprint}`;
  }
  return `${pathname.slice(0, -ext.length)}.${fingerprint}${ext}`;
};

const registerFingerprintedAsset = (
  pathname,
  sourcePath,
  fingerprintedPath,
) => {
  fingerprintedAssets.set(fingerprintedPath, {
    pathname,
    sourcePath,
  });
};

const emitFingerprintedAssets = (outputDir = '_site') => {
  for (const [fingerprintedPath, asset] of fingerprintedAssets) {
    const outputPath = path.join(
      outputDir,
      fingerprintedPath.replace(/^\/+/, ''),
    );
    const sourceExt = path.extname(asset.pathname);
    const sourceBase = path.basename(asset.pathname, sourceExt);
    const outputDirname = path.dirname(outputPath);

    fs.mkdirSync(outputDirname, { recursive: true });

    if (fs.existsSync(outputDirname)) {
      const pattern = new RegExp(
        `^${escapeRegex(sourceBase)}\\.[a-f0-9]{10}${escapeRegex(sourceExt)}$`,
      );
      for (const entry of fs.readdirSync(outputDirname)) {
        if (pattern.test(entry) && entry !== path.basename(outputPath)) {
          fs.rmSync(path.join(outputDirname, entry), { force: true });
        }
      }
    }

    fs.copyFileSync(asset.sourcePath, outputPath);
  }
};

const buildAssetUrl = (href) => {
  if (typeof href !== 'string' || !href.startsWith('/')) {
    return href;
  }

  const { pathname, query, hash } = splitAssetUrl(href);
  const assetPath = path.resolve(pathname.replace(/^\/+/, ''));

  if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    return href;
  }

  const fingerprint = getAssetFingerprint(assetPath);
  const fingerprintedPath = buildFingerprintedAssetPath(pathname, fingerprint);
  registerFingerprintedAsset(pathname, assetPath, fingerprintedPath);
  return `${fingerprintedPath}${query}${hash}`;
};

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

const extractFrontMatter = (content) => {
  const match = String(content).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
};

const getFrontMatterFields = (frontMatter) => {
  const fields = new Map();

  for (const line of frontMatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      fields.set(match[1], match[2]);
    }
  }

  return fields;
};

const isQuotedYamlScalar = (value) => {
  const trimmed = String(value || '').trim();
  return (
    /^"[^"]*"\s*(?:#.*)?$/.test(trimmed) || /^'[^']*'\s*(?:#.*)?$/.test(trimmed)
  );
};

const validateTimelineEntryDateTimeQuotes = (timelineDir = 'timeline') => {
  const timelinePath = path.resolve(timelineDir);
  if (!fs.existsSync(timelinePath)) return;

  const examples = {
    date: 'date: "YYYY-MM-DD"',
    time: 'time: "HH:MM"',
  };
  const failures = [];

  for (const entry of fs.readdirSync(timelinePath, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name) !== '.md') continue;

    const entryPath = path.join(timelinePath, entry.name);
    const relativePath = path.relative(process.cwd(), entryPath);
    const frontMatter = extractFrontMatter(fs.readFileSync(entryPath, 'utf8'));

    if (!frontMatter) {
      failures.push(`${relativePath}: missing YAML front matter`);
      continue;
    }

    const fields = getFrontMatterFields(frontMatter);

    for (const field of ['date', 'time']) {
      const value = fields.get(field);
      if (value === undefined) {
        failures.push(
          `${relativePath}: missing ${field} (expected ${examples[field]})`,
        );
      } else if (!isQuotedYamlScalar(value)) {
        failures.push(
          `${relativePath}: ${field} must be quoted (expected ${examples[field]})`,
        );
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Timeline entry front matter must quote date and time values so YAML does not coerce dates before sorting:\n  - ${failures.join('\n  - ')}`,
    );
  }
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

const markTodoBlockquotes = (tokens = [], isProductionBuild = false) => {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token || token.type !== 'blockquote_open') continue;

    let text = '';
    let j = i + 1;
    for (; j < tokens.length; j += 1) {
      const next = tokens[j];
      if (!next) continue;
      if (next.type === 'blockquote_close') break;
      if (next.type === 'inline' && typeof next.content === 'string') {
        text += `${next.content} `;
      }
    }

    if (/\bTODO\b/i.test(text)) {
      token.attrSet(
        'class',
        isProductionBuild ? 'todo-quote prod' : 'todo-quote',
      );
    }

    if (j > i) i = j;
  }
};

const isProductionBuild = process.env.ELEVENTY_ENV === 'production';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(code, language) {
    return highlightCode(code, normalizeLanguage(language));
  },
})
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

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  return renderMarkdownCodeBlock(token.content, token.info);
};

md.renderer.rules.code_block = (tokens, idx) => {
  const token = tokens[idx];
  return renderMarkdownCodeBlock(token.content);
};

export default function (eleventyConfig) {
  const shouldSkipHref = (href) => {
    if (!href) return true;
    const value = href.trim();
    if (!value) return true;
    if (value.startsWith('#')) return true;
    if (value.startsWith('mailto:')) return true;
    if (value.startsWith('tel:')) return true;
    if (value.startsWith('javascript:')) return true;
    if (value.startsWith('data:')) return true;
    if (value.startsWith('//')) return true;
    if (value.startsWith('http://')) return true;
    if (value.startsWith('https://')) return true;
    return false;
  };

  const hasFileExtension = (path) => {
    if (!path) return false;
    const segment = path.split('/').pop();
    if (!segment) return false;
    return segment.includes('.');
  };

  const normalizePath = (path) => {
    if (!path) return path;
    if (path !== '/' && path.endsWith('/')) return path.slice(0, -1);
    return path;
  };

  const excludedTags = new Set([
    'all',
    'nav',
    'post',
    'posts',
    'notes',
    'timeline',
    'testing',
  ]);
  const filterTagList = (tags = []) =>
    (Array.isArray(tags) ? tags : [tags])
      .map((tag) => (typeof tag === 'string' ? tag : null))
      .filter((tag) => tag && !excludedTags.has(tag));
  const productionEnvironment = process.env.ELEVENTY_ENV === 'production';
  const hasTag = (data, targetTag) =>
    (Array.isArray(data?.tags) ? data.tags : [data?.tags]).some(
      (tag) => typeof tag === 'string' && tag === targetTag,
    );
  const isTestingOnlyContent = (data) =>
    productionEnvironment && hasTag(data, 'testing');

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
    (entryOrRef, entries = []) => getTimelineAncestorEntries(entryOrRef, entries),
  );
  eleventyConfig.addFilter(
    'timelineDescendantCount',
    (entryOrRef, entries = []) => getTimelineDescendantCount(entryOrRef, entries),
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
      return isTestingOnlyContent(data) || (data.draft && productionEnvironment);
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

  eleventyConfig.addCollection('notes', (collectionApi) =>
    collectionApi.getFilteredByTag('notes'),
  );

  eleventyConfig.addCollection('timeline', (collectionApi) => {
    const timelineEntries = collectionApi.getFilteredByTag('timeline');
    validateTimelineEntryRelationships(timelineEntries);

    return timelineEntries.sort((a, b) => {
      return getTimelineSortKey(a).localeCompare(getTimelineSortKey(b));
    });
  });

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
<div class="gh-embed gh-embed--${theme}${collapseClasses}"${collapseAttributes}>
	<div class="gh-embed__meta">
		<a class="gh-embed__file" href="${meta.web}" target="_blank" rel="noopener noreferrer">
			${meta.filePath}
		</a>
		<div class="gh-embed__actions">
			<a class="gh-embed__raw" href="${meta.raw}" target="_blank" rel="noopener noreferrer">view raw</a>
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

  eleventyConfig.addFilter('slug', (value) => {
    if (!value) return '';
    return slugify(value);
  });

  eleventyConfig.on('eleventy.after', ({ results = [] } = {}) => {
    if (!Array.isArray(results) || results.length === 0) {
      return;
    }

    const knownPaths = new Set();
    for (const entry of results) {
      const url = entry?.url;
      if (!url || typeof url !== 'string') continue;
      const normalized = normalizePath(url);
      knownPaths.add(normalized);
      if (normalized !== '/') {
        knownPaths.add(`${normalized}/`);
      }
    }

    const brokenLinks = [];
    for (const entry of results) {
      const { outputPath, content, url: pageUrl } = entry || {};
      if (!outputPath || !content) continue;
      if (!outputPath.endsWith('.html')) continue;

      const baseUrl = new URL(pageUrl || '/', 'http://localhost');
      const linkPattern = /href=(?:"([^"]+)"|'([^']+)')/gi;
      let match;
      while ((match = linkPattern.exec(content)) !== null) {
        const href = match[1] ?? match[2];
        if (shouldSkipHref(href)) continue;
        if (
          !(
            href.startsWith('/') ||
            href.startsWith('./') ||
            href.startsWith('../')
          )
        )
          continue;

        const [hrefWithoutHash] = href.split('#');
        const [hrefWithoutQuery] = hrefWithoutHash.split('?');
        if (hasFileExtension(hrefWithoutQuery)) continue;

        let resolvedPath;
        try {
          const resolved = new URL(href, baseUrl);
          resolvedPath = normalizePath(resolved.pathname);
        } catch (error) {
          brokenLinks.push({
            source: pageUrl || outputPath,
            href,
            error: error.message,
          });
          continue;
        }

        if (!knownPaths.has(resolvedPath)) {
          brokenLinks.push({
            source: pageUrl || outputPath,
            href,
            resolvedPath,
          });
        }
      }
    }

    if (brokenLinks.length > 0) {
      const details = brokenLinks
        .map((link) => {
          const parts = [`source: ${link.source}`, `href: ${link.href}`];
          if (link.resolvedPath) {
            parts.push(`resolved: ${link.resolvedPath}`);
          }
          if (link.error) {
            parts.push(`error: ${link.error}`);
          }
          return `  • ${parts.join(', ')}`;
        })
        .join('\n');
      throw new Error(`Broken internal links detected:\n${details}`);
    }
  });

  eleventyConfig.on('eleventy.before', async () => {
    validateTimelineEntryDateTimeQuotes();
    const { generateOgImages } = await import(
      './scripts/generate-og-images.js'
    );
    await generateOgImages({ force: OG_FORCE_ENV });
  });
}
