// v1.3.1 checks for the ChatGPT novice-test findings (book follow-along test, 3.5/5).
// Usage: node audit/book_v1_3_1/fix_check.js <port serving dist/> <out.json>
// Each fix has a positive check and a negative control that must behave differently.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const port = process.argv[2] || 8765; const OUT = process.argv[3] || path.join(__dirname, 'fix_check_v1_3_1.json');
const ROOT = path.join(__dirname, '..', '..');
const FREE = ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'];
const res = []; const ok = (id, pass, detail) => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, JSON.stringify(detail)); };
async function setv(p, id, v) { await p.evaluate(([id, v]) => { const e = document.getElementById(id); if (typeof v === 'boolean') e.checked = v; else e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await p.waitForTimeout(60); }
const run = async p => { await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(2500); };
const screen = async p => { await p.evaluate(() => document.getElementById('optimize').click()); await p.waitForTimeout(4000); };
const st = p => p.evaluate(() => ({ stale: window.PondGateHelp.runState().changedAfterRun, staleTxt: document.body.innerText.includes('輸入已改變'),
  diag: ((document.getElementById('diagnosticGuide') || {}).innerText || '').match(/受限篩選完成|尚未執行受限篩選或連續最佳化/)?.[0] || '' }));
const metrics = p => p.evaluate(() => { const o = {}; document.querySelectorAll('#metricbody tr').forEach(r => { o[r.cells[0].innerText.trim()] = r.cells[1].innerText.trim(); }); return o; });
async function fresh(b) { const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('dialog', d => d.accept()); await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1800); return p; }
async function evidence(p) { for (const id of FREE) await setv(p, id, true); await setv(p, 'freeEvidenceRecord', '教學假設'); await setv(p, 'screeningLimitRecord', '教學假設'); }
(async () => {
  const b = await chromium.launch();
  // F1 evidence after a run must not mark the routing result stale
  let p = await fresh(b); await run(p); await evidence(p); let s = await st(p);
  ok('F1 evidence after run keeps result current', !s.stale && !s.staleTxt, s);
  await setv(p, 'bw', 0.10); s = await st(p);
  ok('F1-neg changing weir width marks result stale', s.stale && s.staleTxt, s);
  await p.close();
  // F2 screening then typing in the assistant / book search must keep the screening state
  p = await fresh(b); await evidence(p); await run(p); await screen(p); let s0 = await st(p);
  await p.evaluate(() => { window.PondGateHelp.open(); for (const id of ['hcInput', 'bkSearch']) { const e = document.getElementById(id); if (e) { e.value = '孔口'; e.dispatchEvent(new Event('input', { bubbles: true })); } } });
  await p.waitForTimeout(400); s = await st(p);
  ok('F2 typing in assistant keeps screening state', s0.diag === '受限篩選完成' && s.diag === '受限篩選完成' && !s.staleTxt, { before: s0, after: s });
  await setv(p, 'qallow', 0.070); await p.waitForTimeout(200); s = await st(p);
  ok('F2-neg changing Qallow resets screening state', s.diag === '尚未執行受限篩選或連續最佳化', s);
  await p.close();
  // F3 back to base case
  p = await fresh(b); await setv(p, 'case', 'long'); await setv(p, 'bw', 0.10); await setv(p, 'area', 120); await run(p);
  const changed = await metrics(p);
  ok('F3-neg modified inputs give different numbers', changed['出流尖峰 Qp,o'] !== '0.0903 m³/s', changed['出流尖峰 Qp,o']);
  await p.evaluate(() => { window.DSSWorkspacePages.openTarget('helpCenter'); });
  const r = await p.evaluate(() => window.PondGateBook.resetToBase()); await run(p); const m = await metrics(p);
  const vals = await p.evaluate(() => ({ area: document.getElementById('area').value, bw: document.getElementById('bw').value, case: document.getElementById('case').value, qallow: document.getElementById('qallow').value }));
  ok('F3 reset to base case reproduces chapter 4 numbers', r && m['出流尖峰 Qp,o'] === '0.0903 m³/s' && m['最大水位 Hmax'] === '0.413 m' && m['入流尖峰 Qp,i'] === '0.1200 m³/s' && m['質量平衡殘差 ε/Vin'] === '0.000 %', { m, vals });
  // F3b assistant answers reset question
  const a = await p.evaluate(() => window.PondGateHelp.answer('怎麼回到基本案例'));
  ok('F3b assistant explains reset', /回到基本案例/.test(a.text || '') && /重新整理/.test(a.text || ''), (a.text || '').slice(0, 80));
  await p.close();
  // F4 download feedback
  p = await fresh(b);
  await p.evaluate(() => { window.DSSWorkspacePages.openTarget('helpCenter'); });
  await p.evaluate(() => { const t = [...document.querySelectorAll('button,[role=tab]')].find(x => /工具書/.test(x.textContent)); t && t.click(); }); await p.waitForTimeout(400);
  const before = await p.evaluate(() => (document.getElementById('bkMsg') || {}).textContent);
  ok('F4-neg no message before clicking', before === '', before);
  const dl = p.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await p.click('#bkPdf'); const d = await dl; await p.waitForTimeout(300);
  const after = await p.evaluate(() => (document.getElementById('bkMsg') || {}).textContent);
  ok('F4 PDF click shows message and downloads', /已開始下載 PDF/.test(after) && d && /PondGate_book_v1\.3\.1_zh-Hant\.pdf$/.test(d.suggestedFilename()), { after, file: d && d.suggestedFilename() });
  await p.close();
  // F5 book text
  const src = fs.readdirSync(path.join(ROOT, 'docs/book')).filter(f => f.endsWith('.md')).map(f => fs.readFileSync(path.join(ROOT, 'docs/book', f), 'utf8')).join('\n');
  const bad = t => (t.match(/按「執行」/g) || []).length;
  ok('F5 no bare "按「執行」" in the book', bad(src) === 0, bad(src));
  ok('F5-neg detector catches an injected bare 執行', bad(src + '\n請按「執行」。') === 1, 1);
  const ch4 = src.slice(src.indexOf('## 第 4 章'), src.indexOf('## 第 5 章'));
  ok('F5b chapter 4 lists expected numbers', ['0.1200 m³/s', '0.0903 m³/s', '0.413 m', '0.000 %', '不夠用', '0.080'].every(x => ch4.includes(x)), true);
  const data = fs.readFileSync(path.join(ROOT, 'dist/book-data.js'), 'utf8');
  ok('F5c built book-data matches sources (v1.3.1, ch4 table, reset button text)', data.includes('"1.3.1"') && data.includes('表 4-1') && data.includes('回到基本案例') && !/按「執行」/.test(data), true);
  // F6 core files untouched
  const h = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'dist', f))).digest('hex').slice(0, 8);
  const core = { 'routing-core.js': h('routing-core.js'), 'physics-refinement.js': h('physics-refinement.js'), 'module-shell.js': h('module-shell.js') };
  ok('F6 core files unchanged', core['routing-core.js'] === 'f8b7c450' && core['physics-refinement.js'] === '54a882a7' && core['module-shell.js'] === '337e2da0', core);
  await b.close();
  const pass = res.every(x => x.pass); fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), pass, results: res }, null, 1));
  console.log('RESULT', pass ? 'PASS' : 'FAIL', res.filter(x => x.pass).length + '/' + res.length);
})();
