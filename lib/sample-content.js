import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import nunjucks from 'nunjucks';

export const SAMPLE_DIRECTORIES = ['posts/samples', 'notes/samples', 'timeline/samples'];
export const sampleContentEnabled = (site = {}) => site?.sampleContent !== false;
export const isSampleSource = (file) => {
  const source = String(file).replaceAll('\\', '/').replace(/^\.\//, '');
  return SAMPLE_DIRECTORIES.some((dir) => source.startsWith(`${dir}/`));
};

export function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(file)
      : entry.isFile() && entry.name.endsWith('.md') ? [file] : [];
  });
}

// Inventory the namespace, including hidden notes that never enter public collections.
export function sampleContentUrls(root = process.cwd(), site = {}) {
  return new Set(SAMPLE_DIRECTORIES.flatMap((directory) =>
    markdownFiles(path.join(root, directory)).map((file) => {
      const relative = path.relative(root, file).split(path.sep).join('/');
      const slug = path.basename(file, '.md');
      let inherited = {};
      let current = root;
      for (const folder of path.dirname(relative).split('/')) {
        current = path.join(current, folder);
        const dataFile = path.join(current, `${folder}.json`);
        if (fs.existsSync(dataFile)) inherited = { ...inherited, ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) };
      }
      const data = { ...inherited, ...matter(fs.readFileSync(file, 'utf8')).data };
      if (typeof data.permalink === 'string') {
        return nunjucks.renderString(data.permalink, { ...data, site,
          page: { fileSlug: slug, filePathStem: `/${relative.slice(0, -3)}` } });
      }
      const collection = directory.split('/')[0];
      const hidden = relative.startsWith('notes/samples/hidden/');
      return `/${collection}/${hidden ? 'hidden/' : ''}${slug}/`;
    })));
}

export function excludedSampleUrls({ site = {}, root, excludedSampleUrls: urls } = {}) {
  return sampleContentEnabled(site) ? new Set() : new Set(urls ?? sampleContentUrls(root, site));
}

// Track only Eleventy-generated HTML so an on -> off build can retire empty
// tag/archive pages without deleting user assets or unrelated output files.
export function reconcileSampleOutput({ root = process.cwd(), output = '_site', results = [], site = {} }) {
  const outputRoot = path.resolve(root, output);
  const cacheKey = createHash('sha256').update(outputRoot).digest('hex').slice(0, 16);
  const cacheFile = path.join(root, '.cache', `sample-content-output-${cacheKey}.json`);
  const generated = results.map((result) => result.outputPath)
    .filter((file) => typeof file === 'string')
    .map((file) => path.resolve(root, file))
    .filter((file) => file.startsWith(`${outputRoot}${path.sep}`) && file.endsWith('.html'))
    .map((file) => path.relative(outputRoot, file));
  const current = new Set(generated);
  if (!sampleContentEnabled(site) && fs.existsSync(cacheFile)) {
    for (const relative of JSON.parse(fs.readFileSync(cacheFile, 'utf8'))) {
      const file = path.resolve(outputRoot, relative);
      if (!current.has(relative) && file.startsWith(`${outputRoot}${path.sep}`) && file.endsWith('.html')) {
        fs.rmSync(file, { force: true });
      }
    }
  }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(generated));
}
