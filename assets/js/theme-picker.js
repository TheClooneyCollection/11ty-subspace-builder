(() => {
  const runtime = window.siteTheme;
  if (!runtime) return;
  if (!runtime.state.preview) document.querySelectorAll('[data-comment-script]').forEach(config => {
    const script = document.createElement('script');
    for (const attr of config.attributes) if (!['type','data-comment-script','data-src'].includes(attr.name)) script.setAttribute(attr.name, attr.value);
    script.src = config.dataset.src;
    config.replaceWith(script);
  });
  const selector = document.querySelector('[data-theme-selector]');
  if (!selector) return;
  if (runtime.state.preview) { selector.hidden = true; return; }
  const zh = document.documentElement.lang.startsWith('zh');
  const words = zh ? {choose:'选择主题',close:'关闭',apply:'应用',mode:'模式',auto:'自动',light:'浅色',dark:'深色',palette:'配色',preview:'主题预览'} : {choose:'Choose theme',close:'Close',apply:'Apply',mode:'Mode',auto:'Auto',light:'Light',dark:'Dark',palette:'Palette',preview:'Theme preview'};
  const toggle = document.querySelector('[data-theme-mode-toggle]');
  const inlineButtons = [...document.querySelectorAll('[data-theme-preview]')];
  const entries = runtime.config.themes;
  const available = Object.entries(entries).filter(([,entry]) => !entry.hidden && !entry.retired);
  const make = (tag, className, text) => {const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
  const trigger=make('button','theme-picker-open',words.choose);trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');selector.append(trigger);
  const dialog=make('dialog','theme-peek');dialog.setAttribute('aria-label',words.choose);document.body.append(dialog);
  const heading=make('div','theme-peek-heading');heading.append(make('h2','',words.choose));
  const close=make('button','theme-peek-close',words.close);close.type='button';heading.append(close);dialog.append(heading);
  const choices=make('div','theme-peek-choices');choices.setAttribute('role','radiogroup');choices.setAttribute('aria-label',words.choose);dialog.append(choices);
  const options=make('div','theme-peek-options');const modeLabel=make('label','',words.mode+' ');const modeSelect=make('select');
  for(const mode of ['auto','light','dark']){const option=make('option','',words[mode]);option.value=mode;modeSelect.append(option);}modeLabel.append(modeSelect);options.append(modeLabel);
  const paletteLabel=make('label','',words.palette+' ');const paletteSelect=make('select');paletteLabel.append(paletteSelect);options.append(paletteLabel);dialog.append(options);
  const frame=make('iframe','theme-peek-frame');frame.title=words.preview;frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.inert=true;dialog.append(frame);
  const footer=make('div','theme-peek-footer');const description=make('p');const apply=make('button','theme-peek-apply',words.apply);apply.type='button';footer.append(description,apply);dialog.append(footer);
  let selected,selectedMode,selectedPalette,opener;
  const radios=[];
  const choiceMode = id => entries[id].pair ? entries[id].scheme : runtime.state.mode;
  function redraw(load=true){
    const entry=entries[selected];
    radios.forEach(button=>{const active=button.dataset.id===selected;button.setAttribute('aria-checked',String(active));button.tabIndex=active?0:-1;});
    modeSelect.value=selectedMode;modeSelect.disabled=entry.scheme!=='both'&&!entry.pair;
    const palettes=entry.palettes || entries[entry.pair]?.palettes || [];
    if(!palettes.includes(selectedPalette))selectedPalette=palettes[0] || '';
    paletteSelect.replaceChildren(...palettes.map(id=>{const option=make('option','',id.charAt(0).toUpperCase()+id.slice(1));option.value=id;return option;}));
    paletteSelect.value=selectedPalette;paletteLabel.hidden=!palettes.length;
    description.textContent=`${entry.label || selected} · ${entry.scheme==='both'?`${words.light} / ${words.dark}`:words[entry.scheme]}`;
    frame.title=`${words.preview}: ${entry.label || selected}`;
    if(load){const url=new URL(location.href);url.searchParams.set('theme',selected);url.searchParams.set('mode',selectedMode);url.searchParams.set('preview','1');if(selectedPalette)url.searchParams.set('palette',selectedPalette);url.hash='';frame.src=url.pathname+url.search;}
  }
  for(const [id,entry] of available){
    const button=make('button','theme-peek-choice');button.type='button';button.dataset.id=id;button.setAttribute('role','radio');
    const swatch=make('span','theme-swatch','Aa');swatch.setAttribute('aria-hidden','true');
    const colors=entry.swatch || {};swatch.style.background=colors.bg || 'transparent';swatch.style.color=colors.ink || 'inherit';swatch.style.borderColor=colors.accent || 'currentColor';
    button.append(swatch,make('span','',entry.label || id));choices.append(button);radios.push(button);
    button.addEventListener('click',()=>{selected=id;selectedMode=choiceMode(id);redraw();});
    button.addEventListener('keydown',event=>{
      if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();let index=radios.indexOf(button);index=event.key==='Home'?0:event.key==='End'?radios.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+radios.length)%radios.length;
        selected=radios[index].dataset.id;selectedMode=choiceMode(selected);redraw();radios[index].focus();
      }else if(event.key==='Enter'){event.preventDefault();commit();}
    });
  }
  function commit(){runtime.apply(selected,selectedMode,selectedPalette,true);dialog.close();}
  trigger.addEventListener('click',()=>{opener=document.activeElement;selected=available.some(([id])=>id===runtime.state.theme)?runtime.state.theme:available[0][0];selectedMode=runtime.state.mode;selectedPalette=runtime.state.palette;redraw();dialog.showModal();radios.find(r=>r.dataset.id===selected)?.focus();});
  close.addEventListener('click',()=>dialog.close());apply.addEventListener('click',commit);
  dialog.addEventListener('close',()=>{frame.removeAttribute('src');opener?.focus();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  modeSelect.addEventListener('change',()=>{selectedMode=modeSelect.value;redraw();});paletteSelect.addEventListener('change',()=>{selectedPalette=paletteSelect.value;redraw();});
  inlineButtons.forEach(button=>button.addEventListener('click',()=>runtime.apply(button.dataset.themePreview,choiceMode(button.dataset.themePreview),runtime.state.palette,true)));
  toggle?.addEventListener('click',()=>{const modes=['auto','light','dark'];runtime.apply(runtime.state.theme,modes[(modes.indexOf(runtime.state.mode)+1)%3],runtime.state.palette,true);});
  function sync(){
    const {theme,mode}=runtime.state,entry=entries[theme];
    inlineButtons.forEach(button=>{const active=button.dataset.themePreview===theme;button.setAttribute('aria-pressed',String(active));button.toggleAttribute('data-active',active);});
    if(toggle){toggle.disabled=entry.scheme!=='both'&&!entry.pair;toggle.title=toggle.disabled?`${entry.label}: ${words[entry.scheme]}`:`${words.mode}: ${words[mode]}`;toggle.setAttribute('aria-label',toggle.title);toggle.dataset.themeMode=toggle.disabled?entry.scheme:mode;const label=toggle.querySelector('.theme-mode-label');if(label)label.textContent=words[toggle.disabled?entry.scheme:mode];}
  }
  document.addEventListener('themechange',sync);sync();
})();
