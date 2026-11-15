import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('assets/js/theme-init.js','utf8');
const themes={paper:{scheme:'both',css:'/paper.css'},light:{scheme:'light',pair:'dark'},dark:{scheme:'dark',pair:'light',palettes:['aurora','indigo']},holo:{scheme:'dark'}};
function run(storage={},search='',dark=false){
 const data={...storage},root={dataset:{}},sheet={setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}};
 const config={defaultId:'paper',defaultMode:'auto',themes,legacy:{sun:{id:'paper'},charcoal:{id:'paper',mode:'dark'}}};
 const context={URLSearchParams,CustomEvent:class{},location:{search,pathname:'/',hash:''},history:{replaceState(){}},window:{matchMedia:()=>({matches:dark,addEventListener(){}})},document:{documentElement:root,getElementById:id=>id==='theme-config'?{textContent:JSON.stringify(config)}:id==='theme-css'?sheet:null,dispatchEvent(){}},localStorage:{getItem:k=>data[k],setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]}};
 vm.runInNewContext(source,context);return {data,root,sheet,runtime:context.window.siteTheme};
}
describe('theme preferences before first paint',()=>{
 it('migrates a legacy id and dark preference',()=>{const r=run({theme:'charcoal'});expect(r.root.dataset).toMatchObject({theme:'paper',scheme:'dark'});expect(r.data.themeMode).toBe('dark');});
 it('falls back for removed terminal while keeping mode',()=>{expect(run({theme:'terminal',themeMode:'dark'}).root.dataset).toMatchObject({theme:'paper',scheme:'dark'});});
 it('uses system scheme in auto mode',()=>{expect(run({},'',true).root.dataset.scheme).toBe('dark');});
 it('keeps URL previews out of stored preferences',()=>{const r=run({theme:'paper'},'?theme=holo&preview=1');expect(r.root.dataset.theme).toBe('holo');expect(r.data.theme).toBe('paper');});
 it('switches pairs and preserves palette',()=>{const r=run({theme:'light',themeMode:'auto',themePalette:'indigo'},'',true);expect(r.root.dataset).toMatchObject({theme:'dark',palette:'indigo'});r.runtime.apply('dark','light','indigo',true);expect(r.root.dataset.theme).toBe('light');});
 it('ignores invalid mode and palette',()=>{const r=run({theme:'dark',themeMode:'dark',themePalette:'wrong'});expect(r.root.dataset.palette).toBe('aurora');});
 it('loads only the selected detail stylesheet',()=>{expect(run().sheet.href).toBe('/paper.css');});
});
