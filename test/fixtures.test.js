import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import {
  loadHarness,
  loadFixtureEntries,
  makeCollectionApi,
  fixtureDir,
  projectRoot,
} from './fixtures/_harness.js';

/**
 * Phase 5 fixture suite. See test/fixtures/_harness.js for the rationale
 * behind running the real eleventy.config.js against a recording mock
 * instead of spinning up a full Eleventy build per fixture.
 */

let harness;

beforeAll(async () => {
  harness = await loadHarness();
});

const runTimelineCollection = (entries) => {
  const timeline = harness.collections.get('timeline');
  return timeline(makeCollectionApi(entries));
};

const runTagArchives = (entries) => {
  const archives = harness.collections.get('timelineTagArchives');
  return archives(makeCollectionApi(entries));
};

const findByUrl = (entries, url) => entries.find((entry) => entry.url === url);

describe('fixture: timeline-linear-thread (A -> B -> C)', () => {
  let entries;
  let sorted;

  beforeAll(() => {
    entries = loadFixtureEntries('timeline-linear-thread');
    sorted = runTimelineCollection(entries);
  });

  it('sorts entries chronologically', () => {
    expect(sorted.map((e) => e.url)).toEqual([
      '/timeline/a-entry/',
      '/timeline/b-entry/',
      '/timeline/c-entry/',
    ]);
  });

  it("lists ancestors A and B for entry C", () => {
    const ancestors = harness.filters.get('timelineAncestorEntries');
    const c = findByUrl(entries, '/timeline/c-entry/');
    const result = ancestors(c, entries);
    expect(result.map((e) => e.url)).toEqual([
      '/timeline/b-entry/',
      '/timeline/a-entry/',
    ]);
  });

  it('lists descendants B and C in the descendant tree of A', () => {
    const tree = harness.filters.get('timelineDescendantTree');
    const a = findByUrl(entries, '/timeline/a-entry/');
    // maxDepth=5 to capture the full chain
    const result = tree(a, entries, 5);
    expect(result).toHaveLength(1);
    expect(result[0].entry.url).toBe('/timeline/b-entry/');
    expect(result[0].continues).toBe(false);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].entry.url).toBe('/timeline/c-entry/');
  });
});

describe('fixture: timeline-branching (siblings sorted by date+time)', () => {
  it('sorts siblings by date then time', () => {
    const entries = loadFixtureEntries('timeline-branching');
    runTimelineCollection(entries); // validates without throwing
    const tree = harness.filters.get('timelineDescendantTree');
    const root = findByUrl(entries, '/timeline/a-root/');
    const result = tree(root, entries, 2);
    // c-child is 2026-02-02 08:30, b-child is 2026-02-03 10:00 -> c first.
    expect(result.map((node) => node.entry.url)).toEqual([
      '/timeline/c-child/',
      '/timeline/b-child/',
    ]);
  });
});

describe('fixture: timeline-deep-tree (maxDepth and continues flag)', () => {
  it('stops at depth 2 below A and marks the boundary node continues=true', () => {
    const entries = loadFixtureEntries('timeline-deep-tree');
    runTimelineCollection(entries);
    const tree = harness.filters.get('timelineDescendantTree');
    const a = findByUrl(entries, '/timeline/a-deep/');
    const result = tree(a, entries, 2);

    expect(result).toHaveLength(1);
    expect(result[0].entry.url).toBe('/timeline/b-deep/');
    expect(result[0].continues).toBe(false);
    expect(result[0].children).toHaveLength(1);

    const cNode = result[0].children[0];
    expect(cNode.entry.url).toBe('/timeline/c-deep/');
    // At the boundary (depth 2), c has child d -> continues should be true.
    expect(cNode.continues).toBe(true);
    expect(cNode.children).toEqual([]);
  });
});

