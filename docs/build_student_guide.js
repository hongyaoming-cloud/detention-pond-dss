// Builds the full step-by-step student guide (Traditional Chinese) by operating PondGate exactly as a student would.
// Usage: serve dist/ on a port, then: node docs/build_student_guide.js <port>
// Outputs: dist/manual/guide/*.png (annotated screenshots), dist/student-guide.js (in-app data),
//          docs/STUDENT_GUIDE_zh-Hant.md. Every number quoted in "畫面應該出現" is read from the screen
//          during this run, so the text always matches the software. Nothing is computed here.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const port = process.argv[2] || 8765; const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'manual', 'guide'); fs.mkdirSync(OUT, { recursive: true });
const VERSION = '1.1.0';
const FREE = ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'];
const PRACTICE_EVIDENCE = '教學假設（僅供練習）：單一銳頂堰自由出流，不受尾水、回水、淹沒或操作控制影響。';
const PRACTICE_LIMIT = '教學假設（僅供練習）：Qallow = 0.080 m³/s、Hallow = 1.00 m。';

/* ---------- page helpers ---------- */
const setv = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); if (typeof v === 'boolean') e.checked = v; else e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
const click = (p, id) => p.evaluate(id => document.getElementById(id).click(), id);
const open = (p, t) => p.evaluate(t => window.DSSWorkspacePages.openTarget(t), t);
const text = (p, s) => p.evaluate(s => document.querySelector(s)?.innerText || '', s);
const val = (p, id) => p.evaluate(id => document.getElementById(id).value, id);
const wait = (p, ms) => p.waitForTimeout(ms);
async function run(p) { await click(p, 'run'); await wait(p, 2200); }
async function screen(p) { await click(p, 'optimize'); for (let i = 0; i < 40; i++) { await wait(p, 500); const o = await text(p, '#optout'); if (/^(選定可行|阻擋)/.test(o.trim())) break; } await wait(p, 1200); }
async function met(p) {
  return p.evaluate(() => {
    const rows = [...document.querySelectorAll('#metricbody tr')].map(r => [...r.cells].map(c => c.innerText.trim()));
    const g = k => (rows.find(r => r[0].includes(k)) || [])[1] || '';
    return { qpi: g('Qp,i'), qpo: g('Qp,o'), rq: g('RQ'), ds: g('ΔSmax'), rs: g('RS'), hmax: g('Hmax'), eps: g('ε/Vin'), fpi: g('FPI95'), t50: g('中位體積時間'), tc: g('出流重心時間'), resid: g('Te + Td') };
  });
}
async function evidence(p) { for (const id of FREE) await setv(p, id, true); await setv(p, 'freeEvidenceRecord', PRACTICE_EVIDENCE); await setv(p, 'screeningLimitRecord', PRACTICE_LIMIT); }
async function fresh(p) { await p.goto(`http://localhost:${port}/index.html`); await wait(p, 1500); }

/* ---------- annotated screenshot ---------- */
async function shot(p, file, box, marks, opt = {}) {
  await p.addStyleTag({ content: '.button-feedback{display:none!important}' });
  const clip = await p.evaluate(([box, marks, opt]) => {
    document.querySelectorAll('.sg-layer').forEach(e => e.remove());
    const byText = (t, within) => { const root = document.querySelector(within || 'body'); let best = null;
      root.querySelectorAll('*').forEach(e => { if (e.offsetParent === null && getComputedStyle(e).position !== 'fixed') return; if ((e.innerText || '').includes(t) && (!best || e.innerText.length < best.innerText.length)) best = e; }); return best; };
    const find = m => { let el = m.t ? byText(m.t, m.in) : document.querySelector(m.s); if (el && m.up) el = el.closest(m.up) || el.parentElement; return el; };
    const C = box === 'VIEWPORT' ? null : document.querySelector(box); if (box !== 'VIEWPORT' && !C) return null;
    const fixed = C && ['fixed', 'sticky'].includes(getComputedStyle(C).position) || box === 'VIEWPORT';
    if (C && !fixed) { const first = marks.length ? find(marks[0]) : null; (opt.focus && first ? first : C).scrollIntoView({ block: opt.focus ? 'center' : 'start' }); }
    const layer = document.createElement('div'); layer.className = 'sg-layer'; layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:100000;pointer-events:none'; document.body.appendChild(layer);
    const seen = {}; const rects = [];
    for (const m of marks) {
      const el = find(m); if (!el) continue; const r = el.getBoundingClientRect(); if (!r.width) continue;
      const ox = fixed ? 0 : scrollX, oy = fixed ? 0 : scrollY, pos = fixed ? 'fixed' : 'absolute';
      const x = r.left + ox, y = r.top + oy; rects.push(r);
      const o = document.createElement('div'); o.style.cssText = `position:${pos};left:${x - 3}px;top:${y - 3}px;width:${r.width + 6}px;height:${r.height + 6}px;border:3px solid #d92d20;border-radius:6px;box-sizing:border-box`; layer.appendChild(o);
      if (!seen[m.n]) { seen[m.n] = 1; const c = document.createElement('div'); c.textContent = m.n;
        // badge sits inside the box at its right end, so it never hides a label or a neighbouring field
        const btn = el.tagName === 'BUTTON' || r.width < 170, bx = btn ? r.right + ox - 14 : r.right + ox - 32, by = btn ? r.top + oy - 16 : r.height < 64 ? r.top + oy + (r.height - 26) / 2 : r.top + oy + 4; // buttons: badge on the top-right corner, so the button text stays readable
        c.style.cssText = `position:${pos};left:${bx}px;top:${by}px;width:26px;height:26px;border-radius:50%;background:#d92d20;color:#fff;font:700 15px/26px sans-serif;text-align:center;box-shadow:0 0 0 2px #fff`; layer.appendChild(c); }
    }
    if (box === 'VIEWPORT') return { x: 0, y: 0, width: innerWidth, height: innerHeight, vp: true };
    const r = C.getBoundingClientRect();
    if (fixed) return { x: Math.max(0, r.left - 10), y: Math.max(0, r.top - 10), width: Math.min(innerWidth, r.width + 20), height: Math.min(innerHeight, r.height + 20), vp: true };
    let top = r.top + scrollY - 12, bottom = r.bottom + scrollY + 6;
    if (opt.focus && rects.length) { top = Math.max(top, Math.min(...rects.map(q => q.top)) + scrollY - 70); bottom = Math.min(bottom, Math.max(...rects.map(q => q.bottom)) + scrollY + 50); }
    if (bottom - top > (opt.maxH || 950)) bottom = top + (opt.maxH || 950);
    return { x: Math.max(0, r.left + scrollX - 12), y: Math.max(0, top), width: Math.min(r.width + 24, document.documentElement.scrollWidth), height: bottom - top };
  }, [box, marks, opt]);
  if (!clip) throw new Error('missing container ' + box + ' for ' + file);
  const vp = clip.vp; delete clip.vp;
  await p.screenshot({ path: path.join(OUT, file + '.png'), clip, fullPage: !vp });
  await p.evaluate(() => document.querySelectorAll('.sg-layer').forEach(e => e.remove()));
}

/* ---------- guide content ---------- */
// Each step: t (title), act (what the script does, the same as the student), fig {file, box, marks, opt, cap},
// do / see / fix: arrays of strings or functions of the values V read from the screen.
const V = {};
const M = (s, n, l, extra) => Object.assign({ s, n, l }, extra || {});
const MT = (t, n, l, within) => ({ t, n, l, in: within });
const CH = [];

CH.push({ id: 'c1', t: '第 1 章　開始之前', intro: [
  'PondGate 是一套在瀏覽器中執行的滯洪池演算軟體。給它一場已知的入流歷線（流量隨時間的變化）、池的水位—蓄水量關係與出口構造，它會一步一步算出池內水位、蓄水量與出流隨時間的變化，並留下可追溯的紀錄。',
  '它計算的是水平池（蓄水連續）方程 dS/dt = Qin − Qout(H)：池內蓄水量 S 的變化率，等於流入量 Qin 減去流出量 Qout；流出量由水位 H 與出口構造決定。軟體以四階 Runge–Kutta 法（RK4）、每 2 秒一步求解。',
  'PondGate 只處理「已知入流下的單一滯洪池」。它不做降雨逕流計算、河道演算、長期連續模擬或多池系統。受限設計篩選找到的「可行案例」只是在您宣告的條件下的篩選結果，不是最終工程設計；最終設計仍須由專業工程師依法規與現地資料檢核。'
], steps: [], extra: [
  ['本手冊怎麼用', '每一章是一個完整的練習，請依序操作。每個步驟分成三段：「操作」告訴您要按哪裡、填什麼；「畫面應該出現」告訴您做對時會看到什麼（數字是本手冊製作時在軟體上實際操作讀到的）；「如果不一樣」告訴您可能的原因。截圖中紅框與紅色編號標出要看或要按的位置，編號對應圖下方的說明。'],
  ['需要準備什麼', '一台可以上網的電腦或平板，以及瀏覽器（Chrome、Edge、Safari 或 Firefox）。不需要安裝任何程式，也不需要帳號。手機也能使用，但畫面較小，建議用電腦練習。'],
  ['練習資料的性質', '手冊中的數值（例如尖峰流量 0.120 m³/s、池面積 180 m²）都是教學用示範值，不是任何真實工程的資料。第 8 章勾選「自由出流」並填寫的紀錄，是「教學假設（僅供練習）」，實際工作時必須有圖說、現地檢查或計算紀錄作為依據。'],
  ['重新開始的方法', '任何時候想回到示範值，只要重新整理網頁（按瀏覽器的重新整理按鈕，或鍵盤 F5）。軟體不會記住您改過的輸入。']
] });

