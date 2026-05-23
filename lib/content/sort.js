import { toIsoDatePart } from '../timeline/dates.js';

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export const normalizeCollectionTime = (value) => {
  if (typeof value !== 'string') return '00:00';

  const trimmed = value.trim();
  if (!trimmed) return '00:00';

  const match = trimmed.match(TIME_PATTERN);
  if (!match) return '00:00';

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return '00:00';
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const getCollectionSortKey = (item) => {
  const date = toIsoDatePart(item?.data?.date) || toIsoDatePart(item?.date);
  const time = normalizeCollectionTime(item?.data?.time);
  return `${date}T${time}`;
};

export const sortCollectionByDateAndTime = (items = []) =>
  [...items].sort((a, b) =>
    getCollectionSortKey(a).localeCompare(getCollectionSortKey(b)),
  );
