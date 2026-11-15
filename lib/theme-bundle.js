import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Every theme sheet is scoped by html[data-theme=...], so one bundle lets a switch just flip the attribute.
let current = null;

export function themeBundle(themes = []) {
  const files = themes.map(theme => `assets/css/themes/${theme.id}.css`).filter(file => fs.existsSync(file));
  const signature = files.map(file => `${file}:${fs.statSync(file).mtimeMs}`).join('|');
  if (current?.signature !== signature) {
    const css = files.map(file => `/* ${path.basename(file)} */\n${fs.readFileSync(file, 'utf8').trim()}\n`).join('\n');
    const hash = createHash('sha256').update(css).digest('hex').slice(0, 10);
    current = { signature, css, url: files.length ? `/assets/css/themes.${hash}.css` : null };
  }
  return current.url;
}

export function emitThemeBundle(outputDir = '_site') {
  if (!current?.url) return;
  const target = path.join(outputDir, current.url);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  for (const entry of fs.readdirSync(path.dirname(target))) {
    if (/^themes\.[a-f0-9]{10}\.css$/.test(entry) && entry !== path.basename(target)) fs.rmSync(path.join(path.dirname(target), entry), { force: true });
  }
  fs.writeFileSync(target, current.css);
}
