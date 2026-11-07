// Independent checks of the continuous-mode selected design (scenario A).
const {chromium}=require('playwright');const fs=require('fs');
const port=process.argv[2],out=process.argv[3];const A=346.875,B=0.3446759259259259;
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(`http://127.0.0.1:${port}/index.html`);await p.waitForTimeout(1500);await p.locator('#lang').click();await p.waitForTimeout(400);
 await p.evaluate(([A,B])=>{const $=id=>document.getElementById(id);const ev=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));const val=(id,v)=>{const e=$(id);e.value=v;ev(e,'input');ev(e,'change');};val('area',String(A));val('bw',String(B));},[A,B]);
 await p.click('#run');await p.waitForTimeout(1500);
 const ui=await p.evaluate(()=>({metrics:[...document.querySelectorAll('#metricbody tr')].map(r=>r.innerText.replace(/\s+/g,' ')),status:document.getElementById('status')?.innerText.slice(0,600)}));
 // Same authoritative core, called directly with the page's own physics (discrete/interactive routing path)
 const core=await p.evaluate(([A,B])=>{const C=window.DetentionRoutingCore;const qp=.12,a=1800,bb=1800,inflow=t=>t<=a?qp*t/a:t<=a+bb?qp*(1-(t-a)/bb):0;
   const r=C.routeStorage({tEnd:3600,dt:2,storage0:0,inflow,stageOfStorage:s=>Math.max(0,s)/A,outflow:h=>h>0?1.7*B*Math.pow(h,1.5):0,tailSeconds:Math.max(1800,1800,86400),minStorage:0,maxStorage:Infinity,sampleTimes:[3600+86400],landOn:[1800,3600]});
   const qmax=Math.max(...r.rows.map(z=>z.qo)),hmax=Math.max(...r.rows.map(z=>z.h)),smax=Math.max(...r.rows.map(z=>z.s)),sd=r.samples[0].s;return {qmax,hmax,smax,drainPct:100*sd/smax,residual:r.residual,relResPct:100*Math.abs(r.residual)/r.vin,vin:r.vin};},[A,B]);
 await b.close();
 // Fully independent integrator (own RK4, dt=0.5 s), no repo code
 const qp=.12,inflow=t=>t<=1800?qp*t/1800:t<=3600?qp*(1-(t-1800)/1800):0,out_=s=>{const h=s/A;return h>0?1.7*B*Math.pow(h,1.5):0;},f=(t,s)=>inflow(t)-out_(s);
 let t=0,s=0,dt=0.5,qmax=0,smax=0,vin=0,vout=0,sAtDrain=null;while(t<3600+86400-1e-9){const k1=f(t,s),k2=f(t+dt/2,s+k1*dt/2),k3=f(t+dt/2,s+k2*dt/2),k4=f(t+dt,s+k3*dt);const s1=Math.max(0,s+dt*(k1+2*k2+2*k3+k4)/6);vin+=(inflow(t)+inflow(t+dt))*dt/2;vout+=(out_(s)+out_(s1))*dt/2;s=s1;t+=dt;qmax=Math.max(qmax,out_(s));smax=Math.max(smax,s);}
 const indep={qmax,hmax:smax/A,smax,drainPct:100*s/smax,vin,vout,residual:vin-vout-s,dt};
 const res={design:{A,b:B},uiRun:ui,coreDirect:core,independentRK4:indep,errs};fs.writeFileSync(out,JSON.stringify(res,null,1));console.log(JSON.stringify(res,null,1));})();
