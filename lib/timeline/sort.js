import { toIsoDatePart } from './dates.js';

export const getTimelineSortKey = (entry) => {
  const date = toIsoDatePart(entry?.data?.date) || toIsoDatePart(entry?.date);
  const time =
    typeof entry?.data?.time === 'string' && entry.data.time.trim()
      ? entry.data.time.trim()
      : '00:00';
  return `${date}T${time}`;
};