CH.push({ id: 'c2', t: '第 2 章　認識畫面', intro: ['本章不需要輸入任何數值，只要認識畫面上每個區域的位置與用途。'], steps: [
  { t: '打開軟體，認識四個主要區域', act: async p => { await fresh(p); await open(p, 'route'); },
    fig: { file: 'g02_01_layout', box: 'VIEWPORT', marks: [M('#workspacePageTabs', 1, '頁籤列：切換「開始這裡」、「設定與路由」、「受限設計篩選」、「結果、驗證與紀錄」、「教學與內部測試」五個頁面。'), M('#lang', 2, '語言切換按鈕。'), M('#helpFab', 3, '說明／AI 助理按鈕，隨時可以按。'), M('#workspacePageHost', 4, '工作區：目前頁面的內容。')], cap: 'PondGate 的畫面配置' },
    do: ['用瀏覽器開啟 PondGate 網頁，等待約 2 秒讓畫面載入完成。'],
    see: ['畫面左側（手機在上方）是一排頁籤（圖中 1）。', '右上角有語言按鈕（圖中 2）。按鈕上寫「English」表示目前是中文介面，按下會切換成英文；寫「中文」表示目前是英文介面。', '左下角有「？ 說明／AI 助理」按鈕（圖中 3）。', '中間的大區域是工作區（圖中 4）。'],
    fix: ['畫面是英文：按右上角寫著「中文」的按鈕。', '畫面空白或只有文字：請等幾秒，或重新整理網頁。'] },
  { t: '認識「開始這裡」頁', act: async p => { await open(p, 'helpCenter'); },
    fig: { file: 'g02_02_start', box: '#helpCenter', marks: [M('.hc-tabs', 1, '分頁：開始這裡、引導練習、使用手冊、完整版操作手冊、名詞表、AI 助理。'), M('#hcNextPage', 2, '「下一步」提示：依照目前畫面狀態，告訴您接下來該做什麼。'), M('.hc-steps', 3, '五個基本步驟，每個都有「前往」按鈕。')], opt: { maxH: 760 }, cap: '「開始這裡」頁' },
    do: ['在頁籤列按「開始這裡｜說明與助理」。'],
    see: ['頁面上方有一排分頁（圖中 1）。', '「下一步」方框（圖中 2）會隨著您的操作改變內容。第一次打開時，它會說目前載入的是示範案例，可以直接按執行。', '下方列出 1 到 5 的基本步驟（圖中 3）。'],
    fix: ['找不到這一頁：它是頁籤列的第一個頁籤。'] },
  { t: '試用 AI 助理', act: async p => { await p.evaluate(() => window.PondGateHelp.open()); await p.fill('#hcInput', 'Qallow 是什麼？'); await p.press('#hcInput', 'Enter'); await wait(p, 500); V.c2ans = (await p.evaluate(() => [...document.querySelectorAll('#hcLog .hc-msg.bot')].pop()?.innerText || '')).split('\n')[0]; },
    fig: { file: 'g02_03_assistant', box: '#helpDrawer', marks: [M('.hc-quick', 1, '常見問題按鈕，按一下就會回答。'), M('#hcInput', 2, '自己輸入問題的地方。'), M('#hcLog', 3, '問答紀錄。')], cap: 'AI 助理（離線）' },
    do: ['按左下角「？ 說明／AI 助理」。', '在輸入框打「Qallow 是什麼？」，按鍵盤 Enter 或「送出」。'],
    see: [() => `助理回答名詞的意思，開頭是：「${V.c2ans.slice(0, 60)}…」。`, '這個助理是「離線規則式」說明：它在瀏覽器內依關鍵字與畫面狀態回答，不連線到外部 AI 服務，不會傳送任何資料，也不會改動您的輸入或替您做工程判斷。'],
    fix: ['助理說它只能回答 PondGate 的問題：請改用軟體中的名詞或按鈕名稱再問一次。'] },
  { t: '關閉助理', act: async p => { await p.evaluate(() => window.PondGateHelp.close()); }, do: ['按助理視窗右上角的「×」，或再按一次左下角按鈕。'], see: ['助理視窗關閉，回到原本的頁面。'], fix: [] }
] });

CH.push({ id: 'c3', t: '第 3 章　第一次路由：示範案例', intro: ['本章用軟體內建的示範案例跑一次完整的路由，並學會讀結果。示範案例是一場三角形入流事件，流入一座 180 m² 的池，經一座 0.20 m 寬的銳頂堰排出。'], steps: [
  { t: '打開「設定與路由」頁', act: async p => { await fresh(p); await open(p, 'route'); },
    fig: { file: 'g03_01_tab', box: '#workspacePageTabs', marks: [M('[data-workspace-page="route"]', 1, '「設定與路由」頁籤。'), M('.workspace-children', 2, '模組 1 到 4 的子項目，按一下會直接跳到該模組。')], cap: '「設定與路由」頁籤與模組子項目' },
    do: ['在頁籤列按「設定與路由」。'], see: ['工作區顯示模組 1「入流邊界」。頁籤下方列出 1. 入流邊界、2. 蓄水量—水位狀態、3. 出口水理、4. 第一性原理路由演算。'], fix: [] },
  { t: '檢查模組 1：入流邊界', act: async p => { await open(p, 'mod-inflow'); },
    fig: { file: 'g03_02_inflow', box: '#mod-inflow', marks: [M('#case', 1, '標準案例：目前是「三角形事件——測試範圍示範」。'), M('#qp', 2, '入流尖峰 Qp（m³/s）。'), M('#shape', 3, '入流形狀：三角形。'), M('#tpeak', 4, '洪峰到達時間 Tp（分鐘）。'), M('#recess', 5, '退水時間 Tr（分鐘）。'), M('#dur', 6, '總事件延時 T（自動計算 = Tp + Tr）。')], cap: '模組 1 入流邊界（示範值）' },
    do: ['不要修改任何數值，只要對照圖中 1 到 6 的欄位。', '把滑鼠移到欄位名稱旁的「?」上，或按一下「?」，可以看到該欄位的說明。'],
    see: ['標準案例＝三角形事件；入流尖峰 Qp＝0.120 m³/s；入流形狀＝三角形；Tp＝30 分鐘；Tr＝30 分鐘；總事件延時 T＝60 分鐘。', '三角形入流的意思是：流量從 0 在 Tp 分鐘內直線上升到 Qp，再於 Tr 分鐘內直線下降回 0。'],
    fix: ['數值不同：重新整理網頁回到示範值。'] },
  { t: '檢查模組 2：蓄水量—水位狀態', act: async p => { await open(p, 'mod-storage'); },
    fig: { file: 'g03_03_storage', box: '#mod-storage', marks: [M('#storageMode', 1, '蓄水量表示方式：固定平面面積。'), M('#floor', 2, '池底高程 Hfloor（m）。'), M('#area', 3, '平面面積 A（m²）。'), M('#h0', 4, '初始水位 H0（m）。')], cap: '模組 2 蓄水量—水位狀態（示範值）' },
    do: ['在頁籤列按「2. 蓄水量—水位狀態」，對照圖中 1 到 4。'],
    see: ['蓄水量表示方式＝固定平面面積，也就是池壁垂直、各水位的面積都一樣，蓄水量 S = A ×（H − Hfloor）。', '池底高程 Hfloor＝0.00 m；平面面積 A＝180 m²；初始水位 H0＝0 m（事件開始時池是空的）。'],
    fix: [] },
  { t: '檢查模組 3：出口水理', act: async p => { await open(p, 'mod-outlet'); },
    fig: { file: 'g03_04_outlet', box: '#mod-outlet', marks: [M('#weirOn', 1, '「銳頂堰」已勾選。', { up: 'label' }), M('#cw', 2, '堰流係數 Cw。'), M('#bw', 3, '堰寬 b（m）。'), M('#crest', 4, '堰頂高程（m）。'), M('#oriOn', 5, '「矩形開口」未勾選。', { up: 'label' })], opt: { focus: true }, cap: '模組 3 出口水理：銳頂堰（示範值）' },
    do: ['在頁籤列按「3. 出口水理」，往下捲到「銳頂堰」，對照圖中 1 到 5。'],
    see: ['只有「銳頂堰」被勾選；Cw＝1.70；堰寬 b＝0.20 m；堰頂高程＝0 m。', '堰流公式是 Q = Cw × b × h^1.5，h 是水位高出堰頂的高度。堰頂高程等於池底，表示水一進池就開始經堰流出。', '模組 3 上方還有「自由出流邊界」的勾選與紀錄欄位，第 8 章才會用到，現在先不用管。'],
    fix: [] },
  { t: '執行路由', act: async p => { await open(p, 'mod-routing'); },
    fig: { file: 'g03_05_run', box: '#mod-routing', marks: [M('#run', 1, '「執行路由與評估」按鈕。')], cap: '模組 4 的執行按鈕' },
    do: ['在頁籤列按「4. 第一性原理路由演算」。', '按藍色的「執行路由與評估」按鈕（圖中 1）。'],
    see: ['約 1 秒後，頁面自動切換到「結果、驗證與紀錄」頁（模組 6）。'],
    fix: ['按鈕是灰色、按不下去：表示有欄位填錯。按鈕上方會列出要修正的欄位，詳見第 7 章。'] },
  { t: '看「入流與路由出流」圖', act: async p => { await run(p); Object.assign(V, { m3: await met(p) }); await open(p, 'mod-evaluation'); },
    fig: { file: 'g03_06_qchart', box: '#mod-evaluation', marks: [M('#qchart', 1, '入流與路由出流圖。'), M('#hchart', 2, '水位與蓄水量圖。')], opt: { focus: true, maxH: 520 }, cap: '路由結果圖' },
    do: ['在模組 6 找到「入流與路由出流」圖（圖中 1）。'],
    see: ['圖中有入流（Qin）與出流（Qout）兩條曲線。入流是三角形；出流的尖峰比入流低、出現得比較晚，這就是滯洪池「削峰、延遲」的效果。', '旁邊的「水位與蓄水量」圖（圖中 2）把水位（m）與蓄水量（m³）畫在同一個縱軸上，因為兩者數量級差很多，水位線會貼近 0。要讀水位請看下一步的結果表。'],
    fix: ['圖是空白的：回到模組 4 再按一次執行。'] },
  { t: '讀結果表', act: async p => {},
    fig: { file: 'g03_07_table', box: 'table:has(#metricbody)', marks: [M('#metricbody tr:nth-child(2)', 1, '出流尖峰 Qp,o。'), M('#metricbody tr:nth-child(3)', 2, '尖峰比 RQ。'), M('#metricbody tr:nth-child(4)', 3, '事件新增滯洪量 ΔSmax。'), M('#metricbody tr:nth-child(8)', 4, '最大水位 Hmax。'), M('#metricbody tr:nth-child(10)', 5, '質量平衡殘差 ε/Vin。')], opt: { up: 'table' }, cap: '結果表（示範案例）' },
    do: ['往下捲到結果表。先看「質量平衡殘差 ε/Vin」（圖中 5），再看出流尖峰、尖峰比、滯洪量與最大水位。'],
    see: [() => `質量平衡殘差 ε/Vin＝${V.m3.eps}。這是數值計算的守恆檢查，接近 0 表示計算本身沒有遺失或多出水量。每次讀結果都應該先看這一項。`,
      () => `出流尖峰 Qp,o＝${V.m3.qpo}（入流尖峰是 ${V.m3.qpi}）。`, () => `尖峰比 RQ＝${V.m3.rq}，也就是出流尖峰約為入流尖峰的 ${Math.round(parseFloat(V.m3.rq) * 100)}%。`,
      () => `事件新增滯洪量 ΔSmax＝${V.m3.ds}：事件中池內最多多蓄了這麼多水。`, () => `最大水位 Hmax＝${V.m3.hmax}：池內最高水位，要和容許水位與出水高比較。`],
    fix: ['ε/Vin 明顯大於 0：請記下輸入並回報，這不是正常情況。'] },
  { t: '下載可追溯紀錄', act: async p => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 6000 }).catch(() => null), click(p, 'download')]); V.report = d ? d.suggestedFilename() : '（未取得檔名）'; },
    fig: { file: 'g03_08_download', box: '#mod-evaluation', marks: [M('#download', 1, '「下載可追溯決策支援報告」按鈕。')], opt: { focus: true, maxH: 300 }, cap: '下載可追溯紀錄' },
    do: ['在結果表下方按「下載可追溯決策支援報告」（圖中 1）。', '瀏覽器若詢問是否儲存，請選擇儲存。'],
    see: [() => `瀏覽器下載一個文字檔（檔名為 ${V.report}）。`, '檔案記錄了本次所有輸入、計算設定、結果與時間序列。交作業或寫報告時，請附上這個檔案，別人就能重現您的結果。'],
    fix: ['沒有出現下載：檢查瀏覽器是否封鎖下載，或在 Claude 頁面中按下確認視窗的「允許」。'] }
] });

