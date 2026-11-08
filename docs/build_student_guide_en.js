// Builds the full step-by-step student guide in ENGLISH by operating PondGate in its English interface,
// exactly as a student would. English counterpart of docs/build_student_guide.js (Traditional Chinese).
// Usage: serve dist/ on a port, then: node docs/build_student_guide_en.js <port>
// Outputs: dist/manual/guide_en/*.png (annotated English screenshots), dist/student-guide-en.js (in-app data),
//          docs/STUDENT_GUIDE_en.md. Every number quoted under "What you should see" is read from the screen
//          during this run, so the text always matches the software. Nothing is computed here.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const port = process.argv[2] || 8765; const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'manual', 'guide_en'); fs.mkdirSync(OUT, { recursive: true });
const VERSION = '1.3.4';
const FREE = ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'];
const PRACTICE_EVIDENCE = 'Teaching assumption (practice only): a single sharp-crested weir with free discharge, not affected by tailwater, backwater, submergence or operational control.';
const PRACTICE_LIMIT = 'Teaching assumption (practice only): Qallow = 0.080 m³/s and Hallow = 1.00 m.';

/* ---------- page helpers ---------- */
const setv = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); if (typeof v === 'boolean') e.checked = v; else e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
const click = (p, id) => p.evaluate(id => document.getElementById(id).click(), id);
const open = (p, t) => p.evaluate(t => window.DSSWorkspacePages.openTarget(t), t);
const text = (p, s) => p.evaluate(s => document.querySelector(s)?.innerText || '', s);
const val = (p, id) => p.evaluate(id => document.getElementById(id).value, id);
const wait = (p, ms) => p.waitForTimeout(ms);
const FIXPREFIX = /^.*\(outlined in red\):\s*/i;
async function run(p) { await click(p, 'run'); await wait(p, 2200); }
async function screen(p) { await click(p, 'optimize'); for (let i = 0; i < 40; i++) { await wait(p, 500); const o = await text(p, '#optout'); if (/^(Selected feasible|No feasible)/.test(o.trim())) break; } await wait(p, 1200); }
async function met(p) {
  return p.evaluate(() => {
    const rows = [...document.querySelectorAll('#metricbody tr')].map(r => [...r.cells].map(c => c.innerText.trim()));
    const g = k => (rows.find(r => r[0].includes(k)) || [])[1] || '';
    return { qpi: g('Qp,i'), qpo: g('Qp,o'), rq: g('RQ'), ds: g('ΔSmax'), rs: g('RS'), hmax: g('Hmax'), eps: g('ε/Vin'), fpi: g('FPI95'), t50: g('Median-volume time'), tc: g('Discharge-centroid time'), resid: g('Te + Td') };
  });
}
async function evidence(p) { for (const id of FREE) await setv(p, id, true); await setv(p, 'freeEvidenceRecord', PRACTICE_EVIDENCE); await setv(p, 'screeningLimitRecord', PRACTICE_LIMIT); }
async function fresh(p) { await p.goto(`http://localhost:${port}/index.html`); await wait(p, 1500); if (await p.evaluate(() => document.documentElement.lang) !== 'en') { await p.click('#lang'); await wait(p, 2500); } }
const optRows = p => p.evaluate(() => [...document.querySelectorAll('#optout tr')].map(r => [...r.cells].map(c => c.innerText.trim())));

/* ---------- annotated screenshot (identical to the Chinese builder) ---------- */
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

CH.push({ id: 'c1', t: 'Chapter 1  Before you start', intro: [
  'PondGate is detention-pond routing software that runs in a web browser. You give it a known inflow hydrograph (discharge over time), the stage–storage relation of the pond and the outlet structures. It then computes, step by step, how the water level, storage and outflow change over time, and it keeps a traceable record.',
  'It solves the level-pool (storage continuity) equation dS/dt = Qin − Qout(H). The rate of change of the stored volume S equals the inflow Qin minus the outflow Qout. The outflow depends on the water level H and the outlet structures. The software uses the fourth-order Runge–Kutta method (RK4) with a 2-second step.',
  'PondGate handles only "one detention pond under a known inflow". It does not compute rainfall–runoff, channel routing, long-term continuous simulation or multi-pond systems. A "feasible case" from constrained screening is only a screening result under the conditions you declare. It is not a final engineering design. A professional engineer must still check the final design against the regulations and site data.'
], steps: [], extra: [
  ['How to use this guide', 'Each chapter is one complete exercise. Work through the chapters in order. Each step has three parts. "What to do" tells you where to click and what to enter. "What you should see" tells you what appears when you do it right (the numbers were read from the software while this guide was made). "If it looks different" lists likely causes. In the screenshots, red boxes and red numbers mark what to look at or press. The numbers match the notes under each figure.'],
  ['What you need', 'A computer or tablet with internet access and a web browser (Chrome, Edge, Safari or Firefox). You do not need to install anything. On the official website you need an account (Chapter 2 of the book explains this). A phone also works, but the screen is small, so a computer is better for practice.'],
  ['About the practice data', 'The values in this guide (for example, a peak inflow of 0.120 m³/s and a pond area of 180 m²) are teaching values. They do not come from any real project. In Chapter 8 you tick "free discharge" and write two records. These are "teaching assumptions (practice only)". In real work they must be supported by drawings, site checks or calculation records.'],
  ['How to start again', 'To return to the demonstration values at any time, reload the web page (press the browser reload button or F5). The software does not remember the inputs you changed. After a reload, press the language button again if the page opens in Chinese.']
] });

CH.push({ id: 'c2', t: 'Chapter 2  Getting to know the screen', intro: ['In this chapter you do not enter any values. You only learn where each area of the screen is and what it is for.'], steps: [
  { t: 'Open the software and find the four main areas', act: async p => { await fresh(p); await open(p, 'route'); },
    fig: { file: 'g02_01_layout', box: 'VIEWPORT', marks: [M('#workspacePageTabs', 1, 'Tab bar: switches between the five pages "Start here", "Setup and routing", "Constrained screening", "Results, verification and records" and "Teaching and internal tests".'), M('#lang', 2, 'Language button.'), M('#helpFab', 3, 'Help / AI assistant button. You can press it at any time.'), M('#workspacePageHost', 4, 'Work area: the content of the current page.')], cap: 'Screen layout of PondGate' },
    do: ['Open the PondGate web page in your browser and wait about 2 seconds for it to load.', 'If the page is in Chinese, press the button labelled "English" at the top right.'],
    see: ['On the left (on a phone, at the top) is a column of tabs (1 in the figure).', 'At the top right is the language button (2). When it shows "中文", the interface is in English; pressing it switches to Chinese. When it shows "English", the interface is in Chinese.', 'At the bottom left is the "? Help / AI assistant" button (3).', 'The large central area is the work area (4).'],
    fix: ['The screen is in Chinese: press the button labelled "English" at the top right.', 'The screen is blank or shows only text: wait a few seconds or reload the page.'] },
  { t: 'Get to know the "Start here" page', act: async p => { await open(p, 'helpCenter'); },
    fig: { file: 'g02_02_start', box: '#helpCenter', marks: [M('.hc-tabs', 1, 'Tabs: Start here, Guided lessons, User manual, Full step-by-step guide, Book, Tutorial videos, Glossary and AI assistant.'), M('#hcNextPage', 2, '"Next step" box: tells you what to do next, based on the current screen.'), M('.hc-steps', 3, 'Five basic steps, each with a "Go" button.')], opt: { maxH: 760 }, cap: 'The "Start here" page' },
    do: ['In the tab bar, press "Start here | help and assistant".'],
    see: ['A row of tabs runs across the top of the page (1).', 'The "Next step" box (2) changes as you work. When you first open it, it says that the demonstration case is loaded and that you can press run straight away.', 'Below it are the basic steps 1 to 5 (3).'],
    fix: ['You cannot find this page: it is the first tab in the tab bar.'] },
  { t: 'Try the AI assistant', act: async p => { await p.evaluate(() => window.PondGateHelp.open()); await p.fill('#hcInput', 'What is Qallow?'); await p.press('#hcInput', 'Enter'); await wait(p, 500); V.c2ans = (await p.evaluate(() => [...document.querySelectorAll('#hcLog .hc-msg.bot')].pop()?.innerText || '')).split('\n')[0]; },
    fig: { file: 'g02_03_assistant', box: '#helpDrawer', marks: [M('.hc-quick', 1, 'Common-question buttons. Press one to get an answer.'), M('#hcInput', 2, 'Type your own question here.'), M('#hcLog', 3, 'Questions and answers.')], cap: 'AI assistant (offline)' },
    do: ['Press "? Help / AI assistant" at the bottom left.', 'Type "What is Qallow?" in the box and press Enter or "Ask".'],
    see: [() => `The assistant explains the term. Its answer begins: "${V.c2ans.slice(0, 80)}…".`, 'This assistant is an "offline rule-based" guide. It answers from keywords and the screen state inside your browser. It does not connect to an outside AI service, sends no data, does not change your inputs and does not make engineering judgements for you.'],
    fix: ['The assistant says it can answer only PondGate questions: ask again using a term or button name from the software.'] },
  { t: 'Close the assistant', act: async p => { await p.evaluate(() => window.PondGateHelp.close()); }, do: ['Press "×" at the top right of the assistant window, or press the bottom-left button again.'], see: ['The assistant window closes and the page is shown again.'], fix: [] }
] });

