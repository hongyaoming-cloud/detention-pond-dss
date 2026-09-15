/* First-principles refinement. State is storage S; water level is recovered from S(H). */
(() => {
  const $ = id => document.getElementById(id);
  const physical = document.createElement('div');
  physical.id = 'storagePanel';
  physical.innerHTML = `<label>Storage representation</label>
    <select id="storageMode"><option value="constant">Constant plan area: S(H) = A H</option><option value="table">Tabulated stage-storage relation S(H)</option></select>
    <div id="storageTableBox" class="hide"><label>Stage-storage table (water level m, storage m3; one pair per line)</label><textarea id="storageTable" rows="5">0, 0
0.50, 90
1.00, 180</textarea><div class="meta">Levels and storage must increase from 0. The highest listed level is a hard physical boundary.</div></div>
    <div class="meta">State equation: dS/dt = Qin - Qout(H); H is recovered from the declared S(H).</div>`;
  document.querySelector('h3:nth-of-type(2)').insertAdjacentElement('afterend', physical);

  function pairs() {
    if ($('storageMode').value === 'constant') return null;
    const a = $('storageTable').value.trim().split(/\n+/).map(x => x.trim().split(/[ ,;\t]+/).map(Number));
    if (a.length < 2 || a.some(x => x.length < 2 || !Number.isFinite(x[0]) || !Number.isFinite(x[1])) || a[0][0] !== 0 || a[0][1] !== 0 || a.some((x,i) => i && (x[0] <= a[i-1][0] || x[1] <= a[i-1][1]))) throw new Error('Stage-storage table must begin at 0, 0 and increase strictly.');
    return a;
  }
  function interpolate(x, a, xi, yi) {
    if (x < a[0][xi]-1e-9 || x > a.at(-1)[xi]+1e-9) throw new Error('The routed state exceeded the declared stage-storage range. Extend S(H) before using this event.');
    for (let i=1;i<a.length;i++) if (x <= a[i][xi]) { const r=(x-a[i-1][xi])/(a[i][xi]-a[i-1][xi]); return a[i-1][yi]+r*(a[i][yi]-a[i-1][yi]); }
    return a.at(-1)[yi];
  }
  function sOfH(h,p) { return p.storageMode==='constant' ? p.area*h : interpolate(h,p.table,0,1); }
  function hOfS(s,p) { return p.storageMode==='constant' ? s/p.area : interpolate(s,p.table,1,0); }
  function routePhysical(p) {
    const dt=2, T=p.dur*60+Math.max(1800,p.dur*30), s0=sOfH(p.h0,p); let s=s0, vin=0,vout=0; const rows=[];
    const rhs=(t,ss)=>inflow(t,p)-outflow(hOfS(Math.max(0,ss),p),p);
    for(let t=0;t<=T;t+=dt) { const h=hOfS(s,p), qi=inflow(t,p), qo=outflow(h,p); rows.push({t,qi,qo,h,s}); vin+=qi*dt;vout+=qo*dt; const k1=rhs(t,s),k2=rhs(t+dt/2,s+k1*dt/2),k3=rhs(t+dt/2,s+k2*dt/2),k4=rhs(t+dt,s+k3*dt);s=Math.max(0,s+dt*(k1+2*k2+2*k3+k4)/6); }
    return {rows,vin,vout,residual:vin-vout-rows.at(-1).s+s0};
  }
  function readInputs() {
    const p={qp:num('qp'),dur:num('dur'),shape:$('shape').value,area:num('area'),h0:num('h0'),weir:$('weirOn').checked,cw:num('cw'),bw:num('bw'),crest:num('crest'),ori:$('oriOn').checked,cd:num('cd'),ao:num('ao'),invert:num('invert'),storageMode:$('storageMode').value,tpeak:num('tpeak'),recess:num('recess'),rise:num('rise'),plateau:num('plateau')};
    if(p.storageMode==='table')p.table=pairs();
    if(p.shape==='custom'){p.points=parsePoints();p.dur=p.points.at(-1)[0]/60;p.qp=Math.max(...p.points.map(x=>x[1]));}
    if(!(p.qp>0&&p.dur>0&&p.h0>=0&&(p.weir||p.ori)&&p.cw>=0&&p.cd>=0&&p.bw>=0&&p.ao>=0&&p.crest>=0&&p.invert>=0&&(p.storageMode==='table'||p.area>0))) throw new Error('Enter physically valid non-negative geometry and at least one outlet.');
    return p;
  }
  function updateDecision() {
    if(!last)return; const {p,r,e}=last, rs=e.hp.s/Math.max(r.vin,1e-12), tp=num('tpeak'),tr=num('recess');
    $('piout').innerHTML='RQ = '+e.qratio.toFixed(3)+' (peak ratio); RS = '+rs.toFixed(3)+' (storage ratio); RT = '+e.lag.toFixed(3)+' (normalized lag); Tp/Tr = '+(tp/tr).toFixed(3)+'; outlet scale b/√A = '+(p.bw/Math.sqrt(p.area)).toFixed(4)+'. These are response descriptors, not universal design equations.';
  }
  function renderPhysical() {
    syncTimes();
    try {
      const p=readInputs(),r=routePhysical(p),e=evaluate(p,r); if(p.shape==='custom'&&e.status==='ok'){e.status='warn';e.title='Independent verification required';e.text='The imported event was routed successfully. Confirm its dimensionless response and input assumptions before design use.';} last={p,r,e};
      const dm=num('displayMin');let shown=(!Number.isFinite(dm)||dm<=0)?r.rows:r.rows.filter(z=>z.t<=dm*60);if(shown.length<2)shown=r.rows.slice(0,2);
      draw('qchart',shown,['qi','qo'],['#2563eb','#c2410c'],['Inflow','Routed outflow'],'Discharge (m3/s)');draw('hchart',shown,['h','s'],['#15803d','#7c3aed'],['Water level (m)','Storage (m3)'],'Level / storage');
      const rs=e.hp.s/Math.max(r.vin,1e-12),m=[['Peak inflow Qp,i',e.pin.qi.toFixed(4)+' m3/s','Declared hydraulic loading'],['Peak outflow Qp,o',e.pout.qo.toFixed(4)+' m3/s','Sum of active outlet components'],['Peak ratio RQ = Qp,o/Qp,i',e.qratio.toFixed(3),'Peak attenuation descriptor'],['Storage ratio RS = Smax/Vin',rs.toFixed(3),'Required event storage relative to inflow volume'],['Normalized lag RT',e.lag.toFixed(3),'(tp,o - tp,i) / event duration'],['Peak water level Hmax',e.hp.h.toFixed(3)+' m','Compare with allowable level and freeboard'],['Mass-balance residual',(100*r.residual/Math.max(r.vin,1)).toFixed(3)+' %','Numerical conservation check']];
      $('metricbody').innerHTML=m.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join('');const st=$('status');st.className='status '+e.status;st.innerHTML=`<strong>${e.title}</strong>${e.text}`;$('runmeta').textContent='State routing in S; RK4; Δt = 2 s; '+r.rows.length+' steps';updateDecision();
    } catch(err) { const st=$('status');st.className='status stop';st.innerHTML='<strong>Do not use until physical inputs are resolved</strong>'+err.message; }
  }
  function optimizePhysical() {
    renderPhysical(); if(!last)return;
    if(last.p.storageMode!=='constant'){const o=$('optout');o.className='status warn';o.textContent='The present area-width discrete search is defined only for a constant-area S(H) representation. For a tabulated basin, declare a compatible design-variable parameterization before optimization.';return;}
    const qlim=num('qallow'),hlim=num('hallow');let best=null;
    for(let A=60;A<=600;A+=10)for(let b=.05;b<=1.0001;b+=.05){const p={...last.p,area:A,bw:+b.toFixed(2)},r=routePhysical(p),e=evaluate(p,r);if(e.pout.qo<=qlim&&e.hp.h<=hlim&&Math.abs(r.residual)/Math.max(r.vin,1)<=.005&&(!best||A<best.p.area||(A===best.p.area&&b<best.p.bw)))best={p,r,e};}
    const o=$('optout');o.classList.remove('hide');if(!best){o.className='status warn';o.textContent='No feasible solution was found within the declared physical bounds and discrete search domain.';return;}const rs=best.e.hp.s/Math.max(best.r.vin,1e-12);o.className='status';o.innerHTML='<strong>Discrete constrained optimum</strong>Area A = '+best.p.area.toFixed(0)+' m2; weir width b = '+best.p.bw.toFixed(2)+' m; peak outflow = '+best.e.pout.qo.toFixed(4)+' m3/s; peak level = '+best.e.hp.h.toFixed(3)+' m; RQ = '+best.e.qratio.toFixed(3)+'; RS = '+rs.toFixed(3)+'.';
  }
  $('storageMode').addEventListener('change',()=>{$('storageTableBox').classList.toggle('hide',$('storageMode').value!=='table');renderPhysical();});$('storageTable').addEventListener('change',renderPhysical);$('run').onclick=renderPhysical;$('optimize').onclick=optimizePhysical;$('displayMin').addEventListener('input',renderPhysical);renderPhysical();
})();
