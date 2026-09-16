const g=9.80665;
function inflow(t,p){if(p.shape==='custom'){let a=p.points;if(t>a.at(-1)[0])return 0;for(let i=1;i<a.length;i++){if(t<=a[i][0]){let [t0,q0]=a[i-1],[t1,q1]=a[i];return q0+(q1-q0)*(t-t0)/(t1-t0)}}return 0}let T=p.dur*60;if(p.shape==='tri'){return t<=T/2?p.qp*2*t/T:t<=T?p.qp*2*(1-t/T):0}let r=.2*T;return t<r?p.qp*t/r:t<=T-r?p.qp:t<=T?p.qp*(T-t)/r:0}
function outflow(h,p){let q=0;if(p.weir&&h>p.crest)q+=p.cw*p.bw*Math.pow(h-p.crest,1.5);if(p.ori&&h>p.invert)q+=p.cd*p.ao*Math.sqrt(2*g*(h-p.invert));return q}
function route(p){let dt=2,T=p.dur*60+Math.max(1800,p.dur*30),h=p.h0,rows=[];let vin=0,vout=0;for(let t=0;t<=T;t+=dt){let qi=inflow(t,p),qo=outflow(h,p);rows.push({t,qi,qo,h,s:h*p.area});vin+=qi*dt;vout+=qo*dt;let f=(tt,hh)=>(inflow(tt,p)-outflow(Math.max(0,hh),p))/p.area;let k1=f(t,h),k2=f(t+dt/2,h+k1*dt/2),k3=f(t+dt/2,h+k2*dt/2),k4=f(t+dt,h+k3*dt);h=Math.max(0,h+dt*(k1+2*k2+2*k3+k4)/6)}return {rows,vin,vout,residual:vin-vout-rows.at(-1).s+rows[0].s}}
function peak(a,k){return a.reduce((m,x)=>x[k]>m[k]?x:m,a[0])}
const base={qp:.12,dur:60,shape:'tri',area:180,h0:0,weir:true,cw:1.7,bw:.2,crest:.25,ori:false,cd:.62,ao:.01,invert:.05};
const bottomOutlet=route({...base,crest:0});
if(!(bottomOutlet.rows[0].qo===0 && bottomOutlet.rows[1].qo>0))throw new Error('Bottom-outlet hydrograph must start at zero and rise immediately');
const cases={triangular:base,longDuration:{...base,shape:'long',dur:120},orifice:{...base,weir:false,ori:true},custom:{...base,shape:'custom',points:[[0,0],[1500,.1],[3000,.1],[4500,0]],dur:75,qp:.1}};
for(const [name,p] of Object.entries(cases)){const r=route(p),q=peak(r.rows,'qo').qo,relative=Math.abs(r.residual)/r.vin;if(!(q>0&&relative<.005))throw new Error(name+' routing test failed');console.log(name+': peak='+q.toFixed(6)+' m3/s; balance='+(100*relative).toFixed(4)+'%')}

/* Release guard: the interactive application may expose only one formal renderer and optimizer. */
const fs=require('fs');
const app=fs.readFileSync('dist/physics-refinement.js','utf8');
const count=(pattern)=>(app.match(pattern)||[]).length;
if(count(/function renderPhysical\(/g)!==1)throw new Error('Interactive app must declare exactly one authoritative renderPhysical function');
if(count(/function optimizePhysical\(/g)!==1)throw new Error('Interactive app must declare exactly one authoritative optimizePhysical function');
if(/setTimeout\(optimizePhysical/.test(app))throw new Error('Interactive app must not auto-run optimization during startup');
console.log('interactive authority guard: passed');