CH.push({ id: 'c3', t: 'Chapter 3  Your first routing run: the demonstration case', intro: ['In this chapter you run a complete routing calculation with the built-in demonstration case and learn to read the results. The demonstration case is a triangular inflow event. The water flows into a 180 m² pond and leaves through a sharp-crested weir 0.20 m wide.'], steps: [
  { t: 'Open the "Setup and routing" page', act: async p => { await fresh(p); await open(p, 'route'); },
    fig: { file: 'g03_01_tab', box: '#workspacePageTabs', marks: [M('[data-workspace-page="route"]', 1, 'The "Setup and routing" tab.'), M('.workspace-children', 2, 'Sub-items for Modules 1 to 4. Press one to jump to that module.')], cap: 'The "Setup and routing" tab and its module sub-items' },
    do: ['In the tab bar, press "Setup and routing".'], see: ['The work area shows Module 1 "Inflow boundary". Below the tab are 1. Inflow boundary, 2. Storage–water-level state, 3. Outlet hydraulics and 4. First-principles routing.'], fix: [] },
  { t: 'Check Module 1: inflow boundary', act: async p => { await open(p, 'mod-inflow'); },
    fig: { file: 'g03_02_inflow', box: '#mod-inflow', marks: [M('#case', 1, 'Standard case: currently the triangular event (test-envelope demonstration).'), M('#qp', 2, 'Peak inflow Qp (m³/s).'), M('#shape', 3, 'Inflow shape: triangular.'), M('#tpeak', 4, 'Time to peak Tp (min).'), M('#recess', 5, 'Recession time Tr (min).'), M('#dur', 6, 'Total event duration T (computed automatically = Tp + Tr).')], cap: 'Module 1 inflow boundary (demonstration values)' },
    do: ['Do not change any value. Just compare the fields with 1 to 6 in the figure.', 'Move the mouse over the "?" next to a field name, or press the "?", to see an explanation of that field.'],
    see: ['Standard case = triangular event; peak inflow Qp = 0.120 m³/s; inflow shape = triangular; Tp = 30 min; Tr = 30 min; total event duration T = 60 min.', 'A triangular inflow rises in a straight line from 0 to Qp in Tp minutes, then falls in a straight line back to 0 in Tr minutes.'],
    fix: ['The values are different: reload the page to return to the demonstration values.'] },
  { t: 'Check Module 2: storage–water-level state', act: async p => { await open(p, 'mod-storage'); },
    fig: { file: 'g03_03_storage', box: '#mod-storage', marks: [M('#storageMode', 1, 'Storage representation: constant plan area.'), M('#floor', 2, 'Floor elevation Hfloor (m).'), M('#area', 3, 'Plan area A (m²).'), M('#h0', 4, 'Initial water level H0 (m).')], cap: 'Module 2 storage–water-level state (demonstration values)' },
    do: ['In the tab bar, press "2. Storage–water-level state" and compare with 1 to 4 in the figure.'],
    see: ['Storage representation = constant plan area. The pond walls are vertical, so the area is the same at every level, and the storage is S = A × (H − Hfloor).', 'Floor elevation Hfloor = 0.00 m; plan area A = 180 m²; initial water level H0 = 0 m (the pond is empty when the event starts).'],
    fix: [] },
  { t: 'Check Module 3: outlet hydraulics', act: async p => { await open(p, 'mod-outlet'); },
    fig: { file: 'g03_04_outlet', box: '#mod-outlet', marks: [M('#weirOn', 1, '"Sharp-crested weir" is ticked.', { up: 'label' }), M('#cw', 2, 'Weir coefficient Cw.'), M('#bw', 3, 'Weir width b (m).'), M('#crest', 4, 'Crest elevation (m).'), M('#oriOn', 5, '"Rectangular opening" is not ticked.', { up: 'label' })], opt: { focus: true }, cap: 'Module 3 outlet hydraulics: sharp-crested weir (demonstration values)' },
    do: ['In the tab bar, press "3. Outlet hydraulics". Scroll down to "Sharp-crested weir" and compare with 1 to 5 in the figure.'],
    see: ['Only "Sharp-crested weir" is ticked; Cw = 1.70; weir width b = 0.20 m; crest elevation = 0 m.', 'The weir equation is Q = Cw × b × h^1.5, where h is the height of the water above the crest. The crest is at the pond floor, so water starts to flow over the weir as soon as it enters the pond.', 'At the top of Module 3 there are also ticks and record fields for the "free-discharge boundary". You will use them in Chapter 8. Ignore them for now.'],
    fix: [] },
  { t: 'Run the routing', act: async p => { await open(p, 'mod-routing'); },
    fig: { file: 'g03_05_run', box: '#mod-routing', marks: [M('#run', 1, 'The "Run routing and evaluation" button.')], cap: 'The run button in Module 4' },
    do: ['In the tab bar, press "4. First-principles routing".', 'Press the blue "Run routing and evaluation" button (1).'],
    see: ['After about 1 second, the page switches to "Results, verification and records" (Module 6).'],
    fix: ['The button is grey and cannot be pressed: a field has a wrong value. The fields to fix are listed above the button. See Chapter 7.'] },
  { t: 'Look at the "Inflow and routed outflow" chart', act: async p => { await run(p); Object.assign(V, { m3: await met(p) }); await open(p, 'mod-evaluation'); },
    fig: { file: 'g03_06_qchart', box: '#mod-evaluation', marks: [M('#qchart', 1, 'Inflow and routed outflow chart.'), M('#hchart', 2, 'Water level and storage chart.')], opt: { focus: true, maxH: 520 }, cap: 'Routing result charts' },
    do: ['In Module 6, find the "Inflow and routed outflow" chart (1).'],
    see: ['The chart has two curves: inflow (Qin) and outflow (Qout). The inflow is a triangle. The outflow peak is lower and comes later than the inflow peak. This is the "peak reduction and delay" effect of a detention pond.', 'The "Water level and storage" chart next to it (2) plots the water level (m) and the storage (m³) on the same axis. The two have very different sizes, so the level line stays close to 0. Read the water level from the results table in the next step.'],
    fix: ['The chart is empty: go back to Module 4 and press run again.'] },
  { t: 'Read the results table', act: async p => {},
    fig: { file: 'g03_07_table', box: 'table:has(#metricbody)', marks: [M('#metricbody tr:nth-child(2)', 1, 'Peak outflow Qp,o.'), M('#metricbody tr:nth-child(3)', 2, 'Peak ratio RQ.'), M('#metricbody tr:nth-child(4)', 3, 'Event-added detention volume ΔSmax.'), M('#metricbody tr:nth-child(8)', 4, 'Peak water level Hmax.'), M('#metricbody tr:nth-child(10)', 5, 'Mass-balance residual ε/Vin.')], opt: { up: 'table' }, cap: 'Results table (demonstration case)' },
    do: ['Scroll down to the results table. First read the "Mass-balance residual ε/Vin" (5). Then read the peak outflow, peak ratio, detention volume and peak water level.'],
    see: [() => `Mass-balance residual ε/Vin = ${V.m3.eps}. This is the conservation check of the numerical calculation. A value close to 0 means that the calculation did not lose or add water. Always read this item first.`,
      () => `Peak outflow Qp,o = ${V.m3.qpo} (the peak inflow is ${V.m3.qpi}).`, () => `Peak ratio RQ = ${V.m3.rq}. The outflow peak is about ${Math.round(parseFloat(V.m3.rq.replace(/^.*=\s*/, '')) * 100)}% of the inflow peak.`,
      () => `Event-added detention volume ΔSmax = ${V.m3.ds}. This is the largest extra volume stored in the pond during the event.`, () => `Peak water level Hmax = ${V.m3.hmax}. This is the highest level in the pond. Compare it with the allowable level and the freeboard.`],
    fix: ['ε/Vin is clearly larger than 0: write down the inputs and report them. This is not normal.'] },
  { t: 'Download the traceable record', act: async p => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 6000 }).catch(() => null), click(p, 'download')]); V.report = d ? d.suggestedFilename() : '(file name not captured)'; },
    fig: { file: 'g03_08_download', box: '#mod-evaluation', marks: [M('#download', 1, 'The "Download reproducible decision-support report" button.')], opt: { focus: true, maxH: 300 }, cap: 'Download the traceable record' },
    do: ['Below the results table, press "Download reproducible decision-support report" (1).', 'If the browser asks whether to save the file, choose save.'],
    see: [() => `The browser downloads a text file (file name ${V.report}).`, 'The file records all inputs, calculation settings, results and time series of this run. Attach it to homework or reports so that others can reproduce your result.'],
    fix: ['Nothing is downloaded: check whether the browser blocks downloads.'] }
] });

