import { readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collectEntries, readYaml } from '../lib/og/collect.js';
import { generateCards } from '../lib/og/generate.js';
import { cacheKey } from '../lib/og/cache-key.js';
import { loadSources } from '../lib/og/sources.js';
import { loadFonts } from '../lib/og/fonts.js';
import { template } from '../lib/og/styles.js';
import { render } from '../lib/og/render.js';
import { missingGlyphs } from '../lib/og/glyphs.js';
import { showcaseData, SHOWCASE_URL } from '../lib/og/showcase.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
async function json(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return fallback; throw error; }
}
async function exists(file) {
  try { return (await stat(file)).isFile(); }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
const writeJson = (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`);

export async function generateOgImages({ root = ROOT, force = process.argv.includes('--force') || process.env.OG_FORCE === 'true',
  production = process.env.ELEVENTY_ENV === 'production' } = {}) {
  const output = path.join(root, 'assets/og');
  const cache = path.join(root, '.cache/og');
  await Promise.all([mkdir(output, { recursive: true }), mkdir(cache, { recursive: true })]);
  const site = await readYaml(path.join(root, '_data/site.yaml'));
  const series = (await readYaml(path.join(root, '_data/series.yaml'), [])).filter((s) => !production || !s.devOnly);
  const entries = await collectEntries(root, site, { production });
  const locales = Object.fromEntries(await Promise.all([...new Set(entries.map((e) => e.lang))]
    .map(async (lang) => [lang, await readYaml(path.join(root, `_data/locales/${lang}.yaml`))])));
  const fonts = new Map(), sources = new Map();
  const sourcesFor = (style) => {
    if (!sources.has(style)) sources.set(style, loadSources(style));
    return sources.get(style);
  };
  const fontsFor = (style) => {
    if (!fonts.has(style)) fonts.set(style, loadFonts(style));
    return fonts.get(style);
  };
  const glyphsFor = async (data) => missingGlyphs(template(data), await fontsFor(data.style));
  const renderCard = async (data) => render(template(data), await fontsFor(data.style));
  const result = await generateCards({ entries, site, series, locales, force,
    manifest: await json(path.join(cache, 'manifest.json'), {}),
  }, { sourcesFor, renderCard, glyphsFor, warn: (message) => console.warn(message), exists: (file) => exists(path.join(output, file)),
    save: (file, png) => writeFile(path.join(output, file), png),
  });
  // Remove generated files no longer represented, including the comparison post from a prior dev build.
  const keep = new Set(Object.values(result.images).map((url) => path.basename(url)));
  for (const file of await readdir(output)) {
    if (file.endsWith('.png') && !keep.has(file)) await rm(path.join(output, file));
  }
  const showcase = showcaseData(production);
  let showcaseRendered = 0;
  if (production) {
    await rm(path.join(output, 'showcase'), { recursive: true, force: true });
  } else {
    await mkdir(path.join(output, 'showcase'), { recursive: true });
    const previous = await json(path.join(cache, 'showcase.json'), {});
    const next = {};
    for (const item of showcase) {
      const missing = await glyphsFor(item.data);
      if (missing.length) console.warn(`[og] Missing glyphs in showcase ${item.sample} (${item.style}): ${missing.map(({ character, codePoint }) => `${JSON.stringify(character)} ${codePoint}`).join(', ')}`);
      const key = `${item.sample}-${item.style}`;
      const file = path.join(output, 'showcase', `${key}.png`);
      const hash = cacheKey(item.data, await sourcesFor(item.style));
      if (force || previous[key] !== hash || !await exists(file)) {
        await writeFile(file, await renderCard(item.data));
        showcaseRendered++;
      }
      next[key] = hash;
    }
    await writeJson(path.join(cache, 'showcase.json'), next);
  }
  await Promise.all([
    writeJson(path.join(cache, 'manifest.json'), result.manifest),
    writeJson(path.join(root, '_data/ogImages.json'), result.images),
    writeJson(path.join(root, '_data/ogGallery.json'), { cards: result.cards,
      showcase: showcase.map(({ data, ...item }) => item), showcaseUrl: SHOWCASE_URL }),
  ]);
  console.log(`[og] ${result.cards.length} cards; ${result.rendered} rendered, ${showcaseRendered} showcase cards rendered.`);
  return { ...result, showcaseRendered };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateOgImages().catch((error) => { console.error('[og] Generation failed', error); process.exitCode = 1; });
}
