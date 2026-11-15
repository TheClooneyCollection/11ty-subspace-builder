(() => {
  const runtime=window.siteTheme;
  if(!runtime)return;
  const root=document.documentElement;
  if(!runtime.state.preview) document.querySelectorAll('[data-comment-script]').forEach(config=>{
    const script=document.createElement('script');
    for(const attr of config.attributes) if(attr.name!=='type'&&attr.name!=='data-comment-script'&&attr.name!=='data-src')script.setAttribute(attr.name,attr.value);
    script.src=config.dataset.src;config.replaceWith(script);
  });
  const toggle=document.querySelector('[data-theme-mode-toggle]');
  const buttons=[...document.querySelectorAll('[data-theme-preview]')];
  function sync(){
    const {theme,mode,preview}=runtime.state;
    if(preview){document.querySelectorAll('[data-theme-selector]').forEach(el=>el.hidden=true);return;}
    const active=runtime.config.themes[theme];
    buttons.forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.themePreview===theme));button.toggleAttribute('data-active',button.dataset.themePreview===theme);});
    if(toggle){
      toggle.disabled=active.scheme!=='both'&&!active.pair;
      toggle.title=toggle.disabled?`This theme is ${active.scheme} only`:`Mode: ${mode}`;
      toggle.setAttribute('aria-label',toggle.title);
      toggle.dataset.themeMode=toggle.disabled?active.scheme:mode;
      const label=toggle.querySelector('.theme-mode-label');if(label)label.textContent=toggle.disabled?active.scheme:mode;
    }
  }
  buttons.forEach(button=>button.addEventListener('click',()=>runtime.apply(button.dataset.themePreview,runtime.state.mode,runtime.state.palette,true)));
  toggle?.addEventListener('click',()=>{const modes=['auto','light','dark'];runtime.apply(runtime.state.theme,modes[(modes.indexOf(runtime.state.mode)+1)%3],runtime.state.palette,true);});
  document.addEventListener('themechange',sync);sync();
})();
