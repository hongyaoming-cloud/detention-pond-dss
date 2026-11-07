// Runs every Part II example in PondGate exactly as a reader would, and records what the screen shows.
// Usage: serve dist/ on a port, then: node docs/book/run_examples.js <port>
// Outputs: docs/book/examples.json (inputs + numbers read from the result table),
//          dist/book/fig/*.png (chart screenshots), dist/book/data/*.csv (input files for the ZIP).
// Nothing is computed here; docs/book/check_examples.py recomputes the numbers independently.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const port = process.argv[2] || 8765; const ROOT = path.join(__dirname, '..', '..');
const FIG = path.join(ROOT, 'dist', 'book', 'fig'); const DATA = path.join(ROOT, 'dist', 'book', 'data');
fs.mkdirSync(FIG, { recursive: true }); fs.mkdirSync(DATA, { recursive: true });
const FREE = ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'];
const EVID = '教學假設（僅供練習）：單一出口自由出流，不受尾水、回水、淹沒或操作控制影響。';
const LIMREC = '教學假設（僅供練習）：Qallow 與 Hallow 為本書範例設定值。';
const IRREG = '0, 0\n0.25, 30\n0.50, 80\n0.75, 150\n1.00, 240\n1.50, 420';
const SITE = '0, 0\n10, 0.03\n20, 0.09\n30, 0.21\n40, 0.25\n50, 0.18\n60, 0.12\n80, 0.06\n100, 0.025\n120, 0';
const W = { weirOn: true, oriOn: false }, O = { weirOn: false, oriOn: true };
const EX = [
  { id: 'demo', ch: 10, set: {} },
  { id: 'demo_limits', ch: 10, set: { qallow: 0.080, hallow: 1.00 } },
  { id: 'weir_b010', ch: 14, set: { ...W, bw: 0.10 } },
  { id: 'weir_b040', ch: 14, set: { ...W, bw: 0.40 } },
  { id: 'weir_a120', ch: 14, set: { ...W, area: 120 } },
  { id: 'weir_a360', ch: 14, set: { ...W, area: 360 } },
  { id: 'ori_ao005', ch: 15, set: { ...O, ao: 0.005 } },
  { id: 'ori_ao010', ch: 15, set: { ...O, ao: 0.010 } },
  { id: 'ori_ao020', ch: 15, set: { ...O, ao: 0.020 } },
  { id: 'long', ch: 16, set: { case: 'long' } },
  { id: 'tri_same_vol', ch: 16, set: { tpeak: 96, recess: 96 } },
  { id: 'table_tri', ch: 17, set: { storageMode: 'table', storageTable: IRREG } },
  { id: 'screen_ok', ch: 18, evidence: true, set: { qallow: 0.080, hallow: 1.00 }, screen: true },
  { id: 'screen_area', ch: 18, evidence: true, set: { qallow: 0.080, hallow: 1.00, optObjective: 'area' }, screen: true },
  { id: 'screen_block', ch: 18, evidence: true, set: { qallow: 0.040, hallow: 0.30 }, screen: true },
  { id: 'site_try1', ch: 20, set: { case: 'user', shape: 'custom', points: SITE, area: 300, bw: 0.30, qallow: 0.15, hallow: 0.80 } },
  { id: 'site_try2', ch: 20, set: { case: 'user', shape: 'custom', points: SITE, area: 500, bw: 0.30, qallow: 0.15, hallow: 0.80 } },
  { id: 'site_screen', ch: 20, evidence: true, set: { case: 'user', shape: 'custom', points: SITE, area: 500, bw: 0.30, qallow: 0.15, hallow: 0.80, optBmin: 0.10, optBmax: 0.60 }, screen: true },
  { id: 'ex10_1', ch: 'C', set: { qallow: 0.100, hallow: 1.00 } },
  { id: 'ex14_1_b012', ch: 'C', set: { bw: 0.12 } },
  { id: 'ex14_1_b013', ch: 'C', set: { bw: 0.13 } },
  { id: 'ex15_2', ch: 'C', set: { ...O, ao: 0.010, drainHours: 48 } },
  { id: 'ex16_2', ch: 'C', set: { case: 'long', plateau: 36 } },
  { id: 'ex20_1', ch: 'C', evidence: true, set: { case: 'user', shape: 'custom', points: SITE, area: 500, bw: 0.30, qallow: 0.15, hallow: 0.80, optBmin: 0.10, optBmax: 0.60, optObjective: 'area' }, screen: true },
  { id: 'ex18_2', ch: 'C', evidence: true, set: { qallow: 0.040, hallow: 1.00 }, screen: true },
];
const FIGS = { demo: ['qchart'], weir_b010: ['qchart'], ori_ao010: ['qchart'], long: ['qchart'] }; // only the charts the book shows
const ORDER = ['case', 'shape', 'triMode', 'storageMode'];
async function setv(p, id, v) { await p.evaluate(([id, v]) => { const e = document.getElementById(id); if (!e) throw new Error('no #' + id); if (typeof v === 'boolean') e.checked = v; else e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await p.waitForTimeout(60); }
const cell = p => p.evaluate(() => { const rows = [...document.querySelectorAll('#metricbody tr')].map(r => [...r.cells].map(c => c.innerText.trim())); const o = {}; rows.forEach(r => { o[r[0]] = r[1]; }); return o; });
const inputs = p => p.evaluate(() => { const o = {}; document.querySelectorAll('input,select,textarea').forEach(e => { if (!e.id || /^(hc|cross|lang|acct)/.test(e.id) || e.type === 'file') return; o[e.id] = e.type === 'checkbox' ? e.checked : e.value; }); return o; });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const out = { version: null, generated: new Date().toISOString(), examples: [] };
  for (const ex of EX) {
    await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
    out.version = out.version || await p.evaluate(() => (window.PondGateBook && window.PondGateBook.version) || (window.PondGateHelp && window.PondGateHelp.version) || '');
    const keys = Object.keys(ex.set).sort((a, c) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(c) + 1 || 99));
    for (const k of keys) await setv(p, k, ex.set[k]);
    if (ex.evidence) { for (const id of FREE) await setv(p, id, true); await setv(p, 'freeEvidenceRecord', EVID); await setv(p, 'screeningLimitRecord', LIMREC); }
    await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(2500);
    const rec = { id: ex.id, ch: ex.ch, set: ex.set, evidence: !!ex.evidence, inputs: await inputs(p), metrics: await cell(p),
      verdict: await p.evaluate(() => (document.getElementById('pgVerdict') || {}).innerText || '') };
    await p.evaluate(() => window.DSSWorkspacePages.openTarget('mod-evaluation')); await p.waitForTimeout(400);
    for (const c of (ex.ch === 'C' ? [] : FIGS[ex.id] || [])) { const l = p.locator('#' + c); if (await l.count()) { await l.scrollIntoViewIfNeeded(); await l.screenshot({ path: path.join(FIG, `${ex.id}_${c}.png`) }); } }
    if (ex.screen) {
      await p.evaluate(() => document.getElementById('optimize').click());
      for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); const o = await p.evaluate(() => document.getElementById('optout').innerText.trim()); if (/^(選定可行|阻擋)/.test(o)) break; }
      await p.waitForTimeout(1200);
      rec.screen = await p.evaluate(() => { const rows = [...document.querySelectorAll('#optout tr')].map(r => [...r.cells].map(c => c.innerText.trim())); return { text: document.getElementById('optout').innerText.trim(), rows, guide: (document.querySelector('.diagnostic-guide .three-step') || {}).innerText || '' }; });
      rec.afterScreen = { area: await p.evaluate(() => document.getElementById('area').value), bw: await p.evaluate(() => document.getElementById('bw').value) };
      const l = p.locator('#optout'); if (ex.ch !== 'C' && ['screen_ok', 'site_screen'].includes(ex.id) && await l.count()) await l.screenshot({ path: path.join(FIG, `${ex.id}_optout.png`) });
    }
    out.examples.push(rec); console.log(ex.id, rec.metrics['出流尖峰 Qp,o'], rec.metrics['最大水位 Hmax'], rec.screen ? rec.screen.text.split('\n')[0] : '');
  }
  fs.writeFileSync(path.join(__dirname, 'examples.json'), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(DATA, 'ch17_irregular_stage_storage.csv'), 'H_m, S_m3\n' + IRREG + '\n');
  fs.writeFileSync(path.join(DATA, 'ch20_site_inflow.csv'), 't_min, Q_m3s\n' + SITE + '\n');
  await b.close();
})();
