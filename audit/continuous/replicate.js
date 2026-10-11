// Node re-implementation of continuousNumericalSearch (physics-refinement.js:222-231) for the default event,
// weir-only, using routing-core.js. Arg: qallow (default 0.08). Used to confirm algorithm description and counts.
const C=require(require('path').join(__dirname,'..','..','dist','routing-core.js'));const fs=require('fs');
const qlim=+(process.argv[2]||0.08),hlim=1.0,drainLimit=0.01,a0=60,a1=600,x0=0.05,x1=1.0,cw=1.7,qp=.12;
const inflow=t=>t<=1800?qp*t/1800:t<=3600?qp*(1-(t-1800)/1800):0;
function route(A,b){const r=C.routeStorage({tEnd:3600,dt:2,storage0:0,inflow,stageOfStorage:s=>Math.max(0,s)/A,outflow:h=>h>0?cw*b*Math.pow(h,1.5):0,tailSeconds:86400,minStorage:0,maxStorage:Infinity,sampleTimes:[90000],landOn:[1800,3600]});
 return {qmax:r.rows.reduce((m,z)=>Math.max(m,z.qo),0),hmax:r.rows.reduce((m,z)=>Math.max(m,z.h),0),smax:r.rows.reduce((m,z)=>Math.max(m,z.s),0),drain:r.samples[0].s,rel:Math.abs(r.residual)/r.vin};}
const radical=(n,base)=>{let v=0,f=1/base;while(n){v+=f*(n%base);n=Math.floor(n/base);f/=base;}return v;},map=(a,b,u)=>a+u*(b-a),rows=[];let ev=0;const fail={outflow:0,level:0,drain:0,mass:0};
const check=(A,x,phase)=>{ev++;const z=route(A,x),s=Math.max(0,z.smax),rem=Math.max(0,z.drain)/Math.max(s,1e-12),ok=qlim-z.qmax>=-1e-10&&hlim-z.hmax>=-1e-10&&drainLimit-rem>=-1e-10&&z.rel<=.005;if(!ok){if(z.qmax>qlim)fail.outflow++;if(z.hmax>hlim)fail.level++;if(rem>drainLimit)fail.drain++;if(z.rel>.005)fail.mass++;}rows.push({A,x,s,h:z.hmax,q:z.qmax,rem,rel:z.rel,ok,phase});};
for(const u of [0,1])for(const v of [0,1])check(map(a0,a1,u),map(x0,x1,v),'discrete-grid');
for(let i=1;i<=72;i++)check(map(a0,a1,radical(i,2)),map(x0,x1,radical(i,3)),'global');
const pareto=()=>rows.filter(r=>r.ok).filter(a=>!rows.some(b=>b.ok&&b!==a&&b.s<=a.s&&b.h<=a.h&&b.q<=a.q&&(b.s<a.s||b.h<a.h||b.q<a.q)));
let front=pareto();const frontAfterGlobal=front.length;for(let pass=0;pass<2&&front.length;pass++){for(const c of front.slice(0,8))for(const u of [-1,0,1])for(const v of [-1,0,1])check(Math.max(a0,Math.min(a1,c.A+u*(a1-a0)/Math.pow(8,pass+1))),Math.max(x0,Math.min(x1,c.x+v*(x1-x0)/Math.pow(8,pass+1))),'local-'+(pass+1));front=pareto();}
const uniq=new Set(rows.map(r=>r.A.toFixed(9)+','+r.x.toFixed(9))).size,uniqFront=new Set(front.map(r=>r.A.toFixed(9)+','+r.x.toFixed(9))).size;
const chosen=front.slice().sort((a,b)=>a.s-b.s||a.h-b.h||a.q-b.q)[0];
const out={qallow:qlim,evaluated:ev,uniqueEvaluated:uniq,feasible:rows.filter(r=>r.ok).length,frontAfterGlobal,front:front.length,uniqueFront:uniqFront,fail,chosen,chosenPhase:chosen?.phase,firstFrontRowShownInTable:front[0],maxMassRelResidualPct:100*Math.max(...rows.map(r=>r.rel))};
console.log(JSON.stringify(out,null,1));if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(out,null,1));