CH.push({ id: 'c4', t: 'Chapter 4  Change the inputs and compare the results', intro: ['In this chapter you change one condition at a time and watch how the results change. Have a sheet of paper or a spreadsheet ready to record each result.'], steps: [
  { t: 'Use a larger event', act: async p => { await fresh(p); await open(p, 'mod-inflow'); await setv(p, 'qp', '0.20'); await setv(p, 'tpeak', '20'); await setv(p, 'recess', '40'); V.c4dur = await val(p, 'dur'); },
    fig: { file: 'g04_01_inflow', box: '#mod-inflow', marks: [M('#qp', 1, 'Peak inflow Qp changed to 0.20.'), M('#tpeak', 2, 'Tp changed to 20.'), M('#recess', 3, 'Tr changed to 40.'), M('#dur', 4, 'T becomes 60 automatically.')], cap: 'Changing the inflow conditions' },
    do: ['Reload the page to return to the demonstration values (switch to English again if needed).', 'In Module 1, change the peak inflow Qp to 0.20, the time to peak Tp to 20 and the recession time Tr to 40.'],
    see: [() => `The total event duration T changes automatically to ${V.c4dur} min (20 + 40).`],
    fix: ['T does not change: click outside the field so that the input takes effect.'] },
  { t: 'Run and record result A', act: async p => { await run(p); V.a = await met(p); },
    do: ['In Module 4, press "Run routing and evaluation".', 'From the results table, write down the peak outflow Qp,o, the peak ratio RQ, ΔSmax and the peak water level Hmax.'],
    see: [() => `Result A: Qp,o = ${V.a.qpo}, RQ = ${V.a.rq}, ΔSmax = ${V.a.ds}, Hmax = ${V.a.hmax}.`], fix: [] },
  { t: 'Enlarge the pond and record result B', act: async p => { await open(p, 'mod-storage'); await setv(p, 'area', '250'); await shot(p, 'g04_02_area', '#mod-storage', [M('#area', 1, 'Plan area A changed to 250.')]); await run(p); V.b = await met(p); },
    figDone: { file: 'g04_02_area', cap: 'Changing the plan area to 250 m²', notes: ['Plan area A changed to 250.'] },
    do: ['In Module 2, change the plan area A from 180 to 250. Leave everything else as it is.', 'In Module 4, press run and write down result B.'],
    see: [() => `Result B: Qp,o = ${V.b.qpo}, RQ = ${V.b.rq}, ΔSmax = ${V.b.ds}, Hmax = ${V.b.hmax}.`], fix: [] },
  { t: 'Widen the weir and record result C', act: async p => { await open(p, 'mod-outlet'); await setv(p, 'bw', '0.30'); await shot(p, 'g04_03_weir', '#mod-outlet', [M('#bw', 1, 'Weir width b changed to 0.30.')], { focus: true, maxH: 360 }); await run(p); V.c = await met(p); },
    figDone: { file: 'g04_03_weir', cap: 'Changing the weir width to 0.30 m', notes: ['Weir width b changed to 0.30.'] },
    do: ['In Module 3, change the weir width b from 0.20 to 0.30 (keep the pond area at 250).', 'In Module 4, press run and write down result C.'],
    see: [() => `Result C: Qp,o = ${V.c.qpo}, RQ = ${V.c.rq}, ΔSmax = ${V.c.ds}, Hmax = ${V.c.hmax}.`], fix: [] },
  { t: 'Compare the three results', act: async p => {},
    table: () => [['', 'Condition', 'Peak outflow Qp,o', 'Peak ratio RQ', 'ΔSmax', 'Peak water level Hmax'], ['A', 'Qp 0.20, A 180, b 0.20', V.a.qpo, V.a.rq, V.a.ds, V.a.hmax], ['B', 'Pond area changed to 250', V.b.qpo, V.b.rq, V.b.ds, V.b.hmax], ['C', 'Weir width then changed to 0.30', V.c.qpo, V.c.rq, V.c.ds, V.c.hmax]],
    tableTitle: 'Table 4-1  Comparison of the three runs (values read while this guide was made)',
    do: ['Put the three results into Table 4-1 and answer the two questions below.'],
    see: ['A → B (larger pond): the same water spreads over a larger area, so the level rises less and Hmax falls. The pond can store more water, so the outflow peak also falls.', 'B → C (wider weir): the outlet can pass more water, so the water leaves faster. Hmax falls, but the outflow peak rises and the peak reduction becomes weaker.', 'Conclusion: a larger pond area lowers both the water level and the outflow. A wider outlet lowers the water level but increases the outflow downstream. A design must balance the two. Constrained design screening in Chapter 8 deals with this problem.'], fix: [] }
] });

