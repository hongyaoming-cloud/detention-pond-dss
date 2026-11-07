/* v1.2.1 (ChatGPT novice test, 2026-11-07): plain-language checks for first-time users.
   Display only: it reads the result table and the declared limits; it never changes inputs,
   routing, screening eligibility or any computed value. */
(() => {
  const $ = id => document.getElementById(id);
  const zh = () => document.documentElement.lang === 'zh-Hant';
  const T = (a, b) => zh() ? a : b;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = document.createElement('style');
  css.textContent = '#pgVerdict{margin:12px 0;border:1px solid #bfd1dc;border-left:6px solid #64748b;border-radius:8px;padding:12px 14px;background:#f8fafc}#pgVerdict.ok{border-left-color:#16803d;background:#f1fcf4}#pgVerdict.stop{border-left-color:#b42318;background:#fff4f2}#pgVerdict.warn{border-left-color:#b7791f;background:#fff8e7}#pgVerdict h3{margin:0 0 8px;font-size:17px}#pgVerdict table{border-collapse:collapse;width:100%;margin:6px 0}#pgVerdict td,#pgVerdict th{padding:5px 8px;border-bottom:1px solid #dde5ea;text-align:left;font-size:15px}#pgVerdict .tag{font-weight:700}#pgVerdict .tag.ok{color:#16803d}#pgVerdict .tag.stop{color:#b42318}#pgVerdict .tag.warn{color:#b7791f}#pgVerdict button,#pgScreenMissing button{margin:6px 6px 0 0}#pgScreenMissing{margin:10px 0;padding:10px 12px;border:1px solid #e3c98b;border-left:5px solid #b7791f;border-radius:6px;background:#fff8e7;font-size:15px}#pgScreenMissing.ok{border-color:#a9d8b8;border-left-color:#16803d;background:#f1fcf4}#pgScreenMissing ul{margin:6px 0 0 18px;padding:0}#pgQuickStart{margin:10px 0 14px;padding:12px 14px;border:2px solid #0b557d;border-radius:8px;background:#f4fbff}#pgQuickStart h3{margin:0 0 6px;font-size:17px}#pgQuickStart ol{margin:4px 0 6px 20px;padding:0}#pgQuickStart li{margin:3px 0}';
  document.head.appendChild(css);

  /* ---------- 1. "Is this pond good enough?" on the result page ---------- */
  function cellNum(row) { const v = parseFloat((row?.cells?.[1]?.textContent || '').replace(/[^0-9.eE+-]/g, ' ').trim().split(/\s+/)[0]); return Number.isFinite(v) ? v : NaN; }
  function readResult() {
    const rows = [...document.querySelectorAll('#metricbody tr')];
    if (!rows.length) return null;
    const first = r => (r.cells?.[0]?.textContent || '').replace(/\s+/g, ' ').trim();
    const hRow = rows.find(r => /Hmax$/.test(first(r)));
    const qRow = rows.find(r => /Qp,o$/.test(first(r)));
    const qiRow = rows.find(r => /Qp,i$/.test(first(r)));
    return { hmax: cellNum(hRow), qout: cellNum(qRow), qin: cellNum(qiRow) };
  }
  function compare(v, lim, dec) {
    if (!Number.isFinite(v) || !Number.isFinite(lim)) return 'none';
    const rv = +v.toFixed(dec), rl = +lim.toFixed(dec);
    if (rv > rl) return 'stop';
    if (rv === rl) return 'warn'; /* equal after rounding: never report as a pass */
    return 'ok';
  }
  function verdict() {
    const r = readResult(); if (!r) return null;
    const hallow = Number($('hallow')?.value), qallow = Number($('qallow')?.value);
    const st = window.PondGateHelp?.runState?.() || {};
    const h = compare(r.hmax, hallow, 3), q = compare(r.qout, qallow, 4);
    const overall = (h === 'stop' || q === 'stop') ? 'stop' : (h === 'ok' && q === 'ok') ? 'ok' : 'warn';
    return { ...r, hallow, qallow, h, q, overall, stale: !!st.changedAfterRun, demo: !st.userRan };
  }
  const word = s => ({ ok: T('未超過', 'within limit'), stop: T('超過', 'exceeds limit'), warn: T('等於或無法判斷，請再確認', 'equal or undetermined; check again'), none: T('尚未宣告', 'not declared') }[s]);
  function verdictText(v) {
    if (!v) return T('目前還沒有結果。請先到「設定與路由」按「執行路由與評估」。', 'There is no result yet. Press "Run routing and evaluation" first.');
    let s = T(`最高水位 Hmax = ${v.hmax.toFixed(3)} m，容許水位 Hallow = ${v.hallow.toFixed(3)} m（${word(v.h)}）；出流尖峰 Qp,o = ${v.qout.toFixed(4)} m³/s，容許出流 Qallow = ${v.qallow.toFixed(4)} m³/s（${word(v.q)}）。`,
      `Maximum level Hmax = ${v.hmax.toFixed(3)} m, allowable Hallow = ${v.hallow.toFixed(3)} m (${word(v.h)}); peak outflow Qp,o = ${v.qout.toFixed(4)} m³/s, allowable Qallow = ${v.qallow.toFixed(4)} m³/s (${word(v.q)}). `);
    s += v.overall === 'stop' ? T('至少一項超過限制：修正前不可採用此設計。', 'At least one limit is exceeded: do not adopt this design before revision.')
      : v.overall === 'ok' ? T('兩項都沒有超過您宣告的限制。這只是初步判讀，自由出流證據與工程審查完成前，不是最終設計。', 'Neither limit is exceeded. This is a preliminary reading only; it is not a final design before the free-discharge evidence and engineering review.')
      : T('至少一項等於限制或無法判斷，請不要當作通過。', 'At least one value equals the limit or cannot be judged; do not treat it as a pass.');
    if (v.stale) s += T(' 注意：輸入已改變，這是上一次執行的結果，請重新執行。', ' Note: inputs changed; this is the previous result. Run again.');
    return s;
  }
  const freeIncomplete = () => !$('freeDischarge')?.checked || ['freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'].some(id => !$(id)?.checked);
  function renderVerdict() {
    const mb = $('metricbody'); if (!mb) return;
    const panel = mb.closest('section'); const bar = panel?.querySelector('.casebar'); if (!bar) return;
    let box = $('pgVerdict');
    if (!box) { box = document.createElement('div'); box.id = 'pgVerdict'; box.setAttribute('role', 'status'); bar.insertAdjacentElement('afterend', box); }
    const v = verdict();
    if (!v) { box.className = ''; box.innerHTML = '<h3>' + T('新手判讀｜這個池子夠不夠用？', 'Beginner check | Is this pond good enough?') + '</h3><p>' + esc(verdictText(null)) + '</p>'; return; }
    box.className = v.stale ? 'warn' : v.overall;
    const head = v.stale ? T('輸入已改變：下表是上一次執行的結果', 'Inputs changed: the table below is from the previous run')
      : v.overall === 'stop' ? T('不夠用：至少一項超過您宣告的限制', 'Not good enough: at least one declared limit is exceeded')
      : v.overall === 'ok' ? T('初步判讀：兩項都沒有超過限制', 'Preliminary reading: both limits are met')
      : T('請再確認：有數值等於限制或無法判斷', 'Check again: a value equals a limit or cannot be judged');
    const row = (lab, val, lim, s) => `<tr><td>${lab}</td><td>${val}</td><td>${lim}</td><td class="tag ${s}">${esc(word(s))}</td></tr>`;
    box.innerHTML = '<h3>' + T('新手判讀｜這個池子夠不夠用？', 'Beginner check | Is this pond good enough?') + '</h3>'
      + '<p><strong>' + esc(head) + '</strong>' + (v.demo ? T('（目前是示範案例）', ' (demonstration case)') : '') + '</p>'
      + '<table><thead><tr><th>' + T('項目', 'Item') + '</th><th>' + T('本次結果', 'This run') + '</th><th>' + T('您宣告的限制', 'Your declared limit') + '</th><th>' + T('判讀', 'Reading') + '</th></tr></thead><tbody>'
      + row(T('最高水位 Hmax', 'Maximum level Hmax'), v.hmax.toFixed(3) + ' m', 'Hallow = ' + (Number.isFinite(v.hallow) ? v.hallow.toFixed(3) : '—') + ' m', v.h)
      + row(T('出流尖峰 Qp,o', 'Peak outflow Qp,o'), v.qout.toFixed(4) + ' m³/s', 'Qallow = ' + (Number.isFinite(v.qallow) ? v.qallow.toFixed(4) : '—') + ' m³/s', v.q)
      + '</tbody></table><p>' + (v.overall === 'stop'
        ? T('修正前不可採用此設計。可調整池面積（模組 2）或出口尺寸（模組 3）後重新執行；不要只為了通過而放寬 Hallow 或 Qallow。', 'Do not adopt this design before revision. Adjust the pond area (Module 2) or the outlet size (Module 3) and run again; do not relax Hallow or Qallow just to pass.')
        : T('這只是依本次結果與您宣告的限制所做的初步判讀；自由出流證據與工程審查完成前，不是最終設計。限制值在模組 5 設定。', 'This is a preliminary reading of this run against your declared limits; it is not a final design before the free-discharge evidence and engineering review. The limits are set in Module 5.')) + '</p>'
      + (v.overall === 'stop' && !v.stale ? '<p>' + T('怎麼調整：加大池面積時，最高水位和出流尖峰通常都會下降；縮小出口時，出流尖峰下降但最高水位會上升。每次只改一項，重新執行後再比較上表兩列。', 'How to adjust: a larger pond area usually lowers both the maximum level and the peak outflow; a smaller outlet lowers the peak outflow but raises the maximum level. Change one thing at a time, run again, and compare both rows.') + '</p>' : '')
      + (freeIncomplete() ? '<p><strong>' + T('適用範圍：', 'Scope: ') + '</strong>' + T('自由出流證據尚未完整（模組 3），所以這個判讀只供探索與學習，不能當作工程設計驗證。', 'The free-discharge evidence is not complete (Module 3), so this reading is for exploration and learning only, not an engineering design check.') + '</p>' : '')
      + (v.stale ? '<p>' + T('提醒：切換語言也會依目前的輸入重新計算一次。', 'Reminder: switching the language also recomputes once with the current inputs.') + '</p>' : '')
      + (v.stale ? '<button type="button" data-pg-go="mod-routing">' + T('前往重新執行', 'Go and run again') + '</button>' : '')
      + (v.overall === 'stop' && !v.stale ? '<button type="button" data-pg-go="mod-storage">' + T('調整池子（模組 2）', 'Adjust the pond (Module 2)') + '</button><button type="button" data-pg-go="mod-outlet">' + T('調整出口（模組 3）', 'Adjust the outlet (Module 3)') + '</button>' : '')
      + '<button type="button" data-pg-go="mod-optimization">' + T('查看限制值（模組 5）', 'See the limits (Module 5)') + '</button>';
  }

  /* ---------- 2. what is still missing, right beside the screening button ---------- */
  const HINT = {
    freeDischarge: ['要查：出口下游的排水條件，例如下游排水路設計圖或下游水位資料。', 'Look for: the drainage conditions downstream of the outlet, such as drawings of the receiving channel or downstream water levels.'],
    freeTailwater: ['要查：下游設計水位或尾水位紀錄；回水／管摩阻要查出流管渠的長度、坡度、管徑；淹沒要確認洪水時出口不會被下游水淹沒；操作控制要確認沒有閘門或抽水機等人為操作。', 'Look for: downstream design or tailwater levels; for backwater/pipe friction, the length, slope and size of the outlet conduit; for submergence, that the outlet is not drowned by downstream water in a flood; for operation, that no gate or pump is operated.'],
    freeBackwater: ['要查：回水／管摩阻要查出流管渠的長度、坡度、管徑；淹沒要確認洪水時出口不會被下游水淹沒；操作控制要確認沒有閘門或抽水機等人為操作。', 'Look for: for backwater/pipe friction, the length, slope and size of the outlet conduit; for submergence, that the outlet is not drowned; for operation, that no gate or pump is operated.'],
    freeSubmergence: ['要查：淹沒要確認洪水時出口不會被下游水淹沒；操作控制要確認沒有閘門或抽水機等人為操作。', 'Look for: that the outlet is not drowned by downstream water in a flood, and that no gate or pump is operated.'],
    freeOperation: ['要查：確認出口沒有閘門、抽水機等人為操作。', 'Look for: confirmation that no gate or pump is operated at the outlet.'],
    freeEvidenceRecord: ['要填：上述佐證的來源，例如圖說編號、現勘紀錄日期或計算書編號。', 'Enter: the source of the evidence above, such as a drawing number, site-inspection date or calculation report number.'],
    screeningLimitRecord: ['要填：Hallow 與 Qallow 依據的法規或設計準則名稱與條文。', 'Enter: the regulation or design criterion (name and clause) behind Hallow and Qallow.']
  };
  function renderMissing() {
    const btn = $('optimize'); if (!btn || !window.PondGateHelp?.screeningLocks) return;
    let box = $('pgScreenMissing');
    if (!box) { box = document.createElement('div'); box.id = 'pgScreenMissing'; box.setAttribute('aria-live', 'polite'); btn.insertAdjacentElement('afterend', box); }
    const L = window.PondGateHelp.screeningLocks();
    if (!L.length) { box.className = 'ok'; box.textContent = T('篩選條件已齊全，可以按「執行受限設計篩選」。', 'All screening conditions are complete; you can run constrained screening.'); return; }
    box.className = '';
    box.innerHTML = '<strong>' + T(`按下篩選前還缺 ${L.length} 項（只有在您真的有證據時才勾選或填寫）：`, `${L.length} item(s) still missing before screening (tick or fill them only when you hold real evidence):`) + '</strong><ul>'
      + L.map(x => '<li>' + esc(x.msg) + (HINT[x.id] ? '<br><small>' + esc(T(HINT[x.id][0], HINT[x.id][1])) + '</small>' : '') + '</li>').join('') + '</ul>'
      + '<p><small>' + T('這些證據通常由負責設計的工程師依圖說、現勘或計算書確認；沒有證據時不要勾選，路由結果仍可下載作為探索紀錄。', 'These items are usually confirmed by the responsible design engineer from drawings, site inspection or calculations; do not tick them without evidence. The routing result can still be downloaded as an exploration record.') + '</small></p>';
  }

  /* ---------- 3. a short quick start at the top of "How to start" ---------- */
  function renderQuickStart() {
    const host = $('teachingAssistant'); if (!host) return;
    let box = $('pgQuickStart');
    const html = '<h3>' + T('最快上手：三步看懂示範結果', 'Quick start: three steps to read the demonstration') + '</h3><ol>'
      + '<li>' + T('到「設定與路由」，不改數字，直接按「執行路由與評估」。', 'Open "Settings and routing" and press "Run routing and evaluation" without changing anything.') + '</li>'
      + '<li>' + T('在結果頁最上方的「新手判讀」看兩件事：最高水位有沒有超過 Hallow、出流尖峰有沒有超過 Qallow。', 'At the top of the result page, read the "Beginner check": does the maximum level exceed Hallow, and does the peak outflow exceed Qallow?') + '</li>'
      + '<li>' + T('改一個數字（例如入流尖峰）再按執行，比較結果怎麼變。', 'Change one number (for example the inflow peak), run again, and compare.') + '</li></ol>'
      + '<p>' + T('下方的公式與驗證說明是給想深入了解的人，第一次使用可以先跳過。', 'The equations and validation notes below are for readers who want more depth; first-time users can skip them.') + '</p>'
      + '<button type="button" data-pg-go="mod-routing">' + T('前往設定與路由', 'Go to settings and routing') + '</button>';
    if (!box) { box = document.createElement('div'); box.id = 'pgQuickStart'; const h = host.querySelector('h2'); (h || host.firstChild) ? (h ? h.insertAdjacentElement('afterend', box) : host.prepend(box)) : host.appendChild(box); }
    if (box.dataset.lang !== document.documentElement.lang) { box.innerHTML = html; box.dataset.lang = document.documentElement.lang; }
  }

  /* ---------- 4. the "screening not run" message follows the language ---------- */
  const NOT_RUN = ['尚未執行受限篩選。請僅使用單一被動堰流或單一矩形開口，完成自由出流四項檢核，並填寫兩項可追溯紀錄。', 'Screening was not run. Use exactly one passive weir or one rectangular opening, complete the four free-discharge checks, and enter both traceability records.'];
  function relabelOptout() { const o = $('optout'); if (!o) return; const t = o.textContent.trim(), i = NOT_RUN.indexOf(t); if (i >= 0) { const want = zh() ? 0 : 1; if (i !== want) o.textContent = NOT_RUN[want]; } }

  /* ---------- 5. no "selected case" caption while screening has not run (third ChatGPT run) ---------- */
  function captionForNotRun() {
    const box = $('optResultBox'), o = $('optout'); if (!box || !o) return;
    const notRun = NOT_RUN.includes(o.textContent.trim());
    box.querySelectorAll('.meta, #sizegraphic').forEach(e => { e.style.display = notRun ? 'none' : ''; });
  }
  /* ---------- 6. say before switching the language that it recomputes (third ChatGPT run) ---------- */
  function renderLangNote() {
    const btn = $('lang'); if (!btn) return;
    let n = $('pgLangNote');
    if (!n) { n = document.createElement('span'); n.id = 'pgLangNote'; n.style.cssText = 'float:right;clear:right;width:min(260px,60vw);margin:4px 0 0 12px;font-size:13px;line-height:1.35;color:#fff3c4;text-align:right'; btn.insertAdjacentElement('afterend', n); }
    const st = window.PondGateHelp?.runState?.() || {};
    const show = !!st.changedAfterRun && document.querySelectorAll('#metricbody tr').length > 0;
    n.textContent = show ? T('提醒：輸入已改變，切換語言會依目前輸入重新計算一次。', 'Note: inputs changed; switching the language recomputes once with the current inputs.') : '';
    n.hidden = !show; n.style.display = show ? 'block' : 'none';
  }

  let pending = 0;
  function refresh() { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => { try { renderVerdict(); renderMissing(); renderQuickStart(); relabelOptout(); captionForNotRun(); renderLangNote(); } catch (e) { /* display layer must never break the app */ } }); }
  document.addEventListener('click', e => { const b = e.target.closest?.('[data-pg-go]'); if (b) window.DSSWorkspacePages?.openTarget(b.dataset.pgGo); }, false);
  document.addEventListener('input', refresh, true);
  document.addEventListener('change', refresh, true);
  window.addEventListener('dss:language-changed', () => setTimeout(refresh, 60));
  const watch = () => { const mb = $('metricbody'); if (mb) new MutationObserver(refresh).observe(mb, { childList: true, subtree: true, characterData: true }); const o = $('optout'); if (o) new MutationObserver(() => setTimeout(() => { relabelOptout(); captionForNotRun(); }, 0)).observe(o, { childList: true, characterData: true, subtree: true }); };
  const boot = () => { watch(); refresh(); setTimeout(refresh, 800); setInterval(() => { if (!$('pgQuickStart') && $('teachingAssistant')) renderQuickStart(); if (!$('pgScreenMissing') && $('optimize')) renderMissing(); }, 1500); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
  window.PondGateBeginner = Object.freeze({ verdict, verdictText, version: '1.2.1' });
})();
