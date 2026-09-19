/* Release-quality layer: documents the single runtime authority, keeps formal
   design inside the validated envelope, and provides an anonymized internal QA
   checklist. It neither changes inputs nor solves the hydraulic equations. */
(() => {
  const $=id=>document.getElementById(id), zh=()=>document.documentElement.lang==='zh-Hant';
  const text=()=>zh()?{
    title:'品質保證與內部操作測試',
    authority:'單一權威演算來源',
    authorityText:'所有互動路由、設計搜尋與固定回歸測試均以 DetentionRoutingCore.routeStorage（RK4；Δt = 2 s）為唯一時間積分器。教學與品質保證層不會改寫控制方程。',
    verified:'正式設計模式：已驗證範圍內',
    blocked:'正式設計模式：已鎖定',
    verifiedText:'已確認自由出流，且目前僅使用單一被動堰流或單一矩形孔口。可進行受限設計搜尋；仍須由工程師確認係數、基準面與適用條件。',
    blockedText:'目前設定含未驗證構造、複合出口、變動係數或未確認自由出流；路由僅供研究檢視，正式最佳化已鎖定。',
    qa:'研究團隊內部操作測試（不蒐集個人資料）',
    qaLead:'每位測試者以同一腳本逐項勾選。此紀錄用於開發品質保證，不代表學生或外部工程師的可用性研究。',
    run:'檢查目前執行狀態',download:'下載匿名 QA 紀錄',pass:'通過',fail:'待處理',
    tasks:['載入三角形示範，確認入流、出流、水位與蓄水圖均顯示。','改為長延時入流，確認系統提示寬峰／尖峰時間判讀限制。','輸入表列 S(H)，確認超出表列範圍時停止而非外插。','設定 Qallow、Hallow、Td 與殘留限制，確認 Te + Td 殘留被列出。','啟用單一堰流並確認自由出流，執行設計搜尋。','啟用矩形孔口，確認出流量於開口頂部轉換連續。','啟用豎井、圓管、複合出口或變動係數，確認正式最佳化被鎖定。','輸入不合理高程、非正 Qallow 或 Hallow < H0，確認系統阻擋執行。','下載可重現執行紀錄，確認包含輸入、判讀、Te + Td 與歷線。','匯入外部模型 CSV，確認結果只標示為數值交叉檢核，非現地驗證。'],
    current:'目前自動檢核：'
  }:{
    title:'Quality assurance and internal operation testing',
    authority:'Single authoritative calculation path',
    authorityText:'Interactive routing, design search, and fixed regression testing use DetentionRoutingCore.routeStorage (RK4; Δt = 2 s) as their sole time integrator. Teaching and QA layers never rewrite the governing equation.',
    verified:'Formal design mode: within validated envelope',
    blocked:'Formal design mode: locked',
    verifiedText:'Free discharge is confirmed and the setting uses one passive weir or one rectangular opening only. Constrained search is available; the engineer must still confirm coefficients, datum, and applicability.',
    blockedText:'The setting includes an unverified structure, compound outlet, variable coefficients, or unconfirmed free discharge. Routing is research inspection only and formal optimization is locked.',
    qa:'Research-team internal operation test (no personal data)',
    qaLead:'Each tester follows the same script and checks each item. This record is development quality assurance, not a student or external-engineer usability study.',
    run:'Check current run state',download:'Download anonymous QA record',pass:'Pass',fail:'Needs attention',
    tasks:['Load the triangular example and confirm inflow, outflow, water-level, and storage plots display.','Switch to long-duration inflow and confirm the broad-crest / peak-time interpretation notice.','Enter tabulated S(H) and confirm routing stops rather than extrapolating outside its declared range.','Set Qallow, Hallow, Td, and residual limit; confirm the Te + Td residual is reported.','Use one weir with confirmed free discharge and run the design search.','Enable the rectangular opening and confirm discharge is continuous at the crown transition.','Enable a riser, pipe, compound outlet, or variable coefficients and confirm formal optimization locks.','Enter inconsistent elevations, non-positive Qallow, or Hallow < H0 and confirm the system blocks the run.','Download the reproducible run record and confirm inputs, interpretation, Te + Td, and time series are present.','Import an external-model CSV and confirm it is labelled numerical cross-checking, not field validation.'],
    current:'Automatic check: '
  };
  const shell=document.getElementById('teachingAssistant')||document.querySelector('main.wrap'); if(!shell)return;
  const panel=document.createElement('section'); panel.id='qualityAssurance'; panel.className='panel'; shell.insertAdjacentElement(shell.id?'afterend':'afterbegin',panel);
  const style=document.createElement('style');style.textContent=`#qualityAssurance{margin:18px 0;border-top:5px solid #0b557d;background:#f6fbfd}.qa-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:16px}.qa-card{border:1px solid #bfd1dc;border-radius:7px;padding:13px;background:#fff}.qa-card h3{margin:0 0 7px}.qa-state{border-left:5px solid #166534;background:#f0fdf4;padding:10px;margin-top:10px}.qa-state.locked{border-color:#e79a17;background:#fff8e7}.qa-list{columns:2;gap:18px;padding-left:18px}.qa-list li{break-inside:avoid;margin:8px 0;font-size:14px}.qa-list input{width:auto;margin-right:7px}@media(max-width:850px){.qa-grid{grid-template-columns:1fr}.qa-list{columns:1}}`;document.head.appendChild(style);
  function formalDesignAllowed(){return Boolean($('freeDischarge')?.checked)&&!$('riserOn')?.checked&&!$('pipeOn')?.checked&&$('coeffMode')?.value!=='table'&&!($('weirOn')?.checked&&$('oriOn')?.checked)&&($('weirOn')?.checked||$('oriOn')?.checked);}
  function autoChecks(){const p=[];p.push(['authoritative_core',Boolean(window.DetentionRoutingCore?.routeStorage&&window.DetentionRoutingCore.authority)]);p.push(['design_constraint_inputs',Number($('qallow')?.value)>0&&Number($('hallow')?.value)>=Number($('h0')?.value)]);p.push(['research_mode_locked',formalDesignAllowed()||Boolean($('optimize')?.disabled)]);p.push(['teaching_support_loaded',Boolean(document.getElementById('teachingAssistant'))]);return p;}
  function render(){const t=text(),allowed=formalDesignAllowed();panel.innerHTML=`<h2>${t.title}</h2><div class="qa-grid"><div class="qa-card"><h3>${t.authority}</h3><p class="meta">${t.authorityText}</p><div class="qa-state ${allowed?'':'locked'}"><strong>${allowed?t.verified:t.blocked}</strong><span id="qaDesignText">${allowed?t.verifiedText:t.blockedText}</span></div><button id="qaRun" class="report">${t.run}</button><div id="qaAuto" class="meta"></div></div><div class="qa-card"><h3>${t.qa}</h3><p class="meta">${t.qaLead}</p><ol class="qa-list">${t.tasks.map((x,i)=>`<li><label><input type="checkbox" data-qa-task="${i}">${x}</label></li>`).join('')}</ol><button id="qaDownload" class="report">${t.download}</button></div></div>`;
    const show=()=>{const checks=autoChecks(),n=checks.filter(([,ok])=>ok).length;panel.querySelector('#qaAuto').textContent=t.current+`${n}/${checks.length} ${t.pass} — `+checks.map(([k,ok])=>`${k}: ${ok?t.pass:t.fail}`).join('; ');};
    panel.querySelector('#qaRun').onclick=show;show();
    panel.querySelector('#qaDownload').onclick=()=>{const checks=autoChecks(),record={record_type:'internal_developer_quality_assurance',timestamp_utc:new Date().toISOString(),calculator_authority:window.DetentionRoutingCore?.authority||null,automated_checks:Object.fromEntries(checks),manual_tasks:[...panel.querySelectorAll('[data-qa-task]')].map(x=>({task:Number(x.dataset.qaTask)+1,passed:x.checked})),scope:'Internal functional QA only; no respondent identity, learning outcome, or external usability claim.'};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));a.download='detention-pond-internal-qa-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);};
  }
  render();
  ['weirOn','oriOn','riserOn','pipeOn','coeffMode','freeDischarge','qallow','hallow','h0'].forEach(id=>$(id)?.addEventListener(id==='qallow'||id==='hallow'||id==='h0'?'input':'change',()=>setTimeout(render,0)));
  $('lang')?.addEventListener('click',()=>setTimeout(render,0));
  window.DSSAuthority=Object.freeze({router:'DetentionRoutingCore.routeStorage',render:()=>window.__dssAuthoritativeRender?.(),validatedDesign:formalDesignAllowed});
})();