CH.push({ id: 'c5', t: 'Chapter 5  Describe an irregular pond with a stage–storage table', intro: ['Real pond walls are often sloped, so the area differs from level to level. In that case use a "stage–storage table S(H)" and enter the storage for each water level, row by row.'], steps: [
  { t: 'Switch to a stage–storage table', act: async p => { await fresh(p); await open(p, 'mod-storage'); await setv(p, 'storageMode', 'table'); },
    fig: { file: 'g05_01_table', box: '#mod-storage', marks: [M('#storageMode', 1, 'Storage representation changed to the stage–storage table S(H).'), M('#storageTable', 2, 'Stage–storage table; each row is "level, storage".'), M('#storageFile', 3, 'You can also import a .csv or .txt file.')], cap: 'Stage–storage table mode' },
    do: ['Reload the page. In Module 2, set "Storage representation" to the stage–storage table S(H).'],
    see: ['A table input box appears (2). By default it has three rows: 0, 0 / 0.50, 90 / 1.00, 180. This is exactly a vertical-walled pond with an area of 180 m².', 'The "Plan area A" and "Floor elevation" fields disappear, because the table already contains this information.'], fix: [] },
  { t: 'Enter a pond that is wider at the top', act: async p => { await setv(p, 'storageTable', '0, 0\n0.50, 120\n1.00, 300'); await run(p); V.t5 = await met(p); },
    do: ['Replace the table with the three rows below (one pair per row, separated by a comma):', '0, 0', '0.50, 120', '1.00, 300', 'In Module 4, press "Run routing and evaluation".'],
    see: [() => `Between 0 and 0.5 m this pond has an average area of 240 m², and between 0.5 and 1.0 m it has 360 m². It is larger than the demonstration pond. Results: Qp,o = ${V.t5.qpo} and Hmax = ${V.t5.hmax}, both lower than in the demonstration case (Chapter 3).`], fix: ['A red message says that the stage–storage table must start at storage 0: check that the first row is 0, 0 and that both the level and the storage increase row by row.'] },
  { t: 'What happens when the table is too short', act: async p => { await open(p, 'mod-storage'); await setv(p, 'storageTable', '0, 0\n0.15, 30\n0.30, 70'); await click(p, 'run'); await wait(p, 1500); V.c5stop = (await text(p, '#inputErrorGuide')).replace(/\s+/g, ' ').replace(/ ?Go to the outlined field$/, '').trim(); },
    fig: { file: 'g05_02_stop', box: '#mod-routing', marks: [M('#inputErrorGuide', 1, 'Red message: explains why this run was stopped.'), M('#runErrGo', 2, 'The "Go to the outlined field" button.')], opt: { maxH: 420 }, cap: 'The table range is too short, so the run is stopped' },
    figExtra: async p => { await open(p, 'mod-evaluation'); await wait(p, 300); await shot(p, 'g05_03_stale', '#mod-evaluation', [M('#runStaleBanner', 1, 'Warning: the results below are from the previous successful run and do not match the current inputs.')], { focus: true, maxH: 300 }); },
    figExtraDone: { file: 'g05_03_stale', cap: 'Warning on the results page', notes: ['Warning: the results below are from the previous successful run and do not match the current inputs.'] },
    do: ['On purpose, change the table so that it reaches only 0.30 m:', '0, 0', '0.15, 30', '0.30, 70', 'Press "Run routing and evaluation".'],
    see: [() => `The run is stopped. The page stays in Module 4, and a red message appears above the button: "${V.c5stop}"`, 'Press "Go to the outlined field" after the message. The page jumps to the table in Module 2, which now has a red outline.', 'PondGate does not extrapolate (guess) beyond the table, because that would give results without a basis.', 'If you now open the "Results, verification and records" page, a red warning above the results table says that the charts and results below are from the previous successful run and must not be cited.'],
    fix: ['Solution: extend the table above the highest likely water level (and above the reference level Href = 1.00 m in Module 5). For example, add the rows "0.60, 160" and "1.00, 300", then run again.'] },
  { t: 'Import the table from a file', act: async p => { await open(p, 'mod-storage'); },
    do: ['Create a file in Notepad or Excel. Put the water level (m) in the first column and the storage (m³) in the second column, one pair per row, for example:', '0,0', '0.5,120', '1.0,300', 'Save it as a .csv or .txt file. Start the first row with numbers; do not add a header row.', 'In Module 2, press the file button next to "Import stage–storage file" and choose the file.'],
    see: ['The file contents fill the table, and the mode switches to the stage–storage table automatically.'],
    fix: ['After importing, the run shows the message that the table must start at storage 0: usually the first row contains column names (for example "level,storage"). Delete that row.'] },
  { t: 'Return to constant plan area', act: async p => { await setv(p, 'storageMode', 'constant'); }, do: ['Set "Storage representation" back to constant plan area, or reload the page.'], see: ['The plan area A and floor elevation fields appear again.'], fix: [] }
] });

CH.push({ id: 'c6', t: 'Chapter 6  Long-duration events and timing', intro: ['When the inflow lasts a long time and the peak is flat, the outflow peak is also flat. Then "the minute at which the peak occurs" is not a stable number. Report volume-based timing measures instead.'], steps: [
  { t: 'Load the long-duration event', act: async p => { await fresh(p); await open(p, 'mod-inflow'); await setv(p, 'case', 'long'); V.c6 = await p.evaluate(() => ['rise', 'plateau', 'recessLong', 'dur'].map(i => document.getElementById(i).value)); },
    fig: { file: 'g06_01_long', box: '#mod-inflow', marks: [M('#case', 1, 'Standard case changed to the long-duration event.'), M('#shape', 2, 'Inflow shape changes automatically to the long flat-topped shape.'), M('#rise', 3, 'Rise time.'), M('#plateau', 4, 'Plateau duration.'), M('#recessLong', 5, 'Recession time.'), M('#dur', 6, 'Total event duration.')], cap: 'Inflow settings of the long-duration event' },
    do: ['Reload the page. In Module 1, set "Standard case" to the long-duration event (timing-interpretation demonstration).'],
    see: [() => `The inflow shape changes to a long flat-topped hydrograph: rise ${V.c6[0]} min, plateau ${V.c6[1]} min, recession ${V.c6[2]} min, total event duration ${V.c6[3]} min. The peak inflow is still 0.120 m³/s.`], fix: [] },
  { t: 'Run and read the timing measures', act: async p => { await run(p); V.l = await met(p); },
    fig: { file: 'g06_02_metrics', box: 'table:has(#metricbody)', marks: [M('#metricbody tr:nth-child(3)', 1, 'Peak ratio RQ.'), M('#metricbody tr:nth-child(11)', 2, 'Near-peak flatness FPI95.'), M('#metricbody tr:nth-child(12)', 3, 'Median-volume time.'), M('#metricbody tr:nth-child(13)', 4, 'Discharge-centroid time.')], opt: { up: 'table' }, cap: 'Results table of the long-duration event' },
    do: ['In Module 4, press "Run routing and evaluation".', 'In the results table, find the peak ratio RQ, the near-peak flatness FPI95, the median-volume time and the discharge-centroid time.'],
    see: [() => `Peak ratio RQ = ${V.l.rq}. The plateau lasts long enough for the pond to fill until the outflow equals the inflow, so there is almost no peak reduction. A detention pond has limited peak reduction for long-duration events.`, () => `FPI95 = ${V.l.fpi}; median-volume time = ${V.l.t50}; discharge-centroid time = ${V.l.tc}.`, 'The median-volume time is the time when the cumulative outflow reaches half of its total. The discharge-centroid time is the time-weighted mean of the outflow. Both use the water volume of the whole event, so they do not jump because of small changes near the peak.'],
    fix: [] },
  { t: 'Read the timing warning', act: async p => { await evidence(p); await run(p); await open(p, 'mod-evaluation'); V.c6note = (await text(p, '#status')).replace(/\s+/g, ' ').trim(); },
    fig: { file: 'g06_03_note', box: '#mod-evaluation', marks: [M('#status', 1, 'Timing-interpretation warning.')], opt: { focus: true, maxH: 300 }, cap: 'Timing-interpretation warning for the long-duration event' },
    do: ['Follow steps 8-1 and 8-2 in Chapter 8: tick free discharge and fill in the two records (teaching assumptions for practice).', 'Press "Run routing and evaluation" again and find the yellow message box below the results table.'],
    see: [() => `The message box says: "${V.c6note}"`, 'If the free-discharge settings are not complete, the same place first warns that the free-discharge evidence is incomplete. So you must complete the settings before you see this timing message.'], fix: [] },
  { t: 'Rules for reading timing', act: async p => {}, do: ['Read the rules below and answer the question at the end.'],
    see: ['When the peak is flat, a tiny numerical change can move the "outflow peak time" a lot. Do not report it on its own.', 'Report FPI95 together with the median-volume time or the discharge-centroid time. A larger FPI95 means a flatter peak. For long-duration events, or when FPI95 is above 0.12, PondGate reminds you to check the timing interpretation.', 'Question: when the peak is flat, which time should you report first? Answer: the volume-based timing measures (median-volume time and discharge-centroid time), together with FPI95.'], fix: [] }
] });

