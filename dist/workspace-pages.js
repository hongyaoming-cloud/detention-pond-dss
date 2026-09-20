/* Page-level navigation for the Software I workspace.  It changes only the
   presentation of existing modules; inputs, records, and routing state stay in place. */
(() => {
  const work=document.querySelector('.module-workspace');if(!work)return;
  const zh=()=>document.documentElement.lang==='zh-Hant';
  const labels=()=>zh()?[
    ['route','設定與路由','模組 1–4'],['screen','受限設計篩選','模組 5'],
    ['evidence','結果、驗證與紀錄','模組 6'],['learn','教學與內部測試','自學／QA']
  ]:[
    ['route','Setup and routing','Modules 1–4'],['screen','Constrained screening','Module 5'],
    ['evidence','Results, verification and records','Module 6'],['learn','Teaching and internal tests','Learning / QA']
  ];
  const tabs=document.createElement('nav');tabs.id='workspacePageTabs';tabs.setAttribute('aria-label','Software I pages');
  const host=document.createElement('div');host.id='workspacePageHost';
  const pages=new Map();
  ['route','screen','evidence','learn'].forEach(id=>{const page=document.createElement('section');page.className='workspace-page';page.dataset.page=id;pages.set(id,page);host.appendChild(page);});
  work.insertBefore(tabs,work.firstChild);work.insertBefore(host,tabs.nextSibling);
  const move=(id,page)=>{const el=document.getElementById(id);if(el)pages.get(page).appendChild(el);};
  ['userGuide','mod-inflow','mod-storage','mod-outlet','mod-routing'].forEach(id=>move(id,'route'));
  const contract=work.querySelector('.principle-contract');if(contract)pages.get('route').insertBefore(contract,pages.get('route').firstChild);
  move('mod-optimization','screen');
  move('mod-evaluation','evidence');
  move('teachingAssistant','learn');move('qualityAssurance','learn');
  let active='route';
  function draw(){
    const t=labels();tabs.innerHTML=t.map(([id,title,sub])=>`<button type="button" class="workspace-tab${id===active?' active':''}" data-page="${id}" aria-selected="${id===active}"><span>${title}</span><small>${sub}</small></button>`).join('');
    tabs.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.page)));
    pages.forEach((page,id)=>{page.hidden=id!==active;});
  }
  function activate(id){if(!pages.has(id))return;active=id;draw();pages.get(id).scrollIntoView({behavior:'smooth',block:'start'});}
  const modulePage={
    'mod-inflow':'route','mod-storage':'route','mod-outlet':'route','mod-routing':'route',
    'mod-optimization':'screen','mod-evaluation':'evidence'
  };
  document.addEventListener('click',event=>{
    const module=event.target.closest?.('.module-link[data-target]');
    if(module&&modulePage[module.dataset.target])activate(modulePage[module.dataset.target]);
    if(event.target.closest?.('#teachingNavButton'))activate('learn');
  },true);
  document.getElementById('run')?.addEventListener('click',()=>window.setTimeout(()=>activate('evidence'),120));
  document.getElementById('lang')?.addEventListener('click',()=>window.setTimeout(draw,0));
  const style=document.createElement('style');style.textContent=`#workspacePageTabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 16px}.workspace-tab{min-height:62px;border:1px solid #b9d4df;border-radius:7px;background:#fff;color:#123247;text-align:left;padding:9px 10px;cursor:pointer;font:inherit}.workspace-tab span{display:block;font-weight:700;font-size:14px}.workspace-tab small{display:block;color:#526a78;font-size:12px;margin-top:2px}.workspace-tab:hover{background:#eef8fb;border-color:#0b557d}.workspace-tab.active{background:#0b557d;color:#fff;border-color:#0b557d;box-shadow:0 2px 6px #0b557d33}.workspace-tab.active small{color:#dbeef5}.workspace-page[hidden]{display:none!important}.workspace-page>.module-card,.workspace-page>#teachingAssistant,.workspace-page>#qualityAssurance{margin-top:0;margin-bottom:18px}.workspace-page>#mod-evaluation{margin-top:0}@media(max-width:850px){#workspacePageTabs{grid-template-columns:1fr 1fr}.workspace-tab{min-height:58px}}`;document.head.appendChild(style);
  draw();
  window.DSSWorkspacePages=Object.freeze({activate,active:()=>active});
})();
