// Four scripted screening scenarios (Table 2) on the paper release; both interface languages.
const {chromium}=require('playwright');const fs=require('fs');
const port=process.argv[2],out=process.argv[3];
const S=[{name:'A eligible',set:{}},{name:'B missing free-discharge evidence',set:{noFree:true}},{name:'C no feasible case (Qallow 0.010)',set:{qallow:'0.010'}},{name:'D research outlet (weir + opening)',set:{ori:true}}];
(async()=>{const b=await chromium.launch();const res=[];
for(const lang of ['en','zh'])for(const s of S){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(`http://localhost:${port}/index.html`);await p.waitForTimeout(1500);if(lang==='en'){await p.locator('#lang').click();await p.waitForTimeout(400);}
 await p.evaluate(o=>{const $=id=>document.getElementById(id);const ev=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));const chk=(id,v)=>{const e=$(id);if(e&&e.checked!==v){e.checked=v;ev(e,'change');}};const val=(id,v)=>{const e=$(id);if(e){e.value=v;ev(e,'input');ev(e,'change');}};
  chk('weirOn',true);chk('oriOn',!!o.ori);chk('riserOn',false);chk('pipeOn',false);
  ['freeDischarge','freeTailwater','freeBackwater','freeSubmergence','freeOperation'].forEach(id=>chk(id,!o.noFree));
  val('freeEvidenceRecord','record');val('screeningLimitRecord','basis');if(o.qallow)val('qallow',o.qallow);},s.set);
 await p.evaluate(()=>document.getElementById('run').click());await p.waitForTimeout(1000);
 const before=await p.evaluate(()=>{const g=document.getElementById('screeningGateGuidance'),o=document.getElementById('optimize');return {disabled:o.disabled,eligible:o.dataset.screeningEligible,gate:g&&!g.hidden?g.innerText.replace(/\s+/g,' '):'',gateFix:!!(g&&!g.hidden&&g.querySelector('button'))};});
 await p.evaluate(()=>document.getElementById('optimize').click());
 await p.waitForFunction(()=>/Selected feasible|選定可行|No feasible|找不到可行|not yet|尚未執行/i.test(document.getElementById('optout')?.innerText||''),null,{timeout:60000}).catch(()=>{});await p.waitForTimeout(500);
 const after=await p.evaluate(()=>{const g=document.getElementById('diagnosticGuide');const c=g?[...g.querySelectorAll('.step-card')]:[];return {optout:document.getElementById('optout').innerText.replace(/\s+/g,' ').slice(0,300),step1:(c[0]?.innerText||'').replace(/\s+/g,' '),step3:(c[2]?.innerText||'').replace(/\s+/g,' ').slice(0,400),fix:g?g.querySelectorAll('button[data-fix]').length:0};});
 res.push({lang,name:s.name,before,after,errs});await p.close();}
await b.close();fs.writeFileSync(out,JSON.stringify(res,null,1));
for(const r of res)console.log(r.lang,'|',r.name,'| eligible',r.before.eligible,'disabled',r.before.disabled,'gateFix',r.before.gateFix,'|',r.after.step1,'| fix',r.after.fix,'| errs',r.errs.length,'|',r.after.optout.slice(0,90));})();
