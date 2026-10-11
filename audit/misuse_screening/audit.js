// Misuse audit: randomized declared conditions -> invariants on screening output and three-step diagnostic.
const {chromium}=require('playwright');const fs=require('fs');
const port=process.argv[2],N=+process.argv[3]||200,out=process.argv[4];
let seed=20261010;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};const pick=a=>a[Math.floor(rnd()*a.length)];
const outlets=['weir','ori','weir+ori','riser','weir+riser','none','weir+table'];
const ELIG=process.argv[5]==='eligible';if(ELIG)seed=777;const cases=[];for(let i=0;i<N;i++)cases.push({i,outlet:ELIG?pick(['weir','ori']):pick(outlets),free:ELIG?'all':pick(['all','all','all','partial','none']),records:ELIG?'both':pick(['both','both','one','none']),qallow:pick([0.001,0.01,0.03,0.06,0.08,0.1,0.2]),hallowMode:pick(['belowH0','low','normal','high']),qpScale:pick([0.5,1,1.5,3]),lang:pick(['zh','zh','en'])});
async function one(b,c){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(`http://localhost:${port}/index.html`);await p.waitForTimeout(1500);
 if(c.lang==='en'){await p.locator('#lang').click();await p.waitForTimeout(400);}
 const setup=await p.evaluate(c=>{const $=id=>document.getElementById(id);const ev=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));const chk=(id,v)=>{const e=$(id);if(!e)return false;if(e.checked!==v){e.checked=v;ev(e,'change');}return true;};const val=(id,v)=>{const e=$(id);if(!e)return false;e.value=v;ev(e,'input');ev(e,'change');return true;};
  const o=c.outlet;chk('weirOn',/weir/.test(o));chk('oriOn',/ori/.test(o));chk('riserOn',/riser/.test(o));chk('pipeOn',false);if(/table/.test(o))val('coeffMode','table');
  const fi=['freeDischarge','freeTailwater','freeBackwater','freeSubmergence','freeOperation'];fi.forEach((id,k)=>chk(id,c.free==='all'||(c.free==='partial'&&k<3)));
  val('freeEvidenceRecord',c.records!=='none'?'audit record':'');val('screeningLimitRecord',c.records==='both'?'audit basis':'');
  val('qallow',String(c.qallow));const h0=Number($('h0')?.value||0);val('hallow',String(c.hallowMode==='belowH0'?h0-0.05:c.hallowMode==='low'?h0+0.05:c.hallowMode==='normal'?1.0:3.0));
  val('qp',String((Number($('qp').value)*c.qpScale).toFixed(4)));
  return {h0,hasRiser:!!$('riserOn'),hasCoeff:!!$('coeffMode'),coeff:$('coeffMode')?.value};},c);
 await p.evaluate(()=>document.getElementById('run').click());await p.waitForTimeout(900);
 const gate=await p.evaluate(()=>{const g=document.getElementById('screeningGateGuidance');const o=document.getElementById('optimize');return {eligibleAttr:o.dataset.screeningEligible,disabled:o.disabled,gateText:g&&!g.hidden?g.innerText.trim():'',gateFix:!!(g&&!g.hidden&&g.querySelector('button'))};});
 await p.evaluate(()=>document.getElementById('optimize').click());
 await p.waitForFunction(()=>{const o=document.getElementById('optout');return o&&/選定可行|Selected feasible|找不到可行|No feasible|尚未執行受限|not yet|Not run|could not|無法完成|stopped|停止/i.test(o.innerText);},null,{timeout:30000}).catch(()=>{});await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const o=document.getElementById('optout'),g=document.getElementById('diagnosticGuide');const cards=g?[...g.querySelectorAll('.step-card')]:[];return {opt:o?o.innerText.replace(/\s+/g,' '):'',step1:cards[0]?.innerText.replace(/\s+/g,' ')||'',step2:cards[1]?.innerText.replace(/\s+/g,' ')||'',step3:cards[2]?.innerText.replace(/\s+/g,' ')||'',fixButtons:g?g.querySelectorAll('button[data-fix]').length:0,lang:document.documentElement.lang};});
 await p.close();return {...c,setup,gate,r,errs};}
(async()=>{const b=await chromium.launch();const res=[];const conc=6;let k=0;
 await Promise.all([...Array(conc)].map(async()=>{while(k<cases.length){const c=cases[k++];try{res.push(await one(b,c));}catch(e){res.push({...c,crash:e.message});}}}));
 await b.close();res.sort((a,b)=>a.i-b.i);fs.writeFileSync(out,JSON.stringify(res));console.log('done',res.length);})();
