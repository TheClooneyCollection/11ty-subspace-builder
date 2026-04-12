import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

import { html } from 'satori-html';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import matter from 'gray-matter';

import excerpt from '../lib/excerpt.js';
import MarkdownIt from 'markdown-it';
import MarkdownItAnchor from 'markdown-it-anchor';

const TEMPLATE_VERSION = 'v3';
const WIDTH = 1200;
const HEIGHT = 630;
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIRECTORIES = [
  { name: 'posts', dir: path.join(ROOT_DIR, 'posts') },
  { name: 'notes', dir: path.join(ROOT_DIR, 'notes') },
];
const OUTPUT_DIR = path.join(ROOT_DIR, 'assets', 'og');
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'og');
const MANIFEST_PATH = path.join(CACHE_DIR, 'manifest.json');
const DATA_PATH = path.join(ROOT_DIR, '_data', 'ogImages.json');

const CLI_FORCE =
  process.argv.includes('--force') || process.env.OG_FORCE === 'true';

const markdown = new MarkdownIt({ html: true, linkify: true }).use(
  MarkdownItAnchor,
  {
    permalink: MarkdownItAnchor.permalink.ariaHidden({
      class: 'header-anchor',
      placement: 'before',
    }),
  },
);

async function loadFont(packageName, fileName, weight) {
  const fontPath = require.resolve(`${packageName}/files/${fileName}`);
  const data = await readFile(fontPath);
  return { name: fontFamily(packageName), data, weight, style: 'normal' };
}

function fontFamily(packageName) {
  if (packageName.includes('lexend')) return 'Lexend';
  if (packageName.includes('inter')) return 'Inter';
  return 'Sans';
}

async function loadFonts() {
  return Promise.all([
    loadFont('@fontsource/lexend', 'lexend-latin-700-normal.woff', 700),
    loadFont('@fontsource/inter', 'inter-latin-500-normal.woff', 500),
    loadFont('@fontsource/inter', 'inter-latin-400-normal.woff', 400),
  ]);
}

async function ensureDir(directory) {
  await mkdir(directory, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function readManifest() {
  if (!(await fileExists(MANIFEST_PATH))) {
    return { version: TEMPLATE_VERSION, entries: {} };
  }
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[og] Unable to parse manifest, starting fresh.');
    return { version: TEMPLATE_VERSION, entries: {} };
  }
}

async function writeManifest(manifest) {
  const payload = JSON.stringify(manifest, null, 2);
  await writeFile(MANIFEST_PATH, `${payload}\n`, 'utf8');
}

async function writeDataFile(map) {
  const payload = JSON.stringify(map, null, 2);
  await writeFile(DATA_PATH, `${payload}\n`, 'utf8');
}

function stripHtml(text) {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > 80 ? lastSpace : maxLength)}…`;
}

const TITLE_STYLES = [
  { maxChars: 42, fontSize: 72, letterSpacing: -1.2, lineHeight: 1.05 },
  { maxChars: 60, fontSize: 64, letterSpacing: -1.1, lineHeight: 1.07 },
  { maxChars: 78, fontSize: 58, letterSpacing: -1.0, lineHeight: 1.1 },
  { maxChars: 96, fontSize: 52, letterSpacing: -0.9, lineHeight: 1.12 },
  {
    maxChars: Infinity,
    fontSize: 46,
    letterSpacing: -0.8,
    lineHeight: 1.15,
    truncateChars: 112,
  },
];

const EXCERPT_STYLES = [
  { maxChars: 160, fontSize: 32, lineHeight: 1.42 },
  { maxChars: 220, fontSize: 28, lineHeight: 1.46 },
  { maxChars: Infinity, fontSize: 26, lineHeight: 1.5, truncateChars: 260 },
];

function fitTitle(text) {
  const cleaned = text.trim();
  for (const style of TITLE_STYLES) {
    if (cleaned.length <= style.maxChars) {
      const finalText = style.truncateChars
        ? truncate(cleaned, style.truncateChars)
        : cleaned;
      return { ...style, text: finalText };
    }
  }
  return {
    ...TITLE_STYLES[TITLE_STYLES.length - 1],
    text: truncate(cleaned, 112),
  };
}

function fitExcerpt(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  for (const style of EXCERPT_STYLES) {
    if (normalized.length <= style.maxChars) {
      const finalText = style.truncateChars
        ? truncate(normalized, style.truncateChars)
        : normalized;
      return { ...style, text: finalText };
    }
  }
  return {
    ...EXCERPT_STYLES[EXCERPT_STYLES.length - 1],
    text: truncate(normalized, 260),
  };
}

function buildTemplate({ title, excerpt: excerptText }) {
  const fittedTitle = fitTitle(title);
  const fittedExcerpt = fitExcerpt(excerptText);

  return html`
    <div
      style="
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 72px 80px;
        background: linear-gradient(135deg, #fff9c4, #ffd166);
        color: #111111;
        font-family: 'Lexend';
      "
    >
      <div
        style="display:flex; flex-direction:column; gap:24px; max-width: 920px;"
      >
        <div
          style="font-size: ${fittedTitle.fontSize}px; font-weight: 700; line-height: ${fittedTitle.lineHeight}; letter-spacing: ${fittedTitle.letterSpacing}px;"
        >
          ${fittedTitle.text}
        </div>
        <div
          style="
            font-size: ${fittedExcerpt.fontSize}px;
            font-family: 'Inter';
            font-weight: 400;
            line-height: ${fittedExcerpt.lineHeight};
            color: rgba(17, 17, 17, 0.78);
            max-width: 820px;
          "
        >
          ${fittedExcerpt.text}
        </div>
      </div>
      <div
        style="display:flex; justify-content: space-between; align-items: center;"
      >
        <div
          style="height: 6px; width: 160px; background: #ffb700; border-radius: 999px;"
        ></div>
        <div
          style="
            font-family: 'Inter';
            font-weight: 500;
            font-size: 28px;
            color: #d97706;
            letter-spacing: 7px;
            text-transform: uppercase;
          "
        >
          Subspace
        </div>
      </div>
    </div>
  `;
}

// Remove whitespace-only text nodes so Satori doesn't count them as extra children.
function sanitizeNode(node) {
  if (node == null) return node;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    return trimmed.length ? decodeHtmlEntities(trimmed) : null;
  }
  if (Array.isArray(node)) {
    const cleaned = node
      .map((child) => sanitizeNode(child))
      .filter((child) => child !== null && child !== undefined);
    return cleaned;
  }
  if (typeof node === 'object') {
    const props = node.props ?? {};
    if (props.children !== undefined) {
      const normalized = Array.isArray(props.children)
        ? props.children
        : [props.children];
      const cleanedChildren = normalized
        .map((child) => sanitizeNode(child))
        .filter((child) => child !== null && child !== undefined);
      if (cleanedChildren.length === 0) {
        delete props.children;
      } else if (cleanedChildren.length === 1) {
        props.children = cleanedChildren[0];
      } else {
        props.children = cleanedChildren;
      }
      node.props = props;
    }
  }
  return node;
}

function createHashForEntry(data) {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex').slice(0, 12);
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function toContentKey(collectionName, relativePath) {
  const stem = relativePath.replace(path.extname(relativePath), '');
  return `/${collectionName}/${toPosixPath(stem)}`;
}

function toOutputFilename(contentKey) {
  const basename = contentKey
    .replace(/^\/+/, '')
    .replace(/[\\/]+/g, '--')
    .replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${basename}.png`;
}

