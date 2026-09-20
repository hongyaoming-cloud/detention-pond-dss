/* Final action owner for constrained screening.
   Older releases accumulated multiple listeners and disabled-state gates.  This
   guard is loaded last, replaces the visible button once, and always provides
   an observable response to a user click. */
(() => {
  const get = id => document.getElementById(id);
  const zh = () => document.documentElement.lang === 'zh-Hant';
  function message(text, kind='warn') {
    const box=get('optout'), result=get('optResultBox');
    if(result) result.classList.remove('hide');
    if(box) {
      box.className='status '+kind;
      box.textContent=text;
      box.classList.remove('hide');
      box.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
  function replaceAction() {
    const old=get('optimize');
    if(!old || old.dataset.actionOwner==='final') return;
    const button=old.cloneNode(true);
    button.type='button';
    button.disabled=false;
    button.removeAttribute('aria-disabled');
    button.dataset.actionOwner='final';
    old.replaceWith(button);
    button.addEventListener('click', () => {
      if(button.dataset.busy==='true') return;
      button.dataset.busy='true';
      const label=button.textContent;
      button.textContent=zh()?'正在執行受限設計篩選…':'Running constrained design screening…';
      message(zh()?'已收到篩選要求，正在檢查輸入條件並執行路由。':'Screening request received. Checking inputs and rerouting candidates.');
      window.requestAnimationFrame(() => {
        try {
          if(typeof window.__dssRunScreening !== 'function') throw new Error('screening bridge is not ready');
          window.__dssRunScreening();
        } catch (error) {
          message((zh()?'受限篩選無法完成：':'Constrained screening could not be completed: ')+(error?.message||String(error)));
        } finally {
          button.textContent=label;
          button.dataset.busy='false';
          button.disabled=false;
        }
      });
    });
  }
  window.setTimeout(replaceAction, 0);
})();
