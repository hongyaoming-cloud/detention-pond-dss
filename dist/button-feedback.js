/* A visible acknowledgement for every user action.  This layer observes only
   the interface; it never changes inputs, eligibility, or the routing core. */
(() => {
  const zh=()=>document.documentElement.lang==='zh-Hant';
  const isZh=()=>zh();
  const feedback=document.createElement('div');
  feedback.id='buttonFeedback';
  feedback.className='button-feedback';
  feedback.setAttribute('role','status');
  feedback.setAttribute('aria-live','polite');
  document.body.appendChild(feedback);
  const style=document.createElement('style');
  style.textContent=`.button-feedback{position:fixed;right:18px;bottom:18px;z-index:9999;max-width:min(430px,calc(100vw - 36px));padding:11px 14px;border:1px solid #8fb8cf;border-left:5px solid #0b557d;border-radius:6px;background:#f4fbff;color:#123247;box-shadow:0 5px 18px rgba(15,42,59,.18);font-size:15px;line-height:1.45;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .18s,transform .18s}.button-feedback.show{opacity:1;transform:translateY(0)}.button-feedback.warn{border-left-color:#b7791f;background:#fff8e7}.button-feedback.ok{border-left-color:#16803d;background:#f1fcf4}@media(max-width:650px){.button-feedback{left:12px;right:12px;bottom:12px;max-width:none}}`;
  document.head.appendChild(style);
  let timer=0;
  function say(message,kind=''){
    feedback.textContent=message;
    feedback.className='button-feedback show '+kind;
    clearTimeout(timer);
    timer=setTimeout(()=>feedback.classList.remove('show'),6200);
  }
  function label(button){return (button.getAttribute('aria-label')||button.textContent||'').replace(/\s+/g,' ').trim();}
  function blocked(button){
    if(button.id==='run')return isZh()?'尚不能執行路由：請先完成入流、蓄水量—水位與至少一個出口的有效物理輸入。':'Routing is not ready: complete valid inflow, storage–level, and at least one outlet input.';
    if(button.id==='optimize'||button.id==='continuousGlobal')return isZh()?'尚不能進行篩選：請先完成單一被動出口、自由出流四項檢核及兩項可追溯紀錄。':'Screening is not ready: complete one passive outlet, all four free-discharge checks, and both traceability records.';
    if(button.id==='teachRestore')return isZh()?'目前沒有可還原的工作案例；請先載入教學示範。':'There is no saved working case yet; load the teaching demonstration first.';
    return isZh()?'此按鈕目前不可用；請先完成畫面上的待完成條件。':'This action is not available yet; complete the pending conditions shown on the page.';
  }
  function start(button){
    const l=label(button);
    if(button.id==='run')return isZh()?'已收到「執行路由與評估」；正在以 RK4 計算，完成後請查看右側結果。':'Routing and evaluation received; RK4 calculation is running and the result will appear at right.';
    if(button.id==='optimize')return isZh()?'已收到「執行受限設計篩選」；正在檢查條件並計算候選案例。':'Constrained screening received; checking conditions and evaluating candidate cases.';
    if(button.id==='continuousGlobal')return isZh()?'已收到「連續數值搜尋」；正在進行受限範圍內的研究檢視。':'Continuous numerical search received; running the bounded research inspection.';
    if(button.id==='lang')return isZh()?'Switching the display language.':'正在切換展示語言。'; /* message in the target language */
    if(/下載|download/i.test(l))return isZh()?'已開始準備下載；請查看瀏覽器的下載項目。':'Preparing the download; check your browser downloads.';
    if(button.dataset.target)return isZh()?'已移至所選功能區塊。':'Moved to the selected function section.';
    return (isZh()?'已收到操作：':'Action received: ')+l+(isZh()?'。請查看畫面更新。':'. Check the updated panel.');
  }
  function done(button){
    const status=document.getElementById(button.id==='run'?'status':'optout');
    const text=(status?.textContent||'').replace(/\s+/g,' ').trim();
    if(button.id==='run'&&text)return isZh()?'路由已完成；請閱讀結果表、圖形與工程判讀後再下載紀錄。':'Routing completed; review the table, charts, and engineering interpretation before downloading the record.';
    if((button.id==='optimize'||button.id==='continuousGlobal')&&text){
      const failed=/cannot|could not|not run|stopped|未|不可|失敗/i.test(text);
      return failed?(isZh()?'篩選未完成：':'Screening was not completed: ')+text:(isZh()?'篩選已更新：':'Screening updated: ')+text;
    }
    return null;
  }
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest?.('button');
    if(button?.disabled)say(blocked(button),'warn');
  },true);
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button');
    if(!button)return;
    say(start(button));
    window.setTimeout(()=>{const message=done(button);if(message)say(message,/未完成|not completed/i.test(message)?'warn':'ok');},80);
  },true);
  const decorate=()=>document.querySelectorAll('button').forEach(button=>{
    if(!button.dataset.feedbackReady){button.dataset.feedbackReady='true';button.title=(isZh()?'按下後將顯示操作提示： ':'After pressing, an action message appears: ')+label(button);}
  });
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
  decorate();
})();