CH.push({ id: 'c4', t: '第 4 章　修改輸入並比較結果', intro: ['本章一次只改一個條件，觀察結果怎麼變。請準備一張紙或試算表記錄每次的結果。'], steps: [
  { t: '改成較大的事件', act: async p => { await fresh(p); await open(p, 'mod-inflow'); await setv(p, 'qp', '0.20'); await setv(p, 'tpeak', '20'); await setv(p, 'recess', '40'); V.c4dur = await val(p, 'dur'); },
    fig: { file: 'g04_01_inflow', box: '#mod-inflow', marks: [M('#qp', 1, '入流尖峰 Qp 改為 0.20。'), M('#tpeak', 2, 'Tp 改為 20。'), M('#recess', 3, 'Tr 改為 40。'), M('#dur', 4, 'T 自動變成 60。')], cap: '修改入流條件' },
    do: ['重新整理網頁回到示範值。', '到模組 1，把入流尖峰 Qp 改成 0.20，洪峰到達時間 Tp 改成 20，退水時間 Tr 改成 40。'],
    see: [() => `總事件延時 T 自動變成 ${V.c4dur} 分鐘（20 + 40）。`],
    fix: ['T 沒有變：在欄位外點一下，讓輸入生效。'] },
  { t: '執行並記錄結果 A', act: async p => { await run(p); V.a = await met(p); },
    do: ['到模組 4 按「執行路由與評估」。', '在結果表記下出流尖峰 Qp,o、尖峰比 RQ、ΔSmax、最大水位 Hmax。'],
    see: [() => `結果 A：Qp,o＝${V.a.qpo}，RQ＝${V.a.rq}，ΔSmax＝${V.a.ds}，Hmax＝${V.a.hmax}。`], fix: [] },
  { t: '把池面積加大，記錄結果 B', act: async p => { await open(p, 'mod-storage'); await setv(p, 'area', '250'); await shot(p, 'g04_02_area', '#mod-storage', [M('#area', 1, '平面面積 A 改為 250。')]); await run(p); V.b = await met(p); },
    figDone: { file: 'g04_02_area', cap: '把平面面積改為 250 m²', notes: ['平面面積 A 改為 250。'] },
    do: ['到模組 2，把平面面積 A 從 180 改成 250。其他不動。', '到模組 4 按執行，記下結果 B。'],
    see: [() => `結果 B：Qp,o＝${V.b.qpo}，RQ＝${V.b.rq}，ΔSmax＝${V.b.ds}，Hmax＝${V.b.hmax}。`], fix: [] },
  { t: '把堰加寬，記錄結果 C', act: async p => { await open(p, 'mod-outlet'); await setv(p, 'bw', '0.30'); await shot(p, 'g04_03_weir', '#mod-outlet', [M('#bw', 1, '堰寬 b 改為 0.30。')], { focus: true, maxH: 360 }); await run(p); V.c = await met(p); },
    figDone: { file: 'g04_03_weir', cap: '把堰寬改為 0.30 m', notes: ['堰寬 b 改為 0.30。'] },
    do: ['到模組 3，把堰寬 b 從 0.20 改成 0.30（池面積維持 250）。', '到模組 4 按執行，記下結果 C。'],
    see: [() => `結果 C：Qp,o＝${V.c.qpo}，RQ＝${V.c.rq}，ΔSmax＝${V.c.ds}，Hmax＝${V.c.hmax}。`], fix: [] },
  { t: '比較三次結果', act: async p => {},
    table: () => [['', '條件', '出流尖峰 Qp,o', '尖峰比 RQ', 'ΔSmax', '最大水位 Hmax'], ['A', 'Qp 0.20、A 180、b 0.20', V.a.qpo, V.a.rq, V.a.ds, V.a.hmax], ['B', '池面積改 250', V.b.qpo, V.b.rq, V.b.ds, V.b.hmax], ['C', '再把堰寬改 0.30', V.c.qpo, V.c.rq, V.c.ds, V.c.hmax]],
    tableTitle: '表 4-1　三次執行結果比較（本手冊製作時實際讀到的數值）',
    do: ['把三次結果排成表 4-1，回答下面兩個問題。'],
    see: ['A → B（池變大）：同樣的水分布在更大的面積上，水位上升較少，Hmax 下降；池能蓄更多水，出流尖峰也下降。', 'B → C（堰變寬）：出口排水能力變大，水比較快流出，Hmax 下降，但出流尖峰上升、削峰效果變差。', '結論：加大池面積可以同時降低水位與出流；加寬出口會降低水位，但增加下游的出流。設計時要在兩者之間取捨，這就是第 8 章受限設計篩選要處理的問題。'], fix: [] }
] });

