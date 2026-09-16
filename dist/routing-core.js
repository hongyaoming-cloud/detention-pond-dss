/* Authoritative first-principles time integrator shared by the interactive router and fixed regression suite. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DetentionRoutingCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function rk4Scalar({t0=0,tEnd,dt,y0,rhs,onStep,stop}){
    let t=t0,y=y0;
    while(t<=tEnd+1e-9){
      const snapshot=onStep?onStep(t,y):undefined;
      if(stop&&stop(t,y,snapshot))break;
      const k1=rhs(t,y),k2=rhs(t+dt/2,y+k1*dt/2),k3=rhs(t+dt/2,y+k2*dt/2),k4=rhs(t+dt,y+k3*dt);
      y=Math.max(0,y+dt*(k1+2*k2+2*k3+k4)/6);
      t+=dt;
    }
    return {t,y};
  }
  function routeStorage({tEnd,dt,storage0,inflow,stageOfStorage,outflow,onRow,tailSeconds=1800}){
    const rows=[];let vin=0,vout=0;
    const result=rk4Scalar({
      tEnd:tEnd+tailSeconds,dt,y0:storage0,
      rhs:(t,s)=>inflow(t)-outflow(stageOfStorage(Math.max(0,s))),
      onStep:(t,s)=>{const h=stageOfStorage(s),qi=inflow(t),qo=outflow(h),row={t,qi,qo,h,s};rows.push(row);vin+=qi*dt;vout+=qo*dt;if(onRow)onRow(row);return row;}
    });
    return {rows,vin,vout,finalStorage:result.y,residual:vin-vout-result.y+storage0};
  }
  return {version:'software-i-rk4-v1',rk4Scalar,routeStorage};
});
