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
  const migrate = id => config.legacy[id]?.id || (themes[id] && !themes[id].retired ? id : fallback);
  const oldPreference = read('themePreference');
  const storedMode = read('themeMode');
  const storedId = read('theme');
  let theme = oldPreference === 'auto' && !storedMode ? fallback : migrate(oldPreference && oldPreference !== 'auto' && !storedMode ? oldPreference : storedId);
  let mode = validMode(storedMode) ? storedMode : oldPreference === 'auto' ? 'auto' : config.legacy[oldPreference || storedId]?.mode || config.defaultMode;
  let palette = read('themePalette');
  const override = query.has('theme') || query.has('mode') || query.has('palette');
  if(query.has('theme')) theme=migrate(query.get('theme'));
  if(validMode(query.get('mode'))) mode=query.get('mode');
  if(query.has('palette')) palette=query.get('palette');
  root.dataset.previewPage = String(preview);
  let initializing = true;
  function apply(id, nextMode=mode, nextPalette=palette, persist=false) {
    id=themes[id] ? id : migrate(id);
    mode=validMode(nextMode)?nextMode:'auto';
    let entry=themes[id];
    const desired=mode==='auto'?(media?.matches?'dark':'light'):mode;
    if(entry.pair && themes[entry.pair] && entry.scheme!==desired){id=entry.pair;entry=themes[id];}
    theme=id;
    const palettes=entry.palettes || themes[entry.pair]?.palettes || [];
    palette=palettes.includes(nextPalette)?nextPalette:palettes[0] || '';
    root.dataset.theme=id;
    root.dataset.scheme=entry.scheme==='both'?desired:entry.scheme;
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
    if(persist){write('theme',theme);write('themeMode',mode);if(palette)write('themePalette',palette);try{localStorage.removeItem('themePreference');}catch{}}
    document.dispatchEvent(new CustomEvent('themechange',{detail:{theme,mode,palette}}));
  }
  apply(theme,mode,palette,!override && !preview);
  initializing = false;
  window.siteTheme={apply,config,get state(){return {theme,mode,palette,preview};}};
  media?.addEventListener?.('change',()=>{if(mode==='auto')apply(theme,mode,palette,!override&&!preview);});
  if(override || query.has('preview')){
    for(const key of ['theme','mode','palette','preview'])query.delete(key);
    try{history.replaceState(null,'',location.pathname+(query.size?'?'+query:'')+location.hash);}catch{}
  }
})();