CH.push({ id: 'c5', t: '第 5 章　用水位—蓄水量表描述不規則池', intro: ['真實的池壁常是斜坡，不同水位的面積不同。這時要改用「水位—蓄水量表 S(H)」，逐列輸入各水位對應的蓄水量。'], steps: [
  { t: '切換成水位—蓄水量表', act: async p => { await fresh(p); await open(p, 'mod-storage'); await setv(p, 'storageMode', 'table'); },
    fig: { file: 'g05_01_table', box: '#mod-storage', marks: [M('#storageMode', 1, '蓄水量表示方式改為「水位—蓄水量表 S(H)」。'), M('#storageTable', 2, '水位—蓄水量表，每列「水位, 蓄水量」。'), M('#storageFile', 3, '也可以匯入 .csv 或 .txt 檔。')], cap: '水位—蓄水量表模式' },
    do: ['重新整理網頁。到模組 2，「蓄水量表示方式」改選「水位—蓄水量表 S(H)」。'],
    see: ['出現一個表格輸入框（圖中 2），預設內容是三列：0, 0／0.50, 90／1.00, 180。這剛好等於面積 180 m² 的垂直池壁。', '「平面面積 A」與「池底高程」欄位消失，因為表格已經包含這些資訊。'], fix: [] },
  { t: '輸入一座上寬下窄的池', act: async p => { await setv(p, 'storageTable', '0, 0\n0.50, 120\n1.00, 300'); await run(p); V.t5 = await met(p); },
    do: ['把表格內容改成下面三列（每列一組，用逗號分隔）：', '0, 0', '0.50, 120', '1.00, 300', '到模組 4 按「執行路由與評估」。'],
    see: [() => `這座池在 0–0.5 m 之間平均面積 240 m²，0.5–1.0 m 之間 360 m²，比示範池大。結果：Qp,o＝${V.t5.qpo}，Hmax＝${V.t5.hmax}，都比示範案例（第 3 章）低。`], fix: ['出現「水位—蓄水量表必須從蓄水量 0 開始……」的紅色訊息：檢查第一列是否為 0, 0，以及水位、蓄水量是否逐列變大。'] },
  { t: '表格範圍不夠時會怎樣', act: async p => { await open(p, 'mod-storage'); await setv(p, 'storageTable', '0, 0\n0.15, 30\n0.30, 70'); await click(p, 'run'); await wait(p, 1500); V.c5stop = (await text(p, '#inputErrorGuide')).replace(/\s+/g, ' ').replace(/ ?前往紅框欄位$/, '').trim(); },
    fig: { file: 'g05_02_stop', box: '#mod-routing', marks: [M('#inputErrorGuide', 1, '紅色訊息：說明為什麼這次執行被擋下。'), M('#runErrGo', 2, '「前往紅框欄位」按鈕。')], opt: { maxH: 420 }, cap: '表格範圍不足，執行被擋下' },
    figExtra: async p => { await open(p, 'mod-evaluation'); await wait(p, 300); await shot(p, 'g05_03_stale', '#mod-evaluation', [M('#runStaleBanner', 1, '提醒：下方是上一次成功執行的結果，與目前輸入不一致。')], { focus: true, maxH: 300 }); },
    figExtraDone: { file: 'g05_03_stale', cap: '結果頁的提醒', notes: ['提醒：下方是上一次成功執行的結果，與目前輸入不一致。'] },
    do: ['故意把表格改成只到 0.30 m：', '0, 0', '0.15, 30', '0.30, 70', '按「執行路由與評估」。'],
    see: [() => `執行被擋下，畫面停在模組 4，按鈕上方出現紅色訊息：「${V.c5stop}」`, '按訊息後面的「前往紅框欄位」，會跳到模組 2 的表格，表格欄位有紅框。', 'PondGate 不會把表格以外的部分自行外插（猜測），因為那會產生沒有依據的結果。', '如果此時切到「結果、驗證與紀錄」頁，結果表上方會有紅色提醒：下方圖表與結果是上一次成功執行的結果，不能引用。'],
    fix: ['解決方法：把表格延伸到比可能的最高水位更高（並高於模組 5 的參考水位 Href＝1.00 m），例如加入「0.60, 160」與「1.00, 300」兩列，再執行一次。'] },
  { t: '從檔案匯入表格', act: async p => { await open(p, 'mod-storage'); },
    do: ['用記事本或 Excel 建立一個檔案，第一欄是水位（m），第二欄是蓄水量（m³），每列一組，例如：', '0,0', '0.5,120', '1.0,300', '存成 .csv 或 .txt 檔。第一列直接放數字，不要放欄名文字。', '在模組 2 按「匯入水位—蓄水量檔」旁的選擇檔案按鈕，選取這個檔案。'],
    see: ['檔案內容會填進表格，並自動切換成「水位—蓄水量表」模式。'],
    fix: ['匯入後執行出現「必須從蓄水量 0 開始……」的訊息：通常是第一列放了欄名（例如「水位,蓄水量」），請刪除那一列。'] },
  { t: '改回固定平面面積', act: async p => { await setv(p, 'storageMode', 'constant'); }, do: ['「蓄水量表示方式」改回「固定平面面積」，或重新整理網頁。'], see: ['平面面積 A 與池底高程欄位重新出現。'], fix: [] }
] });

CH.push({ id: 'c6', t: '第 6 章　長延時事件與時間判讀', intro: ['入流持續很久、尖峰很平的事件，出流尖峰也會很平。這時「尖峰發生在第幾分鐘」不是一個穩定的數字，報告時要改用體積時間指標。'], steps: [
  { t: '載入長延時事件', act: async p => { await fresh(p); await open(p, 'mod-inflow'); await setv(p, 'case', 'long'); V.c6 = await p.evaluate(() => ['rise', 'plateau', 'recessLong', 'dur'].map(i => document.getElementById(i).value)); },
    fig: { file: 'g06_01_long', box: '#mod-inflow', marks: [M('#case', 1, '標準案例改選「長延時事件」。'), M('#shape', 2, '入流形狀自動變為「長延時平頂」。'), M('#rise', 3, '上升時間。'), M('#plateau', 4, '平頂持續時間。'), M('#recessLong', 5, '退水時間。'), M('#dur', 6, '總事件延時。')], cap: '長延時事件的入流設定' },
    do: ['重新整理網頁。到模組 1，「標準案例」改選「長延時事件——時間判讀驗證示範」。'],
    see: [() => `入流形狀自動變為長延時平頂：上升 ${V.c6[0]} 分鐘、平頂 ${V.c6[1]} 分鐘、退水 ${V.c6[2]} 分鐘，總事件延時 ${V.c6[3]} 分鐘。尖峰流量仍是 0.120 m³/s。`], fix: [] },
  { t: '執行並讀時間指標', act: async p => { await run(p); V.l = await met(p); },
    fig: { file: 'g06_02_metrics', box: 'table:has(#metricbody)', marks: [M('#metricbody tr:nth-child(3)', 1, '尖峰比 RQ。'), M('#metricbody tr:nth-child(11)', 2, '近洪峰平坦指標 FPI95。'), M('#metricbody tr:nth-child(12)', 3, '中位體積時間。'), M('#metricbody tr:nth-child(13)', 4, '出流重心時間。')], opt: { up: 'table' }, cap: '長延時事件的結果表' },
    do: ['到模組 4 按「執行路由與評估」。', '在結果表找到尖峰比 RQ、近洪峰平坦指標 FPI95、中位體積時間與出流重心時間。'],
    see: [() => `尖峰比 RQ＝${V.l.rq}：平頂持續夠久，池最後被填到出流等於入流，幾乎沒有削峰。這說明滯洪池對長延時事件的削峰能力有限。`, () => `FPI95＝${V.l.fpi}；中位體積時間＝${V.l.t50}；出流重心時間＝${V.l.tc}。`, '中位體積時間是累積出流量達到一半的時間；出流重心時間是出流量的時間加權平均。這兩個指標用整場事件的水量計算，不會因為尖峰附近的小起伏而跳動。'],
    fix: [] },
  { t: '看時間判讀提醒', act: async p => { await evidence(p); await run(p); await open(p, 'mod-evaluation'); V.c6note = (await text(p, '#status')).replace(/\s+/g, ' ').trim(); },
    fig: { file: 'g06_03_note', box: '#mod-evaluation', marks: [M('#status', 1, '時間判讀提醒。')], opt: { focus: true, maxH: 300 }, cap: '長延時事件的時間判讀提醒' },
    do: ['依第 8 章步驟 8-1、8-2，勾選自由出流並填寫兩項紀錄（練習用的教學假設）。', '再按一次「執行路由與評估」，在結果表下方找黃色提醒框。'],
    see: [() => `提醒框顯示：「${V.c6note}」`, '沒有完成自由出流設定時，同一個位置會優先提醒「自由出流證據尚未完整」，所以要先完成設定才會看到這段時間判讀提醒。'], fix: [] },
  { t: '判讀原則', act: async p => {}, do: ['閱讀下面的原則，並回答章末問題。'],
    see: ['洪峰很平時，「出流尖峰時間」只要有一點點數值擾動就可能前後移動很多，不適合單獨報告。', '報告時應同時列出 FPI95 與中位體積時間或出流重心時間。FPI95 越大表示尖峰越平。長延時事件，或 FPI95 大於 0.12 時，PondGate 會提醒您檢核時間判讀。', '問題：洪峰很平時，報告的時間應優先使用哪一種？答案：體積時間指標（中位體積時間、出流重心時間），並附上 FPI95。'], fix: [] }
] });

