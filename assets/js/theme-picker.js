(() => {
  const runtime = window.siteTheme;
  if (!runtime) return;
  const previewPage = document.documentElement.dataset.previewPage === 'true';
  if (!previewPage) document.querySelectorAll('[data-comment-script]').forEach(config => {
    const script = document.createElement('script');
    for (const attr of config.attributes) if (!['type', 'data-comment-script', 'data-src'].includes(attr.name)) script.setAttribute(attr.name, attr.value);
    script.src = config.dataset.src;
    config.replaceWith(script);
  });
  const selector = document.querySelector('[data-theme-selector]');
  if (!selector) return;
  if (previewPage) { selector.hidden = true; return; }
  const zh = document.documentElement.lang.startsWith('zh');
  const words = zh
    ? { theme: '主题', choose: '选择主题', hint: '点选主题，在当前页面试用', close: '关闭', use: '使用', current: '当前', trying: '试用中', mode: '显示模式', auto: '跟随系统', light: '浅色', dark: '深色', reset: '使用网站默认主题', partner: 'Halo 的浅色搭配', cancel: '取消试用' }
    : { theme: 'Theme', choose: 'Choose theme', hint: 'Tap one to try it on this page', close: 'Close', use: 'Use', current: 'Current', trying: 'Trying', mode: 'Appearance', auto: 'System', light: 'Light', dark: 'Dark', reset: 'Use site default', partner: 'light partner of Halo', cancel: 'Cancel preview' };
  const entries = runtime.config.themes;
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (className, text) => { const node = make('button', className, text); node.type = 'button'; return node; };
  const label = (id, palette) => id === 'holo' ? 'Halo' : id === 'liquid-glass-light' ? 'LG Light' : id === 'liquid-glass-dark' ? `LG Dark ${palette === 'indigo' ? 'Indigo' : 'Aurora'}` : entries[id].label || id;
  const trigger = button('theme-picker-open');
  const dot = make('span', 'theme-picker-dot'); dot.setAttribute('aria-hidden', 'true');
  const triggerLabel = make('span', 'theme-picker-name');
  const chevron = make('span', 'theme-picker-chevron'); chevron.setAttribute('aria-hidden', 'true');
  trigger.append(dot, triggerLabel, chevron);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'theme-picker-panel');
  const modes = make('div', 'theme-mode-segments');
  modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', words.mode);
  const modeButtons = ['light', 'dark', 'auto'].map(mode => {
    const node = button('theme-mode-segment', { light: '☀', dark: '☾', auto: '◐' }[mode]);
    node.dataset.themeModeToggle = mode;
    node.title = words[mode]; node.setAttribute('aria-label', words[mode]);
    node.addEventListener('click', () => preserveScroll(() => runtime.setMode(mode)));
    modes.append(node); return node;
  });
  selector.append(trigger, modes);

  // The nonmodal dialog lives outside the themed header (glass skins create containing blocks).
  const panel = make('div', 'theme-picker-panel'); panel.id = 'theme-picker-panel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'theme-picker-title');
  panel.setAttribute('aria-describedby', 'theme-picker-hint');
  const heading = make('div', 'theme-picker-heading');
  const title = make('h2', 'theme-picker-title', words.theme); title.id = 'theme-picker-title';
  const hint = make('p', 'theme-picker-hint', words.hint); hint.id = 'theme-picker-hint';
  const close = button('theme-picker-close', '×'); close.setAttribute('aria-label', words.close);
  heading.append(title, hint, close);
  const body = make('div', 'theme-picker-body');
  const choices = make('div', 'theme-picker-choices'); choices.setAttribute('role', 'radiogroup'); choices.setAttribute('aria-label', words.choose);
  const scrollTail = make('div', 'theme-picker-scroll-tail');
  scrollTail.setAttribute('aria-hidden', 'true');
  body.append(choices, scrollTail);
  const footer = make('div', 'theme-picker-footer');
  const status = make('p', 'theme-picker-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const actions = make('div', 'theme-picker-actions');
  const reset = button('theme-picker-reset', words.reset);
  const cancel = button('theme-picker-cancel', words.cancel);
  const apply = button('theme-picker-apply');
  actions.append(reset, cancel, apply); footer.append(status, actions); panel.append(heading, body, footer); document.body.append(panel);
  let open = false;
  let trying = false;
  let restoring = false;
  const cards = [];
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.hidden || entry.retired) continue;
    const palettes = id === 'liquid-glass-dark' ? ['aurora', 'indigo'] : [''];
    for (const palette of palettes) {
      const node = button('theme-picker-card');
      node.dataset.id = id; node.dataset.palette = palette; node.setAttribute('role', 'radio');
      const shot = make('img', 'theme-picker-shot'); shot.alt = ''; shot.width = 1440; shot.height = 900; shot.loading = 'lazy'; shot.decoding = 'async';
      const copy = make('span', 'theme-picker-copy');
      copy.append(make('span', 'theme-picker-card-name', label(id, palette)), make('span', 'theme-picker-description', entry.description));
      node.append(shot, copy); choices.append(node);
      const card = { id, palette, entry, node, shot };
      cards.push(card);
      node.addEventListener('click', () => previewCard(card));
      node.addEventListener('keydown', event => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const visible = cards.filter(item => !item.node.hidden);
        const step = ['ArrowDown', 'ArrowUp'].includes(event.key) && matchMedia('(min-width: 601px)').matches ? 3 : 1;
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : (visible.indexOf(card) + (['ArrowRight', 'ArrowDown'].includes(event.key) ? step : -step) + visible.length) % visible.length;
        previewCard(visible[index]);
        visible[index].node.focus({ preventScroll: true });
        // Only deliberate keyboard navigation scrolls to a newly reached card.
        const rect = visible[index].node.getBoundingClientRect(), viewport = body.getBoundingClientRect();
        if (rect.top < viewport.top) body.scrollTop += rect.top - viewport.top;
        else if (rect.bottom > viewport.bottom) body.scrollTop += rect.bottom - viewport.bottom;
      });
    }
  }
  function previewCard(card) {
    preserveScroll(() => {
      trying = true;
      runtime.apply(card.id, runtime.state.mode, card.palette || runtime.state.palette, false);
    }, card);
  }
  function captureAnchor(tapped) {
    const bounds = body.getBoundingClientRect();
    const visible = card => !card.node.hidden && card.node.getBoundingClientRect().bottom > bounds.top && card.node.getBoundingClientRect().top < bounds.bottom;
    const current = cards.find(card => card.node.getAttribute('aria-checked') === 'true');
    const anchor = tapped || (current && visible(current) ? current : cards.find(visible));
    return { anchor, offset: anchor ? anchor.node.getBoundingClientRect().top - bounds.top : 0, scroll: body.scrollTop };
  }
  function restoreAnchor(snapshot) {
    if (!open) return;
    let anchor = snapshot.anchor;
    if (anchor?.node.hidden) {
      const partner = anchor.id === 'holo' ? 'starship' : anchor.entry.pair;
      anchor = cards.find(card => !card.node.hidden && card.id === partner && (!card.palette || card.palette === runtime.state.palette));
    }
    body.scrollTop = snapshot.scroll;
    if (anchor && !anchor.node.hidden) {
      const target = body.scrollTop + anchor.node.getBoundingClientRect().top - body.getBoundingClientRect().top - snapshot.offset;
      // Removing the last row must not clamp a lower card away from its old offset.
      // Keep just enough trailing space for this open session; reset it on next open.
      const missing = target - (body.scrollHeight - body.clientHeight);
      if (missing > 0) scrollTail.style.height = `${scrollTail.offsetHeight + Math.ceil(missing)}px`;
      body.scrollTop = target;
    }
  }
  function preserveScroll(change, tapped) {
    const snapshot = open ? captureAnchor(tapped) : null;
    restoring = true;
    try { change(); sync(); } finally { restoring = false; }
    if (snapshot) restoreAnchor(snapshot);
  }
  function positionPanel() {
    if (!open) return;
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const control = selector.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || innerHeight;
    const top = Math.max(8, Math.min(header.bottom + 6, viewportHeight - 200));
    panel.style.top = `${top}px`;
    panel.style.right = `${Math.max(8, innerWidth - control.right)}px`;
    panel.style.maxHeight = `${Math.max(160, Math.min(viewportHeight - top - 8, 704))}px`;
  }
  function sync() {
    const state = runtime.state;
    const scheme = state.scheme || document.documentElement.dataset.scheme;
    triggerLabel.textContent = state.theme.startsWith('liquid-glass-') ? 'Liquid Glass' : label(state.theme, state.palette);
    trigger.setAttribute('aria-label', `${words.choose}: ${triggerLabel.textContent}`);
    modeButtons.forEach(node => node.setAttribute('aria-pressed', String(node.dataset.themeModeToggle === state.mode)));
    modes.dataset.scheme = scheme;
    const entry = entries[state.theme], pair = entries[entry.pair];
    const light = entry.swatches?.light || pair?.swatches?.light || entry.swatch;
    const dark = entry.swatches?.dark || pair?.swatches?.dark || entry.swatch;
    dot.style.background = `linear-gradient(90deg, ${light.bg} 50%, ${dark.bg} 50%)`;
    for (const card of cards) {
      card.node.hidden = card.entry.scheme !== 'both' && card.entry.scheme !== scheme;
      const selected = card.id === state.theme && (!card.palette || card.palette === state.palette);
      card.node.setAttribute('aria-checked', String(selected)); card.node.tabIndex = selected && !card.node.hidden ? 0 : -1;
      if (open && !card.node.hidden) {
        const src = card.palette ? card.entry.paletteShots?.[card.palette] : card.entry.shots?.[scheme];
        if (!src) throw new Error(`Missing theme home shot: ${card.id}/${scheme}/${card.palette || 'default'}`);
        if (card.shot.getAttribute('src') !== src) card.shot.src = src;
      }
    }
    const visible = cards.filter(card => !card.node.hidden);
    if (!visible.some(card => card.node.tabIndex === 0) && visible.length) visible[0].node.tabIndex = 0;
    const partner = state.requestedTheme === 'holo' && state.theme === 'starship' && scheme === 'light';
    const schemeHint = partner ? words.partner : entries[state.theme].scheme === 'both' ? `${words.light.toLowerCase()} / ${words.dark.toLowerCase()}` : words[scheme].toLowerCase();
    status.textContent = `${trying ? words.trying : words.current} ${label(state.theme, state.palette)} · ${schemeHint}`;
    apply.textContent = `${words.use} ${label(state.theme, state.palette)}`;
    reset.hidden = !state.manual; cancel.hidden = !trying;
    positionPanel();
  }
  function dismiss(commit = false, returnFocus = true) {
    if (!open) return;
    open = false; panel.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    if (!commit) runtime.cancelPreview();
    trying = false; sync();
    if (returnFocus) trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', () => {
    if (open) { dismiss(); return; }
    scrollTail.style.height = '0px';
    open = true; trying = false; panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); sync();
    cards.find(card => !card.node.hidden && card.node.tabIndex === 0)?.node.focus({ preventScroll: true });
  });
  close.addEventListener('click', () => dismiss());
  apply.addEventListener('click', () => {
    const state = runtime.state;
    runtime.apply(state.requestedTheme || state.theme, state.mode, state.palette, true);
    dismiss(true);
  });
  reset.addEventListener('click', () => preserveScroll(() => { trying = false; runtime.useDefault(); }));
  cancel.addEventListener('click', () => preserveScroll(() => { trying = false; runtime.cancelPreview(); }));
  const inside = target => panel.contains(target) || selector.contains(target);
  document.addEventListener('pointerdown', event => { if (open && !inside(event.target)) dismiss(false, false); });
  document.addEventListener('focusin', event => { if (open && !inside(event.target)) dismiss(false, false); });
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
    // Header controls and dialog form one nonmodal keyboard region, despite separate DOM parents.
    if (event.key === 'Tab' && inside(event.target)) {
      const controls = [trigger, ...modeButtons, close, ...cards.filter(card => !card.node.hidden && card.node.tabIndex === 0).map(card => card.node), ...[reset, cancel, apply].filter(node => !node.hidden)];
      const index = controls.indexOf(document.activeElement), next = index + (event.shiftKey ? -1 : 1);
      if (index >= 0 && next >= 0 && next < controls.length) { event.preventDefault(); controls[next].focus({ preventScroll: true }); }
      else if (index >= 0) { dismiss(false, false); (event.shiftKey ? trigger : modeButtons[modeButtons.length - 1]).focus({ preventScroll: true }); }
    }
  });
  document.addEventListener('themechange', () => {
    if (restoring) return;
    const snapshot = open ? captureAnchor() : null;
    sync(); if (snapshot) restoreAnchor(snapshot);
  });
  window.addEventListener('resize', positionPanel);
  window.addEventListener('scroll', positionPanel, { passive: true });
  window.visualViewport?.addEventListener('resize', positionPanel);
  const header = document.querySelector('.site-header');
  if (window.ResizeObserver && header) new ResizeObserver(positionPanel).observe(header);
  sync();
})();
