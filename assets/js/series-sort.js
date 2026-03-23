(() => {
  const root = document.querySelector('[data-series-page]');
  if (!root) return;

  const list = root.querySelector('[data-series-posts]');
  const buttons = Array.from(root.querySelectorAll('[data-series-sort]'));
  const items = Array.from(root.querySelectorAll('[data-series-post]'));

  if (!list || buttons.length === 0 || items.length < 2) {
    return;
  }

  const validSorts = new Set(['curated', 'reverse', 'date-asc', 'date-desc']);
  const defaultSort = 'curated';
  const paramKey = 'sort';

  const getCuratedIndex = (item) =>
    Number.parseInt(item.dataset.curatedIndex || '0', 10);

  const getDateValue = (item) => item.dataset.date || '';

  const updateButtons = (activeSort) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.seriesSort === activeSort;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const updateUrl = (sort) => {
    const params = new URLSearchParams(window.location.search);
    if (!sort || sort === defaultSort) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, sort);
    }

    const query = params.toString();
    const { pathname, hash } = window.location;
    const nextUrl = `${pathname}${query ? `?${query}` : ''}${hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  };

  const sortItems = (sort) => {
    const nextItems = [...items];

    nextItems.sort((first, second) => {
      const firstIndex = getCuratedIndex(first);
      const secondIndex = getCuratedIndex(second);

      if (sort === 'reverse') {
        return secondIndex - firstIndex;
      }

      if (sort === 'date-asc' || sort === 'date-desc') {
        const firstDate = getDateValue(first);
        const secondDate = getDateValue(second);
        const dateComparison = firstDate.localeCompare(secondDate);

        if (dateComparison !== 0) {
          return sort === 'date-asc' ? dateComparison : -dateComparison;
        }
      }

      return firstIndex - secondIndex;
    });

    nextItems.forEach((item) => list.appendChild(item));
  };

  const applySort = (sort) => {
    const nextSort = validSorts.has(sort) ? sort : defaultSort;
    sortItems(nextSort);
    updateButtons(nextSort);
    updateUrl(nextSort);
  };

  buttons.forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      applySort(button.dataset.seriesSort || defaultSort);
    });
  });

  const params = new URLSearchParams(window.location.search);
  const initialSort = params.get(paramKey) || defaultSort;
  applySort(initialSort);
})();