CH.push({ id: 'c7', t: 'Chapter 7  Find and fix wrong inputs', intro: ['When an input is not reasonable, PondGate does not compute a wrong result. It stops the run and tells you what to change. In this chapter you enter wrong values on purpose and practise reading the messages.'], steps: [
  { t: 'Set the peak inflow to 0', act: async p => { await fresh(p); await open(p, 'mod-inflow'); await setv(p, 'qp', '0'); await wait(p, 300); await open(p, 'mod-routing'); V.c7 = (await text(p, '#hcRunFix')).replace(/\s+/g, ' ').trim(); },
    fig: { file: 'g07_01_list', box: '#mod-routing', marks: [M('#hcRunFix', 1, 'List of fields to fix.'), M('#run', 2, 'The run button turns grey.')], cap: 'Message when the run button is blocked' },
    do: ['Reload the page. In Module 1, change the peak inflow Qp to 0.', 'Go to Module 4 and look at the run button.'],
    see: ['The "Run routing and evaluation" button turns grey and cannot be pressed (2).', () => `Above the button is the list of fields to fix (1): "${V.c7.replace(FIXPREFIX, '')}".`], fix: [] },
  { t: 'Use the list to jump to the field', act: async p => { await open(p, 'mod-inflow'); await p.evaluate(() => document.getElementById('qp').scrollIntoView({ block: 'center' })); },
    fig: { file: 'g07_02_red', box: '#mod-inflow', marks: [M('#qp', 1, 'The field with a problem has a red outline.')], opt: { focus: true, maxH: 300 }, cap: 'The field with a problem has a red outline' },
    do: ['Press "Peak inflow Qp must be greater than 0" in the list.'],
    see: ['The page jumps back to Module 1, and the Qp field has a red outline.'], fix: [] },
  { t: 'Fix it and continue', act: async p => { await setv(p, 'qp', '0.120'); await wait(p, 300); V.c7ok = await p.evaluate(() => !document.getElementById('run').disabled); },
    do: ['Change Qp back to 0.120.'], see: [() => V.c7ok ? 'The red outline and the list disappear. The run button turns blue again and can be pressed.' : '(The button did not recover while this guide was made. Please report this.)'], fix: [] },
  { t: 'Try another one: initial level below the floor', act: async p => { await open(p, 'mod-storage'); await setv(p, 'h0', '-0.1'); await wait(p, 300); V.c7b = (await text(p, '#hcRunFix')).replace(/\s+/g, ' ').trim(); await setv(p, 'h0', '0'); },
    do: ['In Module 2, change the initial water level H0 to −0.1 (below the floor at 0.00).', 'Read the list in Module 4, then change H0 back to 0.'],
    see: [() => `The list shows: "${V.c7b.replace(FIXPREFIX, '')}". After you change it back to 0, everything is normal again.`], fix: [] },
  { t: 'Common wrong inputs', act: async p => {}, do: ['See the error-message table in Appendix B.'], see: ['Common errors include: a discharge or time of 0 or less; an initial level below the floor; a weir width or opening area of 0; an allowable level below the initial level; a stage–storage table that is too short or has column names in the first row.'], fix: [] }
] });

CH.push({ id: 'c8', t: 'Chapter 8  Constrained design screening: find a feasible case', intro: ['In the earlier chapters you gave the pond and the outlet and computed the level and the outflow. This chapter works the other way. You give the largest outflow allowed downstream, Qallow, and the highest level allowed in the pond, Hallow. PondGate then tries many combinations of pond area and weir width within the declared range and finds a case that meets the limits.', 'Formal constrained screening runs only when the outlet is "one weir or one rectangular opening with confirmed free discharge". Free discharge means that the water level downstream of the outlet does not affect the outflow. So you must first complete four checks and two records. In this chapter, all checks and records are "teaching assumptions (practice only)".'], steps: [
  { t: 'Tick the free-discharge boundary and the four checks', act: async p => { await fresh(p); await open(p, 'mod-outlet'); for (const id of FREE) await setv(p, id, true); },
    fig: { file: 'g08_01_free', box: '#mod-outlet', marks: [M('#freeDischarge', 1, 'Free-discharge boundary confirmed.', { up: 'label' }), M('#freeTailwater', 2, 'Tailwater is below all controlling outlets.', { up: 'label' }), M('#freeBackwater', 3, 'Downstream backwater or pipe friction does not change Qout(H).', { up: 'label' }), M('#freeSubmergence', 4, 'The outlet is not submerged.', { up: 'label' }), M('#freeOperation', 5, 'Gates, pumps or operation do not change the outlet law.', { up: 'label' })], opt: { focus: true, maxH: 420 }, cap: 'Free-discharge boundary and the four checks' },
    do: ['Reload the page. In Module 3, tick the free-discharge boundary (1).', 'Then tick the four checks below it (2 to 5).'],
    see: ['All five boxes are ticked.'], fix: ['In real work, tick them only when drawings, site checks or hydraulic calculations support them.'] },
  { t: 'Fill in the two records', act: async p => { await setv(p, 'freeEvidenceRecord', PRACTICE_EVIDENCE); await setv(p, 'screeningLimitRecord', PRACTICE_LIMIT); },
    fig: { file: 'g08_02_records', box: '#mod-outlet', marks: [M('#freeEvidenceRecord', 1, 'Free-discharge evidence record.'), M('#screeningLimitRecord', 2, 'Basis for the screening limits.')], opt: { focus: true, maxH: 380 }, cap: 'The two required records' },
    do: ['In the free-discharge evidence record, enter:', PRACTICE_EVIDENCE, 'In the basis for the screening limits, enter:', PRACTICE_LIMIT],
    see: ['Both fields contain text. Both texts are written into the downloaded report, so others can see the basis of the decision.'], fix: [] },
  { t: 'Run the routing once first', act: async p => { await run(p); }, do: ['In Module 4, press "Run routing and evaluation" so that the results match the current inputs.'], see: ['The page switches to Module 6 and shows the results of the demonstration case (the same as in Chapter 3).'], fix: [] },
  { t: 'Set the limits', act: async p => { await open(p, 'mod-optimization'); },
    fig: { file: 'g08_03_limits', box: '#mod-optimization', marks: [M('#qallow', 1, 'Allowable peak outflow Qallow.'), M('#hallow', 2, 'Allowable water level Hallow.'), M('#href', 3, 'Dimensionless reference level Href.'), M('#drainHours', 4, 'Maximum drain-down time Td.'), M('#residualPct', 5, 'Allowable event-added storage residual.')], opt: { maxH: 900 }, cap: 'Limits in Module 5' },
    do: ['In the tab bar, press "Constrained screening" (Module 5).', 'Check: allowable peak outflow = 0.080 m³/s; allowable water level = 1.00 m; Href = 1.00 m; maximum drain-down time Td = 24 h; allowable residual = 1 %.'],
    see: ['Qallow is the largest outflow that the downstream system can accept. Hallow is the highest level that the pond must not exceed. Both should come from regulations or design criteria. Do not relax them just to get a result.', 'Td and the residual percentage require that, within Td hours after the event, the pond drains until only a very small part of the event storage is left, ready for the next storm.'], fix: [] },
  { t: 'Set the outlet configuration and the search range', act: async p => {},
    fig: { file: 'g08_04_search', box: '#mod-optimization', marks: [M('#optConfig', 1, 'Outlet configuration for screening: passive weir only.'), M('#optMode', 2, 'Screening resolution.'), M('#optObjective', 3, 'Screening objective.'), M('#optBmin', 4, 'Minimum weir width.'), M('#optBmax', 4, 'Maximum weir width.'), M('#optimize', 5, 'The "Run constrained design screening" button.')], opt: { focus: true, maxH: 900 }, cap: 'Outlet configuration, objective and search range' },
    do: ['Check: outlet configuration = passive weir only (formal screening); screening resolution = standard discrete screening; objective = minimum event-added detention volume ΔSmax; weir width range 0.05 to 1.00 m.'],
    see: ['The software tries many combinations of pond area and weir width within this range. It recomputes each one with the same RK4 routing.'], fix: [] },
  { t: 'Run constrained design screening', act: async p => { V.c8before = [await val(p, 'area'), await val(p, 'bw')]; await screen(p); V.c8page = await p.evaluate(() => window.DSSWorkspacePages.active()); const rows = await optRows(p); const g = k => (rows.find(r => r[0].includes(k)) || [])[1] || ''; V.c8out = { a: g('Plan area'), b: g('Weir width'), ds: g('ΔSmax'), q: g('Peak outflow'), h: g('Peak water level'), r: g('Drain-down residual') }; V.c8after = [await val(p, 'area'), await val(p, 'bw')]; },
    fig: { file: 'g08_05_result', box: '#optout', marks: [MT('Plan area A', 1, 'Selected pond area.', '#optout'), MT('Weir width b', 2, 'Selected weir width.', '#optout'), MT('Peak outflow / allowable', 3, 'Peak outflow and allowable value.', '#optout'), MT('Peak water level / allowable', 4, 'Peak water level and allowable value.', '#optout')], cap: 'Constrained screening result (feasible)' },
    do: ['Press "Run constrained design screening" and wait about 5 to 10 seconds.'],
    see: [() => `The page switches to "Results, verification and records" and shows "Selected feasible constrained-screening case — routed".`, () => `Selected pond area A = ${V.c8out.a}, weir width b = ${V.c8out.b}; peak outflow / allowable = ${V.c8out.q}; peak water level / allowable = ${V.c8out.h}; drain-down residual = ${V.c8out.r}.`, 'Every item is within its limit.'],
    fix: ['The button is grey: the free-discharge ticks or the two records are not complete, or the outlet is not one weir or one opening. A message below the button explains why and offers "Go to fix".'] },
  { t: 'Read the three-step check', act: async p => {},
    fig: { file: 'g08_06_check', box: '.diagnostic-guide', marks: [M('.diagnostic-guide .three-step', 1, 'Steps 1 to 3.'), M('.diagnostic-guide .diagnostic-list', 2, 'Check result for each condition.')], cap: 'Three-step check (feasible)' },
    do: ['Below the screening result, find "Screening / optimization result check | three steps".'],
    see: ['Step 1: screening computation status = "Pass | Screening completed".', 'Step 2: outlet type, maximum level, peak outflow, drain-down residual and S(H) boundary, and the four free-discharge evidence checks all show "Pass".', 'Step 3: the current result meets the declared conditions; final engineering-design validation is still required.'], fix: [] },
  { t: 'Note: the inputs now hold the selected values', act: async p => {},
    do: ['Go back to Modules 2 and 3 and look at the plan area A and the weir width b.'],
    see: [() => V.c8after[0] !== V.c8before[0] || V.c8after[1] !== V.c8before[1] ? `After screening, the plan area in Module 2 changed from ${V.c8before[0]} to ${V.c8after[0]} m², and the weir width in Module 3 changed from ${V.c8before[1]} to ${V.c8after[1]} m. The charts and results table above show the routing of the selected case. To return to the original demonstration values, reload the page.` : 'The values in Modules 2 and 3 did not change.'], fix: [] },
  { t: 'Download the report', act: async p => {}, do: ['Press "Download reproducible decision-support report".'], see: ['The report contains the limits, the free-discharge records, the screening result and the three-step check.'], fix: [] }
] });