CH.push({ id: 'c7', t: '第 7 章　找出並修正錯誤輸入', intro: ['輸入不合理時，PondGate 不會算出一個錯誤的結果，而是擋下執行並告訴您哪裡要改。本章故意輸入錯誤，練習看懂提示。'], steps: [
  { t: '把入流尖峰改成 0', act: async p => { await fresh(p); await open(p, 'mod-inflow'); await setv(p, 'qp', '0'); await wait(p, 300); await open(p, 'mod-routing'); V.c7 = (await text(p, '#hcRunFix')).replace(/\s+/g, ' ').trim(); },
    fig: { file: 'g07_01_list', box: '#mod-routing', marks: [M('#hcRunFix', 1, '需要修正的欄位清單。'), M('#run', 2, '執行按鈕變成灰色。')], cap: '執行按鈕被擋下時的提示' },
    do: ['重新整理網頁。到模組 1，把入流尖峰 Qp 改成 0。', '到模組 4 看執行按鈕。'],
    see: ['「執行路由與評估」按鈕變成灰色，按不下去（圖中 2）。', () => `按鈕上方列出要修正的欄位（圖中 1）：「${V.c7.replace(/^下一步 /, '')}」。`], fix: [] },
  { t: '點清單跳回欄位', act: async p => { await open(p, 'mod-inflow'); await p.evaluate(() => document.getElementById('qp').scrollIntoView({ block: 'center' })); },
    fig: { file: 'g07_02_red', box: '#mod-inflow', marks: [M('#qp', 1, '有問題的欄位以紅框標示。')], opt: { focus: true, maxH: 300 }, cap: '有問題的欄位以紅框標示' },
    do: ['按清單中的「入流尖峰 Qp 必須大於 0」。'],
    see: ['畫面跳回模組 1，Qp 欄位有紅色外框。'], fix: [] },
  { t: '修正後恢復', act: async p => { await setv(p, 'qp', '0.120'); await wait(p, 300); V.c7ok = await p.evaluate(() => !document.getElementById('run').disabled); },
    do: ['把 Qp 改回 0.120。'], see: [() => V.c7ok ? '紅框與清單消失，執行按鈕恢復藍色，可以按了。' : '（本次製作時按鈕未恢復，請回報）'], fix: [] },
  { t: '再試一個：初始水位低於池底', act: async p => { await open(p, 'mod-storage'); await setv(p, 'h0', '-0.1'); await wait(p, 300); V.c7b = (await text(p, '#hcRunFix')).replace(/\s+/g, ' ').trim(); await setv(p, 'h0', '0'); },
    do: ['到模組 2，把初始水位 H0 改成 −0.1（比池底 0.00 還低）。', '看模組 4 的清單，然後把 H0 改回 0。'],
    see: [() => `清單顯示：「${V.c7b.replace(/^下一步 需要修正的欄位 點欄位名稱即可跳過去（紅框標示）： /, '')}」。改回 0 後恢復正常。`], fix: [] },
  { t: '常見的錯誤輸入', act: async p => {}, do: ['參考附錄 B 的錯誤訊息表。'], see: ['常見錯誤包括：流量或時間填 0 或負數、初始水位低於池底、堰寬或開口面積為 0、容許水位低於初始水位、水位—蓄水量表範圍不足或第一列放了欄名。'], fix: [] }
] });

CH.push({ id: 'c8', t: '第 8 章　受限設計篩選：找到可行解', intro: ['前幾章是「給定池與出口，算水位與出流」。本章反過來：給定下游容許的最大出流 Qallow 與池內容許的最高水位 Hallow，讓 PondGate 在宣告的範圍內試算許多池面積與堰寬組合，找出符合限制的案例。', '受限篩選只在出口是「已確認自由出流的單一堰或單一矩形開口」時才能正式執行。自由出流的意思是：出口下游的水位不會影響出流量。因此必須先完成四項檢核與兩項紀錄。本章的檢核與紀錄都是「教學假設（僅供練習）」。'], steps: [
  { t: '勾選自由出流邊界與四項檢核', act: async p => { await fresh(p); await open(p, 'mod-outlet'); for (const id of FREE) await setv(p, id, true); },
    fig: { file: 'g08_01_free', box: '#mod-outlet', marks: [M('#freeDischarge', 1, '「已確認自由出流邊界」。', { up: 'label' }), M('#freeTailwater', 2, '尾水位低於所有控制出口。', { up: 'label' }), M('#freeBackwater', 3, '下游回水或管摩阻不改變 Qout(H)。', { up: 'label' }), M('#freeSubmergence', 4, '出口未被淹沒。', { up: 'label' }), M('#freeOperation', 5, '閘門、抽水或操作控制不改變出口定律。', { up: 'label' })], opt: { focus: true, maxH: 420 }, cap: '自由出流邊界與四項檢核' },
    do: ['重新整理網頁。到模組 3，勾選「已確認自由出流邊界」（圖中 1）。', '再勾選下方四項檢核（圖中 2 到 5）。'],
    see: ['五個方框都打勾。'], fix: ['實際工作時，只有在有圖說、現地檢查或水理計算支持時才能勾選。'] },
  { t: '填寫兩項紀錄', act: async p => { await setv(p, 'freeEvidenceRecord', PRACTICE_EVIDENCE); await setv(p, 'screeningLimitRecord', PRACTICE_LIMIT); },
    fig: { file: 'g08_02_records', box: '#mod-outlet', marks: [M('#freeEvidenceRecord', 1, '自由出流證據紀錄。'), M('#screeningLimitRecord', 2, '篩選限制依據。')], opt: { focus: true, maxH: 380 }, cap: '兩項必填紀錄' },
    do: ['在「自由出流證據紀錄」填入：', PRACTICE_EVIDENCE, '在「篩選限制依據」填入：', PRACTICE_LIMIT],
    see: ['兩個欄位都有文字。這兩段文字會寫進下載的報告，讓別人知道判斷依據。'], fix: [] },
  { t: '先執行一次路由', act: async p => { await run(p); }, do: ['到模組 4 按「執行路由與評估」，讓結果與目前輸入一致。'], see: ['頁面切到模組 6，顯示示範案例的結果（與第 3 章相同）。'], fix: [] },
  { t: '設定限制條件', act: async p => { await open(p, 'mod-optimization'); },
    fig: { file: 'g08_03_limits', box: '#mod-optimization', marks: [M('#qallow', 1, '容許出流尖峰 Qallow。'), M('#hallow', 2, '容許水位 Hallow。'), M('#href', 3, '無因次參考水位 Href。'), M('#drainHours', 4, '最長排空時間 Td。'), M('#residualPct', 5, '容許事件新增蓄水殘留。')], opt: { maxH: 900 }, cap: '模組 5 的限制條件' },
    do: ['在頁籤列按「受限設計篩選」（模組 5）。', '確認：容許出流尖峰＝0.080 m³/s；容許水位＝1.00 m；Href＝1.00 m；最長排空時間 Td＝24 小時；容許殘留＝1 %。'],
    see: ['Qallow 是下游能接受的最大出流；Hallow 是池內不能超過的最高水位。兩者都應來自法規或設計準則，不能為了得到結果而任意放寬。', 'Td 與殘留百分比要求事件結束後 Td 小時內，池要排到只剩很少的事件蓄水，以準備下一場雨。'], fix: [] },
  { t: '設定出口組合與搜尋範圍', act: async p => {},
    fig: { file: 'g08_04_search', box: '#mod-optimization', marks: [M('#optConfig', 1, '受限篩選的出口組合：僅被動堰流。'), M('#optMode', 2, '篩選解析度。'), M('#optObjective', 3, '篩選目標。'), M('#optBmin', 4, '最小堰寬。'), M('#optBmax', 4, '最大堰寬。'), M('#optimize', 5, '「執行受限設計篩選」按鈕。')], opt: { focus: true, maxH: 900 }, cap: '出口組合、目標與搜尋範圍' },
    do: ['確認：出口組合＝「僅被動堰流——可正式篩選」；篩選解析度＝標準離散篩選；篩選目標＝最小事件新增滯洪量 ΔSmax；堰寬範圍 0.05 到 1.00 m。'],
    see: ['軟體會在這個範圍內試算許多池面積與堰寬組合，每一個都用同一個 RK4 演算重新計算。'], fix: [] },
  { t: '執行受限設計篩選', act: async p => { V.c8before = [await val(p, 'area'), await val(p, 'bw')]; await screen(p); V.c8page = await p.evaluate(() => window.DSSWorkspacePages.active()); V.c8out = await p.evaluate(() => { const rows = [...document.querySelectorAll('#optout tr')].map(r => [...r.cells].map(c => c.innerText.trim())); const g = k => (rows.find(r => r[0].includes(k)) || [])[1] || ''; return { a: g('池面積'), b: g('堰寬'), ds: g('ΔSmax'), q: g('出流尖峰'), h: g('最高水位'), r: g('排空殘留') }; }); V.c8after = [await val(p, 'area'), await val(p, 'bw')]; },
    fig: { file: 'g08_05_result', box: '#optout', marks: [MT('池面積 A', 1, '選定的池面積。', '#optout'), MT('堰寬 b', 2, '選定的堰寬。', '#optout'), MT('出流尖峰／容許值', 3, '出流尖峰與容許值。', '#optout'), MT('最高水位／容許值', 4, '最高水位與容許值。', '#optout')], cap: '受限篩選結果（可行）' },
    do: ['按「執行受限設計篩選」，等待約 5 到 10 秒。'],
    see: [() => `頁面自動切到「結果、驗證與紀錄」頁，顯示「選定可行受限篩選案例——已完成路由」。`, () => `選定池面積 A＝${V.c8out.a}、堰寬 b＝${V.c8out.b}；出流尖峰／容許值＝${V.c8out.q}；最高水位／容許值＝${V.c8out.h}；排空殘留＝${V.c8out.r}。`, '每一項都在限制之內。'],
    fix: ['按鈕是灰色：自由出流的勾選或兩項紀錄還沒完成，或出口組合不是單一堰或單一開口。按鈕下方會說明原因並有「前往修正」。'] },
  { t: '讀三步判讀', act: async p => {},
    fig: { file: 'g08_06_check', box: '.diagnostic-guide', marks: [M('.diagnostic-guide .three-step', 1, '步驟 1 到 3。'), M('.diagnostic-guide .diagnostic-list', 2, '各項條件的檢核結果。')], cap: '三步判讀（可行）' },
    do: ['在篩選結果下方找到「受限篩選／最佳化結果驗證｜三步判讀」。'],
    see: ['步驟 1：篩選計算狀態＝「通過｜受限篩選完成」。', '步驟 2：出口型式、最高水位、最大出流、排空殘留與 S(H) 邊界、自由出流四項佐證，都顯示「通過」。', '步驟 3：目前結果符合已宣告條件；仍須完成最終工程設計驗證。'], fix: [] },
  { t: '注意：輸入已換成選定值', act: async p => {},
    do: ['回到模組 2 與模組 3，看平面面積 A 與堰寬 b。'],
    see: [() => V.c8after[0] !== V.c8before[0] || V.c8after[1] !== V.c8before[1] ? `篩選後，模組 2 的平面面積由 ${V.c8before[0]} 變成 ${V.c8after[0]} m²，模組 3 的堰寬由 ${V.c8before[1]} 變成 ${V.c8after[1]} m。上方圖形與結果表顯示的是選定案例的路由結果。想回到原本的示範值，請重新整理網頁。` : '模組 2、3 的數值沒有改變。'], fix: [] },
  { t: '下載報告', act: async p => {}, do: ['按「下載可追溯決策支援報告」。'], see: ['報告包含限制條件、自由出流紀錄、篩選結果與三步判讀。'], fix: [] }
] });

