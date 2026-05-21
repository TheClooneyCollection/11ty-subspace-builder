export const normalizeTimelineRef = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  let pathname = trimmed;
  if (/^[a-z]+:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return '';
    }
  }

  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, '/');

  return pathname.endsWith('/') ? pathname : `${pathname}/`;
};

export const getTimelineEntryRef = (entryOrRef) => {
  if (typeof entryOrRef === 'string') {
    return normalizeTimelineRef(entryOrRef);
  }
  return normalizeTimelineRef(entryOrRef?.url || entryOrRef?.page?.url);
};

export const getTimelineParentRef = (entry) =>
  normalizeTimelineRef(entry?.data?.parent);