CH.push({ id: 'c9', t: 'Chapter 9  No feasible case: understanding "Blocked"', intro: ['If the limits are too strict, no combination in the declared range may meet them. PondGate then shows "Blocked" clearly and names the limits that caused it. It never shows "Pass" in this case.'], steps: [
  { t: 'Make the allowable outflow very strict', act: async p => { await fresh(p); await evidence(p); await run(p); await open(p, 'mod-optimization'); await setv(p, 'qallow', '0.010'); },
    fig: { file: 'g09_01_strict', box: '#mod-optimization', marks: [M('#qallow', 1, 'Allowable peak outflow changed to 0.010.')], opt: { focus: true, maxH: 300 }, cap: 'Changing Qallow to 0.010' },
    do: ['Reload the page. Follow steps 8-1 to 8-3 in Chapter 8: tick free discharge, fill in the two records and run the routing once.', 'In Module 5, change the allowable peak outflow Qallow to 0.010.'], see: ['The Qallow field shows 0.010.'], fix: [] },
  { t: 'Run screening and see "Blocked"', act: async p => { await screen(p); V.c9 = (await text(p, '#optout')).replace(/\s+/g, ' ').trim(); V.c9s1 = (await text(p, '.diagnostic-guide .three-step')).split('\n').slice(0, 3).join(' '); },
    fig: { file: 'g09_02_block', box: '.diagnostic-guide', marks: [M('.diagnostic-guide .three-step', 1, 'Step 1 shows "Blocked | No feasible solution"; step 3 lists the dominant limits.'), M('.diagnostic-guide .diagnostic-list', 2, 'Each dominant limit has a "Go to fix" link.')], cap: 'Three-step check when no feasible case exists' },
    do: ['Press "Run constrained design screening".'],
    see: [() => `The screening result says: "${V.c9}"`, 'In the three-step check, step 1 shows "Blocked | No feasible solution", and step 3 lists the dominant limits with "Go to fix" links.'], fix: [] },
  { t: 'The right way to respond', act: async p => { await setv(p, 'qallow', '0.080'); },
    do: ['Read the rules below, then change Qallow back to 0.080.'],
    see: ['Do not relax Qallow or Hallow just to get a result, because they come from regulations or design criteria.', 'What you can do: change the pond area or the outlet size on an engineering basis, widen the search range where there is a basis for it, or add S(H) data.', '"Blocked" is a useful result in itself. It tells you that this design direction cannot work under the current conditions.'], fix: [] }
] });

CH.push({ id: 'c10', t: 'Chapter 10  Research-inspection mode: outlets that cannot be screened formally', intro: ['Formal constrained screening in PondGate is verified only for "one weir" or "one rectangular opening". If you use several outlets at once, or a riser, a circular pipe or a stage-dependent coefficient table, routing still works, but constrained screening is locked and the result is for research inspection only.'], steps: [
  { t: 'Add a rectangular opening to make a combined outlet', act: async p => { await fresh(p); await evidence(p); await open(p, 'mod-outlet'); await setv(p, 'oriOn', true); },
    fig: { file: 'g10_01_combo', box: '#mod-outlet', marks: [M('#weirOn', 1, 'Sharp-crested weir (ticked).', { up: 'label' }), M('#oriOn', 2, 'Rectangular opening (newly ticked).', { up: 'label' }), M('#ao', 3, 'Opening area Ao.'), M('#invert', 4, 'Opening invert elevation.')], opt: { focus: true, maxH: 560 }, cap: 'Combined outlet: weir plus rectangular opening' },
    do: ['Reload the page and complete the free-discharge ticks and the two records as in Chapter 8.', 'In Module 3, tick "Rectangular opening" in addition to the sharp-crested weir.'], see: ['Fields for the rectangular opening appear: discharge coefficient Cd, opening area Ao, opening height and invert elevation.'], fix: [] },
  { t: 'Routing still runs', act: async p => { await run(p); V.c10 = await met(p); }, do: ['In Module 4, press "Run routing and evaluation".'], see: [() => `Routing completes normally: Qp,o = ${V.c10.qpo}, Hmax = ${V.c10.hmax}. You can read the result, but the outflow is the sum of the weir and the opening.`], fix: [] },
  { t: 'Constrained screening is locked', act: async p => { await open(p, 'mod-optimization'); V.c10lock = await p.evaluate(() => { const b = document.getElementById('optimize'); return b.disabled; }); },
    fig: { file: 'g10_02_lock', box: '#mod-optimization', marks: [M('#optimize', 1, 'The "Run constrained design screening" button is locked.'), MT('This outlet type is not eligible for formal constrained design screening', 2, 'Reason for the lock and "Go to fix".', '#mod-optimization')], opt: { focus: true, maxH: 340 }, cap: 'Constrained screening is locked for a combined outlet' },
    do: ['In Module 5, scroll down to the "Run constrained design screening" button.'],
    see: [() => (V.c10lock ? 'The button is grey, and a message ' : 'A message below the button ') + 'says "This outlet type is not eligible for formal constrained design screening; use one passive weir or one rectangular opening", with "Go to fix".', 'You can also ask the AI assistant "Why is screening locked?" and it lists the reasons.'], fix: [] },
  { t: 'Return to a single outlet', act: async p => { await open(p, 'mod-outlet'); await setv(p, 'oriOn', false); }, do: ['In Module 3, untick "Rectangular opening".'], see: ['The lock reason disappears, and constrained screening can run again.'], fix: [] }
] });

CH.push({ id: 'c11', t: 'Chapter 11  Advanced continuous optimization (optional)', intro: ['The constrained screening in Chapter 8 tries values on a fixed grid. Advanced continuous optimization searches continuous ranges of the area A and the weir width b. It considers two objectives at once (detention volume and water level) and lists a set of trade-off alternatives (Pareto alternatives).'], steps: [
  { t: 'Run advanced continuous optimization', act: async p => { await fresh(p); await evidence(p); await run(p); await open(p, 'mod-optimization'); await click(p, 'continuousGlobal'); for (let i = 0; i < 60; i++) { await wait(p, 1000); if (/evaluated \d[\d,]* candidates/.test(await text(p, '#optout'))) break; } V.c11 = (await text(p, '#optout')).split('\n').find(l => /evaluated \d[\d,]* candidates/.test(l)) || ''; },
    fig: { file: 'g11_01_pareto', box: '#optout', marks: [MT('The authoritative RK4 routing core evaluated', 1, 'Search summary.', '#optout'), M('#optout table', 2, 'Table of Pareto alternatives.')], opt: { maxH: 640 }, cap: 'Pareto alternatives from advanced continuous optimization' },
    do: ['Complete the free-discharge ticks, the two records and one routing run as in Chapter 8.', 'In Module 5, press "Advanced continuous optimization | global candidate search + local refinement" and wait about 20 seconds.'],
    see: [() => `The result says: "${V.c11.trim()}"`, 'Each row of the table is one feasible alternative: area, weir width, ΔSmax, Hmax, Qmax and the margin left to each limit. No alternative is best for every objective. The designer must choose based on engineering judgement.'],
    fix: ['This is still not a proven global optimum and not a final engineering design.'] }
] });

