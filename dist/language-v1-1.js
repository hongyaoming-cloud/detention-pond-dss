/* v1.1 display-only language completion.
   Some labels and notes were shown in only one language (found in the v1.1 novice walkthrough).
   This layer swaps whole text nodes, placeholders and titles that exactly match a known string,
   and restores the original when the language is switched back.
   It never reads or changes input values, routed values, screening decisions or downloads. */
(() => {
  // [Chinese, English]
  const PAIRS = [
    ['所有水位、出口高程與 Hfloor 必須使用同一高程基準；若採相對基準，請設 Hfloor = 0。', 'All water levels, outlet elevations, and Hfloor must use the same vertical datum. For a relative datum, set Hfloor = 0.'],
    ['兩欄：第一欄為水面高程（或水位，m），第二欄為蓄水量（m³）。', 'Two columns: water-surface elevation (or level) in m, then storage in m3.'],
    ['狀態方程：dS/dt = Qin − Qout(H)；水位 H 由宣告的 S(H) 反求。', 'State equation: dS/dt = Qin - Qout(H); H is recovered from the declared S(H).'],
    ['最小事件新增滯洪量 ΔSmax', 'Minimum event-added detention volume ΔSmax'],
    ['無因次參考水位 Href（m）', 'Dimensionless reference water level Href (m)'],
    ['Href 必須與 H 使用同一基準、位於宣告的 S(H) 範圍內，且不低於 H0。它用來定義 ΠQ 與 ΠS，不自動等於安全限制。', 'Href must use the same datum as H, lie within the declared S(H) domain, and be no lower than H0. It defines ΠQ and ΠS; it is not automatically a safety limit.'],
    ['最長排空時間 Td（小時）', 'Maximum drain-down time Td (h)'],
    ['容許事件新增蓄水殘留（%）', 'Permitted residual event storage (%)'],
    ['在 Te + Td 時，事件新增蓄水不得超過 ΔSmax 的宣告殘留百分比。每個篩選案例都使用相同的狀態方程、限制條件與時間步長。', 'At Te + Td, event-added storage must not exceed the stated residual percentage of ΔSmax. Every screening case uses the same state equation, constraints and time step.'],
    ['連續搜尋最小平面面積 A（m²）', 'Continuous minimum plan area A (m²)'],
    ['連續搜尋最大平面面積 A（m²）', 'Continuous maximum plan area A (m²)'],
    ['改變堰頂以上的堰流排洪能力。', 'Changes the weir discharge capacity above its crest.'],
    ['改變開口底高程以上的矩形開口排洪能力。', 'Changes the rectangular-opening discharge capacity above its invert.'],
    ['僅供研究檢視的變數；正式篩選維持鎖定。', 'Research-inspection variable only; formal screening remains locked.'],
    ['每個勾選的尺寸會在宣告的最小值與最大值之間（含兩端）等距測試五個值。這些邊界只定義本次離散篩選；選出的可行案例不是最終工程設計驗證。', 'Each selected size is tested at five equally spaced values, including its declared minimum and maximum. These bounds define only the present discrete screen; a selected feasible case is not final engineering-design validation.'],
    ['內部發版門檻：176 組案例、352 條原始入流／出流歷線。已驗證範圍僅限被動溢流堰與矩形孔口路由，且不是使用者可選的模式。豎井、圓形開口／圓管、係數表與複合出口的結果，須經獨立驗證後才能用於設計。', 'Internal release gate: 176 cases and 352 raw inflow/outflow histories. The validated envelope is passive overflow-weir and rectangular-orifice routing only; it is not a selectable user mode. Riser, circular-opening/pipe, coefficient-table, and composite-outlet results require independent verification before design use.'],
    ['PondGate 模組化工作區', 'PondGate modular workspace'],
    ['圖說／現地檢查／計算紀錄編號；檢核人；日期', 'Drawing / field inspection / calculation record identifier; checker; date'],
    ['Qallow、Hallow、Td 與殘留限制的來源及適用性；檢核人；日期', 'Source and applicability of Qallow, Hallow, Td, and residual limit; checker; date'],
    ['進階連續最佳化｜全域候選搜尋＋局部精修', 'Advanced continuous optimization | global candidate search + local refinement'],
    ['正式模式可搜尋兩個連續變數：平面面積 A 與單一被動出口尺寸（堰寬 b 或孔口面積 Ao）。每個候選均重跑同一權威 RK4；不回寫原始工作輸入。結果不是已證明的連續全域最優解，亦非最終工程設計驗證。', 'The formal mode can search two continuous variables: plan area A and the size of one passive outlet (weir width b or opening area Ao). Every candidate reruns the same authoritative RK4 and never writes back to the working inputs. The result is not a proven continuous global optimum and is not final engineering-design validation.'],
    ['導覽驗收', 'Navigation acceptance'],
    ['執行導覽驗收', 'Run navigation acceptance']
  ];
  const ALIAS = [['導覽驗收／Navigation acceptance', 'Navigation acceptance']];
  const toZh = new Map(), toEn = new Map();
  for (const [z, e] of PAIRS) { toZh.set(e, z); toEn.set(z, e); }
  for (const [z, e] of ALIAS) toEn.set(z, e);
  const zh = () => document.documentElement.lang === 'zh-Hant';
  const skip = el => !el || el.closest('#helpCenter,#helpFab,#helpDrawer,script,style');
  let busy = false;
  function swap(v) {
    const t = v.trim(); if (!t) return null;
    const m = zh() ? toZh.get(t) : toEn.get(t);
    return m ? v.replace(t, m) : null;
  }
  function apply() {
    if (busy) return; busy = true;
    try {
      const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = it.nextNode(); n; n = it.nextNode()) {
        if (skip(n.parentElement)) continue;
        const r = swap(n.nodeValue); if (r !== null && r !== n.nodeValue) n.nodeValue = r;
      }
      const map = zh() ? toZh : toEn;
      document.querySelectorAll('button[title]').forEach(el => {
        if (skip(el)) return; let t = el.title, u = t;
        for (const [k, v] of [...map].sort((x, y) => y[0].length - x[0].length)) if (u.includes(k) && !u.includes(v)) u = u.split(k).join(v);
        if (u !== t) el.title = u;
      });
      document.querySelectorAll('[placeholder]').forEach(el => {
        if (skip(el)) return; const r = swap(el.placeholder); if (r !== null && r !== el.placeholder) el.placeholder = r;
      });
    } finally { busy = false; }
  }
  window.__dssLanguageV11 = Object.freeze({ apply, pairs: PAIRS.length });
  new MutationObserver(() => apply()).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['lang'] });
  setTimeout(apply, 0); setTimeout(apply, 400);
})();