CH.push({ id: 'c9', t: '第 9 章　無可行解：讀懂「阻擋」', intro: ['如果限制太嚴，在宣告的範圍內可能找不到任何符合條件的組合。PondGate 會明確顯示「阻擋」，並指出是哪一項限制造成的，絕不會顯示「通過」。'], steps: [
  { t: '把容許出流改得很嚴', act: async p => { await fresh(p); await evidence(p); await run(p); await open(p, 'mod-optimization'); await setv(p, 'qallow', '0.010'); },
    fig: { file: 'g09_01_strict', box: '#mod-optimization', marks: [M('#qallow', 1, '容許出流尖峰改為 0.010。')], opt: { focus: true, maxH: 300 }, cap: '把 Qallow 改為 0.010' },
    do: ['重新整理網頁，依第 8 章步驟 8-1 到 8-3 完成自由出流勾選、兩項紀錄並執行一次路由。', '到模組 5，把容許出流尖峰 Qallow 改成 0.010。'], see: ['Qallow 欄位顯示 0.010。'], fix: [] },
  { t: '執行篩選，看到阻擋', act: async p => { await screen(p); V.c9 = (await text(p, '#optout')).replace(/\s+/g, ' ').trim(); V.c9s1 = (await text(p, '.diagnostic-guide .three-step')).split('\n').slice(0, 3).join(' '); },
    fig: { file: 'g09_02_block', box: '.diagnostic-guide', marks: [M('.diagnostic-guide .three-step', 1, '步驟 1 顯示「阻擋｜無可行解」，步驟 3 列出主導限制。'), M('.diagnostic-guide .diagnostic-list', 2, '每一項主導限制都有「前往修正」。')], cap: '無可行解時的三步判讀' },
    do: ['按「執行受限設計篩選」。'],
    see: [() => `篩選結果顯示：「${V.c9}」`, '三步判讀的步驟 1 顯示「阻擋｜無可行解」，步驟 3 列出主導限制與「前往修正」連結。'], fix: [] },
  { t: '正確的處理方式', act: async p => { await setv(p, 'qallow', '0.080'); },
    do: ['閱讀下面的原則，然後把 Qallow 改回 0.080。'],
    see: ['不可以為了得到結果而放寬 Qallow 或 Hallow，因為它們來自法規或設計準則。', '可以做的是：依工程依據調整池面積、出口尺寸，或擴大有依據的搜尋範圍；或補足 S(H) 資料。', '「阻擋」本身是有用的結果：它告訴您在目前條件下，這個設計方向做不到。'], fix: [] }
] });

CH.push({ id: 'c10', t: '第 10 章　研究檢視模式：哪些出口不能正式篩選', intro: ['PondGate 的正式受限篩選只驗證了「單一堰」或「單一矩形開口」。若同時使用多種出口，或使用豎井、圓管、水位相關係數表，路由仍可以算，但受限篩選會被鎖定，只能作研究檢視。'], steps: [
  { t: '加入矩形開口，變成複合出口', act: async p => { await fresh(p); await evidence(p); await open(p, 'mod-outlet'); await setv(p, 'oriOn', true); },
    fig: { file: 'g10_01_combo', box: '#mod-outlet', marks: [M('#weirOn', 1, '銳頂堰（已勾選）。', { up: 'label' }), M('#oriOn', 2, '矩形開口（新勾選）。', { up: 'label' }), M('#ao', 3, '開口面積 Ao。'), M('#invert', 4, '開口底高程。')], opt: { focus: true, maxH: 560 }, cap: '堰流＋矩形開口的複合出口' },
    do: ['重新整理網頁，依第 8 章完成自由出流勾選與兩項紀錄。', '到模組 3，在銳頂堰之外再勾選「矩形開口」。'], see: ['出現矩形開口的欄位：流量係數 Cd、開口面積 Ao、開口高度、開口底高程。'], fix: [] },
  { t: '路由仍可以執行', act: async p => { await run(p); V.c10 = await met(p); }, do: ['到模組 4 按「執行路由與評估」。'], see: [() => `路由正常完成：Qp,o＝${V.c10.qpo}，Hmax＝${V.c10.hmax}。結果可以看，但出流量是堰與開口的總和。`], fix: [] },
  { t: '受限篩選被鎖定', act: async p => { await open(p, 'mod-optimization'); V.c10lock = await p.evaluate(() => { const b = document.getElementById('optimize'); return b.disabled; }); },
    fig: { file: 'g10_02_lock', box: '#mod-optimization', marks: [M('#optimize', 1, '「執行受限設計篩選」按鈕被鎖定。'), MT('此出口型式不適用正式受限設計篩選', 2, '鎖定原因與「前往修正」。', '#mod-optimization')], opt: { focus: true, maxH: 340 }, cap: '複合出口時受限篩選被鎖定' },
    do: ['到模組 5，往下捲到「執行受限設計篩選」按鈕。'],
    see: [() => (V.c10lock ? '按鈕是灰色的，' : '按鈕下方') + '說明「此出口型式不適用正式受限設計篩選；請使用單一被動堰流或單一矩形開口」，並有「前往修正」。', '也可以問 AI 助理「受限篩選為什麼鎖定？」，它會列出原因。'], fix: [] },
  { t: '回到單一出口', act: async p => { await open(p, 'mod-outlet'); await setv(p, 'oriOn', false); }, do: ['到模組 3，取消勾選「矩形開口」。'], see: ['鎖定原因消失，受限篩選可以再次執行。'], fix: [] }
] });

