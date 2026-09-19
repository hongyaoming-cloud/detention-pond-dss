/* Authoritative first-principles time integrator shared by the interactive router and fixed regression suite. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DetentionRoutingCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function rk4Scalar({t0=0,tEnd,dt,y0,rhs,onStep,stop,landOn=[]}){
    let t=t0,y=y0;
    while(t<tEnd-1e-9){
      if(stop&&stop(t,y))break;
      const snapshot=onStep?onStep(t,y):undefined;
      const nextLand=landOn.find(x=>x>t+1e-9&&x<tEnd+1e-9);
      const step=Math.min(dt,tEnd-t,nextLand===undefined?Infinity:nextLand-t);
      const k1=rhs(t,y),k2=rhs(t+step/2,y+k1*step/2),k3=rhs(t+step/2,y+k2*step/2),k4=rhs(t+step,y+k3*step);
      y=Math.max(0,y+step*(k1+2*k2+2*k3+k4)/6);
      t+=step;
    }
    return {t,y};
  }
  function routeStorage({tEnd,dt,storage0,inflow,stageOfStorage,outflow,outflowComponents,onRow,tailSeconds=1800,minStorage=0,maxStorage=Infinity,sampleTimes=[],landOn=[]}){
    const rows=[];let stateExceeded=false;
    const totalTime=tEnd+tailSeconds;
    const boundedStorage=s=>Math.min(maxStorage,Math.max(minStorage,s));
    const snapshot=(t,s)=>{const sb=boundedStorage(s),h=stageOfStorage(sb),qi=inflow(t),qo=outflow(h),components=outflowComponents?outflowComponents(h):undefined,row={t,qi,qo,h,s:sb,components};rows.push(row);if(onRow)onRow(row);return row;};
    const requestedSamples=sampleTimes.filter(t=>Number.isFinite(t)&&t>=0&&t<=totalTime);
    const requestedLandings=[tEnd,...landOn,...requestedSamples].filter(t=>Number.isFinite(t)&&t>=0&&t<=totalTime).sort((a,b)=>a-b).filter((t,i,a)=>i===0||Math.abs(t-a[i-1])>1e-9);
    const result=rk4Scalar({
      tEnd:totalTime,dt,y0:storage0,
      rhs:(t,s)=>inflow(t)-outflow(stageOfStorage(boundedStorage(s))),
      stop:(t,s)=>{if(s>maxStorage+Math.max(1e-9,Math.abs(maxStorage)*1e-10)){stateExceeded=true;return true;}return false;},
      onStep:snapshot,landOn:requestedLandings
    });
    if(!stateExceeded&&result.t>=totalTime-1e-9)snapshot(totalTime,result.y);
    let vin=0,vout=0;
    for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],step=b.t-a.t;vin+=(a.qi+b.qi)*step/2;vout+=(a.qo+b.qo)*step/2;}
    const finalStorage=boundedStorage(result.y);
    const samples=requestedSamples.map(t=>rows.find(row=>Math.abs(row.t-t)<=1e-7)).filter(Boolean);
    return {rows,vin,vout,finalStorage,residual:vin-vout-finalStorage+storage0,stateExceeded,maxStorage,minStorage,samples};
  }
  /*
   * A vertical rectangular opening is a free-surface opening below its crown.
   * Above the crown, the incremental pressure-driven discharge is anchored to
   * the free-surface value at the crown.  This avoids a non-physical jump in
   * discharge when the governing regime switches while retaining the user's
   * Cw and Cd conventions.  It is an engineering transition relation, not a
   * substitute for a structure-specific calibration.
   */
  function rectangularOpeningDischarge({head,height,width,cw,cd,g=9.80665}){
    if(!(head>0&&height>0&&width>=0))return 0;
    const freeHead=Math.min(head,height);
    const qFree=cw*width*Math.pow(freeHead,1.5);
    if(head<=height)return qFree;
    const qAtCrown=cw*width*Math.pow(height,1.5);
    const area=width*height;
    const crownCentreHead=height/2;
    const centreHead=Math.max(crownCentreHead,head-height/2);
    return qAtCrown+cd*area*(Math.sqrt(2*g*centreHead)-Math.sqrt(2*g*crownCentreHead));
  }
  /* This is the only production time integrator.  Interactive routing,
     constrained search, and release tests must all call this same API. */
  return Object.freeze({version:'software-i-rk4-v1',authority:'DetentionRoutingCore.routeStorage',rk4Scalar,routeStorage,rectangularOpeningDischarge});
});
