export const toIsoDatePart = (value) => {
  if (typeof value === 'string') {
    return value.split('T')[0];
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  return '';
};

export const parseIsoDateAsUtc = (value) => {
  const isoDate = toIsoDatePart(value);
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
