#!/usr/bin/env node
/* Reconstruct the Software I (DSS RK4) E-W1 A-005 reference series by calling
   the released routing core exactly as dist/ew1-a005-benchmark.js does
   (dt = 0.25 s, landOn = Qin nodes, storage0 = 0, tailSeconds = 0).
   Also exports the incremental S(h) and Qout(h) tables (h = 0..0.160 m,
   0.001 m step), which equal the EPA SWMM / HEC-HMS curve tables. Read-only use of the repo. */
const fs=require('fs'),path=require('path');
const CORE=process.argv[2]||path.join(__dirname,'..','..','..','dist','routing-core.js');
const OUT=process.argv[3]||path.join(__dirname,'..','data');
const core=require(CORE);
const ID='DSS_RK4_E_W1_A005',H0=0.07399,B=0.05,P=0.05,G=9.80665,DT=0.25;
const cd=H=>0.63826+0.00139*(H/P);
const qRating=H=>(2/3)*cd(H)*B*Math.sqrt(2*G)*Math.pow(Math.max(H,0),1.5);
const q0=qRating(H0);
const storage=h=>1.2*(Math.pow(H0+Math.max(h,0)+1.75,2)-Math.pow(H0+1.75,2));
const head=s=>Math.max(0,Math.sqrt(Math.max(s,0)/1.2+Math.pow(H0+1.75,2))-(H0+1.75));
const qout=h=>Math.max(qRating(H0+Math.max(h,0))-q0,0);
const lines=fs.readFileSync(path.join(OUT,'inflow_timeseries.csv'),'utf8').trim().split(/\r?\n/);
if(lines.shift().trim()!=='time_s,inflow_m3_s')throw Error('bad header');
const points=lines.map(l=>{const [t,q]=l.split(',').map(Number);return {t,q};});
function interpolation(t){if(t<=points[0].t)return points[0].q;for(let i=1;i<points.length;i++)if(t<=points[i].t){const a=points[i-1],b=points[i];return a.q+(b.q-a.q)*(t-a.t)/(b.t-a.t);}return 0;}
const r=core.routeStorage({tEnd:points.at(-1).t,dt:DT,storage0:0,inflow:interpolation,stageOfStorage:head,outflow:qout,tailSeconds:0,minStorage:0,landOn:points.map(x=>x.t)});
const f=x=>Number(x).toPrecision(17);
const csv=['model,time_s,inflow_m3_s,relative_head_h_m,absolute_head_H_m,storage_increment_m3,routed_outflow_m3_s',
 ...r.rows.map(x=>[ID,f(x.t),f(x.qi),f(x.h),f(H0+x.h),f(x.s),f(x.qo)].join(','))].join('\n')+'\n';
fs.writeFileSync(path.join(OUT,'software_i_reference_dt0p25.csv'),csv);
const tab=['h_rel_m,H_abs_m,storage_increment_m3,outflow_increment_m3_s'];
for(let i=0;i<=160;i++){const h=i/1000;tab.push([h.toFixed(3),f(H0+h),f(storage(h)),f(qout(h))].join(','));}
fs.writeFileSync(path.join(OUT,'incremental_tables_h0p001.csv'),tab.join('\n')+'\n');
fs.writeFileSync(path.join(OUT,'software_i_run_meta.json'),JSON.stringify({core:path.relative(path.join(__dirname,'..','..','..'),CORE).split(path.sep).join('/'),coreVersion:core.version,n:r.rows.length,vin:r.vin,vout:r.vout,finalStorage:r.finalStorage,residual:r.residual,H0,dt:DT},null,2));
console.log(core.version,r.rows.length,'rows; residual',r.residual);
