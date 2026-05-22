import { toIsoDatePart, parseIsoDateAsUtc } from './dates.js';
import { TIMELINE_RESERVED_ARCHIVE_SLUGS } from './categories.js';
import { slugify } from '../slugify.js';

export const formatTimelineMonthKey = (date) =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

export const formatTimelineMonthLabel = (year, month) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

export const getTimelineWeekOfMonth = (date) =>
  Math.floor((date.getUTCDate() - 1) / 7) + 1;

export const formatTimelineWeekLabel = (year, month, week) =>
  `${formatTimelineMonthLabel(year, month)} · Week ${week}`;

export const formatTimelineWeekRangeLabel = (year, month, week) => {
  const startDay = (week - 1) * 7 + 1;
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDay = Math.min(startDay + 6, lastDayOfMonth);

  if (startDay === endDay) {
    return `${formatTimelineMonthLabel(year, month)} ${startDay}, ${year}`;
  }

  return `${formatTimelineMonthLabel(year, month)} ${startDay}-${endDay}, ${year}`;
};

export const getWeekStartUtc = (date) => {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  weekStart.setUTCDate(weekStart.getUTCDate() + offset);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
};

export const getIsoWeekData = (date) => {
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);

  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);

  const isoYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);

  return {
    isoYear,
    week,
    key: `${isoYear}-W${String(week).padStart(2, '0')}`,
  };
};

export const formatCalendarWeekRangeLabel = (weekStart) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const shortMonthFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });

  const startMonth = shortMonthFormatter.format(weekStart);
  const endMonth = shortMonthFormatter.format(weekEnd);
  const startDay = weekStart.getUTCDate();
  const endDay = weekEnd.getUTCDate();
  const startYear = weekStart.getUTCFullYear();
  const endYear = weekEnd.getUTCFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
};

export const formatCalendarWeekLabel = (isoYear, week) =>
  `Calendar Week ${String(week).padStart(2, '0')} · ${isoYear}`;

export const getTimelineEntrySlug = (entry) => {
  const url = typeof entry?.url === 'string' ? entry.url : '';
  const match = url.match(/^\/timeline\/([^/]+)\/$/);
  return match ? match[1] : null;
};

export const buildTimelineTagArchives = (
  entries = [],
  { getTopicTags = () => [], reservedSlugs = TIMELINE_RESERVED_ARCHIVE_SLUGS } = {},
) => {
  const archives = new Map();
  const timelineEntrySlugs = new Set(
    entries.map((entry) => getTimelineEntrySlug(entry)).filter(Boolean),
  );
  const conflictingTags = [];

  for (const entry of entries) {
    const tags = getTopicTags(entry);

    for (const tag of tags) {
      const slug = slugify(tag);

      if (reservedSlugs.has(slug)) {
        conflictingTags.push(
          `"${tag}" resolves to reserved timeline path "/timeline/${slug}/"`,
        );
        continue;
      }

      if (timelineEntrySlugs.has(slug)) {
        conflictingTags.push(
          `"${tag}" resolves to "/timeline/${slug}/", which conflicts with an existing timeline entry URL`,
        );
        continue;
      }

      if (!archives.has(tag)) {
        archives.set(tag, {
          tag,
          slug,
          entries: [],
        });
      }

      archives.get(tag).entries.push(entry);
    }
  }

  if (conflictingTags.length) {
    throw new Error(
      `Invalid timeline topic tag routes:\n  - ${conflictingTags.join('\n  - ')}`,
    );
  }

  return Array.from(archives.values()).sort((a, b) =>
    a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' }),
  );
};

export const buildTimelineMonthArchives = (entries = []) => {
  const archives = new Map();

  for (const entry of entries) {
    const date = parseIsoDateAsUtc(entry?.data?.date || entry?.date);
    if (!date) continue;

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = formatTimelineMonthKey(date);
    const week = getTimelineWeekOfMonth(date);

    if (!archives.has(key)) {
      archives.set(key, {
        key,
        year,
        month,
        label: formatTimelineMonthLabel(year, month),
        entries: [],
        weeks: [],
      });
    }

    const archive = archives.get(key);
    archive.entries.push(entry);

    const existingWeek = archive.weeks.find(
      (weekMeta) => weekMeta.week === week,
    );
    if (existingWeek) {
      existingWeek.entryCount += 1;
    } else {
      archive.weeks.push({
        key: `${key}W${week}`,
        week,
        label: formatTimelineWeekLabel(year, month, week),
        rangeLabel: formatTimelineWeekRangeLabel(year, month, week),
        entryCount: 1,
      });
    }
  }

  return Array.from(archives.values()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
};

export const buildTimelineWeekArchives = (entries = []) => {
  const archives = new Map();

  for (const entry of entries) {
    const date = parseIsoDateAsUtc(entry?.data?.date || entry?.date);
    if (!date) continue;

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const monthKey = formatTimelineMonthKey(date);
    const week = getTimelineWeekOfMonth(date);
    const key = `${monthKey}W${week}`;

    if (!archives.has(key)) {
      archives.set(key, {
        key,
        year,
        month,
        week,
        monthKey,
        monthLabel: formatTimelineMonthLabel(year, month),
        label: formatTimelineWeekLabel(year, month, week),
        rangeLabel: formatTimelineWeekRangeLabel(year, month, week),
        entries: [],
      });
    }

    archives.get(key).entries.push(entry);
  }

  return Array.from(archives.values()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
};

export const buildTimelineCalendarWeekArchives = (entries = []) => {
  const archives = new Map();

  for (const entry of entries) {
    const date = parseIsoDateAsUtc(entry?.data?.date || entry?.date);
    if (!date) continue;

    const weekStart = getWeekStartUtc(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const { isoYear, week, key } = getIsoWeekData(date);

    if (!archives.has(key)) {
      archives.set(key, {
        key,
        isoYear,
        week,
        label: formatCalendarWeekLabel(isoYear, week),
        rangeLabel: formatCalendarWeekRangeLabel(weekStart),
        weekStartDate: toIsoDatePart(weekStart),
        startMonthKey: formatTimelineMonthKey(weekStart),
        endMonthKey: formatTimelineMonthKey(weekEnd),
        entries: [],
      });
    }

    archives.get(key).entries.push(entry);
  }

  return Array.from(archives.values()).sort((a, b) =>
    a.weekStartDate.localeCompare(b.weekStartDate),
  );
};