async function collectEntries() {
  const entries = [];

  for (const { name, dir } of CONTENT_DIRECTORIES) {
    if (!(await fileExists(dir))) continue;

    const files = await readdir(dir, { withFileTypes: true, recursive: true });
    const markdownFiles = files.filter(
      (entry) => entry.isFile() && entry.name.endsWith('.md'),
    );

    for (const file of markdownFiles) {
      const filePath = path.join(file.parentPath, file.name);
      const relativePath = path.relative(dir, filePath);
      const slug = path.basename(file.name, path.extname(file.name));
      const raw = await readFile(filePath, 'utf8');
      const { data, content } = matter(raw);
      const htmlContent = markdown.render(content ?? '');
      const excerptSource = data.excerpt
        ? String(data.excerpt)
        : excerpt(htmlContent, 2);
      const plainExcerpt = stripHtml(excerptSource);
      const normalizedExcerpt = truncate(plainExcerpt, 320);

      entries.push({
        key: toContentKey(name, relativePath),
        slug,
        title: data.title ?? slug,
        excerpt: normalizedExcerpt,
      });
    }
  }

  return entries;
}

export async function generateOgImages(options = {}) {
  const force = options.force ?? CLI_FORCE;
  await ensureDir(OUTPUT_DIR);
  await ensureDir(CACHE_DIR);

  const [fonts, manifest, entries] = await Promise.all([
    loadFonts(),
    readManifest(),
    collectEntries(),
  ]);

  const ogMap = {};
  const nextManifest = { version: TEMPLATE_VERSION, entries: {} };

  for (const entry of entries) {
    const outputFilename = toOutputFilename(entry.key);
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    const templateData = {
      ...entry,
      templateVersion: TEMPLATE_VERSION,
    };
    const hash = createHashForEntry(templateData);
    const previousEntry = manifest.entries?.[entry.key];
    const hasMatch =
      !force && previousEntry?.hash === hash && (await fileExists(outputPath));

    if (hasMatch) {
      console.log(`[og] ✓ ${entry.key} unchanged (hash ${hash})`);
      ogMap[entry.key] = `/assets/og/${outputFilename}`;
      nextManifest.entries[entry.key] = previousEntry;
      continue;
    }

    const templateTree = sanitizeNode(buildTemplate(entry));
    const svg = await satori(templateTree, {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    });

    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: WIDTH,
      },
    });

    const png = resvg.render().asPng();
    await writeFile(outputPath, png);

    console.log(`[og] ★ generated ${entry.key} (hash ${hash})`);
    ogMap[entry.key] = `/assets/og/${outputFilename}`;
    nextManifest.entries[entry.key] = { hash };
  }

  await Promise.all([writeManifest(nextManifest), writeDataFile(ogMap)]);

  console.log(`\n[og] Done. ${Object.keys(ogMap).length} entries written.`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const thisFilePath = fileURLToPath(import.meta.url);

if (invokedPath === thisFilePath) {
  generateOgImages().catch((error) => {
    console.error('[og] Generation failed\n', error);
    process.exitCode = 1;
  });
}
