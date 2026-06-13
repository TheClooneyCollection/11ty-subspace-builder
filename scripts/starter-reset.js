#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import yaml from 'js-yaml';
import { formatSelectionHelp, parseSelectionInput } from '../lib/starter-reset/options.js';

const rootDir = process.cwd();
const today = new Date().toISOString().slice(0, 10);

const CONTENT_CHOICES = [
  {
    id: 'posts',
    label: 'Sample blog posts',
    paths: ['posts/subspace'],
  },
  {
    id: 'notes',
    label: 'Sample notes',
    paths: ['notes'],
  },
  {
    id: 'timeline',
    label: 'Sample timeline entries',
    paths: ['timeline'],
  },
  {
    id: 'series',
    label: 'Series data',
    paths: ['_data/series.yaml'],
  },
  {
    id: 'projects',
    label: 'Project list data',
    paths: ['_data/projects.yaml'],
  },
  {
    id: 'generatedImages',
    label: 'Generated OG image cache and built assets',
    paths: ['assets/og', '.cache/og'],
  },
  {
    id: 'siteIdentity',
    label: 'Site identity, analytics, and comments config',
    paths: ['_data/site.yaml', '_data/me.yaml'],
  },
  {
    id: 'personalImages',
    label: 'Personal profile and project images',
    paths: ['assets/images/profile', 'assets/images/projects'],
  },
];

const PLACEHOLDER_CHOICES = [
  { id: 'blog', label: 'Starter blog post' },
  { id: 'note', label: 'Starter note' },
  { id: 'timeline', label: 'Starter timeline entry' },
  { id: 'projects', label: 'Starter projects list' },
  { id: 'about', label: 'Starter author/about copy' },
];

const FLAGS = new Set(process.argv.slice(2));
const keepPersonalBranding = FLAGS.has('--keep-personal-branding');

const keepIfFlagged = new Set(
  keepPersonalBranding
    ? ['projects', 'siteIdentity', 'personalImages', 'about']
    : [],
);

const ensureDir = (relativePath) => {
  fs.mkdirSync(path.join(rootDir, relativePath), { recursive: true });
};

const removePathContents = (relativePath) => {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return;

  for (const entry of fs.readdirSync(fullPath)) {
    fs.rmSync(path.join(fullPath, entry), { recursive: true, force: true });
  }
};

const removeMarkdownFiles = (relativePath) => {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return;

  for (const entry of fs.readdirSync(fullPath)) {
    if (!entry.endsWith('.md')) continue;
    fs.rmSync(path.join(fullPath, entry), { force: true });
  }
};

const writeFile = (relativePath, content) => {
  ensureDir(path.dirname(relativePath));
  fs.writeFileSync(path.join(rootDir, relativePath), content);
};

const readYaml = (relativePath) =>
  yaml.load(fs.readFileSync(path.join(rootDir, relativePath), 'utf8')) || {};

const writeYaml = (relativePath, value) => {
  ensureDir(path.dirname(relativePath));
  fs.writeFileSync(
    path.join(rootDir, relativePath),
    yaml.dump(value, { lineWidth: 88, noRefs: true, quotingType: '"' }),
  );
};

const clearImageReferences = () => {
  const me = readYaml('_data/me.yaml');
  if (me.profile) {
    me.profile.image = {};
    writeYaml('_data/me.yaml', me);
  }

  const projects = readYaml('_data/projects.yaml');
  for (const section of ['active', 'archive']) {
    const entries = Array.isArray(projects[section]) ? projects[section] : [];
    for (const project of entries) {
      delete project.image;
    }
  }
  writeYaml('_data/projects.yaml', projects);
};

const starterSeriesData = [];

const selectionIncludesSeriesLinkedContent = (selectedIds) =>
  ['posts', 'notes', 'timeline'].some((id) => selectedIds.has(id));

