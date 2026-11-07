// Chinese mode keeps Chinese text; switching zh -> en -> zh restores the original Chinese panels.
const {chromium}=require('playwright');const fs=require('fs');const port=process.argv[2],out=process.argv[3];
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(`http://localhost:${port}/index.html`);await p.waitForTimeout(1500);
await p.evaluate(()=>{const e=document.getElementById('oriOn');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));});
await p.evaluate(()=>document.getElementById('run').click());await p.waitForTimeout(1200);
await p.evaluate(()=>document.getElementById('ew1A005Run').click());await p.waitForTimeout(4000);
const grab=()=>p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>d.open=true);const t=id=>(document.getElementById(id)?.innerText||'').replace(/\s+/g,' ');return {lang:document.documentElement.lang,gate:t('screeningGateGuidance'),trace:t('runTraceability').slice(0,200),ew1:t('ew1A005Benchmark').slice(0,200)};});
const z1=await grab();await p.locator('#lang').click();await p.waitForTimeout(800);const e1=await grab();await p.locator('#lang').click();await p.waitForTimeout(800);const z2=await grab();
const cjk=s=>/[一-鿿]/.test(s);
const res={zh_first:z1,en:e1,zh_again:z2,checks:{zh_first_chinese:cjk(z1.gate)&&cjk(z1.trace)&&cjk(z1.ew1),en_no_chinese:!cjk(e1.gate)&&!cjk(e1.trace)&&!cjk(e1.ew1),zh_restored_equal:z1.trace===z2.trace&&z1.ew1===z2.ew1&&z1.gate===z2.gate},errs};
fs.writeFileSync(out,JSON.stringify(res,null,1));console.log(JSON.stringify(res.checks),'errs',errs.length);console.log(e1.gate);console.log(e1.trace.slice(0,160));await b.close();})();
