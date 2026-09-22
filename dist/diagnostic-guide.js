/* UI-only diagnostic and correction guide.  It reads declared inputs and
   completed results; it never changes the routing or search definitions. */
(()=>{
  const by=id=>document.getElementById(id), num=id=>Number(by(id)?.value);
  const targets={inflow:['mod-inflow','points'],storage:['mod-storage','storageTable'],limits:['mod-optimization','hallow'],outlet:['mod-outlet','freeDischarge'],outletSize:['mod-outlet',()=>by('weirOn')?.checked?'bw':'ao'],routing:['mod-routing','run'],screen:['mod-optimization','qallow'],waterLimit:['mod-optimization','hallow'],drainLimit:['mod-optimization','residualPct'],evidence:['mod-evaluation','crossFile']};
  const zh=()=>document.documentElement.lang==='zh-Hant'||by('lang')?.textContent==='English';
  const copy=()=>zh()?({title:'結果驗證與修正建議',scope:'系統僅檢查輸入一致性、數值計算與已宣告限制；自由出流、回水、係數適用性及最終工程設計，仍須由使用者以圖說、現勘或工程計算佐證。',block:'阻擋',warn:'注意',pass:'通過',go:'前往修正',healthy:'目前沒有需修正的阻擋或注意項目。'}):({title:'Result verification and correction guide',scope:'The system checks only input consistency, numerical calculation, and declared limits. Free discharge, backwater, coefficient applicability, and final engineering design still require user evidence from drawings, field inspection, or engineering calculation.',block:'Blocking',warn:'Attention',pass:'Pass',go:'Go to correction',healthy:'No blocking or attention item is currently detected.'});
  function root(){let el=by('diagnosticGuide');if(el)return el;el=document.createElement('section');el.id='diagnosticGuide';el.className='module-card diagnostic-guide';el.innerHTML='<h2></h2><div class="diagnostic-list"></div><p class="diagnostic-scope"></p>';(by('mod-evaluation')||by('status')?.parentElement)?.appendChild(el);const s=document.createElement('style');s.textContent='.diagnostic-guide{margin-top:16px;border:1px solid #bfd1dc;border-radius:8px;padding:15px;background:#fff}.diagnostic-list{display:grid;gap:9px}.diagnostic-item{border-left:5px solid #166534;background:#f0fdf4;padding:10px}.diagnostic-item.warn{border-color:#e79a17;background:#fff8e7}.diagnostic-item.stop{border-color:#e11d48;background:#fff1f2}.diagnostic-item strong{display:block}.diagnostic-item button{margin-top:7px;border:1px solid #0b557d;border-radius:4px;background:#fff;color:#0b557d;padding:6px 9px;font-weight:700;cursor:pointer}.diagnostic-scope{font-size:13px;color:#526a78;margin:12px 0 0}.diagnostic-focus{outline:3px solid #e79a17!important;outline-offset:2px;background:#fff8e7!important}';document.head.appendChild(s);return el;}
  function add(a,status,reason,advice,target){a.push({status,reason,advice,target});}
  function tableBad(){if(by('storageMode')?.value!=='table')return false;const rows=(by('storageTable')?.value||'').trim().split(/\n+/).map(x=>x.trim().split(/[ ,;\t]+/).map(Number));return rows.length<2||rows.some((r,i)=>r.length<2||!Number.isFinite(r[0])||!Number.isFinite(r[1])||(i&& (r[0]<=rows[i-1][0]||r[1]<=rows[i-1][1])));}
  function freeOK(){return Boolean(by('freeDischarge')?.checked)&&['freeTailwater','freeBackwater','freeSubmergence','freeOperation'].every(id=>by(id)?.checked);}
  /* Both boxes may have content.  The screening advisory can be stale while a
     later continuous search writes its final result to optout, so inspect the
     combined completed-result text rather than choosing the first non-empty box. */
  function resultText(){return [by('designScreening')?.textContent,by('optout')?.textContent].filter(Boolean).join(' ').toLowerCase();}
  function noFeasible(){return /no feasible|無可行|not feasible|沒有可行/.test(resultText());}
  function dominantLimits(){const t=resultText(),r=[];
    if(/outflow|出流|qallow/.test(t))r.push({reason:zh()?'出流限制':'peak-outflow limit',target:'outletSize'});
    if(/water|水位|hallow/.test(t))r.push({reason:zh()?'最大水位限制':'maximum-water-level limit',target:'waterLimit'});
    if(/drain|residual|排空|殘留/.test(t))r.push({reason:zh()?'排空殘量限制':'drain-down residual limit',target:'drainLimit'});
    if(/stage-storage|storage boundary|s\(h\).*bound|蓄水.*邊界|蓄水.*範圍|曲線.*範圍/.test(t))r.push({reason:zh()?'S(H) 邊界／資料範圍限制':'S(H) boundary/data-range limit',target:'storage'});
    return r;
  }
  function collect(){const c=copy(),a=[],h0=num('h0'),ha=num('hallow'),qa=num('qallow');
    if(Number.isFinite(h0)&&Number.isFinite(ha)&&ha<h0)add(a,c.block,'Hallow < H0',zh()?'檢查水位基準與允許最高水位。':'Check the vertical datum and allowable maximum water level.','limits');
    if(!(qa>0))add(a,c.block,'Qallow ≤ 0',zh()?'輸入有效允許出流量。':'Enter a valid allowable peak outflow.','screen');
    if(!freeOK())add(a,c.block,zh()?'自由出流四項佐證未完成。':'All four free-discharge evidence checks are not complete.',zh()?'正式受限篩選與連續最佳化已阻擋；目前僅能探索性路由。':'Formal constrained screening and continuous optimization are blocked; routing is exploratory only.','outlet');
    if(tableBad()||last?.r?.stateExceeded)add(a,c.block,zh()?'S(H) 非遞增、重複，或水位超出蓄水量曲線範圍。':'S(H) is non-increasing/repeated, or the routed level exceeds its declared range.',zh()?'檢查單位、排序、重複資料，或補足曲線。':'Check units, ordering and duplicates, or extend the declared curve.','storage');
    if(last?.r?.vin>0&&Math.abs(last.r.residual)/last.r.vin>.005)add(a,c.warn,zh()?'質量平衡殘差過大。':'Mass-balance residual is too large.',zh()?'檢查入流歷線與時間單位、Qout(H) 與時間步長。':'Check the inflow hydrograph and time units, Qout(H), and time step.','routing');
    if(noFeasible()){
      const limits=dominantLimits(),advice=zh()?'在工程依據下檢討池面積、堰寬或開口面積，或補足 S(H) 資料；不得任意放寬 Qallow 或 Hallow 等設計標準。':'With engineering basis, review pond area, weir width, or opening area, or complete S(H) data; do not arbitrarily relax Qallow, Hallow, or other design standards.';
      (limits.length?limits:[{reason:zh()?'宣告的路由限制':'declared routing constraint',target:'screen'}]).forEach(x=>add(a,c.block,(zh()?'受限篩選／連續最佳化無可行解；主導限制：':'No feasible constrained-screening/continuous-optimization solution; dominant limit: ')+x.reason,advice,x.target));
    }
    const cross=by('crossOut')?.textContent||'';if(/not passed|未通過|不一致|fail/i.test(cross))add(a,c.warn,zh()?'與 HEC-HMS／SWMM 或公開基準案例比較不一致。':'The HEC-HMS/SWMM or public-benchmark comparison is inconsistent.',zh()?'逐項核對 Qin、H0、S(H)、Q(H)、係數、時間單位與時間步長；不可只比較洪峰。':'Check Qin, H0, S(H), Q(H), coefficients, time units, and time step item by item; do not compare only peak flow.','evidence');
    if(!a.length)add(a,c.pass,c.healthy,zh()?'仍請保留工程佐證與完整結果紀錄。':'Retain engineering evidence and the complete result record.','evidence');return a;}
  function go(key){const [mod,fieldSpec]=targets[key]||[],field=typeof fieldSpec==='function'?fieldSpec():fieldSpec;window.DSSWorkspacePages?.openTarget(mod);setTimeout(()=>{const el=by(field)||document.querySelector('#'+mod+' input, #'+mod+' textarea, #'+mod+' select');if(!el)return;document.querySelectorAll('.diagnostic-focus').forEach(x=>x.classList.remove('diagnostic-focus'));el.classList.add('diagnostic-focus');el.focus({preventScroll:true});el.scrollIntoView({behavior:'smooth',block:'center'});},40);}
  function render(){const c=copy(),el=root(),a=collect();el.querySelector('h2').textContent=c.title;el.querySelector('.diagnostic-scope').textContent=c.scope;el.querySelector('.diagnostic-list').innerHTML=a.map((x,i)=>`<div class="diagnostic-item ${x.status===c.block?'stop':x.status===c.warn?'warn':''}"><strong>${x.status} → ${x.reason}</strong><span>${x.advice}</span><br><button data-fix="${x.target}">${c.go}</button></div>`).join('');el.querySelectorAll('button[data-fix]').forEach(b=>b.onclick=()=>go(b.dataset.fix));}
  window.DSSDiagnostics=Object.freeze({render,go});
  ['run','optimize','continuousGlobal'].forEach(id=>by(id)?.addEventListener('click',()=>setTimeout(render,80)));
  /* Result boxes are updated after asynchronous continuous search completes.
     Observe them (never the guide itself) so final result state, not a stale
     pre-search state, drives the diagnostic cards. */
  const watchResultBoxes=()=>{const ids=['designScreening','optout','crossOut'],boxes=ids.map(by).filter(Boolean);if(!boxes.length){setTimeout(watchResultBoxes,120);return;}let queued=false,refresh=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;render();},0);};boxes.forEach(x=>new MutationObserver(refresh).observe(x,{subtree:true,childList:true,characterData:true}));};
  watchResultBoxes();setTimeout(render,160);
})();