CH.push({ id: 'c11', t: '第 11 章　進階連續最佳化（選讀）', intro: ['第 8 章的受限篩選在固定的網格上試算。進階連續最佳化則在面積 A 與堰寬 b 的連續範圍內搜尋，同時考慮兩個目標（滯洪量與水位），列出一組互相取捨的方案（Pareto 方案）。'], steps: [
  { t: '執行進階連續最佳化', act: async p => { await fresh(p); await evidence(p); await run(p); await open(p, 'mod-optimization'); await click(p, 'continuousGlobal'); for (let i = 0; i < 60; i++) { await wait(p, 1000); if (/候選值/.test(await text(p, '#optout'))) break; } V.c11 = (await text(p, '#optout')).split('\n').find(l => /候選值/.test(l)) || ''; },
    fig: { file: 'g11_01_pareto', box: '#optout', marks: [MT('同一權威 RK4 路由核心共評估', 1, '搜尋摘要。', '#optout'), M('#optout table', 2, 'Pareto 方案表。')], opt: { maxH: 640 }, cap: '進階連續最佳化的 Pareto 方案' },
    do: ['完成第 8 章的自由出流勾選、兩項紀錄與一次路由。', '到模組 5，按「進階連續最佳化｜全域候選搜尋＋局部精修」，等待約 20 秒。'],
    see: [() => `結果顯示：「${V.c11.trim()}」`, '表中每一列是一個可行方案：面積、堰寬、ΔSmax、Hmax、Qmax 與離限制還有多少餘裕。沒有一個方案在所有目標上都最好，要由設計者依工程判斷取捨。'],
    fix: ['這仍不是已證明的全域最佳解，也不是最終工程設計。'] }
] });

CH.push({ id: 'c12', t: '第 12 章　外部模型交叉驗算（選讀）', intro: ['如果您會使用 HEC-HMS 或 SWMM，可以用同樣的入流、蓄水關係與出口建立模型，把結果匯入 PondGate 比較。這是數值實作的交叉檢查，不是現地驗證。'], steps: [
  { t: '認識交叉驗算區', act: async p => { await fresh(p); await run(p); await open(p, 'mod-evaluation'); },
    fig: { file: 'g12_01_cross', box: '#mod-evaluation', marks: [M('#crossReference', 1, 'PondGate 參考歷線。'), M('#crossSource', 2, '外部模型：HEC-HMS 或 SWMM。'), M('#crossFile', 3, '匯入外部模型結果 CSV。'), M('#crossRun', 4, '「比較外部結果」按鈕。'), M('#crossCsvTemplate', 5, '下載 CSV 範本（只示範欄名）。')], opt: { focus: true, maxH: 900 }, cap: '外部模型交叉驗算區' },
    do: ['先執行一次路由。在「結果、驗證與紀錄」頁往下捲到「外部模型交叉驗算」。'],
    see: ['「PondGate 參考歷線」可選目前互動路由結果，或四組公開基準案例 A-005 到 D-005。', 'CSV 第一列必須是欄名，至少要有 time_s（秒）與 outflow_m3_s（m³/s）兩欄；完整比較還需要 incremental_storage_m3。按「下載外部結果 CSV 範本」可以看到格式。', '匯入外部模型的實際輸出檔後，按「比較外部結果」。'],
    fix: ['不要匯入入流檔、模型設定檔或 PondGate 自己的輸出檔。'] },
  { t: '看一個已完成的三引擎比較', act: async p => { await open(p, 'qualityAssurance'); await shot(p, 'g12_02_ew1', '#ew1A005Benchmark', [M('#ew1A005Run', 1, '「執行 E‑W1 A‑005 基準 RK4」按鈕。')], { focus: true, maxH: 360 }); await click(p, 'ew1A005Run'); for (let i = 0; i < 30; i++) { await wait(p, 500); if (/本輪完成/.test(await text(p, '#ew1A005Benchmark'))) break; } await wait(p, 600); V.c12 = ((await text(p, '#ew1A005Export')).split('\n').find(l => /本輪基準完成/.test(l)) || '').trim(); },
    figDone: { file: 'g12_02_ew1', cap: 'E‑W1 A‑005 基準案例', notes: ['「執行 E‑W1 A‑005 基準 RK4」按鈕。'] },
    figExtra: async p => { V.c12page = await p.evaluate(() => window.DSSWorkspacePages.active()); await open(p, 'mod-evaluation'); await wait(p, 300); await shot(p, 'g12_03_ew1res', '#ew1A005Export', [M('#ew1A005Download', 1, '匯出比較結果 CSV。')], { maxH: 700 }); },
    figExtraDone: { file: 'g12_03_ew1res', cap: 'E‑W1 A‑005 比較結果（結果、驗證與紀錄頁）', notes: ['匯出比較結果 CSV。'] },
    do: ['在頁籤列按「教學與內部測試」，找到「E‑W1 A‑005 外部交叉驗算基準」。', '按「執行 E‑W1 A‑005 基準 RK4」。'],
    see: [() => `畫面${V.c12page === 'evidence' ? '自動切到「結果、驗證與紀錄」頁，' : ''}在「E‑W1 A‑005 比較結果」顯示「${V.c12}」。這個公開案例已保存 EPA SWMM 5.2.4 與 HEC‑HMS 4.13 的結果，可以看到三個引擎在同一案例下的比較。`, '這個案例是論文用的數值驗證案例，不是工程設計案例。'], fix: [] }
] });

CH.push({ id: 'c13', t: '第 13 章　引導練習、教學案例與名詞表', intro: ['PondGate 內建 7 個引導練習。練習會在畫面右上角顯示步驟，每一步做完會自動打勾。'], steps: [
  { t: '打開引導練習清單', act: async p => { await fresh(p); await open(p, 'helpCenter'); await p.click('[data-hc-tab="lessons"]'); await wait(p, 300); },
    fig: { file: 'g13_01_lessons', box: '#helpCenter', marks: [M('[data-hc-tab="lessons"]', 1, '「引導練習」分頁。'), M('#hcLessons', 2, '七個練習，按「開始」即可進行。')], opt: { maxH: 760 }, cap: '引導練習清單' },
    do: ['在「開始這裡」頁按「引導練習」分頁。'], see: ['列出練習 1 到 7，每個都有目標說明與「開始」按鈕。做完的練習會顯示「完成」。'], fix: [] },
  { t: '進行一個練習', act: async p => { await p.evaluate(() => window.PondGateLessons.begin('L2')); await wait(p, 800); },
    fig: { file: 'g13_02_panel', box: '#lessonPanel', marks: [M('.ls-bar', 1, '進度條。'), M('#lessonPanel .ls-b .ls-acts', 2, '「帶我去」、「示範這一步」等按鈕。'), M('#lessonPanel [data-ls=next]', 3, '下一步。')], cap: '練習面板' },
    do: ['按練習 2 的「開始」。軟體會詢問是否暫時換成練習輸入，按「確定」。', '依面板指示操作。不會的時候按「帶我去」跳到欄位，或按「示範這一步」讓軟體示範。'],
    see: ['畫面右上角出現練習面板，顯示目前步驟。做對時步驟會變成綠色並自動前進。', '練習結束時可以還原您原本的輸入。'], fix: [] },
  { t: '使用名詞表', act: async p => { await p.evaluate(() => window.PondGateLessons.end && window.PondGateLessons.end()); await open(p, 'helpCenter'); await p.click('[data-hc-tab="glossary"]'); await p.fill('#hcGlossFilter', '自由出流'); await wait(p, 300); },
    fig: { file: 'g13_03_glossary', box: '#helpCenter', marks: [M('#hcGlossFilter', 1, '輸入名詞搜尋。'), M('#hcGlossList', 2, '搜尋結果，按「看欄位」會跳到對應欄位。')], opt: { maxH: 560 }, cap: '名詞表' },
    do: ['按「名詞表」分頁，在搜尋框輸入「自由出流」。'], see: ['列出相關名詞與說明。按「看欄位」會跳到該欄位。'], fix: [] },
  { t: '教學案例（教學與內部測試頁）', act: async p => { await open(p, 'teachingAssistant'); },
    fig: { file: 'g13_04_teach', box: '#teachingAssistant', marks: [M('#teachDemo', 1, '載入可執行受限篩選的教學案例（會先保存目前案例）。'), M('#teachRestore', 2, '還原先前案例。')], opt: { maxH: 520 }, cap: '教學輔助區' },
    do: ['在頁籤列按「教學與內部測試」，找到「教學輔助｜四步自學與立即檢核」。', '按「載入可執行受限篩選教學案例」，軟體會先保存您目前的輸入，再載入一組可以直接執行受限篩選的教學資料。用完後按「還原先前案例」。'],
    see: ['下方有四個學習步驟與快速自我檢核題，每題約 30 秒。'], fix: [] }
] });

