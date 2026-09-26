/* E-W1 A-005 is an isolated Paper II reproducibility check. It never changes the interactive design state. */
(() => {
  const qa=document.getElementById('qualityAssurance');
  const evaluation=document.getElementById('mod-evaluation');
  if(!qa||!evaluation||!window.DetentionRoutingCore)return;

  const ID='DSS_RK4_E_W1_A005',H0=0.07399,B=0.05,P=0.05,DT=0.25,G=9.80665,SENSITIVITY_DTS=[0.125,0.25,0.5];
  let current=null,sensitivity=null;
  const style=document.createElement('style');
  style.textContent='#ew1A005Benchmark,#ew1A005Export,#ew1A005ThreeEngine{margin-top:16px;border:1px solid #93b8cb;border-left:5px solid #0b557d;background:#f6fbfd;padding:14px;border-radius:7px}#ew1A005Benchmark h3,#ew1A005Export h3,#ew1A005ThreeEngine h3{margin:0 0 8px;color:#0b557d}.ew1-warning{font-weight:700;color:#7a4510}.ew1-equations{font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;background:#fff;border:1px solid #c8dbe5;border-radius:4px;padding:9px}.ew1-scope{margin:10px 0;background:#fff;border:1px solid #c8dbe5;border-radius:4px;padding:8px 10px;font-size:14px;line-height:1.55}.ew1-scope summary{cursor:pointer;font-weight:700;color:#0b557d}.ew1-scope ol{margin:8px 0 0;padding-left:1.35em}.ew1-scope li+li{margin-top:7px}.ew1-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ew1-actions button{font:inherit;border:1px solid #0b557d;background:#fff;color:#0b557d;border-radius:4px;padding:7px 10px;font-weight:700;cursor:pointer}.ew1-actions button:disabled{color:#71828d;border-color:#b9c8d0;cursor:not-allowed}.ew1-status{font-size:14px;margin:9px 0 0;color:#38536a}.ew1-status.warn{color:#9a5a00;font-weight:700}.ew1-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}.ew1-table th,.ew1-table td{border:1px solid #c8dbe5;padding:6px;text-align:right}.ew1-table th:first-child,.ew1-table td:first-child{text-align:left}.ew1-table th{background:#eaf4f8}.ew1-downloads{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.ew1-downloads button{font:inherit;border:1px solid #0b557d;background:#fff;color:#0b557d;border-radius:4px;padding:6px 9px;cursor:pointer}.ew1-chart{width:100%;height:auto;min-height:220px;background:#fff;border:1px solid #c8dbe5;border-radius:4px}.ew1-chart text{font:12px ui-sans-serif,system-ui,sans-serif;fill:#38536a}.ew1-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;margin:8px 0}.ew1-legend span::before{content:"";display:inline-block;width:12px;height:3px;margin:0 4px 3px 0;vertical-align:middle;background:var(--line)}.ew1-scroll{overflow-x:auto}.ew1-fixed-note{font-size:14px;color:#38536a}';
  document.head.appendChild(style);

  const entry=document.createElement('section');
  entry.id='ew1A005Benchmark';
  entry.innerHTML='<h3>E‑W1 A‑005 外部交叉驗算基準</h3><p>唯讀 Paper II 可重現驗證案例，非工程設計案例；不會改寫一般路由、受限篩選或最佳化的輸入與結果。</p><details class="ew1-scope"><summary>案例說明與適用界線</summary><ol><li><strong>案例定位：</strong>E‑W1 A‑005 是 Paper II 的唯讀、可重現數值驗證案例；不是實際工程設計案例。</li><li><strong>系統與事件：</strong>單一被動堰流；事件期間 0–977.25 s；初始絕對水位 H0 = 0.07399 m。</li><li><strong>固定計算依據：</strong>使用同一原始 Qin(t)、增量 S(H)、增量 Qout(H) 與 RK4。baseflow 只保留為原始資料來源佐證，不納入 Qin(t)。</li><li><strong>外部交叉驗算內容：</strong>同一固定案例與相同來源曲線下，DSS RK4（Δt = 0.25 s）、EPA SWMM 5.2.4 與 HEC‑HMS 4.13 比較歷線、峰值與質量守恆；HEC‑HMS 採 Modified Puls，頁面只呈現其已保存結果，不會即時呼叫 HEC 引擎。</li><li><strong>時間步敏感度內容：</strong>DSS 分別以 Δt = 0.125、0.250、0.500 s 真實重跑；0.125 s 僅是本測試的數值參考，不代表解析真解；比較 H、S、Qout 歷線、峰值與質量守恆殘差。</li><li><strong>已驗證與未驗證項目：</strong>已驗證：此固定案例與相同來源曲線下的跨引擎數值一致性與時間步敏感度。未驗證：現地實測校準、所有入流與出口條件的普遍驗證、降雨逕流、尾水、管渠、閘門、幫浦、豎井、圓管、複合出口與最終工程設計。</li><li><strong>工程責任界線：</strong>本案例不得取代個案水文、水理、結構安全、法規審查或專業工程設計驗證。</li></ol></details><details><summary>案例方程、時間步長與資料來源</summary><div class="ew1-equations">H0 = 0.07399 m; b = P = 0.05 m\nCd(H) = 0.63826 + 0.00139 × (H/P)\nQrating(H) = (2/3) × Cd(H) × b × √(2g) × H^(3/2)\nh = H − H0\nS(h) = 1.2 × [(H0+h+1.75)^2 − (H0+1.75)^2]\nq(h) = max[Qrating(H0+h) − Qrating(H0), 0]\n資料來源：E‑W1 A‑005 原始 Qin(t) 時間—流量記錄；RK4，Δt = 0.25 s。\nCSV 標頭或 baseflow 欄位不納入 Qin(t)。</div></details><p class="ew1-warning">僅供跨引擎比較，不構成現地實測校準、最終工程設計驗證或全域最優保證。</p><div class="ew1-actions"><button type="button" id="ew1A005Run">執行 E‑W1 A‑005 基準 RK4</button><button type="button" id="ew1A005SensitivityRun">時間步敏感度比較（0.125／0.250／0.500 s）</button></div><p id="ew1A005Status" class="ew1-status" role="status">尚未執行本輪基準。</p>';
  qa.insertAdjacentElement('afterend',entry);

  const savedBox=document.createElement('section');
  savedBox.id='ew1A005ThreeEngine';
  savedBox.innerHTML='<h3>三引擎已保存運行結果</h3><p class="ew1-fixed-note">固定案例的唯讀證據，與上方「本輪」DSS RK4 即時重跑結果明確分開；不會隨目前輸入改變，也不會在網站中呼叫 HEC‑HMS。</p><p id="ew1A005ThreeEngineStatus" class="ew1-status" role="status">正在載入已保存的三引擎對齊結果…</p><div id="ew1A005ThreeEngineContent" hidden></div>';
  entry.insertAdjacentElement('afterend',savedBox);

  const exportBox=document.createElement('section');
  exportBox.id='ew1A005Export';
  exportBox.innerHTML='<h3>E‑W1 A‑005 比較結果</h3><p class="meta">僅顯示本輪真實 RK4 基準結果；輸入變更或任何新 run 後會立即失效。</p><div class="ew1-actions"><button type="button" id="ew1A005Download" disabled>匯出 DSS comparison_results CSV</button></div><p id="ew1A005ExportStatus" class="ew1-status" role="status">尚無本輪 E‑W1 A‑005 結果。</p><section id="ew1A005Sensitivity" hidden><h3>時間步敏感度比較</h3><p class="ew1-warning">此為數值時間步敏感度，不是工程設計驗證。</p><div id="ew1A005SensitivityTable"></div><div id="ew1A005SensitivityDownloads" class="ew1-downloads"></div></section>';
  evaluation.appendChild(exportBox);

  const $=id=>document.getElementById(id);
  const SAVED_THREE_ENGINE={n:3910,start:0,end:977.25,dt:0.25,peaks:[['DSS RK4',0.00613899171944149,154.50],['EPA SWMM 5.2.4',0.0061447623,154.75],['HEC‑HMS 4.13',0.006138992544600883,154.50]],rmse:[['HEC–DSS',8.570849474787652e-9],['HEC–SWMM',2.3045975860596335e-6],['DSS–SWMM',2.304485905698044e-6]],series:[[0,0,0,0],[20,0.0000664149115,0.0000656696943,0.00006643617414],[40,0.000348225315,0.000346110855,0.0003482395719],[60,0.001005869438,0.00100197063,0.001005870534],[80,0.002159107202,0.00215385204,0.002159116052],[100,0.003639309576,0.00363448293,0.003639313095],[120,0.005038950567,0.00503780058,0.00503894476],[140,0.00592966371,0.005932801,0.005929667801],[153.75,0.006138455795,0.00614429038,0.006138456926],[154,0.006138618138,0.00614438381,0.006138619143],[154.25,0.006138846266,0.00614455974,0.006138847124],[154.5,0.006138991719,0.00614472694,0.006138992545],[154.75,0.006138955495,0.0061447623,0.006138956385],[155,0.006138771043,0.00614463221,0.006138772076],[155.25,0.006138537414,0.00614440345,0.00613853857],[155.5,0.006138254683,0.0061441258,0.006138256035],[155.75,0.006137809042,0.00614374207,0.006137810694],[156,0.006137152728,0.00614317105,0.006137154795],[156.25,0.006136368366,0.00614243108,0.00613637084],[156.5,0.006135570678,0.00614161996,0.006135573536],[156.75,0.006134792378,0.00614081146,0.006134795577],[157,0.006134049382,0.00614003089,0.006134052888],[157.25,0.006133340896,0.00613928525,0.006133344674],[157.5,0.006132683649,0.00613858239,0.006132687652],[157.75,0.006131931226,0.00613785771,0.006131935564],[158,0.006130937588,0.00613696495,0.00613094231],[158.25,0.00612967172,0.00613581506,0.006129676893],[158.5,0.006128200146,0.00613442549,0.006128205698],[158.75,0.006126557316,0.00613284734,0.006126563244],[160,0.006116916361,0.00612332122,0.006116922317],[180,0.005672713286,0.00568015996,0.005672718563],[200,0.004924403271,0.00493038824,0.004924398265],[220,0.004132786819,0.00413723974,0.004132794981],[240,0.003433378554,0.0034359283,0.003433378451],[260,0.002839528981,0.00284084963,0.002839532167],[280,0.002359060009,0.00235963213,0.002359070417],[300,0.001955935131,0.00195597429,0.001955945184],[320,0.001618338439,0.00161799315,0.001618348975],[340,0.001347127921,0.00134648551,0.001347137434],[360,0.001130532998,0.00112968813,0.00113052793],[380,0.0009578892326,0.000956992772,0.0009578798708],[400,0.0008187440706,0.000817844611,0.0008187401819],[420,0.0007054483598,0.000704569957,0.0007054541573],[440,0.000612822369,0.000612020922,0.0006128165661],[460,0.0005367327515,0.000535980143,0.0005367397921],[480,0.000471882954,0.000471203639,0.0004718879326],[500,0.0004201504754,0.000419531279,0.0004201620226],[520,0.0003791819771,0.00037860159,0.0003791933934],[540,0.0003423852634,0.000341869454,0.000342395411],[560,0.0003134131809,0.000312946868,0.0003134065121],[580,0.000289818068,0.000289390146,0.0002898246338],[600,0.0002719484811,0.00027159781,0.0002719437839],[620,0.0002546044697,0.000254303286,0.0002546145918],[640,0.0002411274784,0.000240842883,0.0002411200088],[660,0.0002291459284,0.000228914059,0.0002291462978],[680,0.0002201261285,0.000219903786,0.0002201359412],[700,0.0002117414948,0.000211544912,0.0002117488913],[720,0.0002050303314,0.000204847506,0.000205029223],[740,0.0001993461431,0.000199174988,0.0001993343843],[760,0.000196695208,0.000196540077,0.0001966787016],[780,0.0001921480805,0.000192022949,0.0001921445323],[800,0.0001876932171,0.00018760496,0.0001876983106],[820,0.0001847926452,0.000184724854,0.000184800707],[840,0.0001822999861,0.000182238578,0.0001823089782],[860,0.0001798728585,0.000179811182,0.0001798818096],[880,0.0001785523973,0.000178491741,0.0001785603249],[900,0.0001777053801,0.000177656007,0.0001777121633],[920,0.0001758857841,0.000175859791,0.0001758914989],[940,0.0001757377632,0.000175693067,0.0001757425065],[960,0.000175703592,0.000175673122,0.000175707547]]};
  function savedChart(rows){
    const w=760,h=270,left=52,right=18,top=18,bottom=34,max=Math.max(...rows.flatMap(r=>r.slice(1)))||1;
    const x=t=>left+(t/977.25)*(w-left-right),y=q=>top+(1-q/max)*(h-top-bottom),line=i=>rows.map(r=>x(r[0]).toFixed(2)+','+y(r[i]).toFixed(2)).join(' ');
    return '<svg class="ew1-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="DSS RK4、EPA SWMM 與 HEC-HMS 已保存出流歷線"><line x1="'+left+'" y1="'+(h-bottom)+'" x2="'+(w-right)+'" y2="'+(h-bottom)+'" stroke="#789"/><line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(h-bottom)+'" stroke="#789"/><polyline fill="none" stroke="#0b557d" stroke-width="1.8" points="'+line(1)+'"/><polyline fill="none" stroke="#bd6b00" stroke-width="1.4" points="'+line(2)+'"/><polyline fill="none" stroke="#207a4c" stroke-width="1.4" points="'+line(3)+'"/><text x="'+left+'" y="'+(h-10)+'">0 s</text><text x="'+(w-78)+'" y="'+(h-10)+'">977.25 s</text><text x="'+left+'" y="13">qout (m³/s)，最大 '+max.toExponential(3)+'</text></svg>';
  }
  function loadSavedThreeEngine(){
    const e=SAVED_THREE_ENGINE,status=$('ew1A005ThreeEngineStatus'),content=$('ew1A005ThreeEngineContent');
    const peakRows=e.peaks.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1].toFixed(8)+'</td><td>'+r[2].toFixed(2)+'</td></tr>').join('');
    const rmseRows=e.rmse.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1].toExponential(5)+'</td></tr>').join('');
    content.innerHTML='<p><strong>共同時間窗：</strong>'+e.start.toFixed(0)+'–'+e.end.toFixed(2)+' s；'+e.dt.toFixed(2)+' s 間距；'+e.n.toLocaleString('en-US')+' 個時點。</p><div class="ew1-scroll"><table class="ew1-table"><thead><tr><th>引擎</th><th>峰值出流（m³/s）</th><th>峰時（s）</th></tr></thead><tbody>'+peakRows+'</tbody></table><table class="ew1-table"><thead><tr><th>出流歷線配對</th><th>RMSE（m³/s）</th></tr></thead><tbody>'+rmseRows+'</tbody></table></div><p><strong>方法：</strong>HEC‑HMS 4.13 使用 Modified Puls。為配合一分鐘計算間隔，採體積守恆的時間／流量轉換：1 HEC 分鐘對應原始 0.25 秒，HEC 流量為原始流量的 1/240，輸出再換回原始尺度。</p><div class="ew1-legend"><span style="--line:#0b557d">DSS RK4</span><span style="--line:#bd6b00">EPA SWMM 5.2.4</span><span style="--line:#207a4c">HEC‑HMS 4.13</span></div>'+savedChart(e.series)+'<p class="ew1-warning">這是同一固定案例與相同來源曲線下的跨引擎數值一致性檢驗；不是現地實測校準、所有入流與出口條件的普遍驗證，也不是最終工程設計驗證。</p>';
    status.textContent='已顯示固定、已保存的 DSS RK4／EPA SWMM 5.2.4／HEC‑HMS 4.13 運行證據；圖為已保存對齊歷線的畫面抽樣呈現。';content.hidden=false;
  }
  const cd=H=>0.63826+0.00139*(H/P);
  const qRating=H=>(2/3)*cd(H)*B*Math.sqrt(2*G)*Math.pow(Math.max(H,0),1.5);
  const q0=qRating(H0);
  const storage=h=>1.2*(Math.pow(H0+Math.max(h,0)+1.75,2)-Math.pow(H0+1.75,2));
  const head=s=>Math.max(0,Math.sqrt(Math.max(s,0)/1.2+Math.pow(H0+1.75,2))-(H0+1.75));
  const qout=h=>Math.max(qRating(H0+Math.max(h,0))-q0,0);
  function invalidate(reason){
    if(!current&&!sensitivity)return;
    current=null;sensitivity=null;
    $('ew1A005Download').disabled=true;
    $('ew1A005ExportStatus').textContent=reason||'先前 E‑W1 A‑005 摘要已失效；請重新執行基準。';
    $('ew1A005ExportStatus').className='ew1-status warn';
    $('ew1A005Status').textContent='先前 E‑W1 A‑005 結果已失效。';
    $('ew1A005Status').className='ew1-status warn';
    $('ew1A005Sensitivity').hidden=true;
    $('ew1A005SensitivityTable').innerHTML='';
    $('ew1A005SensitivityDownloads').innerHTML='';
  }
  function interpolation(points,t){
    if(t<=points[0].t)return points[0].q;
    for(let i=1;i<points.length;i++)if(t<=points[i].t){const a=points[i-1],b=points[i];return a.q+(b.q-a.q)*(t-a.t)/(b.t-a.t);}
    return 0;
  }
  async function sourcePoints(){
    const response=await fetch('benchmarks/E-W1-A-005/inflow_timeseries.csv',{cache:'no-store'});
    if(!response.ok)throw Error('無法載入 E‑W1 A‑005 原始 Qin(t) 資料。');
    const lines=(await response.text()).trim().split(/\r?\n/);
    const header=lines.shift().trim();
    if(header!=='time_s,inflow_m3_s')throw Error('E‑W1 A‑005 Qin(t) 欄位不符合基準定義。');
    const points=lines.map(line=>{const [t,q]=line.split(',').map(Number);return {t,q};}).filter(x=>Number.isFinite(x.t)&&Number.isFinite(x.q));
    if(points.length<2||points.some((x,i)=>i&&x.t<=points[i-1].t))throw Error('E‑W1 A‑005 Qin(t) 時間序列無效。');
    return points;
  }
  function routeDataset(points,dt){
    // Preserve the released 0.125/0.250 s output contract.  The 0.500 s
    // sensitivity member must not land on Qin data nodes: its sole shortened
    // final step is the 0.250 s alignment step to the fixed event end.
    const options={tEnd:points.at(-1).t,dt,storage0:0,inflow:t=>interpolation(points,t),stageOfStorage:head,outflow:qout,tailSeconds:0,minStorage:0};
    if(dt!==0.5)options.landOn=points.map(x=>x.t);
    const r=window.DetentionRoutingCore.routeStorage(options);
    return {dt,executedAt:new Date().toISOString(),points,r,rows:r.rows.map(x=>({model:ID,time_s:x.t,relative_head_h_m:x.h,absolute_head_H_m:H0+x.h,storage_increment_m3:x.s,routed_outflow_m3_s:x.qo}))};
  }
  const peak=(rows,key)=>rows.reduce((best,row)=>row[key]>best[key]?row:best,rows[0]);
  const summary=data=>{const h=peak(data.rows,'relative_head_h_m'),s=peak(data.rows,'storage_increment_m3'),q=peak(data.rows,'routed_outflow_m3_s');return {n:data.rows.length,h,s,q,vin:data.r.vin,vout:data.r.vout,deltaS:data.r.finalStorage,residual:data.r.residual};};
  const timeKey=t=>Number(t).toFixed(9);
  function stepStats(rows){
    const steps=rows.slice(1).map((row,i)=>Number((row.time_s-rows[i].time_s).toFixed(9)));
    const counts={};steps.forEach(dt=>counts[dt]=(counts[dt]||0)+1);
    return {min:Math.min(...steps),max:Math.max(...steps),counts};
  }
  function errorStats(reference,trial,key){
    const refByTime=new Map(reference.rows.map(row=>[timeKey(row.time_s),row[key]]));
    const errors=trial.rows.map(row=>{
      const value=refByTime.get(timeKey(row.time_s));
      if(value===undefined)throw Error('共同輸出時刻缺少 0.125 s 真實參考結果。');
      return row[key]-value;
    });
    const abs=errors.map(Math.abs),n=errors.length;
    return {mae:abs.reduce((a,x)=>a+x,0)/n,rmse:Math.sqrt(errors.reduce((a,x)=>a+x*x,0)/n),max:Math.max(...abs)};
  }
  const metricCell=x=>'MAE '+fmt(x.mae)+'；RMSE '+fmt(x.rmse)+'；最大絕對差 '+fmt(x.max);
  function clearSensitivity(){sensitivity=null;$('ew1A005Sensitivity').hidden=true;$('ew1A005SensitivityTable').innerHTML='';$('ew1A005SensitivityDownloads').innerHTML='';}
  async function run(){
    const button=$('ew1A005Run');button.disabled=true;
    clearSensitivity();
    $('ew1A005Status').className='ew1-status';$('ew1A005Status').textContent='正在以權威 RK4 核心執行 E‑W1 A‑005（Δt = 0.25 s）…';
    try{
      const points=await sourcePoints();
      current=routeDataset(points,DT);
      $('ew1A005Download').disabled=false;
      $('ew1A005ExportStatus').className='ew1-status';
      $('ew1A005ExportStatus').textContent='本輪基準完成：'+current.rows.length+' 筆真實 RK4 結果；可匯出 comparison_results CSV。';
      $('ew1A005Status').className='ew1-status';$('ew1A005Status').textContent='E‑W1 A‑005 本輪完成：RK4，Δt = 0.25 s，未將任何標頭 baseflow 併入 Qin(t)。';
      window.DSSWorkspacePages?.openTarget('mod-evaluation');
    }catch(error){
      current=null;$('ew1A005Download').disabled=true;$('ew1A005Status').className='ew1-status warn';$('ew1A005Status').textContent='基準未完成：'+error.message;$('ew1A005ExportStatus').textContent='尚無可匯出的本輪基準結果。';
    }finally{button.disabled=false;}
  }
  function csv(data){
    const header='model,time_s,relative_head_h_m,absolute_head_H_m,storage_increment_m3,routed_outflow_m3_s';
    const number=x=>Number(x).toPrecision(15);
    return [header,...data.rows.map(x=>[x.model,number(x.time_s),number(x.relative_head_h_m),number(x.absolute_head_H_m),number(x.storage_increment_m3),number(x.routed_outflow_m3_s)].join(','))].join('\n');
  }
  function download(data,name){const url=URL.createObjectURL(new Blob([csv(data)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
  const fmt=x=>Number(x).toExponential(4),delta=(x,y)=>x-y;
  function renderSensitivity(){
    const reference=sensitivity['0.125'],base=summary(reference);
    const rows=SENSITIVITY_DTS.map(dt=>{const data=sensitivity[String(dt)],x=summary(data),steps=stepStats(data.rows),referenceRow=dt===0.125?'—':('H：'+metricCell(errorStats(reference,data,'relative_head_h_m'))+'<br>S：'+metricCell(errorStats(reference,data,'storage_increment_m3'))+'<br>Qout：'+metricCell(errorStats(reference,data,'routed_outflow_m3_s'))+'<br>峰值 ΔH/ΔS/Δq='+fmt(delta(x.h.relative_head_h_m,base.h.relative_head_h_m))+'/'+fmt(delta(x.s.storage_increment_m3,base.s.storage_increment_m3))+'/'+fmt(delta(x.q.routed_outflow_m3_s,base.q.routed_outflow_m3_s))+'；Δt(H/S/q)='+(x.h.time_s-base.h.time_s).toFixed(3)+'/'+(x.s.time_s-base.s.time_s).toFixed(3)+'/'+(x.q.time_s-base.q.time_s).toFixed(3)+' s');const stepText='min/max '+steps.min.toFixed(3)+'/'+steps.max.toFixed(3)+' s；'+Object.entries(steps.counts).map(([k,v])=>k+' s × '+v).join('，');return '<tr><td>'+dt.toFixed(3)+' s</td><td>'+x.n+'<br>'+stepText+(dt===0.5?'<br>最後補步：0.250 s（僅用於對齊事件終點）':'')+'</td><td>'+x.h.relative_head_h_m.toFixed(7)+' @ '+x.h.time_s.toFixed(3)+' s</td><td>'+x.s.storage_increment_m3.toFixed(7)+' @ '+x.s.time_s.toFixed(3)+' s</td><td>'+x.q.routed_outflow_m3_s.toExponential(5)+' @ '+x.q.time_s.toFixed(3)+' s</td><td>'+fmt(x.vin)+'</td><td>'+fmt(x.vout)+'</td><td>'+fmt(x.deltaS)+'</td><td>'+fmt(x.residual)+'</td><td>'+referenceRow+'</td></tr>';}).join('');
    $('ew1A005Sensitivity').hidden=false;
    $('ew1A005SensitivityTable').innerHTML='<p>0.125 s 為本敏感度測試的數值參考，不代表解析真解。完整序列差異僅以共同輸出時刻的真實 RK4 結果計算；不插值、平滑或重新取樣。</p><table class="ew1-table"><thead><tr><th>RK4 Δt</th><th>筆數／實際步長</th><th>最大 h（m）／時間</th><th>最大 S（m³）／時間</th><th>最大 qout（m³/s）／時間</th><th>入流體積（m³）</th><th>出流體積（m³）</th><th>儲量變化（m³）</th><th>質量殘差（m³）</th><th>相對 0.125 s：完整序列與峰值差異</th></tr></thead><tbody>'+rows+'</tbody></table>';
    $('ew1A005SensitivityDownloads').innerHTML=SENSITIVITY_DTS.map(dt=>'<button type="button" data-dt="'+dt+'">下載 comparison_results_dt'+(dt===0.125?'0125':dt===0.25?'0250':'0500')+'.csv</button>').join('');
    $('ew1A005SensitivityDownloads').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{const dt=Number(button.dataset.dt),suffix=dt===0.125?'dt0125':dt===0.25?'dt0250':'dt0500';download(sensitivity[String(dt)],'comparison_results_'+suffix+'.csv');}));
  }
  async function runSensitivity(){
    const button=$('ew1A005SensitivityRun');button.disabled=true;
    $('ew1A005Status').className='ew1-status';$('ew1A005Status').textContent='正在以同一原始 Qin(t) 與既有分段線性插值，分別執行 RK4 Δt = 0.125、0.250、0.500 s…';
    try{
      const points=await sourcePoints();
      const all=Object.fromEntries(SENSITIVITY_DTS.map(dt=>[String(dt),routeDataset(points,dt)]));
      sensitivity=all;current=all['0.25'];
      $('ew1A005Download').disabled=false;$('ew1A005ExportStatus').className='ew1-status';$('ew1A005ExportStatus').textContent='時間步敏感度比較完成；既有 0.250 s 基準與三組個別 comparison_results CSV 均為本輪真實 RK4 結果。';
      $('ew1A005Status').textContent='時間步敏感度比較完成：三組均各自重新計算；未重採樣、平滑或變更事件終點。';
      renderSensitivity();window.DSSWorkspacePages?.openTarget('mod-evaluation');
    }catch(error){clearSensitivity();current=null;$('ew1A005Download').disabled=true;$('ew1A005Status').className='ew1-status warn';$('ew1A005Status').textContent='時間步敏感度比較未完成：'+error.message;$('ew1A005ExportStatus').textContent='尚無可匯出的本輪基準結果。';
    }finally{button.disabled=false;}
  }
  $('ew1A005Run').addEventListener('click',run);
  $('ew1A005SensitivityRun').addEventListener('click',runSensitivity);
  $('ew1A005Download').addEventListener('click',()=>{if(current)download(current,'comparison_results.csv');});
  loadSavedThreeEngine();
  document.addEventListener('input',()=>invalidate(),true);
  document.addEventListener('change',()=>invalidate(),true);
  document.addEventListener('click',event=>{const id=event.target.closest('button')?.id;if(['run','optimize','continuousRun'].includes(id))invalidate('新 run 已開始；先前 E‑W1 A‑005 摘要已失效。');},true);
})();
