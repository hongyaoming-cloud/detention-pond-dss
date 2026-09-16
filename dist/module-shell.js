/* Software I modular shell: explicit first-principles boundaries and future interfaces. */
(() => {
  const grid=document.querySelector('.grid');
  const workspace=grid?.querySelector(':scope > .panel:first-child');
  const evaluation=grid?.querySelector(':scope > .panel:nth-child(2)');
  if(!grid||!workspace||!evaluation)return;

  const nav=document.createElement('aside');
  nav.className='panel module-nav';
  nav.innerHTML='<div id="moduleNavContent"></div>';
  grid.insertBefore(nav,workspace);
  workspace.classList.add('module-workspace');
  workspace.querySelector('h2').id='mod-inflow';
  workspace.querySelector('h2').textContent='Software I modular workspace';
  const heads=workspace.querySelectorAll('h3');
  if(heads[0])heads[0].id='mod-inflow-detail';
  if(heads[1])heads[1].id='mod-storage';
  if(heads[2])heads[2].id='mod-outlet';
  const dss=document.getElementById('optimize')?.closest('section');
  if(dss){dss.id='mod-optimization';dss.classList.add('module-subpanel');}
  evaluation.id='mod-evaluation';
  evaluation.classList.add('module-subpanel');
  workspace.appendChild(evaluation);

  const contract=document.createElement('section');
  contract.className='principle-contract';
  contract.innerHTML='<strong id="principleTitle"></strong><div id="principleSteps"></div><p id="principleScope"></p>';
  workspace.insertBefore(contract,workspace.querySelector('h3'));

  const modules=[
    ['inflow','mod-inflow-detail'],['storage','mod-storage'],['routing','run'],['outlet','mod-outlet'],['evaluation','mod-evaluation'],['optimization','mod-optimization']
  ];
  const copy={
    en:{title:'Software I | modular workflow',current:'Current event-routing modules',future:'Reserved Software II interfaces',inflow:'1. Inflow boundary',storage:'2. Storage–level state',routing:'3. Routing core',outlet:'4. Outlet hydraulics',evaluation:'5. Evaluation & decision support',optimization:'6. Constrained design optimization',upstream:'Upstream rainfall–runoff',multi:'Multiple inflows / catchments',downstream:'Continuous detention-chain',planned:'Software II',pt:'First-principles execution contract',steps:['Known boundary flow Qin(t)','Mass conservation: dS/dt = Qin − Qout','Declared state relation: H = H(S)','Outlet law: Qout = Qout(H, geometry, coefficients)','Constraints, diagnostics, and decision record'],scope:'Software I routes one facility for a known event inflow. The gray modules are explicit future interfaces, not hidden assumptions.'},
    zh:{title:'Software I｜模組化工作流程',current:'本研究 Software I 模組',future:'預留的 Software II 介面',inflow:'1. 入流邊界',storage:'2. 蓄水量—水位狀態',routing:'3. 路由演算核心',outlet:'4. 出口水理',evaluation:'5. 評估與決策支援',optimization:'6. 受限設計最佳化',upstream:'上游降雨—逕流',multi:'多入流／多集水區',downstream:'下游連續性滯洪池',planned:'Software II',pt:'第一性原理執行契約',steps:['已知邊界流量 Qin(t)','質量守恆：dS/dt = Qin − Qout','宣告狀態關係：H = H(S)','出口定律：Qout = Qout(H、幾何、係數)','限制條件、診斷與決策紀錄'],scope:'Software I 僅處理已知事件入流下的單一設施。灰色模組為明確的未來介面，並非隱藏假設。'}
  };
  const lang=()=>document.documentElement.lang==='zh-Hant'?'zh':'en';
  function renderNav(){const c=copy[lang()],host=document.getElementById('moduleNavContent');host.innerHTML='<h2>'+c.title+'</h2><p class="module-caption">'+c.current+'</p>'+modules.map(([k,target])=>'<button class="module-link" data-target="'+target+'">'+c[k]+'</button>').join('')+'<p class="module-caption future-caption">'+c.future+'</p>'+['upstream','multi','downstream'].map(k=>'<div class="module-future"><span>'+c[k]+'</span><em>'+c.planned+'</em></div>').join('');document.getElementById('principleTitle').textContent=c.pt;document.getElementById('principleSteps').innerHTML=c.steps.map((s,i)=>'<span><b>'+String(i+1)+'</b>'+s+'</span>').join('');document.getElementById('principleScope').textContent=c.scope;host.querySelectorAll('.module-link').forEach(b=>b.addEventListener('click',()=>{const target=document.getElementById(b.dataset.target);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.classList.add('module-flash');setTimeout(()=>target.classList.remove('module-flash'),900);}}));}
  function integrity(){const c=copy[lang()],p=document.getElementById('principleSteps');if(!p)return;const checks=[['qp',v=>Number(v)>0],['area',v=>Number(v)>0],['weirOn',()=>document.getElementById('weirOn')?.checked||document.getElementById('oriOn')?.checked||document.getElementById('riserOn')?.checked],['coeffMode',v=>v!=='table'||(document.getElementById('coeffSource')?.value.trim()&&/^https?:\/\//.test(document.getElementById('coeffUrl')?.value.trim()))]];const ok=checks.every(([id,test])=>{const e=document.getElementById(id);return e&&test(e.value)});workspace.dataset.integrity=ok?'ok':'warn';document.getElementById('principleTitle').textContent=c.pt+(ok?' ✓':' ⚠');}
  const style=document.createElement('style');
  style.textContent=`.grid{grid-template-columns:270px minmax(0,1fr)!important;align-items:start}.module-nav{position:sticky;top:12px;padding:14px}.module-nav h2{font-size:17px;margin-bottom:16px}.module-caption{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#526a78;margin:12px 0 6px}.module-link{display:block;width:100%;text-align:left;border:1px solid #c7d7df;background:#fff;color:#102a43;padding:9px 10px;border-radius:5px;margin:5px 0;font:inherit;font-size:14px;cursor:pointer}.module-link:hover{border-color:#0b557d;background:#eaf4f8}.future-caption{margin-top:20px}.module-future{display:flex;justify-content:space-between;gap:5px;padding:8px 4px;border-bottom:1px solid #e1e9ed;color:#748692;font-size:13px}.module-future em{font-style:normal;font-size:11px;color:#8b98a1;white-space:nowrap}.module-workspace{min-width:0}.module-subpanel{margin-top:18px!important}.principle-contract{border:1px solid #bfd1dc;border-left:5px solid #0b557d;background:#f6fbfd;padding:12px;margin:0 0 16px}.principle-contract strong{display:block;color:#102a43;margin-bottom:8px}.principle-contract #principleSteps{display:flex;flex-wrap:wrap;gap:7px}.principle-contract span{background:#fff;border:1px solid #d3e0e6;border-radius:14px;padding:4px 8px;font-size:12px;color:#3b5565}.principle-contract b{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#0b557d;color:#fff;margin-right:5px;font-size:10px}.principle-contract p{font-size:12px;color:#526a78;margin:9px 0 0}.module-workspace[data-integrity="warn"] .principle-contract{border-left-color:#e79a17;background:#fffaf0}.module-flash{outline:3px solid #75b6d8;outline-offset:4px;border-radius:4px}@media(max-width:850px){.grid{grid-template-columns:1fr!important}.module-nav{position:static}.module-nav #moduleNavContent{display:grid;grid-template-columns:1fr 1fr;gap:5px}.module-nav h2,.module-nav p{grid-column:1/-1}.module-link{margin:0;font-size:13px}.module-future{display:none}}`;
  document.head.appendChild(style);
  renderNav();integrity();
  workspace.addEventListener('input',integrity);workspace.addEventListener('change',integrity);
  document.getElementById('lang')?.addEventListener('click',()=>setTimeout(()=>{renderNav();integrity();},0));
})();
