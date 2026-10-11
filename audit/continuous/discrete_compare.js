// Discrete constrained screening comparison (A: eligible single weir; C: A with Qallow=0.010).
const {chromium}=require('playwright');const fs=require('fs');
const port=process.argv[2],out=process.argv[3];
const runs=[['A','en',null],['A','en',null],['C','en',0.010]];
async function one(b,[name,lang,q]){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(`http://127.0.0.1:${port}/index.html`);await p.waitForTimeout(1500);
 if(lang==='en'){await p.locator('#lang').click();await p.waitForTimeout(400);}
 await p.evaluate(q=>{const $=id=>document.getElementById(id);const ev=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));const chk=(id,v)=>{const e=$(id);if(e.checked!==v){e.checked=v;ev(e,'change');}};const val=(id,v)=>{const e=$(id);e.value=v;ev(e,'input');ev(e,'change');};
  chk('weirOn',true);chk('oriOn',false);chk('riserOn',false);chk('pipeOn',false);
  ['freeDischarge','freeTailwater','freeBackwater','freeSubmergence','freeOperation'].forEach(id=>chk(id,true));
  val('freeEvidenceRecord','scenario evidence record');val('screeningLimitRecord','scenario limit basis');
  if(q!==null)val('qallow',String(q));
  window.__events=[];window.addEventListener('dss:continuous-result',e=>window.__events.push({t:performance.now(),d:JSON.parse(JSON.stringify({kind:e.detail.kind,mode:e.detail.mode,limits:e.detail.limits,area:e.detail.p?.area,bw:e.detail.p?.bw,ao:e.detail.p?.ao,hmax:e.detail.e?.hp?.h,smax:e.detail.e?.hp?.s,qmax:e.detail.e?.pout?.qo,remain:e.detail.remain})),rows:e.detail.r?.rows?.map(r=>[r.t,r.qi,r.qo,r.h,r.s])}));},q);
 await p.click('#run');await p.waitForTimeout(900);
 const pre=await p.evaluate(()=>({disabled:document.getElementById('continuousGlobal').disabled,gate:document.getElementById('continuousGateStatus').innerText,guideHidden:document.getElementById('continuousGateGuidance')?.hidden,guide:document.getElementById('continuousGateGuidance')?.innerText}));
 const t0=await p.evaluate(()=>{window.__t0=performance.now();document.getElementById('optimize').click();return window.__t0;});
 await p.waitForFunction(()=>window.__events.length>0,null,{timeout:60000}).catch(()=>{});await p.waitForTimeout(500);
 const r=await p.evaluate(()=>{const o=document.getElementById('optout'),g=document.getElementById('diagnosticGuide');const cards=g?[...g.querySelectorAll('.step-card')]:[];const ev=window.__events[0];
  let mass=null;if(ev&&ev.rows){const R=ev.rows;let vin=0,vout=0;for(let i=1;i<R.length;i++){const dt=R[i][0]-R[i-1][0];vin+=(R[i-1][1]+R[i][1])*dt/2;vout+=(R[i-1][2]+R[i][2])*dt/2;}const res=vin-vout-R.at(-1)[4]+R[0][4];mass={vin,vout,finalS:R.at(-1)[4],residual:res,relPct:100*Math.abs(res)/vin,nrows:R.length,tEnd:R.at(-1)[0]};}
  return {nEvents:window.__events.length,runMs:ev?ev.t-window.__t0:null,detail:ev?.d,mass,opt:o.innerText,step1:cards[0]?.innerText.replace(/\s+/g,' '),step2:cards[1]?.innerText.replace(/\s+/g,' '),step3:cards[2]?.innerText.replace(/\s+/g,' '),fixButtons:g?g.querySelectorAll('button[data-fix]').length:0,lang:document.documentElement.lang,
   inputsAfter:{area:document.getElementById('area').value,bw:document.getElementById('bw').value}};});
 await p.close();return {name,lang,qallow:q,pre,r,errs};}
(async()=>{const b=await chromium.launch();const res=[];for(const c of runs)res.push(await one(b,c));await b.close();fs.writeFileSync(out,JSON.stringify(res,null,1));
 for(const x of res){console.log('==',x.name,x.lang,'errs',x.errs.length,'pre.disabled',x.pre.disabled,'runMs',x.r.runMs?.toFixed(0));console.log(JSON.stringify(x.r.detail),JSON.stringify(x.r.mass));console.log('S1:',x.r.step1);console.log('S2:',x.r.step2);console.log('S3:',x.r.step3);console.log('OPT:',x.r.opt.slice(0,900).replace(/\s+/g,' '));console.log('inputsAfter',x.r.inputsAfter);}})();