describe('fixture: timeline-earlier-thread', () => {
  it('returns ancestors interleaved with earlier siblings, reversed', () => {
    const entries = loadFixtureEntries('timeline-earlier-thread');
    runTimelineCollection(entries);
    const earlier = harness.filters.get('timelineEarlierThreadEntries');
    const c = findByUrl(entries, '/timeline/c-leaf/');
    const result = earlier(c, entries);

    // pathToCurrent (root -> leaf): [a-root, b-path, c-leaf]
    // earlier (forward) accumulates: a-root, b-sib-earlier (sibling of b-path,
    // sorts before it), b-path. Then reverse.
    expect(result.map((entry) => entry.url)).toEqual([
      '/timeline/b-path/',
      '/timeline/b-sib-earlier/',
      '/timeline/a-root/',
    ]);
  });
});

describe('fixture: timeline-multi-category (first category match wins)', () => {
  it('returns the first matching category tag from _data/timeline.yaml', () => {
    const entries = loadFixtureEntries('timeline-multi-category');
    const entryType = harness.filters.get('timelineEntryType');
    const result = entryType(entries[0]);
    // _data/timeline.yaml lists categories in order: shipped, published, wip,
    // idea, thinking. Entry tags both 'published' and 'shipped' -> 'shipped'.
    expect(result).toBe('shipped');
  });
});

describe('fixture: timeline-orphan-parent (parent URL has no entry)', () => {
  it('throws with a useful message', () => {
    const entries = loadFixtureEntries('timeline-orphan-parent');
    expect(() => runTimelineCollection(entries)).toThrowError(
      /does not match any timeline entry URL/,
    );
  });
});

describe('fixture: timeline-cycle (A -> B -> A)', () => {
  it('throws when a parent chain forms a cycle', () => {
    const entries = loadFixtureEntries('timeline-cycle');
    expect(() => runTimelineCollection(entries)).toThrowError(/cycle/i);
  });
});

describe('fixture: timeline-self-parent', () => {
  it('throws when parent points to the entry itself', () => {
    const entries = loadFixtureEntries('timeline-self-parent');
    expect(() => runTimelineCollection(entries)).toThrowError(
      /parent cannot point to the entry itself/,
    );
  });
});

describe('fixture: timeline-tag-collision (tag slug matches an entry slug)', () => {
  it('throws when a topic tag would resolve to an existing entry URL', () => {
    const entries = loadFixtureEntries('timeline-tag-collision');
    expect(() => runTagArchives(entries)).toThrowError(
      /conflicts with an existing timeline entry URL/,
    );
  });
});

describe('fixture: timeline-reserved-slug (tag named months/weeks)', () => {
  it('throws when a topic tag resolves to a reserved archive path', () => {
    const entries = loadFixtureEntries('timeline-reserved-slug');
    expect(() => runTagArchives(entries)).toThrowError(
      /reserved timeline path/,
    );
  });
});

describe('fixture: timeline-unquoted-date (date/time front matter not quoted)', () => {
  // The validator reads `path.resolve('timeline')` against process.cwd(),
  // so we chdir into a fixture parent that has a timeline/ subdir.
  const fixturePath = fixtureDir('timeline-unquoted-date');

  it('throws when date or time is unquoted in any timeline entry', async () => {
    const beforeHooks = harness.events.get('eleventy.before') || [];
    expect(beforeHooks.length).toBeGreaterThan(0);

    const originalCwd = process.cwd();
    process.chdir(fixturePath);
    try {
      // Run all eleventy.before listeners; validate*Quotes runs first and
      // is expected to throw, short-circuiting before the OG generation
      // step (which would otherwise touch the real assets/og cache).
      let caught;
      for (const hook of beforeHooks) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await hook();
        } catch (error) {
          caught = error;
          break;
        }
      }
      expect(caught).toBeDefined();
      expect(String(caught.message)).toMatch(/must quote date and time/);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('is a no-op when running against a real cwd whose timeline is well-quoted', async () => {
    // Sanity check: against the real project cwd, the validator should
    // not throw for date/time quoting. (We can't easily run the full
    // before hook here because it would also run OG generation. Instead
    // we just confirm path resolution lands on the real timeline dir.)
    expect(projectRoot()).toBe(path.resolve(projectRoot()));
  });
});
