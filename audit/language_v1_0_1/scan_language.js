// Language scan: drive the main workflows, open every <details>, and list visible text in the other language.
// Usage: node scan_language.js <port> <en|zh> <out.json>
const {chromium}=require('playwright');const fs=require('fs');
const [port,lang,out]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(`http://localhost:${port}/index.html`);await p.waitForTimeout(1500);
if(lang==='en'){await p.locator('#lang').click();await p.waitForTimeout(500);}
const click=id=>p.evaluate(id=>{const e=document.getElementById(id);if(e)e.click();return !!e;},id);
const scan=async(stage)=>p.evaluate(([lang,stage])=>{document.querySelectorAll('details').forEach(d=>d.open=true);
  const cjk=/[一-鿿]/, latin=/[A-Za-z]{4,}/;const hits=[];
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let n=w.nextNode();n;n=w.nextNode()){const el=n.parentElement;if(!el||['SCRIPT','STYLE','OPTION'].includes(el.tagName))continue;if(el.closest('#lang'))continue;
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);if(!(r.width||r.height)||cs.visibility==='hidden'||cs.display==='none'||el.closest('[hidden]'))continue;
    const t=n.nodeValue.trim();if(!t)continue;
    if(lang==='en'&&cjk.test(t))hits.push({stage,id:el.closest('[id]')?.id||'',text:t.slice(0,80)});}
  return hits;},[lang,stage]);
let all=[];
all=all.concat(await scan('load'));
await p.evaluate(()=>{const $=id=>document.getElementById(id);const ev=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));const chk=(id,v)=>{const e=$(id);if(e&&e.checked!==v){e.checked=v;ev(e,'change');}};chk('oriOn',true);});
await p.waitForTimeout(500);all=all.concat(await scan('ineligible-gate'));
await p.evaluate(()=>{const $=id=>document.getElementById(id);const ev=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));const chk=(id,v)=>{const e=$(id);if(e&&e.checked!==v){e.checked=v;ev(e,'change');}};const val=(id,v)=>{const e=$(id);if(e){e.value=v;ev(e,'input');ev(e,'change');}};
 chk('oriOn',false);chk('weirOn',true);['freeDischarge','freeTailwater','freeBackwater','freeSubmergence','freeOperation'].forEach(id=>chk(id,true));val('freeEvidenceRecord','record');val('screeningLimitRecord','basis');});
await click('run');await p.waitForTimeout(1200);all=all.concat(await scan('routed'));
await click('optimize');await p.waitForFunction(()=>/Selected feasible|選定可行|No feasible|找不到可行/i.test(document.getElementById('optout')?.innerText||''),null,{timeout:60000}).catch(()=>{});await p.waitForTimeout(500);all=all.concat(await scan('screened'));
await click('continuousGlobal');await p.waitForTimeout(8000);all=all.concat(await scan('continuous'));
await p.evaluate(()=>{const e=document.getElementById('qallow');e.value='0.010';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
await click('run');await p.waitForTimeout(1000);await click('optimize');await p.waitForTimeout(6000);all=all.concat(await scan('blocked'));
await click('ew1A005Run');await p.waitForTimeout(4000);await click('ew1A005SensitivityRun');await p.waitForTimeout(8000);all=all.concat(await scan('ew1'));
const uniq=[...new Map(all.map(h=>[h.id+'|'+h.text,h])).values()];
fs.writeFileSync(out,JSON.stringify({lang,errs,hits:uniq},null,1));console.log(lang,'visible other-language text nodes:',uniq.length,'page errors:',errs.length);for(const h of uniq.slice(0,40))console.log(' ',h.stage,'#'+h.id,'|',h.text);await b.close();})();
