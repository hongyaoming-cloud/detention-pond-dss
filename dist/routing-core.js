/* Authoritative first-principles time integrator shared by the interactive router and fixed regression suite. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DetentionRoutingCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function rk4Scalar({t0=0,tEnd,dt,y0,rhs,onStep,stop}){
    let t=t0,y=y0;
    while(t<=tEnd+1e-9){
      if(stop&&stop(t,y))break;
      const snapshot=onStep?onStep(t,y):undefined;
      const k1=rhs(t,y),k2=rhs(t+dt/2,y+k1*dt/2),k3=rhs(t+dt/2,y+k2*dt/2),k4=rhs(t+dt,y+k3*dt);
      y=Math.max(0,y+dt*(k1+2*k2+2*k3+k4)/6);
      t+=dt;
    }
    return {t,y};
  }
  function routeStorage({tEnd,dt,storage0,inflow,stageOfStorage,outflow,outflowComponents,onRow,tailSeconds=1800,maxStorage=Infinity}){
    const rows=[];let vin=0,vout=0,stateExceeded=false;
    const result=rk4Scalar({
      tEnd:tEnd+tailSeconds,dt,y0:storage0,
      rhs:(t,s)=>inflow(t)-outflow(stageOfStorage(Math.max(0,s))),
      stop:(t,s)=>{if(s>maxStorage+Math.max(1e-9,Math.abs(maxStorage)*1e-10)){stateExceeded=true;return true;}return false;},
      onStep:(t,s)=>{const h=stageOfStorage(s),qi=inflow(t),qo=outflow(h),components=outflowComponents?outflowComponents(h):undefined,row={t,qi,qo,h,s,components};rows.push(row);vin+=qi*dt;vout+=qo*dt;if(onRow)onRow(row);return row;}
    });
    return {rows,vin,vout,finalStorage:result.y,residual:vin-vout-result.y+storage0,stateExceeded,maxStorage};
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
  return {version:'software-i-rk4-v1',rk4Scalar,routeStorage,rectangularOpeningDischarge};
});
