import {
  getTimelineEntryRef,
  getTimelineParentRef,
} from './refs.js';
import { getTimelineSortKey } from './sort.js';

export const buildTimelineEntryMap = (entries = []) => {
  const entryMap = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const ref = getTimelineEntryRef(entry);
    if (ref) entryMap.set(ref, entry);
  }

  return entryMap;
};

export const getTimelineEntryByRef = (ref, entries = []) => {
  const normalizedRef = getTimelineEntryRef(ref);
  if (!normalizedRef) return null;
  return buildTimelineEntryMap(entries).get(normalizedRef) || null;
};

export const buildTimelineChildMap = (entries = []) => {
  const childMap = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const parentRef = getTimelineParentRef(entry);
    if (!parentRef) continue;

    if (!childMap.has(parentRef)) childMap.set(parentRef, []);
    childMap.get(parentRef).push(entry);
  }

  for (const childEntries of childMap.values()) {
    childEntries.sort((a, b) =>
      getTimelineSortKey(a).localeCompare(getTimelineSortKey(b)),
    );
  }

  return childMap;
};

export const getTimelineChildEntries = (entryOrRef, entries = []) => {
  const parentRef = getTimelineEntryRef(entryOrRef);
  if (!parentRef) return [];

  const childMap = buildTimelineChildMap(entries);
  return childMap.get(parentRef) || [];
};

export const getTimelineAncestorEntries = (entryOrRef, entries = []) => {
  const timelineEntries = Array.isArray(entries) ? entries : [];
  const entryMap = buildTimelineEntryMap(timelineEntries);
  const currentEntry =
    typeof entryOrRef === 'string'
      ? entryMap.get(getTimelineEntryRef(entryOrRef))
      : entryOrRef;

  if (!currentEntry) return [];

  const ancestors = [];
  let parentRef = getTimelineParentRef(currentEntry);

  while (parentRef) {
    const parentEntry = entryMap.get(parentRef);
    if (!parentEntry) break;

    ancestors.push(parentEntry);
    parentRef = getTimelineParentRef(parentEntry);
  }

  return ancestors;
};

export const getTimelineEarlierThreadEntries = (entryOrRef, entries = []) => {
  const timelineEntries = Array.isArray(entries) ? entries : [];
  const entryMap = buildTimelineEntryMap(timelineEntries);
  const childMap = buildTimelineChildMap(timelineEntries);
  const currentEntry =
    typeof entryOrRef === 'string'
      ? entryMap.get(getTimelineEntryRef(entryOrRef))
      : entryOrRef;

  if (!currentEntry) return [];

  const pathToCurrent = [];
  let cursor = currentEntry;

  while (cursor) {
    pathToCurrent.unshift(cursor);

    const parentRef = getTimelineParentRef(cursor);
    if (!parentRef) break;

    cursor = entryMap.get(parentRef);
    if (!cursor) break;
  }

  if (pathToCurrent.length <= 1) return [];

  const earlierEntries = [];

  for (let index = 0; index < pathToCurrent.length - 1; index += 1) {
    const pathEntry = pathToCurrent[index];
    const nextPathEntry = pathToCurrent[index + 1];

    earlierEntries.push(pathEntry);

    const siblingEntries = childMap.get(getTimelineEntryRef(pathEntry)) || [];

    for (const siblingEntry of siblingEntries) {
      if (
        getTimelineEntryRef(siblingEntry) === getTimelineEntryRef(nextPathEntry)
      ) {
        break;
      }

      earlierEntries.push(siblingEntry);
    }
  }

  return earlierEntries.reverse();
};

export const getTimelineDescendantCount = (entryOrRef, entries = []) => {
  const rootRef = getTimelineEntryRef(entryOrRef);
  if (!rootRef) return 0;

  const childMap = buildTimelineChildMap(entries);
  const countDescendants = (parentRef) => {
    const childEntries = childMap.get(parentRef) || [];

    return childEntries.reduce((count, childEntry) => {
      const childRef = getTimelineEntryRef(childEntry);
      return count + 1 + (childRef ? countDescendants(childRef) : 0);
    }, 0);
  };

  return countDescendants(rootRef);
};

export const getTimelineDescendantTree = (
  entryOrRef,
  entries = [],
  maxDepth = 2,
) => {
  const rootRef = getTimelineEntryRef(entryOrRef);
  const normalizedMaxDepth = Number.isFinite(Number(maxDepth))
    ? Math.max(0, Math.floor(Number(maxDepth)))
    : 0;

  if (!rootRef || normalizedMaxDepth < 1) return [];

  const childMap = buildTimelineChildMap(entries);
  const buildNodes = (parentRef, depthRemaining) => {
    const childEntries = childMap.get(parentRef) || [];

    return childEntries.map((childEntry) => {
      const childRef = getTimelineEntryRef(childEntry);
      const directChildren = childRef ? childMap.get(childRef) || [] : [];

      if (depthRemaining <= 1) {
        return {
          entry: childEntry,
          children: [],
          continues: directChildren.length > 0,
        };
      }

      return {
        entry: childEntry,
        children: childRef ? buildNodes(childRef, depthRemaining - 1) : [],
        continues: false,
      };
    });
  };

  return buildNodes(rootRef, normalizedMaxDepth);
};
