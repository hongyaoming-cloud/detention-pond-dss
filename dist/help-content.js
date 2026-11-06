/* PondGate v1.1 help content: user manual and glossary (bilingual).
   Pure data. It is read by help-center.js and by docs/build_manual.js.
   It contains no calculation and changes nothing in the routing core. */
(function (root) {
  const MANUAL = [
    { id: 'scope',
      zh: { t: '1. PondGate 能做什麼、不能做什麼', h: `
<p>PondGate 計算<b>一座滯洪池</b>在<b>已知入流歷線</b>下的水位、蓄水量與出流隨時間的變化，並保留每次計算的可追溯紀錄。</p>
<ul>
<li>計算方法：水平池（蓄水連續）方程 dS/dt = Qin − Qout(H)，以固定步長四階 Runge–Kutta（RK4，Δt = 2 秒）求解。</li>
<li>可以做：單池路由、讀取尖峰削減與滯洪量、在宣告的限制下做「受限設計篩選」與「連續最佳化」、下載紀錄、與 HEC-HMS／SWMM 輸出做數值比較。</li>
<li>不能做：降雨逕流計算、河道路由、長期連續模擬、多池串聯系統。</li>
<li>結果不是最終工程設計，也不是現地校準。與其他模式的一致只稱為「數值一致性」。工程責任仍由合格專業人員承擔。</li>
<li>沒有可行解時，系統會<b>阻擋</b>並顯示原因與修正方向，不會顯示「通過」。</li>
</ul>` },
      en: { t: '1. What PondGate does and does not do', h: `
<p>PondGate computes how water level, storage and outflow change over time in <b>one detention pond</b> with a <b>known inflow hydrograph</b>. It keeps a traceable record of every run.</p>
<ul>
<li>Method: the level-pool (storage-continuity) equation dS/dt = Qin − Qout(H), solved with a fixed-step fourth-order Runge–Kutta scheme (RK4, Δt = 2 s).</li>
<li>It can: route one pond, report peak reduction and detention volume, run constrained screening and continuous optimization within declared limits, download records, and compare numerically with HEC-HMS or SWMM output.</li>
<li>It cannot: compute rainfall–runoff, channel routing, long continuous simulation or multi-pond systems.</li>
<li>Results are not a final engineering design and not a field calibration. Agreement with other models is called numerical consistency only. A qualified engineer remains responsible.</li>
<li>When no feasible design exists, the software <b>blocks</b> the result and shows the reason and a correction path. It never shows "pass".</li>
</ul>` } },
    { id: 'layout',
      zh: { t: '2. 畫面導覽', h: `
<ul>
<li><b>左側選單</b>：「開始這裡」是本說明；「設定與路由」含模組 1–4；「受限設計篩選」是模組 5；「結果、驗證與紀錄」是模組 6；「教學與內部測試」有練習案例與自我檢核。</li>
<li><b>右上角</b>「English／中文」切換介面語言，輸入值不會改變。</li>
<li><b>左下角「？說明」</b>按鈕隨時打開 AI 助理與「下一步」提示。</li>
<li>欄位名稱旁的 <b>?</b> 可看該名詞的解釋。</li>
<li>每按一個按鈕，右下角會出現操作提示。</li>
</ul>` },
      en: { t: '2. Screen layout', h: `
<ul>
<li><b>Left menu</b>: "Start here" is this help; "Setup and routing" holds Modules 1–4; "Constrained screening" is Module 5; "Results, verification and records" is Module 6; "Teaching and internal tests" holds a practice case and a short quiz.</li>
<li><b>Top right</b>: "English / 中文" switches the interface language. Input values do not change.</li>
<li><b>Bottom left "? Help"</b> opens the AI assistant and the next-step hint at any time.</li>
<li>A <b>?</b> next to a field label explains that term.</li>
<li>Every button press shows a short message at the bottom right.</li>
</ul>` } },
    { id: 'quick',
      zh: { t: '3. 五分鐘上手：用示範案例跑第一次', h: `
<ol>
<li>打開頁面時已載入「三角形事件」示範案例，不代表您的工程資料。</li>
<li>到「設定與路由」，捲到最下方，按<b>「執行路由與評估」</b>。</li>
<li>系統自動切到「結果、驗證與紀錄」。先看結果表的「質量平衡殘差」是否接近 0 %，再看入流尖峰、出流尖峰與最高水位。</li>
<li>想練習受限設計篩選：到「教學與內部測試」按「載入可執行受限篩選教學案例」，再到「受限設計篩選」按「執行受限設計篩選」。教學案例的自由出流勾選只是練習用的假設。</li>
<li>按「下載可追溯決策支援報告」保存紀錄。</li>
</ol>` },
      en: { t: '3. Five-minute start with the demonstration case', h: `
<ol>
<li>The page opens with the "triangular event" demonstration case. It is not your engineering data.</li>
<li>Open "Setup and routing", scroll to the bottom and press <b>"Run routing and evaluation"</b>.</li>
<li>The page switches to "Results, verification and records". First check that the mass-balance residual is close to 0 %. Then read peak inflow, peak outflow and maximum water level.</li>
<li>To practise constrained screening, open "Teaching and internal tests", press "Load teaching example", then open "Constrained screening" and press "Run constrained design screening". The free-discharge ticks in the teaching case are practice assumptions only.</li>
<li>Press "Download reproducible decision-support report" to keep the record.</li>
</ol>` } },
    { id: 'm1',
      zh: { t: '4. 模組 1：入流邊界', h: `
<ul>
<li><b>標準案例</b>：三角形事件、長延時事件或使用者自訂事件。</li>
<li><b>入流尖峰 Qp</b>（m³/s）必須大於 0。</li>
<li><b>入流形狀</b>：三角形用洪峰到達時間 Tp 與退水時間 Tr（或 Tp 與 Tp/Tr 比值）；長延時平頂用上升、平頂與退水時間。總事件延時 T 會自動計算，不能直接輸入。</li>
<li><b>匯入時間—流量對</b>：每行一組「時間（分鐘）, 流量（m³/s）」，第一行時間必須為 0，時間必須遞增，流量不可為負，至少兩行。例如：<code>0, 0</code>、<code>25, 0.10</code>、<code>50, 0.10</code>、<code>75, 0</code>。</li>
<li>只看尖峰流量不夠，歷線的延時與形狀也會改變需要的滯洪量。</li>
</ul>` },
      en: { t: '4. Module 1: inflow boundary', h: `
<ul>
<li><b>Standard case</b>: triangular event, long-duration event, or user-defined event.</li>
<li><b>Peak inflow Qp</b> (m³/s) must be greater than 0.</li>
<li><b>Inflow shape</b>: a triangle uses time to peak Tp and recession time Tr (or Tp and the ratio Tp/Tr); a long-duration plateau uses rising, plateau and recession times. The total event duration T is calculated and cannot be typed.</li>
<li><b>Imported time–discharge pairs</b>: one pair per line, "time (min), discharge (m³/s)". The first time must be 0, times must increase, discharge must not be negative, and at least two lines are needed. Example: <code>0, 0</code>, <code>25, 0.10</code>, <code>50, 0.10</code>, <code>75, 0</code>.</li>
<li>Peak discharge alone is not enough. Duration and shape also change the detention volume needed.</li>
</ul>` } },
    { id: 'm2',
      zh: { t: '5. 模組 2：蓄水量—水位狀態', h: `
<ul>
<li><b>固定平面面積</b>：S(H) = A ×（H − Hfloor），只需填平面面積 A（m²，必須大於 0）。</li>
<li><b>水位—蓄水量表</b>：可匯入 .csv 或 .txt，兩欄：第一欄水位（m），第二欄蓄水量（m³）。路由不會外插超出表格範圍。</li>
<li><b>池底高程 Hfloor</b>、<b>初始水位 H0</b>、所有出口高程必須用<b>同一個高程基準</b>。用相對基準時設 Hfloor = 0。H0 不可低於 Hfloor。</li>
</ul>` },
      en: { t: '5. Module 2: storage–water-level state', h: `
<ul>
<li><b>Constant plan area</b>: S(H) = A × (H − Hfloor). Only the plan area A (m², greater than 0) is needed.</li>
<li><b>Stage–storage table</b>: import a .csv or .txt file with two columns: water level (m), then storage (m³). Routing does not extrapolate beyond the table.</li>
<li><b>Floor elevation Hfloor</b>, <b>initial level H0</b> and every outlet elevation must use <b>one vertical datum</b>. For a relative datum set Hfloor = 0. H0 must not be below Hfloor.</li>
</ul>` } },
    { id: 'm3',
      zh: { t: '6. 模組 3：出口水理與自由出流證據', h: `
<ul>
<li><b>銳頂堰</b>：Qout = Cw × b ×（H − P）<sup>1.5</sup>；需填堰流係數 Cw、堰寬 b、堰頂高程 P。</li>
<li><b>矩形開口</b>：Qout = Cd × Ao × √(2g（H − 開口底高程）)；需填 Cd、開口面積 Ao、開口底高程。</li>
<li><b>豎井、圓管、水位相關係數表、堰＋開口複合出口</b>屬「研究檢視」：可以路由看結果，但受限設計篩選會鎖定。</li>
<li>係數可選預設值（例如 Cw = 1.70、Cd = 0.62），或填現場校正值；預設值只適合初步篩選。</li>
<li><b>自由出流證據</b>：受限篩選前必須勾選「已確認自由出流邊界」及四項檢核（尾水、回水／管摩阻、淹沒、操作控制），並填寫兩項紀錄（自由出流證據紀錄、篩選限制依據）。<b>只有在您真的有圖說、現地檢查或計算依據時才勾選</b>；軟體不會替您驗證這些條件。</li>
</ul>` },
      en: { t: '6. Module 3: outlet hydraulics and free-discharge evidence', h: `
<ul>
<li><b>Sharp-crested weir</b>: Qout = Cw × b × (H − P)<sup>1.5</sup>. Enter weir coefficient Cw, width b and crest elevation P.</li>
<li><b>Rectangular opening</b>: Qout = Cd × Ao × √(2g (H − invert)). Enter Cd, opening area Ao and invert elevation.</li>
<li><b>Riser, circular pipe, level-dependent coefficient table and weir + opening combinations</b> are "research inspection": routing works, but constrained screening is locked.</li>
<li>Coefficients can use presets (for example Cw = 1.70, Cd = 0.62) or a field-calibrated value. Presets suit preliminary screening only.</li>
<li><b>Free-discharge evidence</b>: before screening, tick "Free-discharge boundary confirmed" and the four checks (tailwater, backwater or pipe friction, submergence, operational control), and fill in the two records (free-discharge evidence and screening-limit source). <b>Tick them only when you hold drawings, a field inspection or a calculation that supports them.</b> The software does not verify these conditions for you.</li>
</ul>` } },
    { id: 'm4',
      zh: { t: '7. 模組 4：執行路由', h: `
<ul>
<li>按<b>「執行路由與評估」</b>開始計算，結果顯示在模組 6。</li>
<li>按鈕變<b>灰色</b>代表模組 1–3 有欄位不合理。按鈕上方會列出需要修正的欄位，點一下就會跳到該欄位（紅框標示）。</li>
<li>常見原因：Qp 小於或等於 0、平面面積為 0、堰寬或係數為 0、出口高程低於池底、沒有啟用任何出口。</li>
</ul>` },
      en: { t: '7. Module 4: run routing', h: `
<ul>
<li>Press <b>"Run routing and evaluation"</b>. Results appear in Module 6.</li>
<li>A <b>grey</b> button means a field in Modules 1–3 is not valid. The fields to fix are listed above the button. Click one to jump to it (it is outlined in red).</li>
<li>Common causes: Qp of 0 or less, plan area of 0, weir width or coefficient of 0, an outlet below the floor, or no outlet enabled.</li>
</ul>` } },
    { id: 'm6',
      zh: { t: '8. 模組 6：讀懂結果', h: `
<ul>
<li><b>先看質量平衡殘差 ε/Vin</b>：應接近 0 %。超過 0.5 % 時系統會要求先解決數值問題。</li>
<li><b>出流尖峰 Qp,o</b> 與 <b>尖峰比 RQ</b>：RQ 越小，削峰越多。</li>
<li><b>事件新增滯洪量 ΔSmax</b> 與 <b>最高水位 Hmax</b>：與容許水位及出水高比較。</li>
<li><b>近洪峰平坦指標 FPI95</b>：數值大代表洪峰很平，單一「峰值時間」不可靠，應改用體積時間指標。</li>
<li>圖形：左圖為入流與出流歷線，右圖為水位與蓄水量。「展示時間」可調整橫軸長度。</li>
<li>「受限設計篩選與最佳化結果驗證」三步判讀只針對模組 5 的結果；只做一般路由時會顯示「尚未執行受限篩選」。</li>
</ul>` },
      en: { t: '8. Module 6: reading the results', h: `
<ul>
<li><b>Check the mass-balance residual ε/Vin first</b>. It should be close to 0 %. Above 0.5 % the software asks you to resolve the numerical problem first.</li>
<li><b>Peak outflow Qp,o</b> and <b>peak ratio RQ</b>: a smaller RQ means more peak reduction.</li>
<li><b>Event-added detention volume ΔSmax</b> and <b>maximum level Hmax</b>: compare with the allowable level and freeboard.</li>
<li><b>Near-peak flatness FPI95</b>: a large value means a flat peak, so a single peak time is unreliable. Use the volume-time measures instead.</li>
<li>Charts: the left chart shows inflow and outflow; the right chart shows water level and storage. "Display duration" sets the time axis.</li>
<li>The three-step screening and optimization check covers Module 5 results only. After plain routing it shows "screening not yet run".</li>
</ul>` } },
    { id: 'm5',
      zh: { t: '9. 模組 5：受限設計篩選與連續最佳化', h: `
<ul>
<li>開放條件：只啟用<b>單一銳頂堰</b>或<b>單一矩形開口</b>、固定係數、自由出流四項檢核與兩項紀錄完整。</li>
<li>先填<b>容許出流尖峰 Qallow</b>（m³/s）與<b>容許水位 Hallow</b>（m）。這兩個值應來自法規或設計準則，並寫進「篩選限制依據」。</li>
<li><b>最長排空時間 Td</b> 與<b>容許殘留百分比</b>：在 Te + Td 時，事件新增蓄水不得超過 ΔSmax 的該百分比。</li>
<li><b>參考水位 Href</b> 只用於無因次參數 ΠQ、ΠS，不自動等於安全限制。</li>
<li>篩選邊界：填堰寬 b 或開口面積 Ao 的最小、最大值；每個勾選尺寸在邊界內等距測試五個值。</li>
<li><b>連續最佳化</b>：在最小與最大平面面積之間，同時搜尋面積 A 與一個出口尺寸。結果不是已證明的全域最佳解。</li>
<li><b>無可行解</b>：系統顯示「阻擋」與主導限制（出流尖峰、最高水位或排空殘留），並提供「前往修正」。請依工程依據調整池面積或出口尺寸，<b>不要為了得到解而任意放寬 Qallow 或 Hallow</b>。</li>
</ul>` },
      en: { t: '9. Module 5: constrained screening and continuous optimization', h: `
<ul>
<li>Opens only with a <b>single sharp-crested weir</b> or a <b>single rectangular opening</b>, fixed coefficients, the four free-discharge checks and both records complete.</li>
<li>Enter the <b>allowable peak outflow Qallow</b> (m³/s) and the <b>allowable water level Hallow</b> (m). Both should come from a regulation or design criterion and be cited in the screening-limit record.</li>
<li><b>Maximum drain-down time Td</b> and <b>permitted residual percentage</b>: at Te + Td the event-added storage must not exceed that percentage of ΔSmax.</li>
<li>The <b>reference level Href</b> only defines the dimensionless groups ΠQ and ΠS. It is not automatically a safety limit.</li>
<li>Search bounds: enter minimum and maximum weir width b or opening area Ao. Each selected size is tested at five equally spaced values.</li>
<li><b>Continuous optimization</b> searches plan area A and one outlet size together between the area bounds. The result is not a proven global optimum.</li>
<li><b>No feasible solution</b>: the software shows "Blocked", the dominant limit (peak outflow, maximum level or drain-down residual) and a "Go to fix" link. Change the pond area or outlet size on engineering grounds. <b>Do not relax Qallow or Hallow just to obtain a solution.</b></li>
</ul>` } },
    { id: 'record',
      zh: { t: '10. 下載報告與可追溯紀錄', h: `
<ul>
<li>模組 6 的「本次可追溯紀錄（唯讀）」列出本輪輸入、方法、結果與限制。</li>
<li>「下載可追溯決策支援報告」存成文字檔，包含輸入、結果與適用範圍，可附在設計紀錄中。</li>
<li>輸入改變後，舊結果會失效，請重新執行。</li>
</ul>` },
      en: { t: '10. Reports and run records', h: `
<ul>
<li>The read-only run record in Module 6 lists the inputs, method, results and limits of this run.</li>
<li>"Download reproducible decision-support report" saves a text file with inputs, results and scope for your design file.</li>
<li>When inputs change, the old result becomes invalid. Run again.</li>
</ul>` } },
    { id: 'cross',
      zh: { t: '11. 與 HEC-HMS／SWMM 比較', h: `
<ul>
<li>在模組 6「外部模型交叉驗算」選參考歷線（目前路由結果或公開基準 A-005～D-005）與外部模型。</li>
<li>匯入外部模型的<b>實際模擬結果 CSV</b>。第一列為欄名；必要欄位為 time_s（或 time、t）與 outflow_m3_s（或 qout、qo）；完整比較另需 incremental_storage_m3（或 s、storage）。</li>
<li>外部模型必須使用相同的入流、初始水位、S(H)、Q(H)、係數與時間設定。比較結果只代表數值一致性，不是現地驗證。</li>
</ul>` },
      en: { t: '11. Comparing with HEC-HMS or SWMM', h: `
<ul>
<li>In Module 6, "External model cross-check", choose the reference hydrograph (the current routing or public benchmark A-005 to D-005) and the external model.</li>
<li>Import the external model's <b>actual simulation result CSV</b>. The first row holds column names. Required columns are time_s (or time, t) and outflow_m3_s (or qout, qo). A full comparison also needs incremental_storage_m3 (or s, storage).</li>
<li>The external model must use the same inflow, initial level, S(H), Q(H), coefficients and timing. Agreement means numerical consistency only, not field validation.</li>
</ul>` } },
    { id: 'faq',
      zh: { t: '12. 常見問題', h: `
<ul>
<li><b>按鈕是灰的？</b>看按鈕上方的紅色清單，點欄位名稱去修正。</li>
<li><b>受限篩選一直鎖定？</b>檢查是否只啟用一種出口、係數是否為固定值、自由出流四項檢核與兩項紀錄是否完整。</li>
<li><b>出現「無可行解」？</b>這是正常的阻擋，代表在目前邊界內沒有設計能同時符合限制。依「主導限制」調整面積或出口尺寸，或擴大有工程依據的搜尋邊界。</li>
<li><b>資料會上傳嗎？</b>不會。計算、說明與 AI 助理都在瀏覽器內執行，不會傳送資料。</li>
<li><b>結果可以直接當設計核准嗎？</b>不行。結果只在宣告的條件下成立，須由專業人員判斷。</li>
</ul>` },
      en: { t: '12. Frequently asked questions', h: `
<ul>
<li><b>The button is grey?</b> Read the red list above the button and click a field name to fix it.</li>
<li><b>Screening stays locked?</b> Check that only one outlet is enabled, coefficients are fixed, and the four free-discharge checks and both records are complete.</li>
<li><b>"No feasible solution"?</b> This is a deliberate block: no design within the current bounds meets all limits. Adjust area or outlet size according to the dominant limit, or widen search bounds that you can justify.</li>
<li><b>Is my data uploaded?</b> No. Calculation, help and the AI assistant all run in your browser and send nothing.</li>
<li><b>Can a result serve as design approval?</b> No. It holds only under the declared conditions and needs a professional's judgement.</li>
</ul>` } }
  ];

  // [id, zh term, en term, zh definition, en definition, target field or module, extra match keys]
  const GLOSSARY = [
    ['qp', '入流尖峰 Qp', 'Peak inflow Qp', '入流歷線的最大流量（m³/s），必須大於 0。', 'Largest discharge of the inflow hydrograph (m³/s). Must be greater than 0.', 'qp', ['qp', '入流尖峰', 'peak inflow']],
    ['tp', '洪峰到達時間 Tp', 'Time to peak Tp', '三角形入流從 0 上升到尖峰所需的時間（分鐘）。', 'Time for a triangular inflow to rise from 0 to its peak (min).', 'tpeak', ['tp', '洪峰到達', 'time to peak']],
    ['tr', '退水時間 Tr', 'Recession time Tr', '三角形入流從尖峰下降到 0 所需的時間（分鐘）。', 'Time for a triangular inflow to fall from its peak to 0 (min).', 'recess', ['tr', '退水時間', 'recession']],
    ['dur', '總事件延時 T', 'Total event duration T', '入流歷線的總長度（分鐘），由各段時間自動相加，不能直接輸入。', 'Total length of the inflow hydrograph (min), added up from the segment times. It cannot be typed.', 'dur', ['延時', 'duration']],
    ['sh', '蓄水量—水位關係 S(H)', 'Stage–storage relation S(H)', '池中水位 H 與蓄水量 S 的對應關係。固定面積時 S = A ×（H − Hfloor）。', 'Relation between water level H and stored volume S. With constant area, S = A × (H − Hfloor).', 'storageMode', ['s(h)', '蓄水量', 'stage-storage', 'storage relation']],
    ['area', '平面面積 A', 'Plan area A', '固定面積模式下的池面積（m²），必須大於 0。', 'Pond surface area in constant-area mode (m²). Must be greater than 0.', 'area', ['平面面積', '池面積', 'plan area']],
    ['floor', '池底高程 Hfloor', 'Floor elevation Hfloor', '池底的高程（m）。所有水位與出口高程都要與它使用同一個基準。', 'Elevation of the pond floor (m). All levels and outlet elevations must share its datum.', 'floor', ['hfloor', '池底', 'floor elevation']],
    ['h0', '初始水位 H0', 'Initial level H0', '事件開始時的池內水位（m），不可低於 Hfloor。', 'Water level in the pond when the event starts (m). Must not be below Hfloor.', 'h0', ['h0', '初始水位', 'initial level', 'initial water']],
    ['datum', '高程基準', 'Vertical datum', '量測高程的共同零點。池底、水位、堰頂、開口底都要用同一個基準，否則結果錯誤。', 'Common zero for elevations. Floor, levels, crest and invert must share it, or results are wrong.', 'floor', ['基準', 'datum']],
    ['cw', '堰流係數 Cw', 'Weir coefficient Cw', '銳頂堰公式 Q = Cw × b ×（H − P）^1.5 中的係數。預設 1.70 只供初步篩選。', 'Coefficient in the weir law Q = Cw × b × (H − P)^1.5. The 1.70 preset is for preliminary screening only.', 'cw', ['cw', '堰流係數', 'weir coefficient']],
    ['bw', '堰寬 b', 'Weir width b', '銳頂堰的溢流寬度（m）。', 'Crest length of the sharp-crested weir (m).', 'bw', ['堰寬', 'weir width']],
    ['crest', '堰頂高程 P', 'Crest elevation P', '水位超過此高程才開始溢流（m）。', 'Water starts to spill once the level exceeds this elevation (m).', 'crest', ['堰頂', 'crest']],
    ['cd', '流量係數 Cd', 'Discharge coefficient Cd', '矩形開口公式 Q = Cd × Ao × √(2g(H − 開口底高程)) 中的係數。預設 0.62。', 'Coefficient in the opening law Q = Cd × Ao × √(2g(H − invert)). Preset 0.62.', 'cd', ['cd', '流量係數', 'discharge coefficient']],
    ['ao', '開口面積 Ao', 'Opening area Ao', '矩形開口的斷面積（m²）＝ 高度 a × 寬度 b。', 'Area of the rectangular opening (m²) = height a × width b.', 'ao', ['ao', '開口面積', 'opening area']],
    ['invert', '開口底高程', 'Invert elevation', '矩形開口的下緣高程（m），水位高於此值才出流。', 'Lower edge of the rectangular opening (m). Outflow starts above it.', 'invert', ['開口底', 'invert']],
    ['research', '研究檢視', 'Research inspection', '豎井、圓管、係數表或複合出口的設定。可以路由看結果，但受限設計篩選鎖定，須另行獨立驗證。', 'Riser, pipe, coefficient-table or combined-outlet settings. Routing works but constrained screening is locked; independent verification is needed.', 'riserOn', ['研究檢視', '豎井', '圓管', 'research', 'riser', 'pipe']],
    ['free', '自由出流', 'Free discharge', '出口流量只由池內水位決定，不受尾水、下游回水、淹沒或閘門操作影響。受限篩選前必須有證據並勾選四項檢核。', 'Outlet flow depends only on pond level, not on tailwater, backwater, submergence or gate operation. Evidence and the four checks are required before screening.', 'freeDischarge', ['自由出流', '尾水', '回水', '淹沒', 'free discharge', 'free-discharge', 'tailwater', 'backwater', 'submerg']],
    ['records', '兩項可追溯紀錄', 'Two evidence records', '「自由出流證據紀錄」與「篩選限制依據」：寫明圖說或檢查編號、檢核人與日期，以及 Qallow、Hallow 等限制的來源。', '"Free-discharge evidence" and "screening-limit source": cite drawing or inspection IDs, checker and date, and the source of limits such as Qallow and Hallow.', 'freeEvidenceRecord', ['紀錄', '證據', 'record', 'evidence']],
    ['rk4', 'RK4', 'RK4', '四階 Runge–Kutta 法，用固定時間步長 Δt = 2 秒逐步解 dS/dt = Qin − Qout。', 'Fourth-order Runge–Kutta method that steps dS/dt = Qin − Qout with a fixed Δt = 2 s.', 'run', ['rk4', 'runge']],
    ['mass', '質量平衡殘差 ε/Vin', 'Mass-balance residual ε/Vin', '累積淨入流與蓄水變化的差，除以入流總體積。應接近 0 %；超過 0.5 % 不可使用結果。', 'Difference between cumulative net inflow and storage change, divided by inflow volume. Should be near 0 %; above 0.5 % the result must not be used.', 'mod-evaluation', ['質量平衡', '守恆', '殘差', 'mass balance', 'residual']],
    ['rq', '尖峰比 RQ', 'Peak ratio RQ', 'RQ = 出流尖峰 ÷ 入流尖峰。越小代表削峰越多。', 'RQ = peak outflow ÷ peak inflow. Smaller means more peak reduction.', 'mod-evaluation', ['rq', '尖峰比', 'peak ratio']],
    ['dsmax', '事件新增滯洪量 ΔSmax', 'Event-added detention ΔSmax', '事件期間相對初始蓄水量的最大新增蓄水（m³）。', 'Largest storage added above the initial storage during the event (m³).', 'mod-evaluation', ['δsmax', 'dsmax', 'smax', '滯洪量', 'detention volume']],
    ['rs', '蓄水比 RS', 'Storage ratio RS', 'RS = ΔSmax ÷ 入流總體積 Vin。', 'RS = ΔSmax ÷ inflow volume Vin.', 'mod-evaluation', ['rs', '蓄水比', 'storage ratio']],
    ['rt', '無因次遲滯 RT', 'Dimensionless lag RT', 'RT =（出流尖峰時間 − 入流尖峰時間）÷ 事件延時。', 'RT = (time of peak outflow − time of peak inflow) ÷ event duration.', 'mod-evaluation', ['rt', '遲滯', 'lag']],
    ['hmax', '最高水位 Hmax', 'Maximum level Hmax', '事件中池內最高水位（m），應與容許水位 Hallow 及出水高比較。', 'Highest pond level during the event (m). Compare with Hallow and freeboard.', 'mod-evaluation', ['hmax', '最高水位', 'maximum level']],
    ['fpi', '近洪峰平坦指標 FPI95', 'Near-peak flatness FPI95', '出流在 95 % 尖峰以上的持續時間占路由時間的比例。數值大代表峰很平，單一峰值時間不可靠。', 'Share of routed time with outflow above 95 % of its peak. A large value means a flat peak, so a single peak time is unreliable.', 'mod-evaluation', ['fpi', 'fpi95', '平坦', 'flatness']],
    ['qallow', '容許出流尖峰 Qallow', 'Allowable peak outflow Qallow', '受限篩選中出流尖峰的上限（m³/s），應依法規或設計準則填寫。', 'Upper limit of peak outflow in screening (m³/s), taken from a regulation or design criterion.', 'qallow', ['qallow', '容許出流', 'allowable outflow', 'allowable peak']],
    ['hallow', '容許水位 Hallow', 'Allowable level Hallow', '受限篩選中最高水位的上限（m），不可低於 H0。', 'Upper limit of the maximum level in screening (m). Must not be below H0.', 'hallow', ['hallow', '容許水位', 'allowable level', 'allowable water']],
    ['td', '最長排空時間 Td 與殘留百分比', 'Drain-down time Td and residual', '在事件結束時間 Te 再加 Td 時，事件新增蓄水不得超過 ΔSmax 的宣告百分比。', 'At event end Te plus Td, event-added storage must not exceed the stated percentage of ΔSmax.', 'drainHours', ['td', '排空', 'drain']],
    ['href', '參考水位 Href', 'Reference level Href', '只用來定義無因次參數 ΠQ、ΠS 的水位（m），不自動等於安全限制。', 'Level used only to define the dimensionless groups ΠQ and ΠS (m). Not automatically a safety limit.', 'href', ['href', '參考水位', 'reference level']],
    ['pi', '無因次參數 ΠH、ΠQ、ΠS', 'Dimensionless groups ΠH, ΠQ, ΠS', '把水位、出流能力與庫容以入流尺度正規化的比值，用於比較不同案例；不是通用設計公式。', 'Ratios that scale level, outlet capacity and storage by the inflow, used to compare cases. Not general design formulas.', 'mod-optimization', ['π', 'pi', '無因次', 'dimensionless']],
    ['screen', '受限設計篩選', 'Constrained screening', '在宣告的限制與搜尋邊界內，逐一重跑路由找出可行的池面積與出口尺寸。結果不是最終設計。', 'Reruns routing over the declared bounds to find feasible pond areas and outlet sizes under the declared limits. Not a final design.', 'optimize', ['受限', '篩選', 'screening']],
    ['cont', '連續最佳化', 'Continuous optimization', '在面積上下限之間連續搜尋面積 A 與一個出口尺寸，再局部精修；不是已證明的全域最佳解。', 'Continuous search of area A and one outlet size between bounds, then local refinement. Not a proven global optimum.', 'mod-optimization', ['連續最佳化', '最佳化', 'optimization', 'optimisation']],
    ['blocked', '阻擋／無可行解', 'Blocked / no feasible solution', '在目前的限制與邊界內，沒有任何候選能同時符合所有條件。系統顯示主導限制與修正方向，不會顯示「通過」。', 'No candidate within the current limits and bounds meets every condition. The software shows the dominant limit and a correction path, never "pass".', 'mod-evaluation', ['阻擋', '無可行', 'blocked', 'infeasible', 'no feasible']],
    ['numcons', '數值一致性', 'Numerical consistency', '用相同輸入與物理設定時，PondGate 與 HEC-HMS／SWMM 的計算結果相近。不代表現地校準或普遍驗證。', 'PondGate and HEC-HMS or SWMM give close results under identical inputs and physics. Not field calibration or general validation.', 'mod-evaluation', ['一致性', 'consistency', 'swmm', 'hec']],
    ['reg', '176 組回歸測試', '176-case regression', '用 176 組實驗室案例（352 條原始歷線）檢查每次發版的 RK4 核心結果不變；尖峰流量 MARE：A 2.924 %、B 2.954 %、C 4.104 %、D 4.649 %。', 'Release check that reruns 176 laboratory cases (352 raw series) through the RK4 core. Peak-discharge MARE: A 2.924 %, B 2.954 %, C 4.104 %, D 4.649 %.', 'mod-evaluation', ['176', '回歸', 'regression', 'mare']]
  ];

  const api = { MANUAL, GLOSSARY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PondGateHelpContent = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