CH.push({ id: 'c12', t: 'Chapter 12  Cross-checking with external models (optional)', intro: ['If you use HEC-HMS or SWMM, you can build a model with the same inflow, storage relation and outlet, and import its results into PondGate for comparison. This is a cross-check of the numerical implementation, not a field validation.'], steps: [
  { t: 'Get to know the cross-check area', act: async p => { await fresh(p); await run(p); await open(p, 'mod-evaluation'); },
    fig: { file: 'g12_01_cross', box: '#mod-evaluation', marks: [M('#crossReference', 1, 'PondGate reference hydrograph.'), M('#crossSource', 2, 'External model: HEC-HMS or SWMM.'), M('#crossFile', 3, 'Import the external model result CSV.'), M('#crossRun', 4, 'The "Compare external result" button.'), M('#crossCsvTemplate', 5, 'Download the CSV template (column names only).')], opt: { focus: true, maxH: 900 }, cap: 'External model cross-check area' },
    do: ['Run the routing once. On the "Results, verification and records" page, scroll down to the external model cross-check.'],
    see: ['For the "PondGate reference hydrograph" you can choose the current interactive routing result or one of the four public benchmark cases A-005 to D-005.', 'The first row of the CSV must hold the column names. It needs at least time_s (seconds) and outflow_m3_s (m³/s); a full comparison also needs incremental_storage_m3. Press the button to download the external result CSV template to see the format.', 'After importing the actual output file of the external model, press "Compare external result".'],
    fix: ['Do not import an inflow file, a model setup file or an output file of PondGate itself.'] },
  { t: 'Look at a completed three-engine comparison', act: async p => { await open(p, 'qualityAssurance'); await shot(p, 'g12_02_ew1', '#ew1A005Benchmark', [M('#ew1A005Run', 1, 'The "Run E‑W1 A‑005 benchmark RK4" button.')], { focus: true, maxH: 360 }); await click(p, 'ew1A005Run'); for (let i = 0; i < 30; i++) { await wait(p, 500); if (/run complete/i.test(await text(p, '#ew1A005Benchmark'))) break; } await wait(p, 600); V.c12 = ((await text(p, '#ew1A005Export')).split('\n').find(l => /Benchmark run complete/i.test(l)) || '').trim(); },
    figDone: { file: 'g12_02_ew1', cap: 'E‑W1 A‑005 benchmark case', notes: ['The "Run E‑W1 A‑005 benchmark RK4" button.'] },
    figExtra: async p => { V.c12page = await p.evaluate(() => window.DSSWorkspacePages.active()); await open(p, 'mod-evaluation'); await wait(p, 300); await shot(p, 'g12_03_ew1res', '#ew1A005Export', [M('#ew1A005Download', 1, 'Export the comparison results CSV.')], { maxH: 700 }); },
    figExtraDone: { file: 'g12_03_ew1res', cap: 'E‑W1 A‑005 comparison results (Results, verification and records page)', notes: ['Export the comparison results CSV.'] },
    do: ['In the tab bar, press "Teaching and internal tests" and find "E‑W1 A‑005 external cross-check benchmark".', 'Press "Run E‑W1 A‑005 benchmark RK4".'],
    see: [() => `${V.c12page === 'evidence' ? 'The page switches to "Results, verification and records". ' : ''}${V.c12 ? `"E‑W1 A‑005 comparison results" shows "${V.c12}". ` : '"E‑W1 A‑005 comparison results" shows the result of this run. '}This public case keeps stored results from EPA SWMM 5.2.4 and HEC‑HMS 4.13, so you can compare three engines on the same case.`, 'This case is a numerical verification case used in the research paper. It is not an engineering design case.'], fix: [] }
] });

CH.push({ id: 'c13', t: 'Chapter 13  Guided lessons, teaching case and glossary', intro: ['PondGate has 7 built-in guided lessons. A lesson shows its steps at the top right of the screen and ticks each step automatically when you finish it.'], steps: [
  { t: 'Open the list of guided lessons', act: async p => { await fresh(p); await open(p, 'helpCenter'); await p.click('[data-hc-tab="lessons"]'); await wait(p, 300); },
    fig: { file: 'g13_01_lessons', box: '#helpCenter', marks: [M('[data-hc-tab="lessons"]', 1, 'The "Guided lessons" tab.'), M('#hcLessons', 2, 'Seven lessons. Press "Start" to begin one.')], opt: { maxH: 760 }, cap: 'List of guided lessons' },
    do: ['On the "Start here" page, press the "Guided lessons" tab.'], see: ['Lessons 1 to 7 are listed, each with a goal and a "Start" button. Finished lessons show "Done".'], fix: [] },
  { t: 'Do one lesson', act: async p => { await p.evaluate(() => window.PondGateLessons.begin('L2')); await wait(p, 800); },
    fig: { file: 'g13_02_panel', box: '#lessonPanel', marks: [M('.ls-bar', 1, 'Progress bar.'), M('#lessonPanel .ls-b .ls-acts', 2, 'Buttons such as "Take me there" and "Show me this step".'), M('#lessonPanel [data-ls=next]', 3, 'Next step.')], cap: 'Lesson panel' },
    do: ['Press "Start" for lesson 2. The software asks whether to load the lesson inputs for now. Press "OK".', 'Follow the panel. If you are not sure, press "Take me there" to jump to the field, or "Show me this step" to let the software do it.'],
    see: ['A lesson panel appears at the top right and shows the current step. When you do it right, the step turns green and the lesson moves on.', 'At the end of the lesson you can restore your original inputs.'], fix: [] },
  { t: 'Use the glossary', act: async p => { await p.evaluate(() => window.PondGateLessons.end && window.PondGateLessons.end()); await open(p, 'helpCenter'); await p.click('[data-hc-tab="glossary"]'); await p.fill('#hcGlossFilter', 'free discharge'); await wait(p, 300); },
    fig: { file: 'g13_03_glossary', box: '#helpCenter', marks: [M('#hcGlossFilter', 1, 'Type a term to search.'), M('#hcGlossList', 2, 'Search results. Press "Show field" to jump to the field.')], opt: { maxH: 560 }, cap: 'Glossary' },
    do: ['Press the "Glossary" tab and type "free discharge" in the search box.'], see: ['Related terms and explanations are listed. Press "Show field" to jump to that field.'], fix: [] },
  { t: 'Teaching case (Teaching and internal tests page)', act: async p => { await open(p, 'teachingAssistant'); },
    fig: { file: 'g13_04_teach', box: '#teachingAssistant', marks: [M('#teachDemo', 1, 'Load a teaching case that can run constrained screening (the current case is saved first).'), M('#teachRestore', 2, 'Restore the previous case.')], opt: { maxH: 520 }, cap: 'Teaching assistant area' },
    do: ['In the tab bar, press "Teaching and internal tests" and find the teaching assistant (four self-study steps and instant checks).', 'Press the button that loads the teaching case for constrained screening. The software first saves your current inputs, then loads teaching data that can run constrained screening at once. When you finish, press the button that restores the previous case.'],
    see: ['Below are four learning steps and quick self-check questions, each taking about 30 seconds.'], fix: [] }
] });

