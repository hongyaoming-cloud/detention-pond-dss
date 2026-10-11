/* English display for panels whose source text is Chinese only (run-record panel, E-W1 A-005 benchmark).
   Display-only: it rewrites visible text in English mode and restores the original text in Chinese mode.
   It never reads or changes inputs, routed values, screening decisions or downloads. */
(() => {
  const ROOTS = ['runTraceability', 'ew1A005Benchmark', 'ew1A005Export', 'ew1A005ThreeEngine'];
  const D = [
    // Run-record panel
    ['本次可追溯紀錄（唯讀）', 'Run record for this session (read-only)'],
    ['本區僅讀取目前工作階段的真實狀態；不寫入、儲存、下載、匯出、上傳或傳輸資料。', 'This panel only reads the current session state; it does not write, save, download, export, upload or transmit data.'],
    ['：僅適用於已宣告入流、S(H)、Qout(H) 與限制條件下的本輪計算；不等同現地工程驗證或最終工程設計，工程責任仍須由合格專業人員完成。', ': applies only to this run under the declared inflow, S(H), Qout(H) and limits; it is not field validation or final engineering design, and engineering responsibility remains with a qualified professional.'],
    ['：尚無有效本輪結果；前次摘要已清除，請重新執行路由或連續最佳化。', ': no valid result for this run; the previous summary was cleared. Run routing or continuous optimization again.'],
    ['表列 S(H)；輸入來源：未提供；單位：m、m³。', 'Tabulated S(H); input source: not provided; units: m, m³.'],
    ['；輸入來源：未提供；單位：m、m³。', '; input source: not provided; units: m, m³.'],
    ['；輸入來源：未提供；單位：m³/s。', '; input source: not provided; units: m³/s.'],
    ['；輸入來源：未提供；單位：', '; input source: not provided; units: '],
    ['：RK4；時間步長 Δt = 2 s。', ': RK4; time step Δt = 2 s.'],
    ['：無可行解；本輪主導限制：', ': no feasible solution; dominant limits in this run: '],
    ['進階連續最佳化（無可行解）', 'Advanced continuous optimization (no feasible solution)'],
    ['進階連續最佳化（A+', 'Advanced continuous optimization (A+'],
    ['固定平面積 S(H)；面積', 'Constant-area S(H); area'],
    ['單一矩形開口 Qout(H)，Cd=', 'Single rectangular opening Qout(H), Cd='],
    ['單一堰流 Qout(H)，Cw=', 'Single weir Qout(H), Cw='],
    ['Qout(H) 關係未提供', 'Qout(H) relation not provided'],
    ['適用界線與工程責任警語', 'Scope and engineering-responsibility notice'],
    ['自由出流四項佐證狀態', 'Status of the four free-discharge evidence items'],
    ['RK4 與時間步長設定', 'RK4 and time-step setting'],
    ['模式與執行時間', 'Mode and run time'],
    ['尚未完成本輪計算', 'This run is not complete'],
    ['本輪結果摘要', 'Result summary for this run'],
    ['。佐證紀錄：', '. Evidence record: '],
    ['；限制依據：', '; basis for limits: '],
    ['；執行時間：', '; run time: '],
    ['；排空時間=', '; drain-down time='],
    ['；排空殘留', '; drain-down residual'],
    ['；尖峰出流', '; peak outflow'],
    ['：最高水位', ': maximum level'],
    ['；殘量=', '; residual='],
    ['探索性路由', 'Exploratory routing'],
    ['限制條件', 'Limits'],
    ['入流 Qin(t)', 'Inflow Qin(t)'],
    ['回水／管摩阻', 'backwater/pipe friction'],
    ['已完成', 'Completed'],
    ['未完成', 'Not completed'],
    ['尾水位', 'tailwater'],
    ['操作控制', 'operational control'],
    ['淹沒', 'submergence'],
    ['：未提供。', ': not provided.'],
    ['未提供', 'not provided'],
    ['無可行解', 'no feasible solution'],
    // E-W1 A-005 benchmark panel
    ['H0 = 0.07399 m; b = P = 0.05 m', 'H0 = 0.07399 m; b = P = 0.05 m'],
    ['資料來源：E‑W1 A‑005 原始 Qin(t) 時間—流量記錄；RK4，Δt = 0.25 s。', 'Data source: E‑W1 A‑005 raw Qin(t) time–discharge record; RK4, Δt = 0.25 s.'],
    ['CSV 標頭或 baseflow 欄位不納入 Qin(t)。', 'CSV header or baseflow fields are not included in Qin(t).'],
    ['已驗證：此固定案例與相同來源曲線下的跨引擎數值一致性與時間步敏感度。未驗證：現地實測校準、所有入流與出口條件的普遍驗證、降雨逕流、尾水、管渠、閘門、幫浦、豎井、圓管、複合出口與最終工程設計。', 'Verified: numerical consistency between engines and time-step sensitivity for this fixed case with the same source curves. Not verified: field calibration, general validity for all inflow and outlet conditions, rainfall–runoff, tailwater, conduits, gates, pumps, risers, circular pipes, combined outlets and final engineering design.'],
    ['DSS 分別以 Δt = 0.125、0.250、0.500 s 真實重跑；0.125 s 僅是本測試的數值參考，不代表解析真解；比較 H、S、Qout 歷線、峰值與質量守恆殘差。', 'The DSS reruns the case at Δt = 0.125, 0.250 and 0.500 s; 0.125 s is only the numerical reference for this test, not an analytical solution. H, S and Qout series, peaks and mass-balance residuals are compared.'],
    ['同一固定案例與相同來源曲線下，DSS RK4（Δt = 0.25 s）、EPA SWMM 5.2.4 與 HEC‑HMS 4.13 比較歷線、峰值與質量守恆；HEC‑HMS 採 Modified Puls，頁面只呈現其已保存結果，不會即時呼叫 HEC 引擎。', 'For this fixed case with the same source curves, DSS RK4 (Δt = 0.25 s), EPA SWMM 5.2.4 and HEC‑HMS 4.13 are compared for series, peaks and mass balance; HEC‑HMS uses Modified Puls, and the page shows its stored results only, without calling the HEC engine.'],
    ['HEC‑HMS 4.13 使用 Modified Puls。為配合一分鐘計算間隔，採體積守恆的時間／流量轉換：1 HEC 分鐘對應原始 0.25 秒，HEC 流量為原始流量的 1/240，輸出再換回原始尺度。', 'HEC‑HMS 4.13 uses Modified Puls. To fit its one-minute interval, a volume-conserving time/discharge scaling is used: 1 HEC minute equals 0.25 original seconds and HEC discharge is 1/240 of the original; outputs are scaled back.'],
    ['使用同一原始 Qin(t)、增量 S(H)、增量 Qout(H) 與 RK4。baseflow 只保留為原始資料來源佐證，不納入 Qin(t)。', 'The same raw Qin(t), incremental S(H), incremental Qout(H) and RK4 are used. Baseflow is kept only as source evidence and is not included in Qin(t).'],
    ['已顯示固定、已保存的 DSS RK4／EPA SWMM 5.2.4／HEC‑HMS 4.13 運行證據；圖為已保存對齊歷線的畫面抽樣呈現。', 'Showing fixed, stored run evidence from DSS RK4, EPA SWMM 5.2.4 and HEC‑HMS 4.13; the chart is a display sample of the stored aligned series.'],
    ['0.125 s 為本敏感度測試的數值參考，不代表解析真解。完整序列差異僅以共同輸出時刻的真實 RK4 結果計算；不插值、平滑或重新取樣。', '0.125 s is the numerical reference for this sensitivity test, not an analytical solution. Series differences use actual RK4 results at common output times only, without interpolation, smoothing or resampling.'],
    ['時間步敏感度比較完成；既有 0.250 s 基準與三組個別 comparison_results CSV 均為本輪真實 RK4 結果。', 'Time-step comparison complete; the 0.250 s benchmark and the three comparison_results CSV files are actual RK4 results of this run.'],
    ['這是同一固定案例與相同來源曲線下的跨引擎數值一致性檢驗；不是現地實測校準、所有入流與出口條件的普遍驗證，也不是最終工程設計驗證。', 'This is a numerical consistency check between engines for one fixed case with the same source curves; it is not field calibration, general validation for all inflow and outlet conditions, or final engineering-design validation.'],
    ['固定案例的唯讀證據，與上方「本輪」DSS RK4 即時重跑結果明確分開；不會隨目前輸入改變，也不會在網站中呼叫 HEC‑HMS。', 'Read-only evidence for the fixed case, kept separate from the live DSS RK4 rerun above; it does not change with the current inputs and does not call HEC‑HMS from the website.'],
    ['正在以同一原始 Qin(t) 與既有分段線性插值，分別執行 RK4 Δt = 0.125、0.250、0.500 s…', 'Running RK4 at Δt = 0.125, 0.250 and 0.500 s with the same raw Qin(t) and piecewise-linear interpolation…'],
    ['E‑W1 A‑005 本輪完成：RK4，Δt = 0.25 s，未將任何標頭 baseflow 併入 Qin(t)。', 'E‑W1 A‑005 run complete: RK4, Δt = 0.25 s; no header baseflow was added to Qin(t).'],
    ['唯讀 Paper II 可重現驗證案例，非工程設計案例；不會改寫一般路由、受限篩選或最佳化的輸入與結果。', 'Read-only reproducible verification case, not a design case; it does not change the inputs or results of routing, constrained screening or optimization.'],
    ['E‑W1 A‑005 是 Paper II 的唯讀、可重現數值驗證案例；不是實際工程設計案例。', 'E‑W1 A‑005 is a read-only, reproducible numerical verification case; it is not an engineering design case.'],
    ['單一被動堰流；事件期間 0–977.25 s；初始絕對水位 H0 = 0.07399 m。', 'Single passive weir; event 0–977.25 s; initial absolute head H0 = 0.07399 m.'],
    ['正在以權威 RK4 核心執行 E‑W1 A‑005（Δt = 0.25 s）…', 'Running E‑W1 A‑005 with the authoritative RK4 core (Δt = 0.25 s)…'],
    ['筆真實 RK4 結果；可匯出 comparison_results CSV。', ' actual RK4 rows; comparison_results CSV can be exported.'],
    ['僅顯示本輪真實 RK4 基準結果；輸入變更或任何新 run 後會立即失效。', 'Shows only the actual RK4 benchmark result of this run; it is invalidated by any input change or new run.'],
    ['時間步敏感度比較完成：三組均各自重新計算；未重採樣、平滑或變更事件終點。', 'Time-step comparison complete: each of the three runs was recomputed; no resampling, smoothing or change of event end.'],
    ['本案例不得取代個案水文、水理、結構安全、法規審查或專業工程設計驗證。', 'This case does not replace site-specific hydrology, hydraulics, structural safety, regulatory review or professional design validation.'],
    ['僅供跨引擎比較，不構成現地實測校準、最終工程設計驗證或全域最優保證。', 'For cross-engine comparison only; not field calibration, final design validation or a guarantee of a global optimum.'],
    ['新 run 已開始；先前 E‑W1 A‑005 摘要已失效。', 'A new run has started; the previous E‑W1 A‑005 summary is no longer valid.'],
    ['時間步敏感度比較（0.125／0.250／0.500 s）', 'Time-step sensitivity (0.125 / 0.250 / 0.500 s)'],
    ['無法載入 E‑W1 A‑005 原始 Qin(t) 資料。', 'Could not load the E‑W1 A‑005 raw Qin(t) data.'],
    ['先前 E‑W1 A‑005 摘要已失效；請重新執行基準。', 'The previous E‑W1 A‑005 summary is no longer valid; run the benchmark again.'],
    ['E‑W1 A‑005 Qin(t) 欄位不符合基準定義。', 'E‑W1 A‑005 Qin(t) columns do not match the benchmark definition.'],
    ['E‑W1 A‑005 Qin(t) 時間序列無效。', 'E‑W1 A‑005 Qin(t) time series is invalid.'],
    ['最後補步：0.250 s（僅用於對齊事件終點）', 'Final step: 0.250 s (only to land on the event end)'],
    ['共同輸出時刻缺少 0.125 s 真實參考結果。', 'The 0.125 s reference result is missing at common output times.'],
    ['DSS RK4、EPA SWMM 與 HEC-HMS 已保存出流歷線', 'Stored outflow series from DSS RK4, EPA SWMM and HEC-HMS'],
    ['匯出 DSS comparison_results CSV', 'Export DSS comparison_results CSV'],
    ['先前 E‑W1 A‑005 結果已失效。', 'The previous E‑W1 A‑005 result is no longer valid.'],
    ['相對 0.125 s：完整序列與峰值差異', 'Relative to 0.125 s: series and peak differences'],
    ['此為數值時間步敏感度，不是工程設計驗證。', 'This is a numerical time-step sensitivity test, not engineering-design validation.'],
    ['執行 E‑W1 A‑005 基準 RK4', 'Run E‑W1 A‑005 benchmark RK4'],
    ['E‑W1 A‑005 外部交叉驗算基準', 'E‑W1 A‑005 external cross-check benchmark'],
    ['尚無本輪 E‑W1 A‑005 結果。', 'No E‑W1 A‑005 result for this run yet.'],
    ['正在載入已保存的三引擎對齊結果…', 'Loading the stored three-engine aligned results…'],
    ['E‑W1 A‑005 比較結果', 'E‑W1 A‑005 comparison results'],
    ['最大 qout（m³/s）／時間', 'Max qout (m³/s) / time'],
    ['案例方程、時間步長與資料來源', 'Case equations, time step and data source'],
    ['尚無可匯出的本輪基準結果。', 'No benchmark result from this run to export.'],
    ['時間步敏感度比較未完成：', 'Time-step comparison not complete: '],
    ['qout (m³/s)，最大', 'qout (m³/s), max'],
    ['下載 comparison_results_dt', 'Download comparison_results_dt'],
    ['峰值 ΔH/ΔS/Δq=', 'Peak ΔH/ΔS/Δq='],
    ['最大 S（m³）／時間', 'Max S (m³) / time'],
    ['峰值出流（m³/s）', 'Peak outflow (m³/s)'],
    ['已驗證與未驗證項目：', 'Verified and not verified: '],
    ['三引擎已保存運行結果', 'Stored results of three engines'],
    ['最大 h（m）／時間', 'Max h (m) / time'],
    ['時間步敏感度內容：', 'Time-step sensitivity: '],
    ['尚未執行本輪基準。', 'The benchmark has not been run in this session.'],
    ['外部交叉驗算內容：', 'External cross-check: '],
    ['案例說明與適用界線', 'Case description and scope'],
    ['入流體積（m³）', 'Inflow volume (m³)'],
    ['質量殘差（m³）', 'Mass residual (m³)'],
    ['出流體積（m³）', 'Outflow volume (m³)'],
    ['時間步敏感度比較', 'Time-step sensitivity'],
    ['儲量變化（m³）', 'Storage change (m³)'],
    ['本輪基準完成：', 'Benchmark run complete: '],
    ['筆數／實際步長', 'Rows / actual step'],
    ['固定計算依據：', 'Fixed basis of calculation: '],
    ['工程責任界線：', 'Engineering responsibility: '],
    ['基準未完成：', 'Benchmark not complete: '],
    ['共同時間窗：', 'Common window: '],
    ['；最大絕對差', '; max absolute difference'],
    ['出流歷線配對', 'Outflow series pair'],
    ['系統與事件：', 'System and event: '],
    ['案例定位：', 'Case role: '],
    ['峰時（s）', 'Peak time (s)'],
    ['個時點。', ' time points.'],
    ['s 間距；', ' s spacing; '],
    ['方法：', 'Method: '],
    ['引擎', 'Engine']
  ].sort((a, b) => b[0].length - a[0].length);
  const PUNCT = [['：', ': '], ['；', '; '], ['，', ', '], ['。', '. '], ['（', ' ('], ['）', ')'], ['／', ' / '], ['、', ', '], ['「', '"'], ['」', '"'], ['…', '…']];
  const CJK = /[　-〿一-鿿＀-￯]/;
  const original = new WeakMap();
  const english = () => document.documentElement.lang !== 'zh-Hant';
  function toEnglish(s) {
    let t = s;
    for (const [zh, en] of D) if (t.includes(zh)) t = t.split(zh).join(en);
    for (const [zh, en] of PUNCT) t = t.split(zh).join(en);
    return t.replace(/ {2,}/g, ' ').replace(/ ([,.;:)])/g, '$1');
  }
  function walk(root, fn) {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = it.currentNode; n; n = it.nextNode()) fn(n);
  }
  let busy = false;
  function apply() {
    if (busy) return; busy = true;
    try {
      const en = english();
      for (const id of ROOTS) {
        const root = document.getElementById(id); if (!root) continue;
        walk(root, n => {
          if (n.nodeType === 3) {
            if (en && CJK.test(n.nodeValue)) { if (!original.has(n)) original.set(n, n.nodeValue); n.nodeValue = toEnglish(n.nodeValue); }
            else if (!en && original.has(n)) { n.nodeValue = original.get(n); original.delete(n); }
          } else if (n.nodeType === 1) {
            for (const a of ['aria-label', 'title']) {
              const v = n.getAttribute(a), key = 'data-zh-' + a;
              if (en && v && CJK.test(v)) { n.setAttribute(key, v); n.setAttribute(a, toEnglish(v)); }
              else if (!en && n.hasAttribute(key)) { n.setAttribute(a, n.getAttribute(key)); n.removeAttribute(key); }
            }
          }
        });
      }
    } finally { busy = false; }
  }
  window.__dssEnglishFallback = { toEnglish, apply };
  new MutationObserver(() => apply()).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('DOMContentLoaded', apply);
  setTimeout(apply, 0); setTimeout(apply, 300);
})();
