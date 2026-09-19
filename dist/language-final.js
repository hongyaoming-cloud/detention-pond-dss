/* Authoritative language controller; deliberately loaded after all legacy modules. */
(() => {
  const btn=document.getElementById('lang'); if(!btn)return;
  const zh={
    'Detention Pond Routing Decision Support':'滯洪池路由決策支援系統',
    'Single-facility, event-based level-pool routing with dimensionless and identifiability-aware interpretation':'單一滯洪設施事件式水平池演算，含無因次及可識別性判讀',
    'Model inputs':'模式輸入','Standard case':'標準案例','Inflow hydrograph':'入流歷線','Storage-elevation relation':'蓄水量—水位關係','Outlet relation':'出流關係','Run routing and evaluation':'執行路由與評估','Routing result and engineering interpretation':'路由結果與工程判讀','Inflow and routed outflow':'入流與路由出流','Water level and storage':'水位與蓄水量','Output':'輸出項目','Value':'數值','Engineering meaning':'工程意義','Download reproducible decision-support report':'下載可追溯決策支援報告',
    'Display duration (min)':'展示時間（分鐘）','Event shape':'入流形狀','Triangular input mode':'三角形入流設定','Tp and Tr':'Tp 與 Tr','Tp and Tp/Tr':'Tp 與 Tp/Tr 比值','Ratio Tp/Tr':'Tp/Tr 比值','Time to peak Tp (min)':'洪峰到達時間 Tp（分鐘）','Recession time Tr (min)':'退水時間 Tr（分鐘）','Rising time (min)':'上升時間（分鐘）','Plateau duration (min)':'平頂持續時間（分鐘）','Peak inflow Qp (m3/s)':'入流尖峰 Qp（m³/s）','Event duration T (min)':'事件延時 T（分鐘）','Plan area A (m2)':'平面面積 A（m²）','Initial water level H0 (m)':'初始水位 H0（m）',
    'Storage representation':'蓄水量表示方式','Constant plan area: S(H) = A H':'固定平面面積：S(H) = A H','Tabulated stage-storage relation S(H)':'水位—蓄水量表 S(H)','Vertical riser shaft':'豎井','Outlet discharge-coefficient basis':'出口流量係數依據','Weir Cw preset':'堰流係數 Cw 預設','Orifice Cd preset':'孔口流量係數 Cd 預設','Riser inlet Cr preset':'豎井入口係數 Cr 預設','Riser shaft Cd preset':'豎井管身係數 Cd 預設','Coefficient mode':'係數模式','Fixed coefficient':'固定係數','Water-level-dependent coefficient table':'水位相關係數表','Coefficient table (H, Cw, Cd-orifice, Cr-riser, Cd-shaft; one row per line)':'係數表（H、堰流 Cw、孔口 Cd、豎井入口 Cr、豎井管身 Cd；每列一組）','Taiwan practice—sharp-crested rectangular weir (Cw = 1.70)':'臺灣實務—矩形銳頂堰（Cw = 1.70）','International laboratory/US customary sharp crest (Cw = 1.84)':'國際試驗／美制銳頂堰（Cw = 1.84）','Broad-crested weir screening value (Cw = 1.42)':'寬頂堰初步檢核值（Cw = 1.42）','Standard sharp-edged orifice (Cd = 0.62)':'標準銳緣孔口（Cd = 0.62）','Conservative sharp-edged value (Cd = 0.60)':'保守銳緣孔口值（Cd = 0.60）','Rounded/short-tube screening value (Cd = 0.80)':'圓角／短管初步檢核值（Cd = 0.80）','Standard sharp-crested inlet (Cr = 1.70)':'標準銳頂入口（Cr = 1.70）','Laboratory sharp-crested inlet (Cr = 1.84)':'試驗室銳頂入口（Cr = 1.84）','Standard sharp-edged shaft (Cd = 0.62)':'標準銳緣管身（Cd = 0.62）','Field-calibrated value':'現場校正值','Weir only':'僅堰流','Orifice only':'僅孔口','Vertical riser only':'僅豎井','Weir + orifice':'堰流＋孔口','Weir + riser':'堰流＋豎井','Orifice + riser':'孔口＋豎井','Weir + orifice + riser':'堰流＋孔口＋豎井',
    'Dimensionless decision support and design optimization':'無因次決策支援與設計最佳化','5. Optimization and design support':'5. 最佳化與設計支援','Allowable peak outflow (m3/s)':'容許出流尖峰（m³/s）','Allowable water level (m)':'容許水位（m）','Outlet configuration for design search':'設計搜尋的出口組合','Search mode':'搜尋模式','Standard search: up to two outlet dimensions':'標準搜尋：最多變動兩個出口尺寸','Advanced full search: all three outlet dimensions':'進階完整搜尋：同時變動三個出口尺寸','Design objective':'設計目標','Minimum required detention volume Smax':'最小所需滯洪量 Smax','Minimum plan area A':'最小平面面積 A','Vary weir width b':'調整堰寬 b','Vary orifice area Ao':'調整孔口面積 Ao','Vary riser diameter D':'調整豎井直徑 D','Minimum b (m)':'最小堰寬 b（m）','Maximum b (m)':'最大堰寬 b（m）','Minimum Ao (m2)':'最小孔口面積 Ao（m²）','Maximum Ao (m2)':'最大孔口面積 Ao（m²）','Minimum D (m)':'最小豎井直徑 D（m）','Maximum D (m)':'最大豎井直徑 D（m）','Find discrete constrained optimum':'尋找離散受限最佳解','Recommended design dimensions':'建議設計尺寸','Optimization candidates':'最佳化候選方案','Discrete constrained optimum':'離散受限最佳解','Full routed record':'完整路由歷線',
    'Peak inflow':'入流尖峰','Peak outflow':'出流尖峰','Declared event loading':'宣告事件負荷','Routed outlet response':'路由出口反應','Peak attenuation PiQ':'尖峰削減 PiQ','Fraction of peak reduced':'尖峰削減比例','Volume ratio PiV':'體積比 PiV','Outlet volume / inflow volume':'出流體積／入流體積','Normalized lag':'無因次遲滯','Peak flatness FPI95':'洪峰平坦度 FPI95','95% near-peak duration / record duration':'95% 近尖峰延時／歷線延時','Peak water level':'最大水位','Storage and freeboard check':'蓄水量與出水高檢核','Median-volume time':'體積中位時間','Bulk timing measure':'整體時間指標','Mass-balance residual':'質量平衡殘差','Must remain near zero':'應維持接近零','Use within the tested interpretation envelope':'請在已測試的判讀範圍內使用','The routed hydrograph passed the numerical mass-balance check and is presented with dimensionless response measures. Use the full report, not only point peak time, as the engineering record.':'路由歷線已通過數值質量平衡檢核，並提供無因次反應指標。工程判讀應使用完整報告，不應僅依單一尖峰時間。','Horizontal: candidate plan area. Vertical: maximum detained storage. Green: feasible; gray: constraint failed; red ring: selected discrete constrained optimum.':'水平軸：候選平面面積。垂直軸：最大滯洪量。綠色：可行；灰色：不符限制；紅圈：選定的離散受限最佳解。',
    'Fixed laboratory regression suite / 固定實驗回歸測試':'固定實驗回歸測試','View release manifest':'查看發版檢核紀錄','Scope: one detention facility with a known inflow. Rainfall-runoff, channel routing, continuous simulation, and multi-pond systems belong to Software II.':'適用範圍：已知入流下的單一滯洪設施。降雨逕流、河道路由、連續模擬與多池系統屬於 Software II。'
  };
  Object.assign(zh,{'Rectangular opening':'矩形開口','Opening coefficient Cd':'開口流量係數 Cd','Opening area Ao (m2)':'開口面積 Ao（m²）','Opening height a (m)':'開口高度 a（m）','Opening width b = Ao/a (m)':'開口寬度 b = Ao/a（m）','Opening invert elevation (m)':'開口底高程（m）','Circular pipe outlet':'圓管出口','Pipe diameter Dp (m)':'圓管直徑 Dp（m）','Pipe discharge coefficient Cd,p':'圓管流量係數 Cd,p','Pipe invert elevation (m)':'圓管底高程（m）','Variable-coefficient source':'變動係數來源','Apply Taiwan guidance range template (editable)':'套用臺灣設計指引範圍範本（可編輯）','International laboratory-data workspace':'國際試驗資料工作表','Coefficient-table citation / test record':'係數表引用資料／試驗紀錄','Source URL':'來源網址','Fixed values are preliminary screening settings. Select field-calibrated value to enter a project-specific coefficient.':'固定值僅供初步檢核；選擇現場校正值後可輸入專案專屬係數。','Each source template is an editable engineering starting table, not a universal curve. Linear interpolation is applied at every routing time step. H must increase; end-row coefficients apply outside the table.':'每個來源範本均為可編輯的工程起始表，並非通用曲線。每一演算時間步均採線性內插；H 必須遞增，表外採端點係數。','For a variable curve, retain the exact citation and URL in the calculation record. Replace every template value with a source-supported or field-calibrated value before final design.':'變動曲線的計算紀錄必須保留完整引用資料與網址。最終設計前，應以有出處或現地校正的係數取代所有範本值。','Coefficient references and applicability':'係數文獻與適用條件'});
  Object.assign(zh,{'Design screening and constrained routing':'受限設計篩選與路由','Run constrained design screening':'執行受限設計篩選','This constrained routing screen is conditional on the declared inflow, storage relation, outlet law, limits, and search bounds. It is not a final engineering-design validation.':'本受限路由篩選取決於所宣告的入流、蓄水關係、出口律、限制與搜尋邊界；它不是最終工程設計驗證。'});
  Object.assign(zh,{
    'Constrained design screening':'受限設計篩選',
    '5. Constrained design screening':'5. 受限設計篩選',
    'Dimensionless decision support and constrained screening':'無因次決策支援與受限篩選',
    'Outlet configuration for constrained screening':'受限篩選的出口組合',
    'Formal screening is limited to one passive weir or one rectangular opening under confirmed free discharge. Other choices are retained only for research inspection and keep screening locked.':'正式篩選僅限已確認自由出流下的單一被動堰流或單一矩形開口。其他選項僅保留供研究檢視，並維持篩選鎖定。',
    'Passive weir only — formal screening':'僅被動堰流——可正式篩選',
    'Rectangular opening only — formal screening':'僅矩形開口——可正式篩選',
    'Vertical riser only — research inspection (screening locked)':'僅豎井——研究檢視（篩選鎖定）',
    'Weir + rectangular opening — research inspection (screening locked)':'堰流＋矩形開口——研究檢視（篩選鎖定）',
    'Weir + riser — research inspection (screening locked)':'堰流＋豎井——研究檢視（篩選鎖定）',
    'Rectangular opening + riser — research inspection (screening locked)':'矩形開口＋豎井——研究檢視（篩選鎖定）',
    'Weir + opening + riser — research inspection (screening locked)':'堰流＋開口＋豎井——研究檢視（篩選鎖定）',
    'Screening resolution':'篩選解析度','Screening objective':'篩選目標',
    'Standard discrete screen: up to two outlet dimensions':'標準離散篩選：最多變動兩個出口尺寸',
    'Advanced discrete screen: all three outlet dimensions':'進階離散篩選：同時變動三個出口尺寸',
    'Screen weir width b':'篩選堰寬 b','Screen opening area Ao':'篩選開口面積 Ao','Screen riser diameter D (research inspection only)':'篩選豎井直徑 D（僅研究檢視）',
    'Declared screening bounds':'宣告篩選邊界','Constrained screening dimensions':'受限篩選尺寸','Constrained screening cases':'受限篩選案例',
    'Selected feasible constrained-screening case — routed':'選定可行受限篩選案例——已完成路由',
    'Screening item':'篩選項目','screened':'已篩選',
    'This is a conditional discrete screening result under the declared bounds. It is not a continuous global optimum or final engineering-design validation.':'此為宣告範圍下的條件式離散篩選結果；不是連續全域最佳解，也不是最終工程設計驗證。'
  });
  Object.assign(zh,{
    'Free-discharge evidence record (required for constrained screening)':'自由出流證據紀錄（受限篩選必填）',
    'Screening-limit basis (required for constrained screening)':'篩選限制依據（受限篩選必填）',
    'Drawing / field inspection / calculation record identifier; checker; date':'圖說／現地檢查／計算紀錄識別碼；檢核者；日期',
    'Source and applicability of Qallow, Hallow, Td, and residual limit; checker; date':'Qallow、Hallow、Td 與殘留限制的來源及適用性；檢核者；日期',
    'These records are preserved in the run report. They document user-provided evidence; the software does not independently verify tailwater, backwater, or project design criteria.':'這些紀錄會保留於執行報告，用以記載使用者提出的證據；軟體不會獨立驗證尾水、回水或專案設計準則。',
    'Outlet hydraulic boundary':'出口水力邊界',
    'Free-discharge boundary confirmed':'已確認自由出流邊界',
    'Required evidence for constrained screening':'受限篩選所需物理證據',
    'Tailwater remains below every controlling outlet.':'尾水位低於每一控制出口。',
    'No downstream backwater or pipe-friction control modifies Qout(H).':'下游回水或管摩阻控制不改變 Qout(H)。',
    'No outlet is submerged over the routed water-level range.':'在路由水位範圍內，出口未被淹沒。',
    'No gate, pump, or operational control changes the stated outlet law.':'閘門、抽水或操作控制不改變所宣告的出口定律。',
    'These four checks document why Qout = Qout(H) is applicable. Until all are checked, routing remains exploratory and constrained screening is locked.':'此四項檢核記錄 Qout = Qout(H) 的適用理由；未全部勾選前，路由僅供探索性檢視，受限篩選維持鎖定。'
  });
  let en=false;
  function apply(){const reverse=Object.fromEntries(Object.entries(zh).map(([a,b])=>[b,a]));const map=en?reverse:zh;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const s=n.nodeValue.trim();if(map[s])n.nodeValue=n.nodeValue.replace(s,map[s]);}document.documentElement.lang=en?'en':'zh-Hant';try{appEnglish=en;}catch(_){/* The core language state is unavailable only before the routing extension loads. */}document.title=en?'Detention Pond Routing Decision Support':'滯洪池路由決策支援系統';btn.textContent=en?'中文':'English';}
  btn.onclick=()=>{en=!en;if(window.__dssSetLanguage)window.__dssSetLanguage(en);apply();}; apply();
  /* Translate only after the two known render actions; never observe the whole page. */
  ['run','optimize'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(()=>{if(!en)apply();},0)));
})();
