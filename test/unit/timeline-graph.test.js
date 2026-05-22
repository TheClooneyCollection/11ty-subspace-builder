import { describe, it, expect } from 'vitest';
import {
  buildTimelineEntryMap,
  buildTimelineChildMap,
  getTimelineEntryByRef,
  getTimelineChildEntries,
  getTimelineAncestorEntries,
  getTimelineEarlierThreadEntries,
  getTimelineDescendantCount,
  getTimelineDescendantTree,
} from '../../lib/timeline/graph.js';

// Fixtures: A → B → C, plus a sibling B' under A.
const a = { url: '/timeline/a/', data: { date: '2026-01-01' } };
const b = {
  url: '/timeline/b/',
  data: { date: '2026-01-02', parent: '/timeline/a/' },
};
const bSibling = {
  url: '/timeline/b-sib/',
  data: { date: '2026-01-02', time: '12:00', parent: '/timeline/a/' },
};
const c = {
  url: '/timeline/c/',
  data: { date: '2026-01-03', parent: '/timeline/b/' },
};
const d = {
  url: '/timeline/d/',
  data: { date: '2026-01-04', parent: '/timeline/c/' },
};
const orphan = {
  url: '/timeline/orphan/',
  data: { date: '2026-01-05', parent: '/timeline/missing/' },
};

const linear = [a, b, c];
const branched = [a, b, bSibling, c];
const deep = [a, b, c, d];

describe('buildTimelineEntryMap', () => {
  it('keys entries by their normalized url', () => {
    const map = buildTimelineEntryMap(linear);
    expect(map.get('/timeline/a/')).toBe(a);
    expect(map.size).toBe(3);
  });

  it('returns empty map for non-array input', () => {
    expect(buildTimelineEntryMap(null).size).toBe(0);
  });
});

describe('getTimelineEntryByRef', () => {
  it('looks up an entry by ref string', () => {
    expect(getTimelineEntryByRef('/timeline/b/', linear)).toBe(b);
  });

  it('returns null for unknown ref', () => {
    expect(getTimelineEntryByRef('/timeline/missing/', linear)).toBe(null);
  });
});

describe('buildTimelineChildMap', () => {
  it('groups children under parent ref', () => {
    const map = buildTimelineChildMap(branched);
    expect(map.get('/timeline/a/').length).toBe(2);
    expect(map.get('/timeline/b/')).toEqual([c]);
  });

  it('sorts children by sort key (date then time)', () => {
    const map = buildTimelineChildMap(branched);
    const aChildren = map.get('/timeline/a/');
    expect(aChildren[0]).toBe(b);
    expect(aChildren[1]).toBe(bSibling);
  });

  it('skips entries without a parent', () => {
    const map = buildTimelineChildMap([a]);
    expect(map.size).toBe(0);
  });
});

describe('getTimelineChildEntries', () => {
  it('returns children of a parent', () => {
    expect(getTimelineChildEntries('/timeline/a/', linear)).toEqual([b]);
  });

  it('accepts an entry object', () => {
    expect(getTimelineChildEntries(a, linear)).toEqual([b]);
  });

  it('returns [] for unknown parent', () => {
    expect(getTimelineChildEntries('/timeline/missing/', linear)).toEqual([]);
  });
});

describe('getTimelineAncestorEntries', () => {
  it('walks from entry to root, nearest first', () => {
    expect(getTimelineAncestorEntries(c, linear)).toEqual([b, a]);
  });

  it('returns [] for a root entry', () => {
    expect(getTimelineAncestorEntries(a, linear)).toEqual([]);
  });

  it('breaks when parent ref is missing in the entry set', () => {
    expect(getTimelineAncestorEntries(orphan, [orphan])).toEqual([]);
  });

  it('accepts a ref string', () => {
    expect(getTimelineAncestorEntries('/timeline/c/', linear)).toEqual([b, a]);
  });
});

describe('getTimelineEarlierThreadEntries', () => {
  it('returns siblings that come before each step in the path, reversed', () => {
    // Path to c: a → b → c. The b sibling sorts after b, so it should NOT
    // appear in c's "earlier" thread. Use a sibling that sorts BEFORE b.
    const bEarlySibling = {
      url: '/timeline/b-early/',
      data: { date: '2026-01-01', time: '23:00', parent: '/timeline/a/' },
    };
    const entries = [a, b, bEarlySibling, c];
    const result = getTimelineEarlierThreadEntries(c, entries);
    // Includes path entries themselves plus earlier siblings, reversed
    // (nearest in time first): b is path entry above c; b-early is b's
    // earlier sibling; a is the root.
    expect(result.map((e) => e.url)).toEqual([
      '/timeline/b/',
      '/timeline/b-early/',
      '/timeline/a/',
    ]);
  });

  it('returns [] for a root entry', () => {
    expect(getTimelineEarlierThreadEntries(a, linear)).toEqual([]);
  });
});

describe('getTimelineDescendantCount', () => {
  it('counts all descendants recursively', () => {
    expect(getTimelineDescendantCount(a, deep)).toBe(3);
    expect(getTimelineDescendantCount(b, deep)).toBe(2);
    expect(getTimelineDescendantCount(c, deep)).toBe(1);
    expect(getTimelineDescendantCount(d, deep)).toBe(0);
  });

  it('returns 0 for a missing ref', () => {
    expect(getTimelineDescendantCount(null, deep)).toBe(0);
  });
});

describe('getTimelineDescendantTree', () => {
  it('builds nested children up to maxDepth', () => {
    const tree = getTimelineDescendantTree(a, deep, 2);
    expect(tree).toHaveLength(1);
    expect(tree[0].entry).toBe(b);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].entry).toBe(c);
    expect(tree[0].children[0].children).toEqual([]);
  });

  it('marks continues=true at the boundary when more descendants exist', () => {
    const tree = getTimelineDescendantTree(a, deep, 2);
    expect(tree[0].children[0].continues).toBe(true);
  });

  it('returns [] for maxDepth < 1', () => {
    expect(getTimelineDescendantTree(a, deep, 0)).toEqual([]);
  });

  it('returns [] for missing root', () => {
    expect(getTimelineDescendantTree(null, deep, 2)).toEqual([]);
  });
});
