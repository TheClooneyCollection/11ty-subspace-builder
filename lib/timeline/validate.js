import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeTimelineRef,
  getTimelineEntryRef,
  getTimelineParentRef,
} from './refs.js';
import { buildTimelineEntryMap } from './graph.js';

export const getTimelineEntryLabel = (entry) => {
  const title = entry?.data?.title;
  if (typeof title === 'string' && title.trim()) return title.trim();

  return (
    getTimelineEntryRef(entry) ||
    entry?.page?.fileSlug ||
    entry?.fileSlug ||
    'Untitled timeline entry'
  );
};

export const getTimelineEntrySource = (entry) =>
  entry?.inputPath
    ? path.relative(process.cwd(), entry.inputPath)
    : getTimelineEntryRef(entry) || '(unknown timeline entry)';

export const validateTimelineEntryRelationships = (entries = []) => {
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
    /^"[^"]*"\s*(?:#.*)?$/.test(trimmed) ||
    /^'[^']*'\s*(?:#.*)?$/.test(trimmed)
  );
};

export const validateTimelineEntryDateTimeQuotes = (timelineDir = 'timeline') => {
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
