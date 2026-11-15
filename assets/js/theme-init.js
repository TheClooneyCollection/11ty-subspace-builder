(() => {
  const root = document.documentElement;
  const config = JSON.parse(document.getElementById('theme-config').textContent);
  const themes = config.themes;
  const fallback = themes[config.defaultId] ? config.defaultId : Object.keys(themes)[0];
  const query = new URLSearchParams(location.search);
  const preview = query.get('preview') === '1';
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const validMode = value => ['auto','light','dark'].includes(value);
  const read = key => {try{return localStorage.getItem(key);}catch{return null;}};
  const write = (key, value) => {try{localStorage.setItem(key,value);}catch{}};
  const remove = key => {try{localStorage.removeItem(key);}catch{}};
  const migrate = id => {
    const mapped = config.legacy?.[id]?.id || id;
    return themes[mapped] && !themes[mapped].retired ? mapped : null;
  };
  const override = query.has('theme') || query.has('mode') || query.has('palette');
  const canStore = !preview && !override;
  const oldPreference = read('themePreference');
  const storedMode = read('themeMode');
  const storedId = read('theme');
  const oldId = oldPreference && oldPreference !== 'auto' && !storedMode ? oldPreference : storedId;
  let manualTheme = oldPreference === 'auto' && !storedMode ? null : migrate(oldId);
  let mode = validMode(storedMode) ? storedMode : oldPreference === 'auto' ? 'auto' : config.legacy?.[oldId]?.mode || config.defaultMode || 'auto';
  let rememberedPalette = read('themePalette') || '';
  let committedPalette = rememberedPalette;
  const rolls = {};
  if (config.defaultStrategy === 'fun') {
    for (const period of ['weekday', 'weekend']) {
      const pool = (config[period + 'Themes'] || []).filter(id => migrate(id) === id);
      const key = 'themeRoll' + (period === 'weekday' ? 'Weekday' : 'Weekend');
      const saved = read(key);
      rolls[period] = pool.includes(saved) ? saved : pool[Math.floor(Math.random() * pool.length)] || fallback;
      if (canStore && pool.length && rolls[period] !== saved) write(key, rolls[period]);
    }
  }
  const defaultTheme = () => {
    const day = new Date().getDay();
    return config.defaultStrategy === 'fun' ? rolls[day === 0 || day === 6 ? 'weekend' : 'weekday'] : fallback;
  };
  let requestedTheme = manualTheme || defaultTheme();
  if (canStore && manualTheme && (oldPreference || storedId !== manualTheme)) {
    write('theme', manualTheme);
    write('themeMode', mode);
    remove('themePreference');
  }
  if (canStore && oldPreference === 'auto' && !storedMode) {
    remove('theme');
    remove('themePreference');
    write('themeMode', mode);
  }
  if(query.has('theme')) requestedTheme=migrate(query.get('theme')) || defaultTheme();
  if(validMode(query.get('mode'))) mode=query.get('mode');
  if(query.has('palette')) rememberedPalette=query.get('palette');
  let theme, palette, scheme;
  root.dataset.previewPage = String(preview);
  let initializing = true;
  let fading = null;
  // Chromium hit-tests the root during a view transition, so a tap mid-fade would be lost.
  // End the fade and hand the click to whatever is under the pointer.
  // Its pointerdown would also read as a tap outside the picker, so swallow that too.
  document.addEventListener?.('pointerdown', event => { if (fading && event.target === root) event.stopPropagation(); }, true);
  document.addEventListener?.('click', event => {
    if (!fading || event.target !== root) return;
    event.stopPropagation();
    const {clientX: x, clientY: y} = event;
    fading.skipTransition();
    fading.finished.finally(() => document.elementFromPoint(x, y)?.closest('button,a,[role],input,label')?.click());
  }, true);
  const state = () => ({theme,mode,palette,preview,scheme,manual:!!manualTheme,requestedTheme});
  function render(animate = true) {
    let id = requestedTheme;
    let entry = themes[id];
    const desired = mode === 'auto' ? (media?.matches ? 'dark' : 'light') : mode;
    if (entry.scheme !== 'both' && entry.scheme !== desired) {
      const partner = id === 'holo' && desired === 'light' && themes.starship ? 'starship' : entry.pair;
      if (themes[partner]) {id=partner;entry=themes[id];}
    }
    theme=id;
    const palettes=entry.palettes || themes[entry.pair]?.palettes || [];
    palette=palettes.includes(rememberedPalette)?rememberedPalette:palettes[0] || '';
    if (palette) rememberedPalette=palette;
    scheme=entry.scheme==='both'?desired:entry.scheme;
    const detail=state();
    const visualChange = root.dataset.theme !== detail.theme || root.dataset.scheme !== detail.scheme || root.dataset.palette !== detail.palette;
    if (!animate) fading?.skipTransition();
    const commit=()=>{
      root.dataset.theme=detail.theme;
      root.dataset.scheme=detail.scheme;
      root.dataset.themeMode=detail.mode;
      root.dataset.palette=detail.palette;
      root.dataset.themeReady='';
      let preload=document.getElementById('theme-font');
      if(entry.bodyFont){
        if(!preload){preload=document.createElement('link');preload.id='theme-font';preload.rel='preload';preload.as='font';preload.type='font/woff2';preload.crossOrigin='anonymous';document.head.append(preload);}
        preload.href=entry.bodyFont;
      }else preload?.remove();
      document.dispatchEvent(new CustomEvent('themechange',{detail}));
    };
    // All theme sheets ship in one bundle, so a switch only flips attributes; crossfade it where supported.
    const calm=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(animate && visualChange && !initializing && document.startViewTransition && !calm && !document.hidden){
      const fade=fading=document.startViewTransition(commit);
      fade.finished.finally(()=>{if(fading===fade)fading=null;});
    }
    else commit();
  }
  function apply(id, nextMode=mode, nextPalette=rememberedPalette, persist=false) {
    requestedTheme=migrate(id) || defaultTheme();
    mode=validMode(nextMode)?nextMode:'auto';
    // A non-palette skin must not erase the remembered Liquid Glass variant.
    if (nextPalette) rememberedPalette=nextPalette;
    if (persist) manualTheme=requestedTheme;
    // Persisting a selection does not change whether its appearance needs a transition.
    render();
    if (persist) {
      committedPalette=rememberedPalette;
      if (!preview) {
        write('theme',manualTheme);
        write('themeMode',mode);
        if(committedPalette) write('themePalette',committedPalette);
        remove('themePreference');
      }
    }
  }
  function capturePreference() {
    return {requestedTheme, mode, palette:rememberedPalette, manual:!!manualTheme};
  }
  function restorePreference(saved) {
    requestedTheme=migrate(saved.requestedTheme) || defaultTheme();
    manualTheme=saved.manual ? requestedTheme : null;
    mode=validMode(saved.mode) ? saved.mode : 'auto';
    rememberedPalette=saved.palette || '';
    committedPalette=rememberedPalette;
    if (!preview) {
      if (manualTheme) write('theme',manualTheme); else remove('theme');
      write('themeMode',mode);
      if (rememberedPalette) write('themePalette',rememberedPalette); else remove('themePalette');
      remove('themePreference');
    }
    render();
  }
  function setMode(nextMode) {
    if (!validMode(nextMode)) return;
    mode=nextMode;
    if (!preview) write('themeMode',mode);
    render();
  }
  function cancelPreview() {
    requestedTheme=manualTheme || defaultTheme();
    rememberedPalette=committedPalette;
    render();
  }
  function useDefault() {
    manualTheme=null;
    if (!preview) {remove('theme');remove('themePreference');}
    cancelPreview();
  }
  render();
  committedPalette=rememberedPalette;
  initializing = false;
  window.siteTheme={apply,capturePreference,restorePreference,setMode,useDefault,cancelPreview,config,get state(){return state();}};
  media?.addEventListener?.('change',()=>{if(mode==='auto')render();});
  if(override || query.has('preview')){
    for(const key of ['theme','mode','palette','preview'])query.delete(key);
    try{history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+location.hash);}catch{}
  }
})();