/* ---------- exercises with answers read from the software ---------- */
const EX = [
  { q: '示範案例中，只把入流尖峰 Qp 改成 0.15，最大水位 Hmax 與尖峰比 RQ 各是多少？', run: async p => { await fresh(p); await setv(p, 'qp', '0.15'); await run(p); const m = await met(p); return `Hmax＝${m.hmax}，RQ＝${m.rq}。入流變大，水位跟著上升。`; } },
  { q: '示範案例中，只把平面面積 A 改成 360 m²，出流尖峰 Qp,o 是多少？和示範案例相比如何？', run: async p => { await fresh(p); await setv(p, 'area', '360'); await run(p); const m = await met(p); return `Qp,o＝${m.qpo}，比示範案例的 ${V.m3.qpo} 低；池越大，削峰越多。`; } },
  { q: '示範案例中，只把堰寬 b 改成 0.10 m，最大水位 Hmax 是多少？有沒有超過容許水位 1.00 m？', run: async p => { await fresh(p); await setv(p, 'bw', '0.10'); await run(p); const m = await met(p); return `Hmax＝${m.hmax}，${parseFloat(m.hmax) > 1 ? '超過' : '沒有超過'} 1.00 m。出口變窄，水位上升。`; } },
  { q: '依第 8 章完成自由出流設定後，把容許出流 Qallow 改成 0.060，執行受限設計篩選。有可行解嗎？選定的池面積與堰寬是多少？', run: async p => { await fresh(p); await evidence(p); await run(p); await setv(p, 'qallow', '0.060'); await screen(p); const o = (await text(p, '#optout')).trim(); if (/^阻擋/.test(o)) return '沒有可行解（阻擋）：' + o.split('\n')[0]; const rows = await p.evaluate(() => [...document.querySelectorAll('#optout tr')].map(r => [...r.cells].map(c => c.innerText.trim()))); const g = k => (rows.find(r => r[0].includes(k)) || [])[1]; return `有可行解。池面積 A＝${g('池面積')}，堰寬 b＝${g('堰寬')}，出流尖峰／容許值＝${g('出流尖峰')}。限制越嚴，需要的池越大。`; } },
  { q: '篩選結果是「阻擋」時，可以把 Qallow 調大直到出現可行解嗎？為什麼？', ans: '不可以。Qallow 與 Hallow 來自法規或設計準則，代表下游與池體的安全限制。應依工程依據調整池面積、出口尺寸或有依據的搜尋範圍。' },
  { q: '為什麼每次讀結果都要先看質量平衡殘差 ε/Vin？', ans: '它檢查計算過程中水量是否守恆。若明顯不為 0，表示計算有問題，後面的數值都不可信。' }
];

/* ---------- appendix tables ---------- */
function appendixB() {
  return [['訊息（出現在執行按鈕上方）', '原因', '怎麼改'],
    ['入流尖峰 Qp 必須大於 0', 'Qp 為 0、負數或空白', '填入大於 0 的流量（m³/s）'],
    ['初始水位 H0 不可低於池底高程 Hfloor', 'H0 小於 Hfloor', '把 H0 設為等於或高於 Hfloor'],
    ['初始水位 H0 與參考水位 Href 必須落在宣告的水位—蓄水量表 S(H) 範圍內', 'S(H) 表的最高水位太低', '把表格延伸到更高水位，或調整 H0、Href'],
    ['水位—蓄水量表必須從蓄水量 0 開始……', '第一列不是 0, 0；有欄名文字；數值沒有逐列變大', '刪除欄名列，確認逐列遞增'],
    ['路由水位超出宣告的水位—蓄水量表範圍', '事件水位高過表格最高水位', '延伸 S(H) 表'],
    ['匯入的入流歷線至少需要兩組「時間, 流量」……', '自訂歷線格式錯誤', '每列「時間（分鐘）, 流量」，時間從 0 開始遞增'],
    ['此出口型式不適用正式受限設計篩選', '使用複合出口、豎井、圓管或係數表', '改回單一堰或單一矩形開口，或只作研究檢視'],
    ['阻擋：自由出流四項佐證', '自由出流勾選或兩項紀錄未完成', '依第 8 章完成勾選與紀錄'],
    ['阻擋：……找不到可行篩選案例', '限制太嚴或搜尋範圍不足', '依工程依據調整，不可任意放寬限制']];
}
const CHECKLIST = ['能說出 PondGate 能做與不能做的事（第 1 章）', '能找到頁籤、語言按鈕、說明按鈕與工作區（第 2 章）', '能執行示範案例並讀出 ε/Vin、Qp,o、RQ、ΔSmax、Hmax（第 3 章）', '能下載可追溯紀錄（第 3 章）', '能一次改一個條件並比較結果（第 4 章）', '能輸入水位—蓄水量表，並知道範圍不足時會被擋下（第 5 章）', '能解釋寬平洪峰時為何要用體積時間指標（第 6 章）', '能依清單修正錯誤輸入（第 7 章）', '能完成自由出流設定並執行受限設計篩選（第 8 章）', '能讀懂「阻擋」並說出正確的處理方式（第 9 章）', '能說出哪些出口設定會鎖定受限篩選（第 10 章）'];

/* ---------- build ---------- */
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, acceptDownloads: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await fresh(p);
  const figs = [];
  for (const ch of CH) {
    for (const st of ch.steps) {
      await st.act(p); await wait(p, 200);
      if (st.fig) { await shot(p, st.fig.file, st.fig.box, st.fig.marks, st.fig.opt || {}); }
      if (st.figExtra) await st.figExtra(p);
      console.log('done', ch.id, st.t);
    }
  }
  for (const e of EX) if (e.run) { e.ans = await e.run(p); console.log('exercise', e.ans); }
  await b.close();

  // resolve text
  const R = x => typeof x === 'function' ? x() : x;
  const data = { version: VERSION, title: 'PondGate 完整版操作手冊（學生逐步版）', chapters: [] };
  let figNo = 0;
  for (const ch of CH) {
    const c = { id: ch.id, t: ch.t, intro: ch.intro, extra: ch.extra || [], steps: [] };
    const chNum = ch.id.slice(1); let fc = 0;
    ch.steps.forEach((st, i) => {
      const s = { n: `${chNum}-${i + 1}`, t: st.t, do: st.do.map(R), see: st.see.map(R), fix: (st.fix || []).map(R), figs: [] };
      const addFig = (file, cap, notes) => { figNo++; s.figs.push({ n: `${chNum}-${++fc}`, file, cap, notes }); };
      if (st.fig) addFig(st.fig.file, st.fig.cap, [...new Map(st.fig.marks.map(m => [m.n, m.l])).entries()].map(([n, l]) => [n, l]));
      if (st.figDone) addFig(st.figDone.file, st.figDone.cap, st.figDone.notes.map((l, k) => [k + 1, l]));
      if (st.figExtraDone) addFig(st.figExtraDone.file, st.figExtraDone.cap, st.figExtraDone.notes.map((l, k) => [k + 1, l]));
      if (st.table) { s.table = R(st.table); s.tableTitle = st.tableTitle; }
      c.steps.push(s);
    });
    data.chapters.push(c);
  }
  const helpContent = require(path.join(ROOT, 'dist', 'help-content.js'));
  data.glossary = helpContent.GLOSSARY.map(g => [g[1], g[3]]);
  data.errors = appendixB(); data.checklist = CHECKLIST; data.exercises = EX.map(e => [e.q, e.ans]);
  fs.writeFileSync(path.join(ROOT, 'dist', 'student-guide.js'), `/* Generated by docs/build_student_guide.js from a real run of PondGate ${VERSION}. Do not edit by hand. */\nwindow.PondGateStudentGuide = ${JSON.stringify(data)};\n`);

  // Markdown copy for the repository
  const md = [`# ${data.title}`, '', `PondGate v${VERSION}。本手冊由 \`docs/build_student_guide.js\` 在軟體上逐步實際操作產生；文中數值與截圖都來自該次操作。`, ''];
  for (const c of data.chapters) {
    md.push(`## ${c.t}`, ''); c.intro.forEach(x => md.push(x, ''));
    c.extra.forEach(([h, x]) => md.push(`### ${h}`, '', x, ''));
    for (const s of c.steps) {
      md.push(`### 步驟 ${s.n}　${s.t}`, '', '**操作**', ''); s.do.forEach((x, k) => md.push(`${k + 1}. ${x}`)); md.push('');
      md.push('**畫面應該出現**', ''); s.see.forEach(x => md.push(`- ${x}`)); md.push('');
      if (s.fix.length) { md.push('**如果不一樣**', ''); s.fix.forEach(x => md.push(`- ${x}`)); md.push(''); }
      if (s.table) { md.push(s.tableTitle, '', '| ' + s.table[0].join(' | ') + ' |', '|' + s.table[0].map(() => ' --- |').join(''), ...s.table.slice(1).map(r => '| ' + r.join(' | ') + ' |'), ''); }
      for (const f of s.figs) { md.push(`![圖 ${f.n}](../dist/manual/guide/${f.file}.png)`, '', `圖 ${f.n}：${f.cap}`, ''); f.notes.forEach(([n, l]) => md.push(`${n}. ${l}`)); md.push(''); }
    }
  }
  md.push('## 附錄 A　名詞速查', '', '| 名詞 | 說明 |', '| --- | --- |', ...data.glossary.map(([a, b]) => `| ${a} | ${b} |`), '');
  md.push('## 附錄 B　錯誤訊息與處理', '', '表 B-1　常見錯誤訊息', '', '| ' + data.errors[0].join(' | ') + ' |', '| --- | --- | --- |', ...data.errors.slice(1).map(r => '| ' + r.join(' | ') + ' |'), '');
  md.push('## 附錄 C　學生操作檢核表', '', ...data.checklist.map(x => `- [ ] ${x}`), '');
  md.push('## 附錄 D　課後練習與參考答案', ''); data.exercises.forEach(([q, a], i) => md.push(`${i + 1}. ${q}`, `   - 參考答案：${a}`)); md.push('');
  fs.writeFileSync(path.join(ROOT, 'docs', 'STUDENT_GUIDE_zh-Hant.md'), md.join('\n'));
  console.log('figures', figNo, 'chapters', data.chapters.length, 'steps', data.chapters.reduce((a, c) => a + c.steps.length, 0));
})();
