/* v1.1 display-only handling of a rejected routing run (found while writing the step-by-step guide).
   Before: when an input such as a short S(H) table stopped the run, the page still jumped to the
   results, the old results stayed on screen as if new, the message was English-only, and repeated
   rows were added to the result table. This layer:
   - moves the stop message next to the run button (it sat at the bottom of Module 3, out of sight);
   - translates the stop message into Traditional Chinese in the Chinese interface;
   - keeps the page on the stop message (with a button to the outlined field) instead of the old results;
   - marks the result table as "from the previous successful run" until a run succeeds;
   - removes repeated rows from the result table.
   It never changes inputs, routed values, screening decisions or downloads. */
(() => {
  const $ = id => document.getElementById(id);
  const zh = () => document.documentElement.lang === 'zh-Hant';
  const MSG = [
    ['Correct the highlighted input before routing', '請先修正紅框標示的欄位，再執行路由'],
    ['Initial water level and reference level Href must lie within the declared stage-storage table range.', '初始水位 H0 與參考水位 Href 必須落在宣告的水位—蓄水量表 S(H) 範圍內。請把表格延伸到更高的水位，或調整 H0、Href（模組 5）。'],
    ['Stage-storage table must begin at zero storage and increase strictly. Elevation may use any declared datum.', '水位—蓄水量表必須從蓄水量 0 開始，水位與蓄水量都要逐列嚴格遞增；第一列不可是欄名文字。高程可使用任何宣告的基準。'],
    ['The routed state exceeded the declared stage-storage range. Extend S(H) before using this event.', '路由水位超出宣告的水位—蓄水量表範圍。請先把 S(H) 表延伸到更高的水位，再用這場事件。'],
    ['Imported hydrograph needs at least two increasing time, discharge pairs beginning at 0.', '匯入的入流歷線至少需要兩組「時間, 流量」，時間從 0 開始並逐列遞增。'],
    ['Coefficient table requires at least two rows with increasing water level H and non-negative numeric coefficients.', '係數表至少需要兩列，水位 H 逐列遞增，係數為非負數值。'],
    ['Enter the coefficient-table citation or field-test record.', '請填寫係數表的文獻引用或現地試驗紀錄。'],
    ['Enter a valid source URL beginning with http:// or https://.', '請輸入以 http:// 或 https:// 開頭的有效來源網址。'],
    ['Enter one consistent elevation datum, a reference level Href not below H0, physically valid active-outlet geometry, a positive drain-down time, residual storage between 0% and 100%, and at least one outlet.', '請使用一致的高程基準；參考水位 Href 不可低於 H0；啟用的出口幾何須合理；排空時間須大於 0；殘留百分比須介於 0% 與 100% 之間；且至少啟用一個出口。'],
    ['Review the declared inflow, storage relation, outlet geometry, and limits.', '請檢查宣告的入流、蓄水關係、出口幾何與限制條件。']
  ];
  const toZh = new Map(MSG), toEn = new Map(MSG.map(([e, z]) => [z, e]));
  let busy = false;
  function translate() {
    const g = $('inputErrorGuide'); if (!g || busy) return; busy = true;
    try {
      const map = zh() ? toZh : toEn;
      const it = document.createTreeWalker(g, NodeFilter.SHOW_TEXT);
      for (let n = it.nextNode(); n; n = it.nextNode()) {
        let v = n.nodeValue, u = v;
        for (const [k, w] of [...map].sort((a, b) => b[0].length - a[0].length)) if (u.includes(k)) u = u.split(k).join(w);
        if (u !== v) n.nodeValue = u;
      }
    } finally { busy = false; }
  }

  /* repeated rows in the result table */
  function dedupe() {
    const body = $('metricbody'); if (!body) return;
    const seen = new Set();
    [...body.querySelectorAll(':scope > tr')].forEach(tr => {
      const k = tr.textContent.replace(/\s+/g, ' ').trim();
      if (seen.has(k)) tr.remove(); else seen.add(k);
    });
  }

  /* stale-result notice in Module 6 */
  const banner = document.createElement('div'); banner.id = 'runStaleBanner'; banner.className = 'status stop'; banner.hidden = true; banner.setAttribute('role', 'alert');
  function placeBanner() { const t = $('metricbody')?.closest('table'); if (t && banner.parentNode !== t.parentNode) t.insertAdjacentElement('beforebegin', banner); }
  function bannerText() {
    banner.innerHTML = zh()
      ? '<strong>本次執行沒有完成</strong>輸入有問題，路由被擋下。下方圖表與結果表是<b>上一次成功執行</b>的結果，與目前輸入不一致，請勿引用。 <button type="button" class="hc-link" id="runStaleFix">前往修正</button>'
      : '<strong>This run did not complete</strong>An input stopped the routing. The charts and table below are from the <b>previous successful run</b> and do not match the current inputs; do not cite them. <button type="button" class="hc-link" id="runStaleFix">Go to fix</button>';
  }
  const failed = () => { const g = $('inputErrorGuide'); return !!g && !g.classList.contains('hide') && g.textContent.trim() !== ''; };
  function invalidField() { return document.querySelector('.module-workspace [aria-invalid="true"]'); }
  function goField() {
    const f = invalidField(), nav = window.DSSWorkspacePages;
    nav?.openTarget(f?.closest('section[id^="mod-"]')?.id || 'mod-routing');
    setTimeout(() => { f?.scrollIntoView({ block: 'center' }); f?.focus?.(); }, 120);
  }
  function goMessage() {
    window.DSSWorkspacePages?.openTarget('mod-routing');
    setTimeout(() => $('inputErrorGuide')?.scrollIntoView({ block: 'center' }), 120);
  }
  function addFieldButton() {
    const g = $('inputErrorGuide'); if (!g || !failed() || !invalidField() || $('runErrGo')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'runErrGo'; b.className = 'hc-link'; b.style.marginLeft = '6px';
    b.textContent = zh() ? '前往紅框欄位' : 'Go to the outlined field'; g.appendChild(b);
  }
  document.addEventListener('click', e => {
    if (e.target.closest?.('#runStaleFix')) { goMessage(); return; }
    if (e.target.closest?.('#runErrGo')) { goField(); return; }
    if (!e.target.closest?.('#run') || $('run')?.disabled) return;
    setTimeout(() => {
      placeBanner(); dedupe();
      if (failed()) { bannerText(); banner.hidden = false; translate(); addFieldButton(); goMessage(); }
      else banner.hidden = true;
    }, 250);
  }, false);

  new MutationObserver(() => { translate(); if (!banner.hidden) bannerText(); const b = $('runErrGo'); if (b) b.textContent = zh() ? '前往紅框欄位' : 'Go to the outlined field'; }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const watch = () => {
    // the stop message was created next to the run button before the button moved to Module 4,
    // so it stayed at the bottom of Module 3 and could not be seen from Module 4
    { const g0 = $('inputErrorGuide'), r = $('run'); if (g0 && r && g0.closest('section') !== r.closest('section')) r.insertAdjacentElement('beforebegin', g0); }
    const g = $('inputErrorGuide'); if (g) new MutationObserver(() => { translate(); addFieldButton(); }).observe(g, { childList: true, subtree: true, characterData: true });
    const b = $('metricbody'); if (b) new MutationObserver(dedupe).observe(b, { childList: true });
    placeBanner(); dedupe(); translate();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window.PondGateRunErrorDisplay = Object.freeze({ failed, version: '1.1.0' });
})();
