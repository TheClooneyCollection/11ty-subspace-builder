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
  const state = () => ({theme,mode,palette,preview,scheme,manual:!!manualTheme,requestedTheme});
  function render() {
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
    root.dataset.theme=id;
    root.dataset.scheme=scheme;
    root.dataset.themeMode=mode;
    root.dataset.palette=palette;
    root.dataset.themeReady='';
    const sheet=document.getElementById('theme-css');
    if(sheet){
      if (initializing && entry.css && document.write && typeof HTMLLinkElement !== 'undefined' && !('blocking' in HTMLLinkElement.prototype)) {
        // Older engines need a parser-inserted sheet to block the first paint.
        const href=entry.css.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
        sheet.remove();
        document.write('<link id="theme-css" rel="stylesheet" blocking="render" href="'+href+'">');
      } else if(entry.css) sheet.setAttribute('href',entry.css);
      else sheet.removeAttribute('href');
    }
    let preload=document.getElementById('theme-font');
    if(entry.bodyFont){
      if(!preload){preload=document.createElement('link');preload.id='theme-font';preload.rel='preload';preload.as='font';preload.type='font/woff2';preload.crossOrigin='anonymous';document.head.append(preload);}
      preload.href=entry.bodyFont;
    }else preload?.remove();
    document.dispatchEvent(new CustomEvent('themechange',{detail:state()}));
  }
  function apply(id, nextMode=mode, nextPalette=rememberedPalette, persist=false) {
    requestedTheme=migrate(id) || defaultTheme();
    mode=validMode(nextMode)?nextMode:'auto';
    // A non-palette skin must not erase the remembered Liquid Glass variant.
    if (nextPalette) rememberedPalette=nextPalette;
    if (persist) manualTheme=requestedTheme;
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
  window.siteTheme={apply,setMode,useDefault,cancelPreview,config,get state(){return state();}};
  media?.addEventListener?.('change',()=>{if(mode==='auto')render();});
  if(override || query.has('preview')){
    for(const key of ['theme','mode','palette','preview'])query.delete(key);
    try{history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+location.hash);}catch{}
  }
})();
