import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getTimelineEntryLabel,
  validateTimelineEntryRelationships,
  validateTimelineEntryDateTimeQuotes,
} from '../../lib/timeline/validate.js';

describe('getTimelineEntryLabel', () => {
  it('uses data.title when present', () => {
    expect(getTimelineEntryLabel({ data: { title: '  Hello  ' } })).toBe(
      'Hello',
    );
  });

  it('falls back to URL ref', () => {
    expect(getTimelineEntryLabel({ url: '/timeline/foo/' })).toBe(
      '/timeline/foo/',
    );
  });

  it('falls back to fileSlug', () => {
    expect(getTimelineEntryLabel({ fileSlug: 'foo' })).toBe('foo');
  });

  it('returns "Untitled timeline entry" as last resort', () => {
    expect(getTimelineEntryLabel({})).toBe('Untitled timeline entry');
  });
});

describe('validateTimelineEntryRelationships', () => {
  const a = { url: '/timeline/a/', data: {} };
  const b = {
    url: '/timeline/b/',
    data: { parent: '/timeline/a/' },
  };

  it('passes on valid graph', () => {
    expect(() => validateTimelineEntryRelationships([a, b])).not.toThrow();
  });

  it('passes when no entry has a parent', () => {
    expect(() => validateTimelineEntryRelationships([a])).not.toThrow();
  });

  it('throws when parent ref does not exist', () => {
    const orphan = {
      url: '/timeline/orphan/',
      data: { parent: '/timeline/missing/' },
    };
    expect(() => validateTimelineEntryRelationships([orphan])).toThrow(
      /does not match any timeline entry/,
    );
  });

  it('throws when parent ref is not under /timeline/', () => {
    const bad = { url: '/timeline/foo/', data: { parent: '/posts/bar/' } };
    expect(() => validateTimelineEntryRelationships([bad])).toThrow(
      /must point to a timeline entry URL under \/timeline\//,
    );
  });

  it('throws when parent points to self', () => {
    const self = { url: '/timeline/foo/', data: { parent: '/timeline/foo/' } };
    expect(() => validateTimelineEntryRelationships([self])).toThrow(
      /cannot point to the entry itself/,
    );
  });

  it('throws when parent value is not a string', () => {
    const bad = { url: '/timeline/foo/', data: { parent: 42 } };
    expect(() => validateTimelineEntryRelationships([bad])).toThrow(
      /must be a string URL path/,
    );
  });

  it('throws on cycle', () => {
    const x = { url: '/timeline/x/', data: { parent: '/timeline/y/' } };
    const y = { url: '/timeline/y/', data: { parent: '/timeline/x/' } };
    expect(() => validateTimelineEntryRelationships([x, y])).toThrow(
      /cycle/,
    );
  });

  it('accumulates multiple failures in one error', () => {
    const bad1 = { url: '/timeline/b1/', data: { parent: '/timeline/missing/' } };
    const bad2 = { url: '/timeline/b2/', data: { parent: '/posts/bar/' } };
    expect(() => validateTimelineEntryRelationships([bad1, bad2])).toThrow(
      /missing[\s\S]+\/posts\/bar/,
    );
  });
});

describe('validateTimelineEntryDateTimeQuotes', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-validate-'));

  const writeEntry = (filename, frontMatter) => {
    const full = path.join(tmpDir, filename);
    fs.writeFileSync(full, `---\n${frontMatter}\n---\n\nbody\n`);
    return full;
  };

  it('passes when both date and time are quoted', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    writeEntry('a.md', 'date: "2026-05-22"\ntime: "10:00"');
    expect(() => validateTimelineEntryDateTimeQuotes(tmpDir)).not.toThrow();
  });

  it('throws when date is unquoted', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    writeEntry('a.md', 'date: 2026-05-22\ntime: "10:00"');
    expect(() => validateTimelineEntryDateTimeQuotes(tmpDir)).toThrow(
      /date must be quoted/,
    );
  });

  it('throws when time is unquoted', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    writeEntry('a.md', 'date: "2026-05-22"\ntime: 10:00');
    expect(() => validateTimelineEntryDateTimeQuotes(tmpDir)).toThrow(
      /time must be quoted/,
    );
  });

  it('throws when date is missing', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    writeEntry('a.md', 'time: "10:00"');
    expect(() => validateTimelineEntryDateTimeQuotes(tmpDir)).toThrow(
      /missing date/,
    );
  });

  it('throws on missing front matter', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'a.md'), 'no front matter');
    expect(() => validateTimelineEntryDateTimeQuotes(tmpDir)).toThrow(
      /missing YAML front matter/,
    );
  });

  it('returns silently when directory does not exist', () => {
    expect(() =>
      validateTimelineEntryDateTimeQuotes(path.join(tmpDir, 'nope')),
    ).not.toThrow();
  });

  it('accepts single-quoted scalars', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    writeEntry('a.md', "date: '2026-05-22'\ntime: '10:00'");
    expect(() => validateTimelineEntryDateTimeQuotes(tmpDir)).not.toThrow();
  });
});
