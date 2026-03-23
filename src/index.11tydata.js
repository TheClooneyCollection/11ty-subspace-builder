const DEFAULT_HOME_PAGE_SIZE = 10;

const toPageSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_HOME_PAGE_SIZE;
};

export default function (data = {}) {
  return {
    pagination: {
      data: 'collections.posts',
      size: toPageSize(data?.paginationConfig?.home?.size),
      reverse: true,
      alias: 'homePosts',
      generatePageOnEmptyData: true,
    },
  };
}
