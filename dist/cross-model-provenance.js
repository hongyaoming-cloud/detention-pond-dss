/* Provenance declaration for external-model comparisons.  This records the
   evidence category and mapping, but never changes the routing calculation. */
(() => {
  const zh=()=>document.documentElement.lang==='zh-Hant';
  const copy=()=>zh()?{
    title:'外部比較的來源與適用範圍紀錄',
    lead:'先登錄比較案例，再匯入 HEC-HMS／SWMM 輸出。數值一致不等於現地驗證；公開複合出口案例也不等於 Software I 的正式受限篩選驗證。',
    kind:'證據類別',
    scope:'Software I 範圍一致：單池、已知入流、單一自由出流被動出口',
    integration:'外部系統整合比較：公開 SWMM 複合出口案例（不作正式受限篩選驗證）',
    id:'案例識別碼',url:'公開來源網址',version:'外部模型／版本',map:'輸入映射與範圍說明',
    preset:'載入公開 SWMM 滯洪池案例登錄',template:'下載外部結果 CSV 範本',
    templateNote:'範本僅示範欄名與單位；不可作為驗證結果。',
    recorded:'已附加來源紀錄：',
    required:'此類別需要填寫案例識別碼、公開來源網址、外部模型／版本與映射說明。',
    integrationResult:'此比較屬外部系統整合紀錄；即使數值一致，也不可作為 Software I 正式受限篩選或現地驗證的證據。',
    scopeResult:'此比較被宣告為 Software I 範圍一致的數值交叉驗算；仍不是現地驗證或最終工程設計驗證。'
  }:{
    title:'External-comparison provenance and scope record',
    lead:'Declare the comparison case before importing HEC-HMS/SWMM output. Numerical agreement is not field validation; a public compound-outlet case is also not formal Software I constrained-screening validation.',
    kind:'Evidence category',
    scope:'Software I scope-matched: one pond, known inflow, one passive free-discharge outlet',
    integration:'External system-integration comparison: public SWMM compound-outlet case (not formal constrained-screening validation)',
    id:'Case identifier',url:'Public source URL',version:'External model / version',map:'Input mapping and scope statement',
    preset:'Load public SWMM detention-pond registry',template:'Download external-output CSV template',
    templateNote:'The template demonstrates columns and units only; it is not validation output.',
    recorded:'Provenance record attached: ',
    required:'This category requires a case identifier, public source URL, external model/version, and a mapping statement.',
    integrationResult:'This is an external system-integration record; even numerical agreement cannot support formal Software I constrained screening or field validation.',
    scopeResult:'This has been declared as a Software I scope-matched numerical cross check; it remains neither field validation nor final engineering-design validation.'
  };
  let panel;
  function field(id,label,type='text'){
    if(type==='textarea')return `<label>${label}<textarea id="${id}" rows="3"></textarea></label>`;
    return `<label>${label}<input id="${id}"${type==='url'?' type="url"':''}></label>`;
  }
  function add(){
    const target=document.getElementById('crossOut');if(!target||document.getElementById('crossProvenance'))return;
    const t=copy();panel=document.createElement('section');panel.id='crossProvenance';panel.className='cross-provenance';
    panel.innerHTML=`<h4>${t.title}</h4><p class="meta">${t.lead}</p><label>${t.kind}<select id="crossEvidenceKind"><option value="scope">${t.scope}</option><option value="integration">${t.integration}</option></select></label><div class="twocol"><div>${field('crossCaseId',t.id)}</div><div>${field('crossModelVersion',t.version)}</div></div>${field('crossSourceUrl',t.url,'url')}${field('crossMapping',t.map,'textarea')}<div class="cross-actions"><button type="button" class="report" id="crossPublicPreset">${t.preset}</button><button type="button" class="report" id="crossCsvTemplate">${t.template}</button></div><p class="meta">${t.templateNote}</p><div class="status hide" id="crossProvenanceNote"></div>`;
    target.insertAdjacentElement('beforebegin',panel);
    panel.querySelector('#crossPublicPreset').addEventListener('click',()=>{
      panel.querySelector('#crossEvidenceKind').value='integration';
      panel.querySelector('#crossCaseId').value='SWMM-Tutorial-Detention-Pond';
      panel.querySelector('#crossSourceUrl').value='https://markuspichler.gitlab.io/swmm_api/examples/Detention_Pond_Model.html';
      panel.querySelector('#crossModelVersion').value='EPA SWMM tutorial example; swmm_api documentation 0.4.75';
      panel.querySelector('#crossMapping').value=zh()?'原始公開案例包含側向孔口、堰流與圓管，且以降雨—逕流輸入；僅登錄為外部系統整合比較。不可作為 Software I 單池、已知入流、單一被動出口之正式受限篩選驗證。':'The original public case contains a side orifice, weir, and culvert with rainfall-runoff input. It is registered only as an external system-integration comparison and cannot serve as formal Software I validation for one pond, known inflow, and one passive outlet.';
      show(zh()?'已載入公開 SWMM 案例登錄；請匯入該外部模型實際輸出的 CSV。':'Public SWMM registry loaded. Import the actual external-model output CSV.','warn');
    });
    panel.querySelector('#crossCsvTemplate').addEventListener('click',()=>{
      const rows=['time_s,inflow_m3_s,outflow_m3_s,relative_head_m,incremental_storage_m3','0,0,0,0,0','60,,,,'];
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}));a.download='external-model-comparison-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);
      show(zh()?'已下載 CSV 範本；請以外部模型實際輸出取代空白欄位。':'CSV template downloaded; replace blank fields with actual external-model output.');
    });
  }
  function show(message,kind='warn'){const n=document.getElementById('crossProvenanceNote');if(!n)return;n.className='status '+kind;n.textContent=message;}
  function values(){return {kind:document.getElementById('crossEvidenceKind')?.value||'scope',case_id:document.getElementById('crossCaseId')?.value.trim()||'',source_url:document.getElementById('crossSourceUrl')?.value.trim()||'',external_model_version:document.getElementById('crossModelVersion')?.value.trim()||'',mapping_statement:document.getElementById('crossMapping')?.value.trim()||''};}
  function appendResultRecord(p,t,remaining=8){
    const out=document.getElementById('crossOut');
    if(!out||out.classList.contains('hide')||!out.textContent.trim()){
      if(remaining>0)window.setTimeout(()=>appendResultRecord(p,t,remaining-1),250);
      return;
    }
    const prior=out.querySelector('.cross-provenance-result');if(prior)prior.remove();
    const note=document.createElement('p');note.className='meta cross-provenance-result';note.textContent=t.recorded+(p.case_id||'(not declared)')+'. '+(p.kind==='integration'?t.integrationResult:t.scopeResult);out.appendChild(note);
  }
  document.addEventListener('click',event=>{
    const b=event.target.closest?.('#crossRun');if(!b)return;
    const p=values(),t=copy();if(!p.case_id||!p.source_url||!p.external_model_version||!p.mapping_statement)show(t.required,'warn');
    window.setTimeout(()=>appendResultRecord(p,t),120);
  },true);
  const style=document.createElement('style');style.textContent=`.cross-provenance{margin:14px 0;padding:13px;border:1px solid #b9d4df;border-left:5px solid #0b557d;border-radius:7px;background:#f5fbfd}.cross-provenance h4{margin:0 0 6px;color:#123247}.cross-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.cross-provenance-result{border-top:1px solid #d2e3ea;padding-top:8px}`;document.head.appendChild(style);
  new MutationObserver(add).observe(document.body,{childList:true,subtree:true});add();
  document.getElementById('lang')?.addEventListener('click',()=>setTimeout(add,0));
})();
