/* Authoritative language controller; deliberately loaded after all legacy modules. */
(() => {
  const btn=document.getElementById('lang'); if(!btn)return;
  const zh={
    'Detention Pond Routing Decision Support':'滯洪池路由決策支援系統',
    'Single-facility, event-based level-pool routing with dimensionless and identifiability-aware interpretation':'單一滯洪設施事件式水平池演算，含無因次及可識別性判讀',
    'Model inputs':'模式輸入','Standard case':'標準案例','Inflow hydrograph':'入流歷線','Storage-elevation relation':'蓄水量—水位關係','Outlet relation':'出流關係','Run routing and evaluation':'執行路由與評估','Routing result and engineering interpretation':'路由結果與工程判讀','Inflow and routed outflow':'入流與路由出流','Water level and storage':'水位與蓄水量','Output':'輸出項目','Value':'數值','Engineering meaning':'工程意義','Download reproducible decision-support report':'下載可追溯決策支援報告',
    'Display duration (min)':'展示時間（分鐘）','Event shape':'入流形狀','Triangular input mode':'三角形入流設定','Tp and Tr':'Tp 與 Tr','Tp and Tp/Tr':'Tp 與 Tp/Tr 比值','Ratio Tp/Tr':'Tp/Tr 比值','Time to peak Tp (min)':'洪峰到達時間 Tp（分鐘）','Recession time Tr (min)':'退水時間 Tr（分鐘）','Rising time (min)':'上升時間（分鐘）','Plateau duration (min)':'平頂持續時間（分鐘）','Peak inflow Qp (m3/s)':'入流尖峰 Qp（m³/s）','Event duration T (min)':'事件延時 T（分鐘）','Plan area A (m2)':'平面面積 A（m²）','Initial water level H0 (m)':'初始水位 H0（m）',
    'Storage representation':'蓄水量表示方式','Constant plan area: S(H) = A H':'固定平面面積：S(H) = A H','Tabulated stage-storage relation S(H)':'水位—蓄水量表 S(H)','Vertical riser shaft':'豎井','Weir only':'僅堰流','Orifice only':'僅孔口','Vertical riser only':'僅豎井','Weir + orifice':'堰流＋孔口','Weir + riser':'堰流＋豎井','Orifice + riser':'孔口＋豎井','Weir + orifice + riser':'堰流＋孔口＋豎井',
    'Dimensionless decision support and design optimization':'無因次決策支援與設計最佳化','Advanced full search: all three outlet dimensions':'進階完整搜尋：同時變動三個出口尺寸','Find discrete constrained optimum':'尋找離散受限最佳解','Recommended design dimensions':'建議設計尺寸','Optimization candidates':'最佳化候選方案','Discrete constrained optimum':'離散受限最佳解','Full routed record':'完整路由歷線',
    'Fixed laboratory regression suite / 固定實驗回歸測試':'固定實驗回歸測試','Scope: one detention facility with a known inflow. Rainfall-runoff, channel routing, continuous simulation, and multi-pond systems belong to Software II.':'適用範圍：已知入流下的單一滯洪設施。降雨逕流、河道路由、連續模擬與多池系統屬於 Software II。'
  };
  let en=true;
  function apply(){const reverse=Object.fromEntries(Object.entries(zh).map(([a,b])=>[b,a]));const map=en?reverse:zh;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const s=n.nodeValue.trim();if(map[s])n.nodeValue=n.nodeValue.replace(s,map[s]);}document.documentElement.lang=en?'en':'zh-Hant';document.title=en?'Detention Pond Routing Decision Support':'滯洪池路由決策支援系統';btn.textContent=en?'中文':'English';}
  btn.onclick=()=>{en=!en;apply();}; apply();
})();
