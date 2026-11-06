/* PondGate v1.1 guided lessons: seven step-by-step practice cases with automatic step checks.
   Presentation only. A lesson may load practice inputs (after the learner agrees) and restores the
   learner's own inputs when it ends; it never calls the routing core directly and never changes
   screening or optimization rules. Practice evidence ticks are labelled as teaching assumptions. */
(() => {
  const H = () => window.PondGateHelp, NAV = () => window.DSSWorkspacePages;
  const zh = () => document.documentElement.lang === 'zh-Hant';
  const T = (a, b) => zh() ? a : b;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = id => Number($(id)?.value);
  const near = (id, v) => Math.abs(num(id) - v) < 1e-9;
  const yes = id => Boolean($(id)?.checked);
  const page = () => NAV()?.active();
  const FREE = ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'];

  /* ---------- counters the checks use ---------- */
  const count = { run: 0, screen: 0, download: 0 };
  document.addEventListener('click', e => {
    if (e.target.closest?.('#run') && !$('run').disabled) count.run++;
    if (e.target.closest?.('#optimize,#continuousGlobal') && !e.target.closest('button').disabled) count.screen++;
    if (e.target.closest?.('#download')) count.download++;
  }, true);

  /* ---------- input snapshot / practice values ---------- */
  const fields = () => [...document.querySelectorAll('.module-workspace input, .module-workspace select, .module-workspace textarea')]
    .filter(e => e.id && e.type !== 'file' && !e.closest('#helpCenter,#lessonPanel'));
  const fire = (e, t) => e.dispatchEvent(new Event(t, { bubbles: true }));
  function snapshot() { return fields().map(e => [e.id, e.type === 'checkbox' ? e.checked : e.value]); }
  function restore(s) {
    s.forEach(([id, v]) => { const e = $(id); if (!e) return; if (e.type === 'checkbox') e.checked = v; else e.value = v; });
    ['shape', 'triMode', 'storageMode', 'coeffMode'].forEach(id => $(id) && fire($(id), 'change'));
    s.forEach(([id]) => { const e = $(id); if (!e || id === 'case') return; fire(e, 'input'); fire(e, 'change'); });
  }
  function setv(id, v) { const e = $(id); if (!e) return; e.value = v; fire(e, 'input'); fire(e, 'change'); }
  function chk(id, v) { const e = $(id); if (e && e.checked !== v) { e.checked = v; fire(e, 'change'); } }
  function base() {
    setv('case', 'tri'); setv('triMode', 'times'); setv('tpeak', '30'); setv('recess', '30'); setv('storageMode', 'constant');
    setv('floor', '0'); setv('area', '180'); setv('h0', '0'); setv('coeffMode', 'fixed');
    chk('weirOn', true); chk('oriOn', false); chk('riserOn', false); chk('pipeOn', false);
    setv('cw', '1.70'); setv('bw', '0.20'); setv('crest', '0');
    FREE.forEach(id => chk(id, false)); setv('freeEvidenceRecord', ''); setv('screeningLimitRecord', '');
    setv('qallow', '0.080'); setv('hallow', '1.00'); setv('optConfig', 'weir');
  }
  const practiceEvidence = () => T('教學假設（僅供練習）：單一銳頂堰自由出流，不受尾水、回水、淹沒或操作控制影響。', 'Teaching assumption (practice only): single sharp-crested weir in free discharge, not affected by tailwater, backwater, submergence or operation.');
  const practiceLimit = () => T('教學假設（僅供練習）：Qallow = 0.080 m³/s、Hallow = 1.00 m。', 'Teaching assumption (practice only): Qallow = 0.080 m³/s, Hallow = 1.00 m.');
  function evidence() { FREE.forEach(id => chk(id, true)); setv('freeEvidenceRecord', practiceEvidence()); setv('screeningLimitRecord', practiceLimit()); }

  /* ---------- lessons ---------- */
  // step: {t: [zh, en], go: target, check: () => bool, demo: () => void, confirm: true, quiz: {q, options, answer}}
  const ranSince = n => () => count.run > n.run && !$('run').disabled;
  const LESSONS = [
    { id: 'L1', title: ['練習 1：第一次路由（示範案例）', 'Lesson 1: your first routing run'], goal: ['認識畫面，用示範案例跑一次路由並讀結果。', 'Learn the screen, route the demonstration case and read the result.'],
      setup: () => base(),
      steps: [
        { t: ['打開「設定與路由」，看模組 1 的「入流尖峰 Qp」，示範值是 0.120 m³/s。', 'Open "Setup and routing" and find "Peak inflow Qp" in Module 1. The demonstration value is 0.120 m³/s.'], go: 'qp', check: () => page() === 'route' },
        { t: ['捲到最下方，按「執行路由與評估」。', 'Scroll to the bottom and press "Run routing and evaluation".'], go: 'run', check: s => count.run > s.run, demo: () => $('run').click() },
        { t: ['系統自動切到模組 6。在結果表找到「質量平衡殘差 ε/Vin」，應接近 0 %。', 'The page switches to Module 6. In the result table, find the mass-balance residual ε/Vin; it should be close to 0 %.'], go: 'metricbody', confirm: true },
        { t: ['再找「出流尖峰 Qp,o」與「最高水位 Hmax」，比較出流尖峰是否小於入流尖峰 0.120。', 'Find "Peak outflow Qp,o" and "Maximum level Hmax". Check that peak outflow is below the 0.120 inflow peak.'], go: 'metricbody', confirm: true },
        { t: ['按「下載可追溯決策支援報告」保存紀錄。', 'Press "Download reproducible decision-support report" to keep the record.'], go: 'download', check: s => count.download > s.download, demo: () => $('download').click() }
      ] },
    { id: 'L2', title: ['練習 2：輸入自己的事件與池', 'Lesson 2: enter your own event and pond'], goal: ['學會修改入流、池面積與堰寬，並比較結果。', 'Change inflow, pond area and weir width, then compare results.'],
      setup: () => base(),
      steps: [
        { t: ['模組 1：把入流尖峰 Qp 改成 0.20。', 'Module 1: set peak inflow Qp to 0.20.'], go: 'qp', check: () => near('qp', 0.2), demo: () => setv('qp', '0.20') },
        { t: ['把洪峰到達時間 Tp 改成 20 分鐘、退水時間 Tr 改成 40 分鐘。總事件延時 T 會自動變成 60。', 'Set time to peak Tp to 20 min and recession time Tr to 40 min. The total duration T becomes 60 automatically.'], go: 'tpeak', check: () => near('tpeak', 20) && near('recess', 40), demo: () => { setv('tpeak', '20'); setv('recess', '40'); } },
        { t: ['模組 2：把平面面積 A 改成 250 m²。', 'Module 2: set plan area A to 250 m².'], go: 'area', check: () => near('area', 250), demo: () => setv('area', '250') },
        { t: ['模組 3：把堰寬 b 改成 0.30 m。', 'Module 3: set weir width b to 0.30 m.'], go: 'bw', check: () => near('bw', 0.3), demo: () => setv('bw', '0.30') },
        { t: ['按「執行路由與評估」。', 'Press "Run routing and evaluation".'], go: 'run', check: s => count.run > s.run, demo: () => $('run').click() },
        { t: ['讀尖峰比 RQ 與最高水位 Hmax。想一想：池面積變大、堰變寬，各會讓 Hmax 變高還是變低？', 'Read peak ratio RQ and maximum level Hmax. Think: does a larger pond or a wider weir raise or lower Hmax?'], go: 'metricbody', confirm: true },
        { quiz: { q: ['只把池面積變大、其他不變，最高水位 Hmax 通常會？', 'With only a larger pond area, the maximum level Hmax usually…'], options: [['變高', 'rises'], ['變低', 'falls'], ['不變', 'stays the same']], answer: 1, why: ['同樣的蓄水量分布在較大面積上，水位上升較少。', 'The same storage spreads over a larger area, so the level rises less.'] } }
      ] },
    { id: 'L3', title: ['練習 3：長延時事件與峰時判讀', 'Lesson 3: long-duration event and peak timing'], goal: ['了解寬平洪峰時，單一峰值時間不可靠。', 'See why a single peak time is unreliable for a broad peak.'],
      setup: () => base(),
      steps: [
        { t: ['模組 1：「標準案例」選「長延時事件」。', 'Module 1: choose "Long-duration event" as the standard case.'], go: 'case', check: () => $('case')?.value === 'long', demo: () => setv('case', 'long') },
        { t: ['按「執行路由與評估」。', 'Press "Run routing and evaluation".'], go: 'run', check: s => count.run > s.run, demo: () => $('run').click() },
        { t: ['在結果表找「尖峰比 RQ」、「近洪峰平坦指標 FPI95」、「中位體積時間」與「出流重心時間」。長延時事件的出流尖峰很平、持續很久（RQ 接近 1），單一峰值時刻不穩定，報告時要同時列出 FPI95 與體積時間指標。', 'In the table, find peak ratio RQ, near-peak flatness FPI95, median-volume time and outflow centroid time. A long event gives a flat, lasting outflow peak (RQ close to 1), so a single peak time is unstable; report FPI95 together with the volume-time measures.'], go: 'metricbody', confirm: true },
        { quiz: { q: ['洪峰很平時，報告時間應該優先使用？', 'For a flat peak, which timing should the report rely on?'], options: [['單一峰值時間', 'the single peak time'], ['體積時間指標（如中位體積時間、出流重心時間）', 'volume-time measures (median-volume time, outflow centroid time)'], ['不需要時間指標', 'no timing measure']], answer: 1, why: ['寬峰時峰值時間對微小擾動很敏感，體積時間指標較穩定。', 'With a broad peak, peak time is sensitive to small changes; volume-time measures are stable.'] } }
      ] },
    { id: 'L4', title: ['練習 4：找出並修正錯誤輸入', 'Lesson 4: find and fix a wrong input'], goal: ['看懂灰色按鈕與紅框，學會修正。', 'Understand the grey button and red outline, and fix the input.'],
      setup: () => base(),
      steps: [
        { t: ['模組 1：故意把入流尖峰 Qp 改成 0。', 'Module 1: deliberately set peak inflow Qp to 0.'], go: 'qp', check: () => !(num('qp') > 0), demo: () => setv('qp', '0') },
        { t: ['到模組 4：執行按鈕變灰，上方列出「入流尖峰 Qp 必須大於 0」，Qp 欄位被紅框標示。點清單中的欄位名稱會跳回欄位。', 'Go to Module 4: the run button is grey, the list above it says Qp must be greater than 0, and the Qp field is outlined in red. Clicking the list item jumps to the field.'], go: 'run', check: () => $('run').disabled && (H()?.inputProblems() || []).some(p => p.id === 'qp'), confirm: true },
        { t: ['把 Qp 改回 0.120，紅框與清單會消失，按鈕恢復可按。', 'Set Qp back to 0.120. The outline and list disappear and the button is enabled.'], go: 'qp', check: () => near('qp', 0.12) && !$('run').disabled, demo: () => setv('qp', '0.120') },
        { t: ['再試一次：把初始水位 H0 改成 −0.1（低於池底），看清單怎麼說，再改回 0。', 'Try again: set the initial level H0 to −0.1 (below the floor), read the list, then set it back to 0.'], go: 'h0', check: () => near('h0', 0) && !$('run').disabled, demo: () => setv('h0', '0'), confirm: true }
      ] },
    { id: 'L5', title: ['練習 5：受限設計篩選（找到可行解）', 'Lesson 5: constrained screening with a feasible result'], goal: ['完成自由出流證據、限制條件，執行篩選並下載報告。', 'Complete free-discharge evidence and limits, run screening and download the report.'],
      setup: () => base(),
      steps: [
        { t: ['模組 3：勾選「已確認自由出流邊界」。實務上只有在您有圖說或現地檢查時才勾；本練習是教學假設。', 'Module 3: tick "Free-discharge boundary confirmed". In practice tick it only with drawings or a field check; here it is a teaching assumption.'], go: 'freeDischarge', check: () => yes('freeDischarge'), demo: () => chk('freeDischarge', true) },
        { t: ['勾選下方四項檢核：尾水、回水／管摩阻、淹沒、操作控制。', 'Tick the four checks below: tailwater, backwater / pipe friction, submergence, operational control.'], go: 'freeTailwater', check: () => FREE.every(yes), demo: () => FREE.forEach(id => chk(id, true)) },
        { t: ['填寫兩項紀錄：「自由出流證據紀錄」與「篩選限制依據」（練習時可按「示範這一步」填入教學假設）。', 'Fill in the two records: free-discharge evidence and screening-limit source ("Show me" fills in the teaching assumption).'], go: 'freeEvidenceRecord', check: () => $('freeEvidenceRecord').value.trim() && $('screeningLimitRecord').value.trim(), demo: () => { setv('freeEvidenceRecord', practiceEvidence()); setv('screeningLimitRecord', practiceLimit()); } },
        { t: ['按「執行路由與評估」，讓路由結果與目前輸入一致。', 'Press "Run routing and evaluation" so the result matches the current inputs.'], go: 'run', check: s => count.run > s.run, demo: () => $('run').click() },
        { t: ['到模組 5，確認容許出流 Qallow = 0.080、容許水位 Hallow = 1.00。', 'Open Module 5 and check Qallow = 0.080 and Hallow = 1.00.'], go: 'qallow', confirm: true, check: () => page() === 'screen' && near('qallow', 0.08) && near('hallow', 1), demo: () => { setv('qallow', '0.080'); setv('hallow', '1.00'); NAV().openTarget('mod-optimization'); } },
        { t: ['按「執行受限設計篩選」。完成後頁面會自動切到模組 6 顯示結果。', 'Press "Run constrained design screening". The page then shows the result in Module 6.'], go: 'optimize', check: s => count.screen > s.screen && H()?.screeningOutcome() === 'feasible', demo: () => $('optimize').click() },
        { t: ['閱讀選定的池面積 A、堰寬 b、出流尖峰與最高水位是否都在限制內。這仍不是最終工程設計。', 'Read the selected area A, weir width b, peak outflow and maximum level against the limits. It is still not a final design.'], go: 'optout', confirm: true },
        { t: ['下載可追溯報告。', 'Download the traceable report.'], go: 'download', check: s => count.download > s.download, demo: () => $('download').click() }
      ] },
    { id: 'L6', title: ['練習 6：無可行解與阻擋診斷', 'Lesson 6: no feasible solution and the block'], goal: ['看懂「阻擋」、主導限制與正確的修正方式。', 'Read the block, the dominant limit and the right way to respond.'],
      setup: () => { base(); evidence(); },
      steps: [
        { t: ['到模組 5，把容許出流 Qallow 改成 0.010（很嚴格的限制）。', 'Open Module 5 and set Qallow to 0.010 (a very strict limit).'], go: 'qallow', check: () => near('qallow', 0.01), demo: () => setv('qallow', '0.010') },
        { t: ['按「執行受限設計篩選」。', 'Press "Run constrained design screening".'], go: 'optimize', check: s => count.screen > s.screen && H()?.screeningOutcome() === 'infeasible', demo: () => $('optimize').click() },
        { t: ['模組 6 顯示「阻擋」，三步判讀列出主導限制，並有「前往修正」連結。系統不會顯示「通過」。', 'Module 6 shows "Blocked"; the three-step check lists the dominant limit with "Go to fix" links. It never shows "pass".'], go: 'mod-evaluation', confirm: true },
        { quiz: { q: ['遇到無可行解，正確做法是？', 'With no feasible solution, the right response is…'], options: [['把 Qallow 放寬到很大，直到出現解', 'relax Qallow until a solution appears'], ['依工程依據調整池面積或出口尺寸，或擴大有依據的搜尋邊界', 'change pond area or outlet size on engineering grounds, or widen bounds you can justify'], ['忽略阻擋，直接用路由結果', 'ignore the block and use the routing result']], answer: 1, why: ['Qallow、Hallow 來自法規或設計準則，不能為了得到解而放寬。', 'Qallow and Hallow come from regulations or criteria; they are not relaxed to obtain a solution.'] } },
        { t: ['把 Qallow 改回 0.080 結束本練習。', 'Set Qallow back to 0.080 to finish.'], go: 'qallow', check: () => near('qallow', 0.08), demo: () => setv('qallow', '0.080') }
      ] },
    { id: 'L7', title: ['練習 7：研究檢視模式（篩選鎖定）', 'Lesson 7: research-inspection mode (screening locked)'], goal: ['了解哪些出口設定只能看路由、不能做受限篩選。', 'Learn which outlet settings allow routing but lock screening.'],
      setup: () => { base(); evidence(); },
      steps: [
        { t: ['模組 3：在銳頂堰之外再勾選「矩形開口」，變成複合出口。', 'Module 3: tick "Rectangular opening" in addition to the weir, making a combined outlet.'], go: 'oriOn', check: () => yes('oriOn') && yes('weirOn'), demo: () => chk('oriOn', true) },
        { t: ['按「執行路由與評估」：路由仍可執行，結果可以看。', 'Press "Run routing and evaluation": routing still works and the result can be read.'], go: 'run', check: s => count.run > s.run, demo: () => $('run').click() },
        { t: ['到模組 5：受限篩選顯示「研究檢視：受限篩選鎖定」。AI 助理問「受限篩選為什麼鎖定？」也會說明原因。', 'Open Module 5: screening shows research inspection and is locked. Ask the assistant "Why is screening locked?" for the reason.'], go: 'mod-optimization', check: () => (H()?.screeningLocks() || []).some(l => l.id === 'weirOn'), confirm: true },
        { t: ['取消勾選「矩形開口」，回到單一被動堰流，鎖定原因消失。', 'Untick "Rectangular opening" to return to a single passive weir; the lock reason disappears.'], go: 'oriOn', check: () => !yes('oriOn') && !(H()?.screeningLocks() || []).some(l => l.id === 'weirOn'), demo: () => chk('oriOn', false) }
      ] }
  ];

  /* ---------- progress (per viewer, optional) ---------- */
  const KEY = 'pondgate.lessons.v1';
  const loadDone = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const saveDone = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage unavailable */ } };
  let done = loadDone();

  /* ---------- runner panel ---------- */
  const style = document.createElement('style');
  style.textContent = `
#lessonPanel{position:fixed;right:16px;top:96px;z-index:9997;width:min(360px,calc(100vw - 32px));background:#fff;border:2px solid #0b557d;border-radius:10px;box-shadow:0 10px 28px rgba(11,60,93,.25);color:#102a43;font-size:15px;line-height:1.5}
#lessonPanel[hidden]{display:none}
.ls-h{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:9px 12px;background:#0b557d;color:#fff;border-radius:7px 7px 0 0}
.ls-h strong{font-size:15px}.ls-h small{display:block;opacity:.85;font-size:12px}.ls-h button{border:0;background:none;color:#fff;font-size:20px;cursor:pointer;line-height:1}
.ls-b{padding:10px 12px}.ls-bar{height:6px;background:#e3ecf0;border-radius:3px;margin-bottom:8px}.ls-bar i{display:block;height:6px;background:#16803d;border-radius:3px}
.ls-state{margin:8px 0;padding:6px 9px;border-radius:5px;font-size:14px}.ls-state.wait{background:#fff8e7;border:1px solid #efd9a8}.ls-state.ok{background:#f1fcf4;border:1px solid #9fd8b2}
.ls-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ls-q label{display:block;margin:4px 0;cursor:pointer}
.ls-list{display:grid;gap:8px}.ls-card{border:1px solid #d6e3e8;border-radius:6px;padding:10px;background:#f8fbfc}.ls-card b{color:#0b3c5d}.ls-card .done{color:#16803d;font-weight:700;margin-left:6px}
@media(max-width:650px){#lessonPanel{top:auto;bottom:70px;right:8px;left:8px;width:auto;max-height:55vh;overflow:auto}}`;
  document.head.appendChild(style);
  const panel = document.createElement('section'); panel.id = 'lessonPanel'; panel.hidden = true; panel.setAttribute('aria-live', 'polite'); document.body.appendChild(panel);
  let cur = null, idx = 0, start = null, saved = null, confirmed = false, picked = null, timer = 0;

  function begin(id) {
    const L = LESSONS.find(l => l.id === id); if (!L) return;
    if (!window.confirm(T('開始練習會暫時換成練習用的輸入；結束時會還原您原本的輸入。要開始嗎？', 'The lesson temporarily loads practice inputs; your own inputs are restored when it ends. Start?'))) return;
    if (!saved) saved = snapshot();
    cur = L; idx = 0; L.setup(); enter(); panel.hidden = false; H()?.close?.(); render(); tick();
  }
  function enter() { start = { ...count }; confirmed = false; picked = null; const s = cur.steps[idx]; if (s && s.go && !s.quiz) setTimeout(() => H()?.go(s.go), 50); }
  function end(restoreInputs) {
    clearTimeout(timer); panel.hidden = true;
    if (restoreInputs && saved) { restore(saved); }
    saved = null; cur = null; renderList();
  }
  const stepOk = s => s.quiz ? picked === s.quiz.answer : s.check ? Boolean(s.check(start)) && (!s.confirm || confirmed) : confirmed;
  function render() {
    if (!cur) return; const s = cur.steps[idx], n = cur.steps.length, ok = stepOk(s);
    let body;
    if (s.quiz) {
      body = `<p><b>${T('小測驗', 'Quick check')}</b>：${esc(T(...s.quiz.q))}</p><div class="ls-q">${s.quiz.options.map((o, i) => `<label><input type="radio" name="lsq" value="${i}"${picked === i ? ' checked' : ''}> ${esc(T(...o))}</label>`).join('')}</div>` +
        (picked !== null ? `<div class="ls-state ${ok ? 'ok' : 'wait'}">${ok ? '✓ ' + esc(T('答對了。', 'Correct.')) + ' ' + esc(T(...s.quiz.why)) : esc(T('再想想看。', 'Not quite; try again.'))}</div>` : '');
    } else {
      const needCheck = Boolean(s.check), checkOk = needCheck ? Boolean(s.check(start)) : true;
      body = `<p>${esc(T(...s.t))}</p>` +
        `<div class="ls-state ${ok ? 'ok' : 'wait'}">${ok ? '✓ ' + esc(T('這一步完成了。', 'This step is done.')) : needCheck && !checkOk ? esc(T('等待您完成這一步…（系統會自動檢查）', 'Waiting for you to do this step… (checked automatically)')) : esc(T('看完後按「我看到了」。', 'When you have read it, press "I see it".'))}</div>` +
        `<div class="ls-acts">${s.go ? `<button type="button" class="hc-btn" data-ls="go">${T('帶我去', 'Take me there')}</button>` : ''}${s.demo && !ok ? `<button type="button" class="hc-btn" data-ls="demo">${T('示範這一步', 'Show me')}</button>` : ''}${(s.confirm || !s.check) && !confirmed && checkOk ? `<button type="button" class="hc-btn" data-ls="seen">${T('我看到了', 'I see it')}</button>` : ''}</div>`;
    }
    panel.innerHTML = `<div class="ls-h"><div><strong>${esc(T(...cur.title))}</strong><small>${T('步驟', 'Step')} ${idx + 1} / ${n}</small></div><button type="button" data-ls="close" aria-label="${T('結束練習', 'End lesson')}">×</button></div>
      <div class="ls-b"><div class="ls-bar"><i style="width:${Math.round(100 * idx / n)}%"></i></div>${body}
      <div class="ls-acts" style="justify-content:space-between;margin-top:10px"><button type="button" class="hc-btn" data-ls="prev"${idx ? '' : ' disabled'}>${T('上一步', 'Back')}</button><button type="button" class="hc-btn primary" data-ls="next"${ok ? '' : ' disabled'}>${idx === n - 1 ? T('完成練習', 'Finish lesson') : T('下一步', 'Next')}</button></div></div>`;
  }
  let lastOk = null;
  function tick() { clearTimeout(timer); if (!cur) return; const ok = stepOk(cur.steps[idx]); if (ok !== lastOk) { lastOk = ok; render(); } timer = setTimeout(tick, 500); }
  panel.addEventListener('change', e => { if (e.target.name === 'lsq') { picked = Number(e.target.value); lastOk = null; render(); } });
  panel.addEventListener('click', e => {
    const a = e.target.closest('[data-ls]')?.dataset.ls; if (!a || !cur) return; const s = cur.steps[idx];
    if (a === 'close') { end(window.confirm(T('結束練習並還原您原本的輸入？（取消＝保留練習輸入）', 'End the lesson and restore your own inputs? (Cancel keeps the practice inputs)'))); return; }
    if (a === 'go' && s.go) H()?.go(s.go);
    if (a === 'demo' && s.demo) s.demo();
    if (a === 'seen') confirmed = true;
    if (a === 'prev' && idx > 0) { idx--; enter(); }
    if (a === 'next' && stepOk(s)) {
      if (idx < cur.steps.length - 1) { idx++; enter(); }
      else { done[cur.id] = true; saveDone(done); const keep = !window.confirm(T('恭喜完成！要還原您原本的輸入嗎？（取消＝保留練習輸入）', 'Well done! Restore your own inputs? (Cancel keeps the practice inputs)')); end(!keep); return; }
    }
    lastOk = null; render();
  });

  /* ---------- lesson list inside "Start here" ---------- */
  function listHtml() {
    return `<p>${T('跟著練習一步一步操作，每一步做完系統會自動打勾。做完 7 個練習，就會用整個軟體。練習會暫時換成練習輸入，結束時可還原。', 'Follow each lesson step by step; each step is checked automatically. After all seven lessons you will have used the whole software. Lessons load practice inputs and can restore yours at the end.')}</p>
      <div class="ls-list">${LESSONS.map(l => `<div class="ls-card"><b>${esc(T(...l.title))}</b>${done[l.id] ? `<span class="done">✓ ${T('已完成', 'done')}</span>` : ''}<br>${esc(T(...l.goal))}<div class="ls-acts"><button type="button" class="hc-btn primary" data-lesson="${l.id}">${done[l.id] ? T('再做一次', 'Do again') : T('開始', 'Start')}</button></div></div>`).join('')}</div>`;
  }
  function renderList() { const el = document.getElementById('hcLessons'); if (el) el.innerHTML = listHtml(); }
  document.addEventListener('click', e => { const l = e.target.closest?.('[data-lesson]'); if (l) { e.preventDefault(); begin(l.dataset.lesson); } }, true);
  const hc = document.getElementById('helpCenter');
  if (hc) new MutationObserver(() => { const el = document.getElementById('hcLessons'); if (el && !el.firstChild) renderList(); }).observe(hc, { childList: true, subtree: true });
  new MutationObserver(() => { if (cur) { lastOk = null; render(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  renderList();
  window.PondGateLessons = Object.freeze({ list: () => LESSONS.map(l => l.id), begin, end, state: () => cur ? { id: cur.id, step: idx, ok: stepOk(cur.steps[idx]) } : null, count: () => ({ ...count }), version: '1.1.0' });
})();