const withImplicitSeriesReset = (selection) => {
  const selected = Array.isArray(selection) ? [...selection] : [];
  const selectedIds = new Set(selected.map((item) => item.id));

  if (
    selectionIncludesSeriesLinkedContent(selectedIds) &&
    !selectedIds.has('series')
  ) {
    const seriesChoice = CONTENT_CHOICES.find((item) => item.id === 'series');
    if (seriesChoice) {
      selected.push(seriesChoice);
    }
  }

  return selected;
};

const formatMenu = (items) =>
  items.map((item, index) => `  ${index + 1}. ${item.label}`).join('\n');

const summarizeSelection = (items) =>
  items.length ? items.map((item) => item.label).join(', ') : 'none';

const promptForSelection = async (rl, label, items) => {
  while (true) {
    output.write(`\n${label}\n${formatMenu(items)}\n`);
    const answer = await rl.question(`Select ${formatSelectionHelp(items.length)}: `);
    const parsed = parseSelectionInput(answer, items);
    if (!parsed.error) return parsed.selected;
    output.write(`${parsed.error}\n`);
  }
};

const buildPlaceholderPost = () => `---
title: Start here: your first post
date: ${today}
tags:
  - posts
excerpt: |
  Replace this short summary with the one-line idea for your first real post.
---

This is a starter post.

Replace the title, date, tags, and excerpt first.

Then write your content here in Markdown. Delete this guidance once you have real copy.
`;

const buildPlaceholderNote = () => `---
title: Quick note example
date: ${today}
tags:
  - notes
---

Use notes for short updates, links, and half-formed thoughts.
`;

const buildPlaceholderTimeline = () => `---
title: "Started customizing the site"
date: "${today}"
time: "09:00"
tags:
  - timeline
  - idea
---

This is a starter timeline entry. Keep both \`date\` and \`time\` quoted.
`;

const starterProjectsData = {
  active: [
    {
      name: 'Your flagship project',
      summary:
        'Describe the main thing you are building, maintaining, or documenting.',
      url: null,
      repo: null,
      tech: ['Eleventy', 'JavaScript'],
    },
  ],
  archive: [],
};

const starterMeData = {
  profile: {
    name: 'Your Name',
    role: 'What you do',
    image: {},
  },
  intro: {
    paragraphs: [
      'Replace this with a short introduction to who you are and what this site is for.',
    ],
  },
  contacts: [
    {
      label: 'Email',
      url: 'mailto:you@example.com',
      icon: '@',
    },
  ],
  aboutSite: {
    heading: 'About this site',
    paragraphs: [
      'Replace this section with a short description of the purpose, shape, and voice of your site.',
    ],
  },
};

const updateSiteIdentity = () => {
  const site = readYaml('_data/site.yaml');
  site.title = 'Your Site Title';
  site.url = 'https://example.com';

  site.author = {
    name: 'Your Name',
    email: 'you@example.com',
  };

  delete site.umami;
  delete site.giscus;

  if (site.mastodon?.relMe) {
    site.mastodon.relMe.enabled = false;
    delete site.mastodon.relMe.url;
  }

  writeYaml('_data/site.yaml', site);
};

const applyContentReset = (selected) => {
  const ids = new Set(selected.map((item) => item.id));

  if (ids.has('posts')) {
    removeMarkdownFiles('posts/subspace');
  }

  if (ids.has('notes')) {
    removeMarkdownFiles('notes');
    removeMarkdownFiles('notes/hidden');
  }

  if (ids.has('timeline')) {
    removeMarkdownFiles('timeline');
  }

  if (ids.has('series')) {
    writeYaml('_data/series.yaml', starterSeriesData);
  }

  if (ids.has('projects')) {
    writeYaml('_data/projects.yaml', { active: [], archive: [] });
  }

  if (ids.has('generatedImages')) {
    removePathContents('assets/og');
    removePathContents('.cache/og');
  }

  if (ids.has('siteIdentity')) {
    updateSiteIdentity();
    writeYaml('_data/me.yaml', starterMeData);
  }

  if (ids.has('personalImages')) {
    removePathContents('assets/images/profile');
    removePathContents('assets/images/projects');
    clearImageReferences();
  }
};

