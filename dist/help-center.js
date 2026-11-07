/* PondGate v1.1 help centre: start-here page, live next-step hint, user manual, glossary,
   field help, invalid-field list and an offline rule-based assistant.
   Presentation only. It reads the visible interface state and never writes input values,
   never calls the routing core, and never sends data out of the browser.
   It never reports "pass": blocked states are described as blocked. */
(() => {
  const C = window.PondGateHelpContent; if (!C) return;
  const zh = () => document.documentElement.lang === 'zh-Hant';
  const T = (a, b) => zh() ? a : b;
  const $ = id => document.getElementById(id);
  const num = id => Number($(id)?.value);
  const yes = id => Boolean($(id)?.checked);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- where each field lives ---------- */
  const MODULE_OF = {};
  [['mod-inflow', 'case qp shape triMode tpeak recess tpratio rise plateau recessLong dur points'],
   ['mod-storage', 'storageMode floor storageFile storageTable area h0'],
   ['mod-outlet', 'weirOn cw bw crest oriOn cd ao oriH oriW invert riserOn pipeOn coeffMode coeffSource coeffUrl cwPreset cdPreset freeDischarge freeTailwater freeBackwater freeSubmergence freeOperation freeEvidenceRecord screeningLimitRecord'],
   ['mod-routing', 'run'],
   ['mod-optimization', 'qallow hallow optConfig optMode optObjective href drainHours residualPct optBmin optBmax optAomin optAomax contAmin contAmax optimize continuousGlobal'],
   ['mod-evaluation', 'download metricbody'],
   ['teachingAssistant', 'teachDemo']
  ].forEach(([m, ids]) => ids.split(' ').forEach(id => { MODULE_OF[id] = m; }));
  const MODULES = ['mod-inflow', 'mod-storage', 'mod-outlet', 'mod-routing', 'mod-optimization', 'mod-evaluation', 'teachingAssistant', 'qualityAssurance', 'helpCenter'];

  function go(target) {
    const nav = window.DSSWorkspacePages; if (!nav) return;
    closeDrawer();
    if (target.startsWith('help:')) { nav.openTarget('helpCenter'); showTab(target.slice(5)); return; }
    if (MODULES.includes(target)) { nav.openTarget(target); setTimeout(() => $(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); return; }
    const mod = MODULE_OF[target] || $(target)?.closest('.module-card')?.id;
    if (mod) nav.openTarget(mod);
    setTimeout(() => {
      const el = $(target); if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('hc-flash'); setTimeout(() => el.classList.remove('hc-flash'), 2200);
      try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }, 80);
  }

  /* ---------- reading the interface state (mirrors the route-readiness rule in module-shell.js) ---------- */
  function inputProblems() {
    const P = [], add = (id, a, b) => P.push({ id, msg: T(a, b) });
    const shape = $('shape')?.value, floor = num('floor'), h0 = num('h0');
    const weir = yes('weirOn'), ori = yes('oriOn'), riser = yes('riserOn'), pipe = yes('pipeOn');
    if (!(num('qp') > 0)) add('qp', '入流尖峰 Qp 必須大於 0', 'Peak inflow Qp must be greater than 0');
    if (!(num('dur') > 0)) add(shape === 'long' ? 'rise' : shape === 'custom' ? 'points' : 'tpeak', '總事件延時 T 必須大於 0（由入流各段時間自動計算）', 'Total event duration T must be greater than 0 (it is added up from the inflow segment times)');
    if (!Number.isFinite(floor)) add('floor', '池底高程 Hfloor 必須是數字', 'Floor elevation Hfloor must be a number');
    if (!Number.isFinite(h0)) add('h0', '初始水位 H0 必須是數字', 'Initial level H0 must be a number');
    else if (Number.isFinite(floor) && h0 < floor) add('h0', '初始水位 H0 不可低於池底高程 Hfloor', 'Initial level H0 must not be below the floor elevation Hfloor');
    if ($('storageMode')?.value !== 'table' && !(num('area') > 0)) add('area', '平面面積 A 必須大於 0', 'Plan area A must be greater than 0');
    if (weir) {
      if (!(num('cw') > 0)) add('cw', '堰流係數 Cw 必須大於 0', 'Weir coefficient Cw must be greater than 0');
      if (!(num('bw') > 0)) add('bw', '堰寬 b 必須大於 0', 'Weir width b must be greater than 0');
      if (!(num('crest') >= floor)) add('crest', '堰頂高程不可低於池底高程 Hfloor', 'Weir crest must not be below Hfloor');
    }
    if (ori) {
      if (!(num('cd') > 0)) add('cd', '開口流量係數 Cd 必須大於 0', 'Opening coefficient Cd must be greater than 0');
      if (!(num('ao') > 0)) add('ao', '開口面積 Ao 必須大於 0', 'Opening area Ao must be greater than 0');
      if (!(num('invert') >= floor)) add('invert', '開口底高程不可低於池底高程 Hfloor', 'Opening invert must not be below Hfloor');
    }
    if (!(weir || ori || riser || pipe)) add('weirOn', '至少要啟用一種出口（例如銳頂堰）', 'Enable at least one outlet (for example the sharp-crested weir)');
    if ($('coeffMode')?.value === 'table' && !($('coeffSource')?.value.trim() && /^https?:\/\//.test($('coeffUrl')?.value.trim() || '')))
      add('coeffMode', '使用係數表時必須填寫係數來源與網址（http:// 或 https://）', 'A coefficient table needs a source and a URL (http:// or https://)');
    return P;
  }
  let userRan = false, changedAfterRun = false;
  function screeningLocks() {
    const L = [], add = (id, a, b) => L.push({ id, msg: T(a, b) });
    const weir = yes('weirOn'), ori = yes('oriOn'), riser = yes('riserOn'), pipe = yes('pipeOn');
    if (riser || pipe || (weir && ori)) add('weirOn', '出口組合屬研究檢視：受限篩選只接受單一銳頂堰或單一矩形開口', 'The outlet combination is research inspection: screening accepts a single weir or a single rectangular opening only');
    if ($('coeffMode')?.value === 'table') add('coeffMode', '水位相關係數表屬研究檢視：受限篩選需要固定係數', 'A level-dependent coefficient table is research inspection: screening needs fixed coefficients');
    if (!yes('freeDischarge')) add('freeDischarge', '尚未勾選「已確認自由出流邊界」', '"Free-discharge boundary confirmed" is not ticked');
    const four = [['freeTailwater', '尾水位', 'tailwater'], ['freeBackwater', '回水／管摩阻', 'backwater / pipe friction'], ['freeSubmergence', '淹沒', 'submergence'], ['freeOperation', '操作控制', 'operational control']].filter(([id]) => !yes(id));
    if (four.length) add(four[0][0], '自由出流四項檢核未完成：' + four.map(x => x[1]).join('、'), 'Free-discharge checks not complete: ' + four.map(x => x[2]).join(', '));
    if (!$('freeEvidenceRecord')?.value.trim()) add('freeEvidenceRecord', '尚未填寫「自由出流證據紀錄」', 'The free-discharge evidence record is empty');
    if (!$('screeningLimitRecord')?.value.trim()) add('screeningLimitRecord', '尚未填寫「篩選限制依據」', 'The screening-limit record is empty');
    return L;
  }
  function screeningOutcome() {
    const g = document.querySelector('.diagnostic-guide .three-step')?.innerText || '';
    if (/無可行解|No feasible solution/.test(g)) return 'infeasible';
    if (/受限篩選完成|連續最佳化完成|Screening completed|Continuous optimization completed/.test(g)) return 'feasible';
    return 'none';
  }
  function blockText() {
    const o = $('optout'); const t = o && !o.classList.contains('hide') ? o.innerText.trim() : '';
    return /^(阻擋|Blocked|No feasible)/.test(t) ? t : '';
  }

  /* ---------- next step ---------- */
  function nextStep() {
    const P = inputProblems();
    if (P.length) return { kind: 'stop', title: T('先修正輸入，才能執行路由', 'Fix the inputs before routing'),
      body: T('「執行路由與評估」目前無法按。請修正下列欄位：', '"Run routing and evaluation" is disabled. Fix these fields:'), list: P };
    if (!userRan || changedAfterRun) return { kind: 'todo', title: T('按「執行路由與評估」', 'Press "Run routing and evaluation"'),
      body: !userRan ? T('目前載入的是示範案例（不是您的工程資料）。可以直接按執行看看結果，或先在模組 1–3 填入您的資料。', 'The demonstration case is loaded (not your engineering data). Run it to see the results, or enter your data in Modules 1–3 first.')
        : T('輸入已改變，舊結果已不適用，請重新執行。', 'Inputs changed, so the old result no longer applies. Run again.'),
      actions: [['run', T('前往執行按鈕', 'Go to the run button')], ['mod-inflow', T('前往模組 1', 'Go to Module 1')]] };
    const out = screeningOutcome();
    if (out === 'infeasible') return { kind: 'stop', title: T('受限篩選結果：阻擋（無可行解）', 'Screening result: blocked (no feasible solution)'),
      body: (blockText() || T('在目前宣告的限制與搜尋邊界內，沒有候選能同時符合所有條件。', 'No candidate within the declared limits and bounds meets every condition.')) + ' ' + T('請看模組 6 的三步判讀與「前往修正」連結；依工程依據調整池面積或出口尺寸，不要只為了得到解而放寬 Qallow 或 Hallow。', 'Read the three-step check and the "Go to fix" links in Module 6. Adjust pond area or outlet size on engineering grounds; do not relax Qallow or Hallow just to obtain a solution.'),
      actions: [['mod-evaluation', T('查看阻擋診斷', 'See the blocking diagnosis')], ['mod-optimization', T('回到模組 5', 'Back to Module 5')]] };
    if (out === 'feasible') return { kind: 'info', title: T('閱讀篩選結果並下載紀錄', 'Read the screening result and download the record'),
      body: T('篩選已找到符合宣告條件的案例。請在模組 6 確認數值與適用範圍，再下載可追溯報告。此結果仍不是最終工程設計。', 'Screening found a case that meets the declared conditions. Check the values and scope in Module 6, then download the report. It is still not a final engineering design.'),
      actions: [['download', T('前往下載報告', 'Go to the report download')], ['mod-evaluation', T('查看結果', 'See the results')]] };
    const L = screeningLocks();
    if (L.length) return { kind: 'info', title: T('路由結果已產生：請到模組 6 閱讀', 'Routing result ready: read it in Module 6'),
      body: T('若只需要路由結果，到此即可下載報告。若要進一步做受限設計篩選，下列條件尚未滿足（只有在您真的有證據時才勾選或填寫）：', 'If you only need the routing result, you can download the report now. Constrained screening still needs the items below (tick or fill them only when you hold real evidence):'),
      list: L, actions: [['mod-evaluation', T('查看路由結果', 'See the routing result')], ['teachingAssistant', T('用教學案例練習篩選', 'Practise screening with the teaching case')]] };
    return { kind: 'todo', title: T('可以執行受限設計篩選', 'Constrained screening is available'),
      body: T('到模組 5 確認容許出流 Qallow、容許水位 Hallow 與搜尋邊界，再按「執行受限設計篩選」。', 'In Module 5, check Qallow, Hallow and the search bounds, then press "Run constrained design screening".'),
      actions: [['optimize', T('前往模組 5', 'Go to Module 5')]] };
  }
  function nextHtml(s) {
    const list = s.list ? '<ul class="hc-list">' + s.list.map(p => `<li><button type="button" class="hc-link" data-hc-go="${esc(p.id)}">${esc(p.msg)}</button></li>`).join('') + '</ul>' : '';
    const acts = (s.actions || []).map(([t, l]) => `<button type="button" class="hc-btn" data-hc-go="${esc(t)}">${esc(l)}</button>`).join('');
    return `<div class="hc-next ${s.kind}"><div class="hc-next-label">${T('下一步', 'Next step')}</div><strong>${esc(s.title)}</strong><p>${esc(s.body)}</p>${list}${acts ? '<div class="hc-actions">' + acts + '</div>' : ''}</div>`;
  }

  /* ---------- glossary helpers ---------- */
  const G = C.GLOSSARY.map(([id, tz, te, dz, de, target, keys]) => ({ id, tz, te, dz, de, target, keys }));
  const term = g => T(g.tz, g.te), def = g => T(g.dz, g.de);
  const FIELD_TERM = { qp: 'qp', tpeak: 'tp', recess: 'tr', dur: 'dur', storageMode: 'sh', area: 'area', floor: 'floor', h0: 'h0', cw: 'cw', bw: 'bw', crest: 'crest', cd: 'cd', ao: 'ao', invert: 'invert', freeDischarge: 'free', freeEvidenceRecord: 'records', qallow: 'qallow', hallow: 'hallow', href: 'href', drainHours: 'td' };

  /* ---------- offline assistant ---------- */
  const isAscii = s => /^[\x20-\x7e]+$/.test(s);
  const hit = (q, k) => isAscii(k) ? new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)').test(q) : q.includes(k);
  const INTENTS = [
    { k: ['為什麼不能按', '不能按', '按不下', '灰色', '灰的', '反灰', '無法執行', '沒反應', '不能執行', 'disabled', 'grey', 'gray', "can't run", 'cannot run', 'not run', 'nothing happens'], a: () => {
      const P = inputProblems();
      return P.length ? { text: T('執行按鈕被鎖住，是因為下列欄位不合理。點一下就會跳到該欄位：', 'The run button is locked because of these fields. Click one to jump to it:'), list: P }
        : { text: T('目前輸入都合理，「執行路由與評估」可以按。它在「設定與路由」頁最下方。', 'All inputs are valid, so "Run routing and evaluation" is available. It is at the bottom of "Setup and routing".'), actions: [['run', T('前往執行按鈕', 'Go to the run button')]] }; } },
    { k: ['無可行解', '沒有解', '找不到解', '阻擋', '被擋', 'blocked', 'no feasible', 'infeasible', 'no solution'], a: () => {
      const out = screeningOutcome();
      if (out === 'infeasible') return { text: (blockText() || '') + ' ' + T('這是系統刻意的阻擋，不是錯誤：在目前的限制與邊界內沒有設計能同時符合所有條件。請依「主導限制」調整池面積或出口尺寸，或擴大有工程依據的搜尋邊界；不要只為了得到解而放寬 Qallow 或 Hallow。', 'This is a deliberate block, not an error: no design within the current limits and bounds meets every condition. Adjust pond area or outlet size according to the dominant limit, or widen bounds you can justify. Do not relax Qallow or Hallow just to obtain a solution.'), actions: [['mod-evaluation', T('查看阻擋診斷', 'See the blocking diagnosis')]] };
      return { text: T('目前沒有「無可行解」的結果。當受限篩選或連續最佳化找不到符合所有條件的設計時，系統會顯示「阻擋」與主導限制，並提供「前往修正」連結，不會顯示「通過」。', 'There is no "no feasible solution" result now. When screening or optimization finds no design that meets every condition, the software shows "Blocked", the dominant limit and a "Go to fix" link. It never shows "pass".') }; } },
    { k: ['鎖定', '鎖住', '不能篩選', '無法篩選', '篩選不能', '篩選', '篩選按', '篩選不了', '篩選沒反應', '篩選灰', 'locked', 'lock', 'screening disabled', "can't screen", 'cannot screen'], a: () => {
      const L = screeningLocks();
      return L.length ? { text: T('受限設計篩選目前鎖定，原因如下。只有在您真的有證據時才勾選或填寫：', 'Constrained screening is locked for these reasons. Tick or fill them only when you hold real evidence:'), list: L, actions: [['teachingAssistant', T('用教學案例練習', 'Practise with the teaching case')]] }
        : { text: T('受限篩選的出口與證據條件都已滿足。到模組 5 按「執行受限設計篩選」。', 'The outlet and evidence conditions for screening are met. Press "Run constrained design screening" in Module 5.'), actions: [['optimize', T('前往模組 5', 'Go to Module 5')]] }; } },
    { k: ['下一步', '接下來', '卡住', '不知道', '怎麼開始', '如何開始', '從哪', '該做什麼', '要做什麼', 'next', 'stuck', 'start', 'begin', 'what now', 'what should', 'what do i do'], a: () => ({ next: nextStep() }) },
    { k: ['這是什麼', '能做什麼', '可以做什麼', '用途', '範圍', '功能', 'what is', 'what does', 'scope', 'purpose', 'can it'], a: () => ({ manual: 'scope' }) },
    { k: ['夠不夠', '夠用', '不夠用', '合格', '可以採用', '能不能用', '可不可以用', '是否足夠', '符合限制', '超過限制', 'good enough', 'enough', 'adequate', 'acceptable'], a: () => { /* v1.2.1: answer "is my pond good enough?" from the result and the declared limits */
      const v = window.PondGateBeginner?.verdict?.();
      return { text: (window.PondGateBeginner ? window.PondGateBeginner.verdictText(v) + ' ' : '') + T('判斷方法：比較兩件事，最高水位 Hmax 不可超過容許水位 Hallow，出流尖峰 Qp,o 不可超過容許出流 Qallow。結果頁最上方的「新手判讀」會直接列出這兩項；限制值在模組 5 設定，應依法規或設計準則填寫。', 'How to judge: compare two things. The maximum level Hmax must not exceed the allowable level Hallow, and the peak outflow Qp,o must not exceed the allowable outflow Qallow. The "Beginner check" at the top of the result page lists both; the limits are set in Module 5 from regulations or design criteria.'),
        actions: [['mod-evaluation', T('看新手判讀', 'See the beginner check')], ['mod-optimization', T('看限制值（模組 5）', 'See the limits (Module 5)')]] };
    } },
    { k: ['結果', '怎麼看', '判讀', '解讀', '表格', '圖', 'result', 'interpret', 'read the', 'chart', 'table'], a: () => ({ manual: 'm6', actions: [['mod-evaluation', T('前往模組 6', 'Go to Module 6')]] }) },
    { k: ['存專案', '存成專案', '儲存專案', '存檔', '保存', '開啟專案', '打開專案', '我的專案', '分享', '登出', '改密碼', '變更密碼', '忘記密碼', '帳號', '回收區', 'save project', 'open project', 'share', 'sign out', 'log out', 'password', 'account', 'trash'], a: () => {
      if (!window.PondGateAccounts?.active()) return { text: T('這個版本沒有登入帳號，不能存專案。要留下紀錄，請在模組 6 按「下載可追溯決策支援報告」。', 'This copy has no sign-in, so projects cannot be saved. To keep a record, press "Download the traceable decision-support report" in Module 6.'), actions: [['download', T('前往下載報告', 'Go to the report download')]] };
      return { text: T('登入後，畫面上方的帳號列有這些按鈕：', 'After sign-in, the account bar at the top has these buttons:'), html: T('<ul><li><b>存成專案</b>／<b>存檔／開啟專案</b>：把目前的輸入值存起來，下次登入再開啟；可勾選「分享給同公司的人」（他們只能看）。專案只存輸入，開啟後請重新按「執行」。</li><li><b>儲存</b>：開啟專案後出現，改了輸入要按它；有「● 有未儲存的變更」表示還沒存。</li><li><b>移到回收區</b>：刪除的專案可在「回收區」還原。</li><li><b>變更密碼</b>、<b>登出</b>：忘記密碼請洽貴公司的管理者重設。</li></ul><p>要把結果給別人看，請下載模組 6 的報告。</p>', '<ul><li><b>Save as project</b> / <b>Save / open projects</b>: store the current inputs and open them next time; you may tick "Share with my organisation" (read-only for others). Projects store inputs only; press Run again after opening.</li><li><b>Save</b>: appears once a project is open; press it after changing inputs. "● unsaved changes" means not yet saved.</li><li><b>To trash</b>: deleted projects can be restored from the Trash.</li><li><b>Password</b>, <b>Sign out</b>: if you forget your password, ask your organisation administrator.</li></ul><p>To show results to others, download the report in Module 6.</p>'), actions: [['download', T('前往下載報告', 'Go to the report download')]] }; } },
    { k: ['多大', '多少面積', '面積要', '池子大小', '尺寸要', '堰要多寬', '怎麼設計', '設計多大', 'how big', 'how large', 'what size', 'size the pond'], a: () => ({ text: T('PondGate 不會直接告訴您「池子要多大」，而是幫您檢查：先在模組 1–3 填入入流、池子與出口，按「執行」看出流尖峰與最高水位；再到模組 5「受限設計篩選」填入容許出流 Qallow 和容許水位 Hallow，系統會在您給的範圍內逐一試算，找出符合限制的池面積與出口尺寸。結果只是篩選，不是最終設計。', 'PondGate does not simply tell you how big the pond must be; it checks designs. Enter inflow, pond and outlet in Modules 1–3 and press Run to see peak outflow and maximum level. Then, in Module 5 "Constrained design screening", enter the allowable outflow Qallow and level Hallow; the software tries each candidate within your bounds and lists pond areas and outlet sizes that meet the limits. The result is screening, not a final design.'), actions: [['mod-optimization', T('前往模組 5', 'Go to Module 5')], ['help:lessons', T('先做引導練習', 'Try the guided lessons')]] }) },
    { k: ['下載', '怎麼下載', '報告', '匯出', 'download', 'report', 'export'], a: () => ({ manual: 'record', actions: [['download', T('前往下載報告', 'Go to the report download')]] }) },
    { k: ['匯入', 'csv', '上傳', '檔案', '格式', 'import', 'upload', 'file', 'format'], a: () => ({ text: T('三種匯入格式：', 'Three import formats:'), html: T('<ul><li><b>自訂入流</b>（模組 1，入流形狀選「匯入時間—流量對」）：每行「時間（分鐘）, 流量（m³/s）」，第一行時間為 0，時間遞增。</li><li><b>水位—蓄水量表</b>（模組 2）：.csv 或 .txt 兩欄，水位（m）、蓄水量（m³）。</li><li><b>外部模型結果</b>（模組 6）：第一列欄名，time_s 與 outflow_m3_s，完整比較另需 incremental_storage_m3。</li></ul>', '<ul><li><b>Custom inflow</b> (Module 1, shape "Imported time–discharge pairs"): one "time (min), discharge (m³/s)" pair per line, first time 0, times increasing.</li><li><b>Stage–storage table</b> (Module 2): .csv or .txt with two columns, level (m) and storage (m³).</li><li><b>External model result</b> (Module 6): column names in the first row, time_s and outflow_m3_s; a full comparison also needs incremental_storage_m3.</li></ul>') }) },
    { k: ['自由出流', '尾水', '回水', '淹沒', '操作控制', '四項', 'free discharge', 'free-discharge', 'tailwater', 'backwater', 'submerg'], a: () => ({ manual: 'm3', actions: [['freeDischarge', T('前往自由出流檢核', 'Go to the free-discharge checks')]] }) },
    { k: ['係數', 'coefficient'], a: () => ({ text: T('堰流係數 Cw 預設 1.70（臺灣實務矩形銳頂堰），開口流量係數 Cd 預設 0.62（標準銳緣孔口）。預設值只適合初步篩選；有現場校正值時請選「現場校正值」並填入。', 'The weir coefficient Cw preset is 1.70 (Taiwan practice, sharp-crested rectangular weir) and the opening coefficient Cd preset is 0.62 (standard sharp-edged orifice). Presets suit preliminary screening only; choose "Field-calibrated value" when you have one.'), actions: [['cw', T('前往係數欄位', 'Go to the coefficient fields')]] }) },
    { k: ['練習', '教學', '範例', '示範', '例子', 'practice', 'practise', 'tutorial', 'example', 'demo', 'teaching'], a: () => ({ text: T('「開始這裡 → 引導練習」有 7 個一步一步的練習案例，每一步會自動檢查。「教學與內部測試」頁另有四步自學、三題自我檢核，以及可執行受限篩選的教學案例。教學案例中的自由出流勾選只是練習假設。', '"Start here → Guided lessons" has seven step-by-step lessons, each step checked automatically. "Teaching and internal tests" also has a four-step guide, a three-question quiz and a teaching case that can run constrained screening. Its free-discharge ticks are practice assumptions only.'), actions: [['help:lessons', T('開始引導練習', 'Start the guided lessons')], ['teachingAssistant', T('前往教學頁', 'Go to the teaching page')]] }) },
    { k: ['語言', '英文', '中文', 'language', 'english', 'chinese'], a: () => ({ text: T('右上角的「English／中文」按鈕切換介面語言，輸入值和結果不會改變。', 'The "English / 中文" button at the top right switches the language. Inputs and results do not change.') }) },
    { k: ['可信', '準確', '驗證', '正確嗎', '精度', 'accurate', 'accuracy', 'valid', 'trust', 'reliable', 'verified'], a: () => ({ text: T('每次發版都用 176 組實驗室案例（352 條原始歷線）重跑 RK4 核心，尖峰流量平均絕對相對誤差（MARE）A 2.924 %、B 2.954 %、C 4.104 %、D 4.649 %。與 HEC-HMS、SWMM 的比較只稱「數值一致性」，不是現地校準或普遍驗證；已驗證範圍僅限被動堰流與矩形開口。', 'Each release reruns 176 laboratory cases (352 raw series) through the RK4 core. Peak-discharge MARE: A 2.924 %, B 2.954 %, C 4.104 %, D 4.649 %. Comparison with HEC-HMS and SWMM is numerical consistency only, not field calibration or general validation. The tested envelope covers passive weirs and rectangular openings only.') }) },
    { k: ['外部模型', '交叉', 'swmm', 'hec', 'hms', 'cross', 'external'], a: () => ({ manual: 'cross', actions: [['mod-evaluation', T('前往模組 6', 'Go to Module 6')]] }) },
    { k: ['隱私', '個資', '傳送', '上傳到', '資料會', '外流', '金鑰', 'privacy', 'private', 'send', 'leave', 'server', 'api key'], a: () => ({ text: T('不會傳送任何資料。計算、說明與本助理都在您的瀏覽器內執行；本助理是離線規則式說明，不連線到任何外部 AI 服務。', 'Nothing is sent. Calculation, help and this assistant all run in your browser. This assistant is an offline rule-based guide and does not connect to any external AI service.') }) },
    { k: ['設計核准', '直接用', '最終設計', '核定', '可以用來設計', 'final design', 'approve', 'approval', 'use for design'], a: () => ({ text: T('不行。PondGate 的結果只在您宣告的入流、S(H)、出口律與限制條件下成立，不是最終工程設計，也不是現地驗證。工程責任仍由合格專業人員承擔。', 'No. PondGate results hold only under your declared inflow, S(H), outlet law and limits. They are not a final engineering design or field validation. A qualified engineer remains responsible.') }) },
    { k: ['手冊', '說明書', '說明', 'manual', 'guide', 'help'], a: () => ({ text: T('「開始這裡」頁有兩份手冊：「使用手冊（精簡版）」，以及給學生一步一步跟著做的「完整版操作手冊」（繁體中文，附截圖、檢核表與練習題），兩份都可以下載。', 'The "Start here" page has two manuals: the short user manual, and a full step-by-step guide for students (Traditional Chinese, with screenshots, a checklist and exercises). Both can be downloaded.'), actions: [['help:manual', T('打開使用手冊', 'Open the user manual')]] }) },
    { k: ['你好', '嗨', '哈囉', '您好', 'hello', 'hi', 'hey'], a: () => ({ text: T('您好，我是 PondGate 的離線說明助理。可以問我「下一步要做什麼」、「為什麼按鈕不能按」、「Qallow 是什麼」等問題。我不會改動您的輸入，也不做工程判斷。', 'Hello, I am the PondGate offline help assistant. Ask me "what should I do next", "why is the button grey" or "what is Qallow". I never change your inputs and I do not make engineering judgements.') }) }
  ];
  function answer(raw) {
    const q = raw.toLowerCase().trim(); if (!q) return null;
    let best = null, score = 0;
    INTENTS.forEach((it, i) => { const s = it.k.filter(k => hit(q, k.toLowerCase())).length; if (s > score) { score = s; best = it; } });
    const terms = G.filter(g => g.keys.some(k => hit(q, k.toLowerCase())));
    const askDef = /是什麼|什麼是|意思|定義|代表|what is|what's|meaning|define|stands for/.test(q);
    if (terms.length && (askDef || !best)) return { terms: terms.slice(0, 3) };
    if (best) { const r = best.a(); if (terms.length && !r.terms) r.terms = terms.slice(0, 2); return r; }
    return { text: T('抱歉，我是離線規則式助理，只能回答 PondGate 的操作與名詞問題。可以試試下面的常見問題，或打開使用手冊。', 'Sorry, I am an offline rule-based assistant and can answer only PondGate operation and terminology questions. Try a common question below or open the user manual.'), actions: [['help:manual', T('打開使用手冊', 'Open the user manual')], ['help:glossary', T('打開名詞表', 'Open the glossary')]] };
  }
  function answerHtml(r) {
    let h = '';
    if (r.next) h += nextHtml(r.next);
    if (r.text) h += `<p>${esc(r.text)}</p>`;
    if (r.html) h += r.html;
    if (r.manual) { const s = C.MANUAL.find(m => m.id === r.manual); if (s) { const c = zh() ? s.zh : s.en; h += `<p><b>${esc(c.t)}</b></p>${c.h}`; } }
    if (r.list) h += '<ul class="hc-list">' + r.list.map(p => `<li><button type="button" class="hc-link" data-hc-go="${esc(p.id)}">${esc(p.msg)}</button></li>`).join('') + '</ul>';
    if (r.terms) h += r.terms.map(g => `<div class="hc-term"><b>${esc(term(g))}</b><br>${esc(def(g))} <button type="button" class="hc-link" data-hc-go="${esc(g.target)}">${T('看欄位', 'Show field')}</button></div>`).join('');
    if (r.actions) h += '<div class="hc-actions">' + r.actions.map(([t, l]) => `<button type="button" class="hc-btn" data-hc-go="${esc(t)}">${esc(l)}</button>`).join('') + '</div>';
    return h;
  }
  const QUICK = () => T(['下一步要做什麼？', '為什麼執行按鈕不能按？', '受限篩選為什麼鎖定？', '出現無可行解怎麼辦？', 'Qallow 是什麼？', '資料會傳出去嗎？'],
    ['What should I do next?', 'Why is the run button grey?', 'Why is screening locked?', 'What if there is no feasible solution?', 'What is Qallow?', 'Is my data sent anywhere?']);

  /* ---------- styles ---------- */
  const style = document.createElement('style');
  style.textContent = `
#helpCenter{border:1px solid #c9dbe3;border-radius:8px;background:#fff;padding:16px 18px;color:#102a43}
#helpCenter h2{margin:0 0 4px;font-size:22px;color:#0b3c5d}#helpCenter .hc-lead{margin:0 0 12px;color:#425b6d}
.sg .sg-fig{margin:12px 0}.sg .sg-fig img{max-width:100%;border:1px solid #c9dbe3;border-radius:6px}.sg figcaption{font-weight:700}.sg .sg-notes{font-size:14px;margin:4px 0}.sg .sg-k{font-weight:700;color:#0b557d;margin:8px 0 2px}.sg h4{color:#0b3c5d;margin:18px 0 4px}.sg .sg-tw{overflow-x:auto}.sg .sg-t{border-collapse:collapse;font-size:14px}.sg .sg-t th,.sg .sg-t td{border:1px solid #c9dbe3;padding:3px 6px;text-align:left;vertical-align:top}.sg .sg-tt{font-weight:700;margin:10px 0 4px}.sg .sg-check{list-style:none;padding-left:0}
.hc-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px;border-bottom:1px solid #d6e3e8;padding-bottom:8px}
.hc-tab{border:1px solid #b9d4df;background:#f6fafc;color:#123247;border-radius:5px;padding:7px 12px;font:inherit;font-size:15px;cursor:pointer}
.hc-tab.active{background:#0b557d;color:#fff;border-color:#0b557d}
.hc-pane[hidden]{display:none!important}.hc-pane{font-size:15.5px;line-height:1.6}
.hc-pane ul,.hc-pane ol{padding-left:22px;margin:6px 0 10px}.hc-pane li{margin:3px 0}
.hc-pane code{background:#eef4f7;padding:1px 4px;border-radius:3px}
.hc-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:12px 0}
.hc-step{border:1px solid #d6e3e8;border-radius:6px;padding:10px;background:#f8fbfc}.hc-step b{display:block;color:#0b557d;margin-bottom:3px}
.hc-next{border:1px solid #9cc3d6;border-left:6px solid #0b557d;border-radius:6px;background:#f1f8fc;padding:10px 12px;margin:8px 0}
.hc-next.stop{border-left-color:#b42318;background:#fff4f2;border-color:#f0b8b0}.hc-next.info{border-left-color:#b7791f;background:#fffaf0;border-color:#efd9a8}
.hc-next-label{font-size:12px;font-weight:700;letter-spacing:.04em;color:#526a78;text-transform:uppercase}.hc-next p{margin:4px 0}
.hc-list{margin:4px 0 6px;padding-left:20px}.hc-link{border:0;background:none;color:#0b557d;text-decoration:underline;cursor:pointer;font:inherit;padding:0;text-align:left}
.hc-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.hc-btn{border:1px solid #0b557d;background:#fff;color:#0b557d;border-radius:5px;padding:5px 10px;font:inherit;font-size:14px;cursor:pointer}.hc-btn.primary{background:#0b557d;color:#fff}
.hc-man details{border:1px solid #d6e3e8;border-radius:6px;margin:6px 0;background:#fff}.hc-man summary{cursor:pointer;padding:9px 12px;font-weight:700;color:#0b3c5d}
.hc-man details>div{padding:0 14px 8px}
.hc-fig{margin:12px 0}.hc-fig img{display:block;max-width:100%;height:auto;border:1px solid #c9dbe3;border-radius:6px}.hc-fig figcaption{font-weight:700;margin-top:5px;color:#0b3c5d}.hc-fig-notes{margin:4px 0 0;padding-left:22px;font-size:14px;color:#334e5e}
.hc-gloss input{width:100%;box-sizing:border-box;padding:8px 10px;font:inherit;border:1px solid #9eb4c1;border-radius:5px;margin-bottom:8px}
.hc-term{border-bottom:1px solid #e3ecf0;padding:7px 2px}
#helpFab{position:fixed;left:16px;bottom:16px;z-index:9998;border:0;border-radius:24px;background:#0b557d;color:#fff;padding:11px 16px;font:inherit;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(11,60,93,.3);cursor:pointer}
#helpDrawer{position:fixed;left:16px;bottom:70px;z-index:9999;width:min(420px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 100px));display:flex;flex-direction:column;background:#fff;border:1px solid #9cc3d6;border-radius:10px;box-shadow:0 10px 30px rgba(11,60,93,.25);color:#102a43}
#helpDrawer[hidden]{display:none}
.hc-dh{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #d6e3e8;background:#f1f8fc;border-radius:10px 10px 0 0}
.hc-dh strong{font-size:16px}.hc-dh small{display:block;color:#526a78;font-size:12px}.hc-x{border:0;background:none;font-size:22px;cursor:pointer;color:#425b6d}
.hc-log{flex:1;overflow:auto;padding:10px 12px;font-size:15px;line-height:1.55}
.hc-msg{margin:6px 0}.hc-msg.me{text-align:right}.hc-msg.me span{display:inline-block;background:#0b557d;color:#fff;border-radius:12px 12px 2px 12px;padding:6px 10px}
.hc-msg.bot{background:#f6fafc;border:1px solid #e0eaef;border-radius:8px;padding:8px 10px}.hc-msg.bot ul{padding-left:20px;margin:4px 0}
.hc-quick{display:flex;flex-wrap:wrap;gap:5px;padding:6px 12px}.hc-chip{border:1px solid #b9d4df;background:#fff;border-radius:14px;padding:4px 9px;font:inherit;font-size:13px;cursor:pointer;color:#123247}
.hc-form{display:flex;gap:6px;padding:10px 12px;border-top:1px solid #d6e3e8}.hc-form input{flex:1;padding:8px 10px;font:inherit;border:1px solid #9eb4c1;border-radius:5px;min-width:0}
.hc-note{font-size:12px;color:#526a78;padding:0 12px 8px}
.hc-q{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-left:5px;border:1px solid #7fa7bb;border-radius:50%;background:#fff;color:#0b557d;font-size:12px;font-weight:700;line-height:1;cursor:pointer;vertical-align:middle;padding:0}
.hc-invalid{outline:3px solid #d92d20!important;outline-offset:1px}.hc-flash{animation:hcflash 2s ease}
@keyframes hcflash{0%,60%{box-shadow:0 0 0 4px #fbbf24}100%{box-shadow:none}}
#hcRunFix{margin:6px 0 8px}
@media(max-width:650px){#helpFab{left:12px;bottom:12px;padding:9px 13px}#helpDrawer{left:8px;right:8px;width:auto;bottom:62px}}`;
  document.head.appendChild(style);

  /* ---------- help page ---------- */
  const page = document.querySelector('.workspace-page[data-page="help"]') || document.querySelector('.module-workspace');
  const box = document.createElement('section'); box.id = 'helpCenter'; page?.appendChild(box);
  let activeTab = 'start';
  function showTab(id) { activeTab = id; renderPage(); box.scrollIntoView({ block: 'start' }); }
  const FIGS = (C.FIGURES || []).map((f, i) => ({ sec: f[0], file: f[1], cz: f[2], ce: f[3], notes: f[4], n: i + 1 }));
  const figSrc = f => `manual/${zh() ? 'zh' : 'en'}/${f.file}.png`;
  function figHtml(f, src) {
    return `<figure class="hc-fig"><img src="${src || figSrc(f)}" loading="lazy" alt="${esc(T(f.cz, f.ce))}"><figcaption>${T('圖', 'Figure')} ${f.n}${T('：', '. ')}${esc(T(f.cz, f.ce))}</figcaption><ol class="hc-fig-notes">${f.notes.map(x => `<li>${esc(T(x[0], x[1]))}</li>`).join('')}</ol></figure>`;
  }
  function manualHtml(forFile, srcMap) {
    return C.MANUAL.map(s => { const c = zh() ? s.zh : s.en; const figs = FIGS.filter(f => f.sec === s.id).map(f => figHtml(f, srcMap && srcMap[f.file])).join('');
      return forFile ? `<h2>${esc(c.t)}</h2>${c.h}${figs}` : `<details${s.id === 'quick' ? ' open' : ''}><summary>${esc(c.t)}</summary><div>${c.h}${figs}</div></details>`; }).join('');
  }
  function glossHtml(filter) {
    const f = (filter || '').toLowerCase();
    return G.filter(g => !f || (g.tz + g.te + g.dz + g.de + g.keys.join(' ')).toLowerCase().includes(f))
      .map(g => `<div class="hc-term"><b>${esc(term(g))}</b>（${esc(zh() ? g.te : g.tz)}）<br>${esc(def(g))} <button type="button" class="hc-link" data-hc-go="${esc(g.target)}">${T('看欄位', 'Show field')}</button></div>`).join('') || `<p>${T('找不到符合的名詞。', 'No matching term.')}</p>`;
  }
  function renderPage() {
    const tabs = [['start', T('開始這裡', 'Start here')], ['lessons', T('引導練習', 'Guided lessons')], ['manual', T('使用手冊（精簡版）', 'User manual (short)')], ['guide', T('完整版操作手冊', 'Full step-by-step guide')], ['glossary', T('名詞表', 'Glossary')], ['assistant', T('AI 助理', 'AI assistant')]];
    const steps = T([['1 設定入流', '模組 1：尖峰流量與歷線形狀。', 'mod-inflow'], ['2 設定池與出口', '模組 2–3：池面積、池底高程、堰或開口。', 'mod-storage'], ['3 執行路由', '模組 4：按「執行路由與評估」。', 'run'], ['4 讀結果、存紀錄', '模組 6：先看質量平衡，再看尖峰與水位。', 'mod-evaluation'], ['5（選用）受限篩選', '模組 5：需有自由出流證據。', 'mod-optimization']],
      [['1 Set the inflow', 'Module 1: peak discharge and hydrograph shape.', 'mod-inflow'], ['2 Set pond and outlet', 'Modules 2–3: area, floor elevation, weir or opening.', 'mod-storage'], ['3 Run routing', 'Module 4: press "Run routing and evaluation".', 'run'], ['4 Read and record', 'Module 6: check mass balance first, then peaks and levels.', 'mod-evaluation'], ['5 (optional) Screening', 'Module 5: needs free-discharge evidence.', 'mod-optimization']]);
    const panes = {
      start: `<div id="hcNextPage">${nextHtml(nextStep())}</div>
        <div class="hc-steps">${steps.map(([a, b, t]) => `<div class="hc-step"><b>${esc(a)}</b>${esc(b)}<div class="hc-actions"><button type="button" class="hc-btn" data-hc-go="${t}">${T('前往', 'Go')}</button></div></div>`).join('')}</div>
        <p>${T('第一次使用？目前已載入示範案例，可以直接到模組 4 按執行，看看結果長什麼樣子。想練習完整流程（含受限篩選），請用教學案例。', 'First time? The demonstration case is loaded, so you can press run in Module 4 and see what a result looks like. To practise the full workflow including screening, use the teaching case.')}</p>
        <div class="hc-actions"><button type="button" class="hc-btn primary" data-hc-go="run">${T('用示範案例跑一次', 'Run the demonstration case')}</button><button type="button" class="hc-btn" data-hc-go="help:lessons">${T('開始引導練習（7 個案例）', 'Start the guided lessons (7 cases)')}</button><button type="button" class="hc-btn" data-hc-go="teachingAssistant">${T('打開教學案例', 'Open the teaching case')}</button><button type="button" class="hc-btn" data-hc-open="drawer">${T('問 AI 助理', 'Ask the AI assistant')}</button></div>`,
      lessons: '<div id="hcLessons"></div>',
      manual: `<div class="hc-actions" style="margin-bottom:8px"><button type="button" class="hc-btn" id="hcManualDl">${T('下載使用手冊（HTML）', 'Download the user manual (HTML)')}</button></div><div class="hc-man">${manualHtml(false)}</div>`,
      guide: guidePane(),
      glossary: `<div class="hc-gloss"><input id="hcGlossFilter" type="search" placeholder="${T('輸入名詞搜尋，例如 Qallow、自由出流', 'Search a term, for example Qallow or free discharge')}"><div id="hcGlossList">${glossHtml('')}</div></div>`,
      assistant: `<p>${T('AI 助理是<b>離線規則式</b>說明：它在您的瀏覽器內，依關鍵字與目前畫面狀態回答操作與名詞問題。它不連線到外部 AI 服務、不傳送資料、不改動輸入，也不做工程判斷。', 'The AI assistant is an <b>offline rule-based</b> guide. It runs in your browser and answers operation and terminology questions from keywords and the current screen state. It does not connect to an external AI service, send data, change inputs or make engineering judgements.')}</p><div class="hc-actions"><button type="button" class="hc-btn primary" data-hc-open="drawer">${T('打開 AI 助理', 'Open the AI assistant')}</button></div>`
    };
    box.innerHTML = `<h2>${T('開始這裡｜說明與助理', 'Start here | help and assistant')}</h2><p class="hc-lead">${T('不熟悉軟體也沒關係：照「下一步」做，或問左下角的 AI 助理。', 'No experience needed: follow the next step, or ask the AI assistant at the bottom left.')}</p>
      <div class="hc-tabs" role="tablist">${tabs.map(([id, l]) => `<button type="button" role="tab" class="hc-tab${id === activeTab ? ' active' : ''}" data-hc-tab="${id}" aria-selected="${id === activeTab}">${esc(l)}</button>`).join('')}</div>
      ${tabs.map(([id]) => `<div class="hc-pane" data-hc-pane="${id}"${id === activeTab ? '' : ' hidden'}>${panes[id]}</div>`).join('')}`;
  }
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-hc-tab]'); if (t) { activeTab = t.dataset.hcTab; renderPage(); }
    if (e.target.closest('#hcManualDl')) downloadManual();
    if (e.target.closest('#hcGuideDl')) downloadGuide();
  });
  box.addEventListener('input', e => { if (e.target.id === 'hcGlossFilter') $('hcGlossList').innerHTML = glossHtml(e.target.value); });
  async function downloadManual() {
    const srcMap = {};
    await Promise.all(FIGS.map(async f => { try { const r = await fetch(figSrc(f)); if (!r.ok) return; const blob = await r.blob();
      srcMap[f.file] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(blob); }); } catch (e) { /* image left as a link */ } }));
    const html = `<!doctype html><html lang="${zh() ? 'zh-Hant' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${T('PondGate 使用手冊 v1.1.0', 'PondGate user manual v1.1.0')}</title><style>body{font-family:system-ui,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;line-height:1.6;color:#102a43}h1{color:#0b3c5d}h2{color:#0b557d;border-bottom:1px solid #d6e3e8;padding-bottom:4px;margin-top:28px}code{background:#eef4f7;padding:1px 4px}dt{font-weight:700;margin-top:8px}figure{margin:14px 0}figure img{max-width:100%;border:1px solid #c9dbe3;border-radius:6px}figcaption{font-weight:700;margin-top:4px}.hc-fig-notes{margin:4px 0 0;font-size:14px}</style></head><body><h1>${T('PondGate 使用手冊（v1.1.0）', 'PondGate user manual (v1.1.0)')}</h1>${manualHtml(true, srcMap)}<h2>${T('名詞表', 'Glossary')}</h2><dl>${G.map(g => `<dt>${esc(term(g))}</dt><dd>${esc(def(g))}</dd>`).join('')}</dl></body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = zh() ? 'PondGate_user_manual_v1.1.0_zh-Hant.html' : 'PondGate_user_manual_v1.1.0_en.html'; document.body.appendChild(a); a.click(); a.remove();
  }


  /* ---------- full step-by-step guide (Traditional Chinese, generated by docs/build_student_guide.js) ---------- */
  const SG = () => window.PondGateStudentGuide;
  const gSrc = f => `manual/guide/${f}.png`;
  function guideBody(forFile, srcMap) {
    const g = SG(); if (!g) return '';
    const fig = f => `<figure class="sg-fig"><img src="${(srcMap && srcMap[f.file]) || gSrc(f.file)}" loading="lazy" alt="${esc(f.cap)}"><figcaption>圖 ${esc(f.n)}：${esc(f.cap)}</figcaption><ol class="sg-notes">${f.notes.map(([n, l]) => `<li value="${n}">${esc(l)}</li>`).join('')}</ol></figure>`;
    const table = (title, rows) => `<p class="sg-tt">${esc(title)}</p><div class="sg-tw"><table class="sg-t"><thead><tr>${rows[0].map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const step = s => `<section class="sg-step"><h4>步驟 ${esc(s.n)}　${esc(s.t)}</h4>
      <p class="sg-k">操作</p><ol>${s.do.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <p class="sg-k">畫面應該出現</p><ul>${s.see.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${s.fix.length ? `<p class="sg-k">如果不一樣</p><ul>${s.fix.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${s.table ? table(s.tableTitle, s.table) : ''}${s.figs.map(fig).join('')}</section>`;
    const chapter = c => `${c.intro.map(x => `<p>${esc(x)}</p>`).join('')}${c.extra.map(([h, x]) => `<h4>${esc(h)}</h4><p>${esc(x)}</p>`).join('')}${c.steps.map(step).join('')}`;
    const apps = [
      ['附錄 A　名詞速查', table('表 A-1　名詞速查', [['名詞', '說明'], ...g.glossary])],
      ['附錄 B　錯誤訊息與處理', table('表 B-1　常見錯誤訊息', g.errors)],
      ['附錄 C　學生操作檢核表', `<ul class="sg-check">${g.checklist.map(x => `<li>☐ ${esc(x)}</li>`).join('')}</ul>`],
      ['附錄 D　課後練習與參考答案', `<ol>${g.exercises.map(([q, a]) => `<li>${esc(q)}<br><b>參考答案：</b>${esc(a)}</li>`).join('')}</ol>`]];
    if (forFile) return `<nav class="sg-toc"><h2>目錄</h2><ul style="list-style:none;padding-left:0">${g.chapters.map(c => `<li>${esc(c.t)}</li>`).join('')}${apps.map(([h]) => `<li>${esc(h)}</li>`).join('')}</ul></nav>`
      + g.chapters.map(c => `<h2>${esc(c.t)}</h2>${chapter(c)}`).join('') + apps.map(([h, b]) => `<h2>${esc(h)}</h2>${b}`).join('');
    return g.chapters.map((c, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(c.t)}</summary><div>${chapter(c)}</div></details>`).join('')
      + apps.map(([h, b]) => `<details><summary>${esc(h)}</summary><div>${b}</div></details>`).join('');
  }
  function guidePane() {
    const g = SG(); if (!g) return `<p>${T('完整版操作手冊未載入。', 'The full guide did not load.')}</p>`;
    const n = g.chapters.reduce((a, c) => a + c.steps.length, 0), f = g.chapters.reduce((a, c) => a + c.steps.reduce((b, s) => b + s.figs.length, 0), 0);
    return `${zh() ? '' : '<p class="hc-lead">This full step-by-step guide is written in Traditional Chinese for students. The short manual is available in English.</p>'}
      <p>給學生一步一步跟著做的完整手冊：${g.chapters.length} 章、${n} 個步驟、${f} 張標註截圖，附名詞速查、錯誤訊息表、操作檢核表與課後練習（含參考答案）。文中數值與截圖都是在本版軟體上實際操作取得。</p>
      <div class="hc-actions" style="margin-bottom:8px"><button type="button" class="hc-btn primary" id="hcGuideDl">下載完整版操作手冊（HTML，可列印成 PDF）</button></div><div class="hc-man sg">${guideBody(false)}</div>`;
  }
  const GUIDE_CSS = 'body{font-family:"Noto Sans TC","Microsoft JhengHei","PingFang TC",system-ui,sans-serif;max-width:880px;margin:24px auto;padding:0 16px;line-height:1.7;color:#102a43}h1{color:#0b3c5d}h2{color:#0b557d;border-bottom:2px solid #d6e3e8;padding-bottom:4px;margin-top:32px;page-break-before:always}h2:first-of-type{page-break-before:auto}h4{color:#0b3c5d;margin:22px 0 6px}.sg-k{font-weight:700;margin:8px 0 2px;color:#0b557d}.sg-fig{margin:14px 0;page-break-inside:avoid}.sg-fig img{max-width:100%;border:1px solid #c9dbe3;border-radius:6px}figcaption{font-weight:700;margin-top:4px}.sg-notes{margin:4px 0 0;font-size:14px}.sg-tt{font-weight:700;margin:12px 0 4px}.sg-t{border-collapse:collapse;width:100%;font-size:14px}.sg-t th,.sg-t td{border:1px solid #c9dbe3;padding:4px 6px;text-align:left;vertical-align:top}.sg-t th{background:#eef4f7}.sg-check{list-style:none;padding-left:0}.sg-step{page-break-inside:auto}.cover{text-align:center;margin:80px 0 40px}.cover p{color:#486581}';
  function guideDocument(srcMap) {
    const g = SG();
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(g.title)} v${esc(g.version)}</title><style>${GUIDE_CSS}</style></head><body><div class="cover"><h1>${esc(g.title)}</h1><p>PondGate v${esc(g.version)}｜滯洪池演算與受限設計篩選</p><p>本手冊的數值與截圖都是在本版軟體上逐步實際操作取得。</p></div>${guideBody(true, srcMap)}</body></html>`;
  }
  async function guideImages() {
    const g = SG(), srcMap = {}; const files = g.chapters.flatMap(c => c.steps.flatMap(s => s.figs.map(f => f.file)));
    await Promise.all(files.map(async file => { try { const r = await fetch(gSrc(file)); if (!r.ok) return; const blob = await r.blob();
      srcMap[file] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(blob); }); } catch (e) { /* image left as a link */ } }));
    return srcMap;
  }
  async function downloadGuide() {
    if (!SG()) return;
    const html = guideDocument(await guideImages());
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = 'PondGate_student_guide_v1.1.0_zh-Hant.html'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- floating assistant ---------- */
  const fab = document.createElement('button'); fab.type = 'button'; fab.id = 'helpFab';
  const drawer = document.createElement('section'); drawer.id = 'helpDrawer'; drawer.hidden = true; drawer.setAttribute('aria-label', 'PondGate assistant');
  document.body.append(fab, drawer);
  const log = []; // {who, html}
  function renderDrawer() {
    fab.textContent = T('？ 說明／AI 助理', '? Help / AI assistant');
    drawer.innerHTML = `<div class="hc-dh"><div><strong>${T('PondGate AI 助理（離線）', 'PondGate AI assistant (offline)')}</strong><small>${T('只讀取畫面狀態，不改輸入、不傳送資料', 'Reads the screen only; changes no input and sends nothing')}</small></div><button type="button" class="hc-x" aria-label="${T('關閉', 'Close')}" data-hc-close>×</button></div>
      <div class="hc-log" id="hcLog"><div class="hc-msg bot" id="hcDrawerNext">${nextHtml(nextStep())}</div>${log.map(m => m.who === 'me' ? `<div class="hc-msg me"><span>${esc(m.text)}</span></div>` : `<div class="hc-msg bot">${m.html}</div>`).join('')}</div>
      <div class="hc-quick">${QUICK().map(q => `<button type="button" class="hc-chip" data-hc-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <form class="hc-form" id="hcForm"><input id="hcInput" autocomplete="off" placeholder="${T('輸入問題，例如：為什麼不能篩選？', 'Type a question, e.g. why is screening locked?')}"><button type="submit" class="hc-btn primary">${T('送出', 'Ask')}</button></form>
      <div class="hc-note">${T('離線規則式助理：依關鍵字回答，不是大型語言模型；不做工程判斷。', 'Offline rule-based assistant: answers by keyword, not a large language model; makes no engineering judgement.')}</div>`;
    const l = $('hcLog'); if (l) l.scrollTop = l.scrollHeight;
  }
  function ask(q) {
    const r = answer(q); if (!r) return;
    log.push({ who: 'me', text: q }, { who: 'bot', html: answerHtml(r) }); if (log.length > 40) log.splice(0, log.length - 40);
    renderDrawer(); setTimeout(() => $('hcInput')?.focus(), 0);
  }
  function openDrawer() { drawer.hidden = false; renderDrawer(); setTimeout(() => $('hcInput')?.focus(), 0); }
  function closeDrawer() { drawer.hidden = true; }
  fab.addEventListener('click', () => drawer.hidden ? openDrawer() : closeDrawer());
  drawer.addEventListener('submit', e => { e.preventDefault(); const v = $('hcInput')?.value || ''; ask(v); });
  drawer.addEventListener('click', e => { if (e.target.closest('[data-hc-close]')) closeDrawer(); const c = e.target.closest('[data-hc-ask]'); if (c) ask(c.dataset.hcAsk); });
  document.addEventListener('click', e => {
    const g = e.target.closest?.('[data-hc-go]'); if (g) { e.preventDefault(); go(g.dataset.hcGo); return; }
    if (e.target.closest?.('[data-hc-open="drawer"]')) { e.preventDefault(); openDrawer(); return; }
    const q = e.target.closest?.('.hc-q'); if (q) { e.preventDefault(); e.stopPropagation(); const gl = G.find(x => x.id === q.dataset.term); if (gl) { openDrawer(); log.push({ who: 'bot', html: answerHtml({ terms: [gl] }) }); renderDrawer(); } }
  }, true);

  /* ---------- field "?" buttons and invalid-field list ---------- */
  function labelFor(input) {
    let p = input.previousElementSibling; while (p && p.tagName !== 'LABEL' && !(p.tagName === 'DIV' && p.classList.contains('meta'))) { if (p.tagName === 'LABEL') break; p = p.previousElementSibling; }
    if (p && p.tagName === 'LABEL') return p;
    const lab = input.closest('label'); return lab || null;
  }
  function decorateFields() {
    Object.entries(FIELD_TERM).forEach(([id, tid]) => {
      const el = $(id); if (!el) return; const lab = labelFor(el); if (!lab || lab.querySelector('.hc-q')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hc-q'; b.dataset.term = tid; b.dataset.feedbackReady = 'true'; b.dataset.feedbackLang = 'none'; b.textContent = '?';
      b.setAttribute('aria-label', 'help'); lab.appendChild(b);
    });
    document.querySelectorAll('.hc-q').forEach(b => { const g = G.find(x => x.id === b.dataset.term); if (g) { b.title = term(g); b.setAttribute('aria-label', T('說明：', 'Help: ') + term(g)); } });
  }
  let fixBox = null;
  function renderRunFix() {
    const run = $('run'); if (!run) return;
    if (!fixBox || !fixBox.isConnected) { fixBox = document.createElement('div'); fixBox.id = 'hcRunFix'; run.insertAdjacentElement('beforebegin', fixBox); }
    const P = run.disabled ? inputProblems() : [];
    document.querySelectorAll('.hc-invalid').forEach(e => e.classList.remove('hc-invalid'));
    P.forEach(p => $(p.id)?.classList.add('hc-invalid'));
    fixBox.innerHTML = run.disabled ? nextHtml(P.length ? { kind: 'stop', title: T('需要修正的欄位', 'Fields to fix'), body: T('點欄位名稱即可跳過去（紅框標示）：', 'Click a field to jump to it (outlined in red):'), list: P }
      : { kind: 'stop', title: T('執行按鈕暫時無法使用', 'The run button is unavailable'), body: T('請檢查模組 1–3 的輸入是否完整。', 'Check that Modules 1–3 are complete.') }) : '';
  }

  /* ---------- refresh ---------- */
  let timer = 0;
  function refresh() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      decorateFields(); renderRunFix();
      const np = $('hcNextPage'); if (np) np.innerHTML = nextHtml(nextStep());
      const nd = $('hcDrawerNext'); if (nd) nd.innerHTML = nextHtml(nextStep());
    }, 120);
  }
  const inRouteInputs = el => el && el.closest && el.closest('#mod-inflow,#mod-storage,#mod-outlet');
  document.addEventListener('input', e => { if (inRouteInputs(e.target)) changedAfterRun = true; refresh(); }, true);
  document.addEventListener('change', e => { if (inRouteInputs(e.target)) changedAfterRun = true; refresh(); }, true);
  /* v1.2.1: switching the language re-runs routing with the current inputs (physics-refinement setLanguage).
     Say so, and mark the result as current, so a beginner is not surprised by updated numbers. */
  let anyChange = false;
  document.addEventListener('input', e => { if (inRouteInputs(e.target)) anyChange = true; }, true);
  document.addEventListener('change', e => { if (inRouteInputs(e.target)) anyChange = true; }, true);
  window.addEventListener('dss:language-changed', () => {
    const rerun = (changedAfterRun || (!userRan && anyChange)) && !inputProblems().length && document.querySelectorAll('#metricbody tr').length > 0;
    if (!rerun) return;
    userRan = true; changedAfterRun = false;
    setTimeout(() => { const f = $('buttonFeedback'); if (f) { f.textContent = T('已切換語言，並依目前的輸入重新計算了一次路由（等同按一次「執行路由與評估」）。結果頁的數值已更新。', 'Language switched. Routing was recomputed once with the current inputs (same as pressing "Run routing and evaluation"); the result page is updated.'); f.className = 'button-feedback show ok'; setTimeout(() => f.classList.remove('show'), 8000); } refresh(); }, 250);
  });
  document.addEventListener('click', e => {
    if (e.target.closest?.('#run') && !$('run').disabled) { userRan = true; changedAfterRun = false; }
    if (e.target.closest?.('#teachDemo,#teachRestore')) setTimeout(() => { userRan = true; changedAfterRun = false; refresh(); }, 400);
    setTimeout(refresh, 300); setTimeout(refresh, 1500);
  });
  // After screening or continuous optimization, show the result: it is displayed in Module 6.
  document.addEventListener('click', e => {
    const btn = e.target.closest?.('#optimize,#continuousGlobal'); if (!btn || btn.disabled) return;
    const o = $('optout'), before = o ? o.innerText : '', t0 = Date.now();
    const poll = () => { const now = $('optout'); if (now && !now.classList.contains('hide') && now.innerText.trim() && now.innerText !== before) { window.DSSWorkspacePages?.openTarget('mod-evaluation'); setTimeout(() => now.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); return; } if (Date.now() - t0 < 20000) setTimeout(poll, 250); };
    setTimeout(poll, 250);
  }, true);
  document.addEventListener('dss:continuous-result', refresh);
  document.addEventListener('dss:workspace-change', refresh);
  new MutationObserver(() => { renderPage(); renderDrawer(); refresh(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const og = document.querySelector('.diagnostic-guide'); if (og) new MutationObserver(refresh).observe(og, { childList: true, subtree: true });
  $('run') && new MutationObserver(refresh).observe($('run'), { attributes: true, attributeFilter: ['disabled'] });

  renderPage(); renderDrawer(); refresh();
  window.PondGateHelp = Object.freeze({ guideDocument: async () => guideDocument(await guideImages()), answer, nextStep, inputProblems, screeningLocks, screeningOutcome, runState: () => ({ userRan, changedAfterRun }), open: openDrawer, close: closeDrawer, go, version: '1.1.0' });
})();
