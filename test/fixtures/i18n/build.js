/** Real isolated Eleventy builds: production templates/config, no remote content. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';

const root = fileURLToPath(new URL('../../../', import.meta.url));
let dependencyRoot = root;
while (
  !fs.existsSync(
    path.join(dependencyRoot, 'node_modules/@11ty/eleventy/cmd.cjs'),
  )
) {
  const parent = path.dirname(dependencyRoot);
  if (parent === dependencyRoot)
    throw new Error('Install dependencies before running fixtures');
  dependencyRoot = parent;
}
const write = (dir, name, value) => {
  const target = path.join(dir, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const writeYaml = (dir, name, value) => write(dir, name, yaml.dump(value));
const content = (title, extra = {}) =>
  `---\n${yaml.dump({ title, date: '2026-04-14', tags: ['shared-topic'], ...extra })}---\n\n${title} fixture body.\n`;

export function buildI18nFixture({
  enabled = true,
  environment = 'production',
  translations = true,
  homeTarget = 'blog',
  configure,
  onBuild,
} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'subspace-i18n-'));
  try {
    for (const name of [
      'eleventy.config.js',
      'lib',
      '_includes',
      'src',
      '_data',
      'assets/css',
      'assets/js',
      'assets/images/theme-previews',
    ]) {
      fs.cpSync(path.join(root, name), path.join(dir, name), {
        recursive: true,
      });
    }
    // Resolve installed packages without installing or fetching anything.
    fs.symlinkSync(
      fs.realpathSync(path.join(dependencyRoot, 'node_modules')),
      path.join(dir, 'node_modules'),
      'dir',
    );
    write(dir, 'package.json', '{"type":"module"}');
    write(dir, '.eleventyignore', 'node_modules/\nlib/\nscripts/\n');
    // OG raster generation is unrelated to locale rendering and has its own tests.
    // Keep every actual Eleventy hook, collection, filter and HTML link check active.
    write(
      dir,
      'scripts/generate-og-images.js',
      'export async function generateOgImages() {}\n',
    );
    for (const name of [
      'posts/posts.json',
      'posts/posts.11tydata.js',
      'notes/notes.json',
      'notes/notes.11tydata.js',
      'notes/hidden/hidden.json',
      'timeline/timeline.json',
      'timeline/timeline.11tydata.js',
    ]) {
      write(dir, name, fs.readFileSync(path.join(root, name), 'utf8'));
    }
    const site = yaml.load(
      fs.readFileSync(path.join(root, '_data/site.yaml'), 'utf8'),
    );
    site.title = 'Fixture English Site';
    site.description = 'Fixture English description';
    site.home = { target: homeTarget };
    site.i18n = {
      ...(enabled === undefined ? {} : { enabled }),
      defaultLanguage: 'en',
      languages: [
        { code: 'en', label: 'English', htmlLang: 'en' },
        { code: 'zh', label: '简体中文', htmlLang: 'zh-Hans' },
        { code: 'fr', label: 'Français', htmlLang: 'fr-FR' },
      ],
    };
    if (enabled === 'omitted') delete site.i18n;
    writeYaml(dir, '_data/site.yaml', site);
    writeYaml(dir, '_data/me.yaml', { profile: { name: 'Fixture Author' } });
    writeYaml(dir, '_data/projects.yaml', { active: [], archived: [] });
    writeYaml(dir, '_data/series.yaml', [
      {
        id: 'reading-path',
        title: 'English reading path',
        intro: 'English series introduction',
        entries: [
          '/notes/short/',
          '/posts/paired/',
          '/posts/english-only/',
          '/timeline/event/',
        ],
      },
    ]);
    writeYaml(dir, '_data/locales/zh.yaml', {
      ui: {
        pages: { notes: { heading: '中文笔记' } },
        shared: { series: { sectionLabel: '中文系列' }, languageSwitcher: { label: '语言' } },
      },
      nav: { blog: '博客', notes: '笔记' },
      series: { 'reading-path': { title: '中文阅读顺序' } },
      site: { title: '中文站点', description: '中文站点说明' },
    });
    writeYaml(dir, '_data/locales/fr.yaml', {
      ui: { shared: { pagination: { previous: 'Précédent' } } },
      nav: { blog: 'Articles français' },
      series: { 'reading-path': { intro: 'Introduction française' } },
    });
    // Source nesting deliberately differs: pairing must use the final URL.
    write(
      dir,
      'posts/nested/paired.md',
      content('EN paired', { permalink: '/posts/paired/' }),
    );
    write(
      dir,
      'posts/english-only.md',
      content('EN only', { tags: ['english-topic'] }),
    );
    write(dir, 'notes/short.md', content('EN short'));
    write(dir, 'notes/hidden/secret.md', content('EN hidden'));
    write(dir, 'posts/draft.md', content('EN draft', { draft: true }));
    write(
      dir,
      'timeline/event.md',
      content('EN timeline', { date: '2026-04-14', time: '12:30' }),
    );
    if (translations) {
      for (const [code, title] of [
        ['zh', 'ZH'],
        ['fr', 'FR'],
      ]) {
        write(
          dir,
          `${code}/posts/paired.md`,
          content(`${title} paired`, {
            tags: ['shared-topic', `${code}-topic`],
          }) + '\n{{ site.description }}\n',
        );
        write(dir, `${code}/notes/short.md`, content(`${title} short`));
        write(
          dir,
          `${code}/notes/hidden/secret.md`,
          content(`${title} hidden`),
        );
        write(
          dir,
          `${code}/posts/draft.md`,
          content(`${title} draft`, { draft: true }),
        );
        // Eleven published posts force real localized pagination.
        for (let i = 1; i <= 10; i++) {
          write(
            dir,
            `${code}/posts/extra-${i}.md`,
            content(`${title} extra ${i}`),
          );
        }
      }
    }
    // Customize isolated content/data without replacing the real build pipeline.
    configure?.(dir);
    const cli = path.join(
      dependencyRoot,
      'node_modules/@11ty/eleventy/cmd.cjs',
    );
    const result = spawnSync(process.execPath, [cli, '--quiet'], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...process.env, ELEVENTY_ENV: environment },
    });
    const pages = new Map();
    const visit = (folder) => {
      for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (entry.name.endsWith('.html') || entry.name === 'feed.xml') {
          const relative = path
            .relative(path.join(dir, '_site'), file)
            .split(path.sep)
            .join('/');
          const url = `/${relative}`.replace(/index\.html$/, '');
          pages.set(url, fs.readFileSync(file, 'utf8'));
        }
      }
    };
    if (fs.existsSync(path.join(dir, '_site'))) visit(path.join(dir, '_site'));
    // Report failed builds too, including written HTML, before cleaning up.
    onBuild?.({ ...result, pages });
    if (result.status !== 0)
      throw new Error(
        `i18n fixture ${environment} build failed:\n${result.stdout}\n${result.stderr}\n${result.error || ''}`,
      );
    return pages;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
