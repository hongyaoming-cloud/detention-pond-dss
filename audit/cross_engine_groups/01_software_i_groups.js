/* Route the four group benchmarks (A/B/C/D-005) through the released Software I core
   with the same physics as regression_176.js, and write the routed series (dt = 0.1 s). */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const Core=require(path.join(ROOT,'dist','routing-core.js'));
const FX=path.join(ROOT,'tests','fixtures'),RAW=path.join(FX,'raw_hydrographs');
const src=fs.readFileSync(path.join(ROOT,'regression_176.js'),'utf8');
// Reuse the exact constants and outlet relation from the regression suite.
const pre=src.slice(src.indexOf('const G='),src.indexOf('function rerun'));
const ctx={};new Function('fs','path','FX','RAW','ctx',pre+';ctx.outlet=outlet;ctx.read=read;ctx.resolve=resolve;ctx.csv=csv;ctx.interp=interp;ctx.K2=K2;ctx.M=M;ctx.Z0=Z0;')(fs,path,FX,RAW,ctx);
const rows=ctx.csv(path.join(FX,'corrected_raw_case_metrics.csv'));
const out={};
for(const id of ['A-005','B-005','C-005','D-005']){
  const r=rows.find(x=>x.case_id===id||x['﻿case_id']===id);
  const i=ctx.read(ctx.resolve(r.group,r.inflow_source_filename)),o=ctx.read(ctx.resolve(r.group,r.outflow_source_filename));
  const size=Number(r.outlet_size_cm),control=r.outlet_control,h0=o.h0,q0=ctx.outlet(h0,control,size),end=i.t.at(-1);
  const series=[];
  Core.rk4Scalar({tEnd:end+Math.max(1800,3*end),dt:.1,y0:0,
    rhs:(t,h)=>(ctx.interp(t,i.t,i.q)-Math.max(ctx.outlet(h0+Math.max(h,0),control,size)-q0,0))/(ctx.K2*(h0+Math.max(h,0)+ctx.Z0)**ctx.M),
    onStep:(t,h)=>{const q=Math.max(ctx.outlet(h0+Math.max(h,0),control,size)-q0,0);series.push([t,h,q]);return q;},
    stop:(t,h,q)=>t>end&&h<1e-8&&q<1e-8});
  out[id]={control,size,h0,inflow:{t:i.t,q:i.q},series};
  const pk=series.reduce((m,x)=>x[2]>m[2]?x:m);console.log(id,control,size,'n',series.length,'qmax',pk[2],'t',pk[0]);
}
fs.writeFileSync(path.join(__dirname,'software_i_groups.json'),JSON.stringify(out));
