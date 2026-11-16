import { isSampleSource, sampleContentEnabled } from '../sample-content.js';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import nunjucks from 'nunjucks';
import MarkdownIt from 'markdown-it';
import excerpt from '../excerpt.js';
import { normalizeI18n } from '../i18n/index.js';
import { SHOWCASE_SOURCE } from './showcase.js';

const markdown = new MarkdownIt({ html: true, linkify: true });
const posix = (value) => value.split(path.sep).join('/');
export async function readYaml(file, fallback = {}) {
  try { return yaml.load(await readFile(file, 'utf8')) || fallback; }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}
async function markdownFiles(dir) {
  try {
    const files = await readdir(dir, { recursive: true, withFileTypes: true });
    return files.filter((f) => f.isFile() && f.name.endsWith('.md'))
      .map((f) => path.join(f.parentPath, f.name)).sort();
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function directoryData(root, file) {
  const folders = path.relative(root, path.dirname(file)).split(path.sep);
  let current = root;
  let data = {};
  for (const folder of folders) {
    current = path.join(current, folder);
    data = { ...data, ...await readJson(path.join(current, `${folder}.json`)) };
  }
  return data;
}
function plainExcerpt(data, content) {
  const source = data.excerpt ? String(data.excerpt) : excerpt(markdown.render(content || ''), 2);
  const text = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= 320) return text;
  const part = text.slice(0, 320);
  const lastSpace = part.lastIndexOf(' ');
  return `${part.slice(0, lastSpace > 80 ? lastSpace : 320)}…`;
}

// Resolve relationships from the same entry inventory used for rendering.
export function resolveParents(entries) {
  const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
  return entries.map((entry) => ({ ...entry,
    parentTitle: entry.parent ? byUrl.get(entry.parent)?.title || null : null,
  }));
}

export async function collectEntries(root, site, { production = false } = {}) {
  const config = normalizeI18n(site);
  const languages = [{ code: config.defaultLanguage, prefix: '' },
    ...(config.enabled ? config.languages.filter((l) => l.code !== config.defaultLanguage)
      .map((l) => ({ code: l.code, prefix: l.code })) : [])];
  const entries = (Array.isArray(site.ogImage?.staticEntries) ? site.ogImage.staticEntries : [])
    .filter((e) => e?.key && e.slug && e.title && typeof e.excerpt === 'string')
    .map((e) => ({ ...e, collection: 'page', lang: config.defaultLanguage,
      filePath: '_data/site.yaml', url: e.url || `${e.key.replace(/\/$/, '')}/`,
    }));
  for (const language of languages) {
    for (const collection of language.prefix ? ['posts', 'notes'] : ['posts', 'notes', 'timeline']) {
      const dir = path.join(root, language.prefix, collection);
      for (const file of await markdownFiles(dir)) {
        const relative = posix(path.relative(root, file));
        if (!sampleContentEnabled(site) && isSampleSource(relative)) continue;
        const slug = path.basename(file, '.md');
        const parsed = matter(await readFile(file, 'utf8'));
        const data = { ...await directoryData(root, file), ...parsed.data };
        if (production && relative === SHOWCASE_SOURCE) continue;
        const stem = relative.slice(0, -3);
        const translated = Boolean(language.prefix);
        const baseStem = translated ? stem.slice(language.prefix.length + 1) : stem;
        const key = translated ? `${language.code}:${baseStem}` : `/${stem}`;
        const hidden = collection === 'notes' && (data.hidden || baseStem.startsWith('notes/hidden/') || baseStem.startsWith('notes/samples/hidden/'));
        const defaultUrl = translated
          ? `/${language.code}/${collection}/${hidden ? 'hidden/' : ''}${slug}/`
          : `/${stem}/`;
        const url = translated ? defaultUrl : typeof data.permalink === 'string'
          ? nunjucks.renderString(data.permalink, { ...data, site, page: { fileSlug: slug, filePathStem: `/${stem}` } })
          : defaultUrl;
        entries.push({ ...data, title: data.title ?? slug,
          tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
          collection, key, slug, url, lang: language.code, filePath: relative,
          excerpt: plainExcerpt(data, parsed.content),
        });
      }
    }
  }
  return resolveParents(entries).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}
