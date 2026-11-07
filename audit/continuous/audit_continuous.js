// Continuous-mode misuse audit. Derived from ../misuse_screening/audit.js (same LCG, same case fields),
// but requests continuous optimization (#continuousGlobal) instead of constrained screening (#optimize).
// usage: node audit_continuous.js <port> <N> <out>
const {chromium}=require('playwright');const fs=require('fs');
const port=process.argv[2],N=+process.argv[3]||100,out=process.argv[4];
let seed=20261011;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};const pick=a=>a[Math.floor(rnd()*a.length)];
const outlets=['weir','ori','weir+ori','riser','weir+riser','none','weir+table'];
const cases=[];for(let i=0;i<N;i++){const bias=rnd()<0.5;cases.push({i,bias,outlet:bias?pick(['weir','ori']):pick(outlets),free:bias?'all':pick(['all','all','all','partial','none','noBoundary']),records:bias?'both':pick(['both','both','one','none']),qallow:pick([0.001,0.01,0.03,0.06,0.08,0.1,0.2]),hallowMode:pick(['belowH0','low','normal','high']),qpScale:pick([0.5,1,1.5,3]),lang:pick(['zh','zh','en'])});}
// Targeted cases appended after the randomized ones (gate-consistency probes), flagged targeted:true.
const T0=[{outlet:'weir',free:'noBoundary',records:'both',hallowMode:'normal',qallow:0.08,qpScale:1,lang:'en'},{outlet:'ori',free:'noBoundary',records:'both',hallowMode:'normal',qallow:0.08,qpScale:1,lang:'zh'},{outlet:'weir+table',free:'all',records:'both',hallowMode:'normal',qallow:0.08,qpScale:1,lang:'en'},{outlet:'weir',free:'all',records:'both',hallowMode:'belowH0',qallow:0.08,qpScale:1,lang:'zh'}];
if(process.argv[5]!=='notargeted')T0.forEach((t,j)=>cases.push({i:N+j,bias:false,targeted:true,...t}));
const DONE=/進階連續最佳化｜全域|Advanced continuous optimization —|沒有可行解|No feasible candidate|尚未執行連續|was not run|無法完成|could not be completed|請先輸入有效|Enter valid|上下限無效|bounds are invalid|固定面積|constant-area/;
async function snap(p){return p.evaluate(()=>{const o=document.getElementById('optout'),g=document.getElementById('diagnosticGuide'),b=document.getElementById('continuousGlobal'),gs=document.getElementById('continuousGateStatus'),gg=document.getElementById('continuousGateGuidance');const cards=g?[...g.querySelectorAll('.step-card')]:[];
 return {opt:o?o.innerText.replace(/\s+/g,' '):'',optClass:o?.className||'',step1:cards[0]?.innerText.replace(/\s+/g,' ')||'',step2:cards[1]?.innerText.replace(/\s+/g,' ')||'',step3:cards[2]?.innerText.replace(/\s+/g,' ')||'',diagList:g?.querySelector('.diagnostic-list')?.innerText.replace(/\s+/g,' ')||'',fixButtons:g?g.querySelectorAll('button[data-fix]').length:0,lang:document.documentElement.lang,
  contDisabled:b.disabled,gateStatus:gs?.innerText||'',gateGuideText:gg&&!gg.hidden?gg.innerText.trim():'',gateGuideFix:!!(gg&&!gg.hidden&&gg.querySelector('button')),events:(window.__events||[]).slice()};});}
async function request(p){const t0=Date.now();const clicked=await p.evaluate(()=>{const b=document.getElementById('continuousGlobal');const was=b.disabled;b.click();return {wasDisabled:was,busy:b.dataset.busy};});
 if(clicked.busy==='true')await p.waitForFunction(()=>document.getElementById('continuousGlobal').dataset.busy!=='true',null,{timeout:180000}).catch(()=>{});
 await p.waitForTimeout(400);const s=await snap(p);return {...clicked,ms:Date.now()-t0,...s,done:DONE.test(s.opt)};}
async function one(b,c){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(`http://127.0.0.1:${port}/index.html`);await p.waitForTimeout(1500);
 if(c.lang==='en'){await p.locator('#lang').click();await p.waitForTimeout(400);}
 const setup=await p.evaluate(c=>{const $=id=>document.getElementById(id);const ev=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));const chk=(id,v)=>{const e=$(id);if(!e)return false;if(e.checked!==v){e.checked=v;ev(e,'change');}return true;};const val=(id,v)=>{const e=$(id);if(!e)return false;e.value=v;ev(e,'input');ev(e,'change');return true;};
  window.__events=[];window.addEventListener('dss:continuous-result',e=>{const d=e.detail;window.__events.push({kind:d.kind,mode:d.mode,limits:d.limits,area:d.p?.area,bw:d.p?.bw,ao:d.p?.ao,hmax:d.e?.hp?.h,qmax:d.e?.pout?.qo,remain:d.remain});});
  const o=c.outlet;chk('weirOn',/weir/.test(o));chk('oriOn',/ori/.test(o));chk('riserOn',/riser/.test(o));chk('pipeOn',false);if(/table/.test(o))val('coeffMode','table');
  const fi=['freeDischarge','freeTailwater','freeBackwater','freeSubmergence','freeOperation'];fi.forEach((id,k)=>chk(id,c.free==='all'||(c.free==='partial'&&k<3)||(c.free==='noBoundary'&&k>0)));
  val('freeEvidenceRecord',c.records!=='none'?'audit record':'');val('screeningLimitRecord',c.records==='both'?'audit basis':'');
  val('qallow',String(c.qallow));const h0=Number($('h0')?.value||0);val('hallow',String(c.hallowMode==='belowH0'?h0-0.05:c.hallowMode==='low'?h0+0.05:c.hallowMode==='normal'?1.0:3.0));
  val('qp',String((Number($('qp').value)*c.qpScale).toFixed(4)));
  return {h0,hallow:Number($('hallow').value),qallow:Number($('qallow').value),qp:Number($('qp').value),residualPct:Number($('residualPct').value),contAmin:Number($('contAmin').value),contAmax:Number($('contAmax').value),optBmin:Number($('optBmin').value),optBmax:Number($('optBmax').value),optAomin:Number($('optAomin').value),optAomax:Number($('optAomax').value),coeff:$('coeffMode')?.value};},c);
 await p.evaluate(()=>document.getElementById('run').click());await p.waitForTimeout(900);
 const before=await snap(p);
 const normal=await request(p);let forced=null;
 if(normal.wasDisabled){await p.evaluate(()=>{const b=document.getElementById('continuousGlobal');b.disabled=false;b.removeAttribute('aria-disabled');});forced=await request(p);}
 await p.close();return {...c,setup,before:{contDisabled:before.contDisabled,gateStatus:before.gateStatus,gateGuideText:before.gateGuideText,gateGuideFix:before.gateGuideFix,lang:before.lang},normal,forced,errs};}
(async()=>{const b=await chromium.launch();const res=[];const conc=5;let k=0;const T=Date.now();
 await Promise.all([...Array(conc)].map(async()=>{while(k<cases.length){const c=cases[k++];try{res.push(await one(b,c));}catch(e){res.push({...c,crash:e.message});}process.stdout.write('.');}}));
 await b.close();res.sort((a,b)=>a.i-b.i);fs.writeFileSync(out,JSON.stringify(res));console.log('\ndone',res.length,'wall s',((Date.now()-T)/1000).toFixed(0));})();