/* ---------- exercises with answers read from the software ---------- */
const EX = [
  { q: 'In the demonstration case, change only the peak inflow Qp to 0.15. What are the peak water level Hmax and the peak ratio RQ?', run: async p => { await fresh(p); await setv(p, 'qp', '0.15'); await run(p); const m = await met(p); return `Hmax = ${m.hmax}, RQ = ${m.rq}. A larger inflow raises the water level.`; } },
  { q: 'In the demonstration case, change only the plan area A to 360 m². What is the peak outflow Qp,o, and how does it compare with the demonstration case?', run: async p => { await fresh(p); await setv(p, 'area', '360'); await run(p); const m = await met(p); return `Qp,o = ${m.qpo}, lower than ${V.m3.qpo} in the demonstration case. A larger pond reduces the peak more.`; } },
  { q: 'In the demonstration case, change only the weir width b to 0.10 m. What is the peak water level Hmax? Does it exceed the allowable level of 1.00 m?', run: async p => { await fresh(p); await setv(p, 'bw', '0.10'); await run(p); const m = await met(p); return `Hmax = ${m.hmax}, which ${parseFloat(m.hmax) > 1 ? 'exceeds' : 'does not exceed'} 1.00 m. A narrower outlet raises the water level.`; } },
  { q: 'After completing the free-discharge settings as in Chapter 8, change the allowable outflow Qallow to 0.060 and run constrained design screening. Is there a feasible case? What pond area and weir width are selected?', run: async p => { await fresh(p); await evidence(p); await run(p); await setv(p, 'qallow', '0.060'); await screen(p); const o = (await text(p, '#optout')).trim(); if (/^No feasible/.test(o)) return 'No feasible case (Blocked): ' + o.split('\n')[0]; const rows = await optRows(p); const g = k => (rows.find(r => r[0].includes(k)) || [])[1]; return `Yes. Pond area A = ${g('Plan area')}, weir width b = ${g('Weir width')}, peak outflow / allowable = ${g('Peak outflow')}. A stricter limit needs a larger pond.`; } },
  { q: 'When the screening result is "Blocked", may you raise Qallow until a feasible case appears? Why?', ans: 'No. Qallow and Hallow come from regulations or design criteria and stand for the safety limits of the downstream system and the pond. Change the pond area, the outlet size or the search range only on an engineering basis.' },
  { q: 'Why should you always read the mass-balance residual ε/Vin first?', ans: 'It checks whether water is conserved during the calculation. If it is clearly not 0, the calculation has a problem and none of the other numbers can be trusted.' }
];

/* ---------- appendix tables ---------- */
function appendixB() {
  return [['Message (shown above the run button)', 'Cause', 'How to fix it'],
    ['Peak inflow Qp must be greater than 0', 'Qp is 0, negative or empty', 'Enter a discharge greater than 0 (m³/s)'],
    ['Initial level H0 must not be below the floor elevation Hfloor', 'H0 is lower than Hfloor', 'Set H0 equal to or above Hfloor'],
    ['Initial water level and reference level Href must lie within the declared stage-storage table range', 'The highest level in the S(H) table is too low', 'Extend the table to a higher level, or change H0 or Href'],
    ['The stage–storage table must start at storage 0 …', 'The first row is not 0, 0; there is a header row; values do not increase row by row', 'Delete the header row and check that the values increase'],
    ['Routed water level exceeds the declared stage–storage table range', 'The event level rises above the top of the table', 'Extend the S(H) table'],
    ['An imported inflow hydrograph needs at least two "time, discharge" pairs …', 'The custom hydrograph has a format error', 'Each row is "time (min), discharge", with time starting at 0 and increasing'],
    ['This outlet type is not eligible for formal constrained design screening', 'A combined outlet, riser, circular pipe or coefficient table is used', 'Return to one weir or one rectangular opening, or use the result for research inspection only'],
    ['Blocked: four free-discharge evidence checks', 'The free-discharge ticks or the two records are not complete', 'Complete the ticks and records as in Chapter 8'],
    ['No feasible screening case was found …', 'The limits are too strict or the search range is too small', 'Adjust on an engineering basis; never relax the limits arbitrarily']];
}
const CHECKLIST = ['I can say what PondGate can and cannot do (Chapter 1)', 'I can find the tabs, the language button, the help button and the work area (Chapter 2)', 'I can run the demonstration case and read ε/Vin, Qp,o, RQ, ΔSmax and Hmax (Chapter 3)', 'I can download the traceable record (Chapter 3)', 'I can change one condition at a time and compare the results (Chapter 4)', 'I can enter a stage–storage table and know that a table that is too short stops the run (Chapter 5)', 'I can explain why volume-based timing measures are used for broad, flat peaks (Chapter 6)', 'I can fix wrong inputs from the list (Chapter 7)', 'I can complete the free-discharge settings and run constrained design screening (Chapter 8)', 'I can read "Blocked" and say how to respond correctly (Chapter 9)', 'I can name the outlet settings that lock constrained screening (Chapter 10)'];

/* ---------- build ---------- */
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, acceptDownloads: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await fresh(p);
  for (const ch of CH) {
    for (const st of ch.steps) {
      await st.act(p); await wait(p, 200);
      if (await p.evaluate(() => document.documentElement.lang) !== 'en') throw new Error('interface left English at ' + ch.id + ' ' + st.t);
      if (st.fig) { await shot(p, st.fig.file, st.fig.box, st.fig.marks, st.fig.opt || {}); }
      if (st.figExtra) await st.figExtra(p);
      console.log('done', ch.id, st.t);
    }
  }
  for (const e of EX) if (e.run) { e.ans = await e.run(p); console.log('exercise', e.ans); }
  await b.close();

  // resolve text
  const R = x => typeof x === 'function' ? x() : x;
  const data = { version: VERSION, lang: 'en', title: 'PondGate full step-by-step guide (student edition)', chapters: [] };
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
  data.glossary = helpContent.GLOSSARY.map(g => [g[2], g[4]]);
  data.errors = appendixB(); data.checklist = CHECKLIST; data.exercises = EX.map(e => [e.q, e.ans]);
  fs.writeFileSync(path.join(ROOT, 'dist', 'student-guide-en.js'), `/* Generated by docs/build_student_guide_en.js from a real run of PondGate (English interface) ${VERSION}. Do not edit by hand. */\nwindow.PondGateStudentGuideEn = ${JSON.stringify(data)};\n`);

  // Markdown copy for the repository
  const md = [`# ${data.title}`, '', `PondGate v${VERSION}. This guide was produced by \`docs/build_student_guide_en.js\`, which operated the English interface of the software step by step; all values and screenshots come from that run.`, ''];
  for (const c of data.chapters) {
    md.push(`## ${c.t}`, ''); c.intro.forEach(x => md.push(x, ''));
    c.extra.forEach(([h, x]) => md.push(`### ${h}`, '', x, ''));
    for (const s of c.steps) {
      md.push(`### Step ${s.n}  ${s.t}`, '', '**What to do**', ''); s.do.forEach((x, k) => md.push(`${k + 1}. ${x}`)); md.push('');
      md.push('**What you should see**', ''); s.see.forEach(x => md.push(`- ${x}`)); md.push('');
      if (s.fix.length) { md.push('**If it looks different**', ''); s.fix.forEach(x => md.push(`- ${x}`)); md.push(''); }
      if (s.table) { md.push(s.tableTitle, '', '| ' + s.table[0].join(' | ') + ' |', '|' + s.table[0].map(() => ' --- |').join(''), ...s.table.slice(1).map(r => '| ' + r.join(' | ') + ' |'), ''); }
      for (const f of s.figs) { md.push(`![Figure ${f.n}](../dist/manual/guide_en/${f.file}.png)`, '', `Figure ${f.n}: ${f.cap}`, ''); f.notes.forEach(([n, l]) => md.push(`${n}. ${l}`)); md.push(''); }
    }
  }
  md.push('## Appendix A  Glossary', '', '| Term | Meaning |', '| --- | --- |', ...data.glossary.map(([a, b]) => `| ${a} | ${b} |`), '');
  md.push('## Appendix B  Error messages and fixes', '', 'Table B-1  Common error messages', '', '| ' + data.errors[0].join(' | ') + ' |', '| --- | --- | --- |', ...data.errors.slice(1).map(r => '| ' + r.join(' | ') + ' |'), '');
  md.push('## Appendix C  Student checklist', '', ...data.checklist.map(x => `- [ ] ${x}`), '');
  md.push('## Appendix D  Exercises and answers', ''); data.exercises.forEach(([q, a], i) => md.push(`${i + 1}. ${q}`, `   - Answer: ${a}`)); md.push('');
  fs.writeFileSync(path.join(ROOT, 'docs', 'STUDENT_GUIDE_en.md'), md.join('\n'));
  console.log('figures', figNo, 'chapters', data.chapters.length, 'steps', data.chapters.reduce((a, c) => a + c.steps.length, 0));
})();
