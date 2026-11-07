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
    ['退水時間（分鐘）', 'Recession time (min)'],
    ['豎井出流量 = min（豎井入口能力, 豎井管身能力）。兩種能力都以同一水位基準計算。', 'Riser discharge = min(crest-inlet capacity, shaft capacity). Both capacities are reported through the same water-level datum.'],
    ['內政部國土管理署，下水道工程設施設計規範及解說', 'Taiwan National Land Management Agency, Sewerage System Design and Commentary'],
    ['：孔口流量係數一般為 0.5–0.6；請依所引用的幾何條件與設計情境使用。', ': reports an orifice coefficient generally 0.5–0.6; use the cited geometry and design context.'],
    ['桃園市雨水逕流抑制設施設計手冊', 'Taoyuan Rainwater Runoff-Control Facility Design Manual'],
    ['：提供堰流與孔口設計公式；請確認實際出口幾何。', ': gives weir and orifice design formulations; confirm the exact outlet geometry.'],
    ['美國墾務局（USBR）孔板試驗報告', 'U.S. Bureau of Reclamation, laboratory orifice-plate report'],
    ['：依試驗孔板幾何提供實驗係數；只能套用幾何相符的試驗列。', ': gives experimentally obtained coefficients by tested plate geometry; transfer only matching test rows.'],
    ['美國陸軍工兵團 HEC-HMS 出口構造文件', 'USACE HEC-HMS outlet documentation'],
    ['：區分自由水面堰流與淹沒孔口流兩種流況。', ': distinguishes free-surface weir and submerged-orifice regimes.'],
    ['部分充水的圓管以圓弓形開口計算；滿管以圓形孔口計算。尾水與管摩阻回水不在 PondGate 範圍內。', 'A partially wetted pipe is evaluated as a circular-segment opening; a full opening is evaluated as a circular orifice. Tailwater and pipe-friction backwater are outside PondGate.'],
    ['宣告邊界／固定條件', 'Declared bound / fixed condition'],
    ['在路由篩選中的角色', 'Role in the routing screen'],
    ['定義固定面積蓄水幾何。這些是使用者宣告的搜尋邊界，不是通用的已驗證範圍。', 'Defines the constant-area storage geometry. These are user-declared search bounds, not a universal validated range.'],
    ['請輸入最小值與最大值（預設 0.05–1.00 m）。堰頂高程 P 與係數 Cw 維持固定。', 'Enter a minimum and maximum (default 0.05–1.00 m). Crest elevation P and coefficient Cw remain fixed.'],
    ['請輸入最小值與最大值（預設 0.005–0.050 m²）。開口底高程與 Cd 維持固定。', 'Enter a minimum and maximum (default 0.005–0.050 m²). Invert elevation and Cd remain fixed.'],
    ['請輸入最小值與最大值（預設 0.15–0.60 m）。豎井堰頂／底高程與 Cr／Cd 維持固定。', 'Enter a minimum and maximum (default 0.15–0.60 m). Riser crest/invert and Cr/Cd remain fixed.'],
    ['出流歷線有一段寬平的近洪峰區間。尖峰流量與體積可能穩定，但不可只用單一時點的尖峰時間作協調或預警判斷；請同時報告區間型與體積型時間指標。', 'The response contains a broad near-peak interval. Peak discharge and volume may be stable, but a single point peak time should not be used alone for coordination or warning decisions. Report interval-based and bulk timing evidence.'],
    ['請檢核時間判讀', 'Verify timing interpretation'],
    ['數值檢核未解決前請勿使用', 'Do not use until numerical checks are resolved'],
    ['質量平衡殘差超過實際入流體積的 0.5%。請檢查輸入解析度、蓄水關係與求解設定。', 'The mass-balance residual exceeds 0.5% of actual inflow volume. Review input resolution, storage relation, and solver configuration.'],
    ['蓄水量必須從 0 開始；水位高程可使用任何宣告的基準。兩欄都必須逐列遞增。表中最高的水位是硬性物理邊界，路由水位超過時會停止計算，不會外插。', 'Storage must begin at 0; water-level elevation may use any declared datum. Both columns must increase. The highest listed level is a hard physical boundary.'],
    ['使用者自訂／現場試驗係數表', 'User-defined / field test table'],
    ['執行導覽驗收', 'Run navigation acceptance']
  ];
  const ALIAS = [['導覽驗收／Navigation acceptance', 'Navigation acceptance']];
  const toZh = new Map(), toEn = new Map();
  for (const [z, e] of PAIRS) { toZh.set(e, z); toEn.set(z, e); }
  for (const [z, e] of ALIAS) { toEn.set(z, e); toZh.set(z, z.split('／')[0]); }
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
