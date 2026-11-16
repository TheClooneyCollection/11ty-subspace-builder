import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fontFiles } from './fonts.js';
import { templateName } from './styles.js';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
async function packageVersion(name) {
  let dir = path.dirname(require.resolve(name));
  while (dir !== path.dirname(dir)) {
    try {
      const info = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
      if (info.name === name) return info.version;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    dir = path.dirname(dir);
  }
  throw new Error(`Cannot find renderer package version: ${name}`);
}
export async function loadSources(style) {
  const name = templateName(style);
  const files = [`templates/${name}.js`, 'fonts.js', 'render.js', 'fitting.js', 'styles.js',
    ...(name === 'classic' ? [] : ['templates/shared.js'])];
  return {
    templates: Object.fromEntries(await Promise.all(files.map(async (file) =>
      [file, await readFile(path.join(here, file), 'utf8')]))),
    fonts: Object.fromEntries(await Promise.all(fontFiles(style).map(async (file) =>
      [path.basename(file), await readFile(file)]))),
    versions: Object.fromEntries(await Promise.all(['satori', '@resvg/resvg-js', '@shuding/opentype.js',
      ...(name === 'classic' ? ['satori-html'] : [])].map(async (name) => [name, await packageVersion(name)]))),
  };
}