const applyPlaceholders = (selected, contentSelectionIds) => {
  const ids = new Set(selected.map((item) => item.id));

  if (ids.has('blog')) {
    writeFile('posts/subspace/start-here.md', buildPlaceholderPost());
  }

  if (ids.has('note')) {
    writeFile('notes/quick-note-example.md', buildPlaceholderNote());
  }

  if (ids.has('timeline')) {
    writeFile('timeline/start-customizing-the-site.md', buildPlaceholderTimeline());
  }

  if (ids.has('projects')) {
    writeYaml('_data/projects.yaml', starterProjectsData);
  }

  if (ids.has('about')) {
    writeYaml('_data/me.yaml', starterMeData);
    if (!contentSelectionIds.has('siteIdentity')) {
      updateSiteIdentity();
    }
  }

  const site = readYaml('_data/site.yaml');
  if (contentSelectionIds.has('timeline') && !ids.has('timeline')) {
    site.timeline = {
      ...(site.timeline || {}),
      showInNav: false,
    };
    writeYaml('_data/site.yaml', site);
  } else if (ids.has('timeline')) {
    site.timeline = {
      ...(site.timeline || {}),
      showInNav: true,
    };
    writeYaml('_data/site.yaml', site);
  }
};

const printPreview = (contentSelection, placeholderSelection) => {
  output.write('\nPlanned changes\n');
  output.write(`- Clear: ${summarizeSelection(contentSelection)}\n`);
  output.write(`- Add placeholders: ${summarizeSelection(placeholderSelection)}\n`);
  if (keepPersonalBranding) {
    output.write('- Preserve personal branding: yes (`--keep-personal-branding`)\n');
  }
};

const filterChoices = (choices) =>
  choices.filter((choice) => !keepIfFlagged.has(choice.id));

const main = async () => {
  const rl = createInterface({ input, output });

  try {
    output.write('Subspace starter reset\n');
    output.write(
      'This wizard can clear sample content and leave behind starter placeholders.\n',
    );
    if (keepPersonalBranding) {
      output.write(
        'Personal branding flag is on: preserving author/profile/projects data and related images.\n',
      );
    }

    const requestedContentSelection = await promptForSelection(
      rl,
      'Choose what to clear:',
      filterChoices(CONTENT_CHOICES),
    );
    const contentSelection = withImplicitSeriesReset(requestedContentSelection);
    const requestedContentIds = new Set(
      requestedContentSelection.map((item) => item.id),
    );
    const autoAddedSeries =
      contentSelection.some((item) => item.id === 'series') &&
      !requestedContentIds.has('series');

    const placeholderSelection = await promptForSelection(
      rl,
      'Choose which placeholders to add back:',
      filterChoices(PLACEHOLDER_CHOICES),
    );

    if (autoAddedSeries) {
      output.write(
        '\nNote: series data will also be cleared. Series entries point at posts, notes, and timeline URLs, so removing content without clearing `_data/series.yaml` can leave broken references and fail the build.\n',
      );
    }

    printPreview(contentSelection, placeholderSelection);
    const confirm = (await rl.question('\nApply these changes? (`yes` to continue): '))
      .trim()
      .toLowerCase();

    if (confirm !== 'yes') {
      output.write('No changes written.\n');
      return;
    }

    const contentSelectionIds = new Set(contentSelection.map((item) => item.id));
    applyContentReset(contentSelection);
    applyPlaceholders(placeholderSelection, contentSelectionIds);

    output.write('\nReset complete.\n');
    output.write('Next steps:\n');
    output.write('- Edit `_data/site.yaml`\n');
    output.write('- Edit `_data/me.yaml`\n');
    output.write('- Replace any placeholder content in `posts/`, `notes/`, and `timeline/`\n');
    output.write('- Run `npm run build`\n');
  } finally {
    rl.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
