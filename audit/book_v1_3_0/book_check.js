// v1.3.0 checks: the book tab, its downloads, offline book search in the assistant,
// the drain-down row of the beginner check, the blocked-screening wording, and unchanged core files.
// Usage: node audit/book_v1_3_0/book_check.js <port v1.3.0> <port v1.0.2> <out.json>
// Positive checks must pass on v1.3.0; each negative control must fail where it says.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const [port, basePort, out] = process.argv.slice(2); const ROOT = path.join(__dirname, '..', '..');
const R = []; const ok = (id, pass, what, info = '') => { R.push({ id, pass: !!pass, what, info: String(info).slice(0, 200) }); console.log((pass ? 'PASS ' : 'FAIL ') + id + ' ' + what + ' ' + String(info).slice(0, 120)); };
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
async function page(b, p) { const pg = await b.newPage({ viewport: { width: 1280, height: 900 } }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.goto(`http://localhost:${p}/index.html`); await pg.waitForTimeout(1800); return pg; }
const set = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); if (typeof v === 'boolean') e.checked = v; else e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
(async () => {
  const b = await chromium.launch(); const p = await page(b, port);
  // B1 book tab
  const b1 = await p.evaluate(() => { window.DSSWorkspacePages.openTarget('helpCenter'); const t = document.querySelector('[data-hc-tab="book"]'); if (!t) return null; t.click(); return { toc: document.querySelectorAll('.bk-toc button').length, view: (document.getElementById('bkView') || {}).innerText || '' }; });
  ok('B1', b1 && b1.toc >= 25 && /序/.test(b1.view), 'Start here has a Book tab with the full table of contents', b1 && b1.toc);
  // B2 every chapter opens and every figure loads
  const chapters = await p.evaluate(() => window.PondGateBook.chapters());
  let badFig = [], badCh = [];
  for (const c of chapters) {
    await p.evaluate(id => window.PondGateBook.open(id), c.id); await p.waitForTimeout(150);
    const r = await p.evaluate(async () => { const v = document.getElementById('bkView'); const imgs = [...v.querySelectorAll('img')]; imgs.forEach(i => { i.loading = 'eager'; }); await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 3000); }))); return { h2: (v.querySelector('h2') || {}).innerText || '', bad: imgs.filter(i => !i.naturalWidth).map(i => i.getAttribute('src')) }; });
    if (r.h2 !== c.title) badCh.push(c.title); badFig = badFig.concat(r.bad);
  }
  ok('B2', chapters.length >= 25 && !badCh.length && !badFig.length, 'every chapter opens with its own heading and every figure loads', `${chapters.length} chapters; bad ${badCh.concat(badFig).join(',')}`);
  // B3 downloads exist
  const dl = await p.evaluate(async () => { const r = []; for (const a of ['#bkPdf', '#bkZip']) { window.PondGateBook.open('bk-c1'); const el = document.querySelector(a); const res = await fetch(el.getAttribute('href')); const buf = await res.arrayBuffer(); const h = new Uint8Array(buf.slice(0, 4)); r.push({ a, status: res.status, size: buf.byteLength, magic: String.fromCharCode(...h) }); } return r; });
  ok('B3', dl[0].status === 200 && dl[0].magic === '%PDF' && dl[0].size > 500000 && dl[1].status === 200 && dl[1].magic.startsWith('PK') && dl[1].size > 5000, 'PDF and example ZIP download links serve real files', JSON.stringify(dl));
  // B4 single-page HTML contains every chapter and embedded figures
  const doc = await p.evaluate(() => window.PondGateBook.documentHtml());
  const missingTitles = chapters.filter(c => !doc.includes(c.title)).map(c => c.title);
  ok('B4', !missingTitles.length && (doc.match(/src="data:image\/png;base64/g) || []).length >= 15 && !/data-bk-src/.test(doc), 'single-page HTML holds every chapter with all figures embedded', `missing ${missingTitles.length}; images ${(doc.match(/src="data:image/g) || []).length}`);
  // B5 assistant finds the book section and opens it
  const a5 = await p.evaluate(() => window.PondGateHelp.answer('孔口公式怎麼算'));
  const act = (a5.actions || []).find(x => x[0].startsWith('book:'));
  let opened = '';
  if (act) { await p.evaluate(t => document.querySelector('.hc-btn') && window.PondGateBook && (window.PondGateHelp && 0, null), null); await p.evaluate(t => { const btn = document.createElement('button'); btn.dataset.hcGo = t; btn.className = 'hc-btn'; document.getElementById('helpCenter').appendChild(btn); btn.click(); btn.remove(); }, act[0]); await p.waitForTimeout(400); opened = await p.evaluate(id => (document.getElementById(id) || {}).innerText || '', act[0].slice(5)); }
  ok('B5', act && /矩形開口/.test(act[1]) && /矩形開口/.test(opened), 'assistant answers "孔口公式怎麼算" with the book section and the button opens it', act && act[1] + ' -> ' + opened);
  // B5n gibberish gets no book section
  const a5n = await p.evaluate(() => window.PondGateHelp.answer('zxqv wplk'));
  ok('B5n', !(a5n.actions || []).some(x => x[0].startsWith('book:')), 'negative control: a meaningless question gets no book section', JSON.stringify(a5n.actions));
  // B6 assistant answer adds book links to a term question
  const a6 = await p.evaluate(() => window.PondGateHelp.answer('RK4 是什麼'));
  ok('B6', (a6.terms || []).length && (a6.actions || []).some(x => x[0].startsWith('book:')), 'a term question returns the definition plus a book link', JSON.stringify(a6.actions));
  // B7 every number the book quotes from a run is the number the run produced (examples.json)
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'book', 'examples.json'), 'utf8')).examples;
  const text = fs.readFileSync(path.join(ROOT, 'dist', 'book-data.js'), 'utf8');
  const need = ex.filter(e => e.ch !== 'C' && !/^(demo_limits|screen_block|screen_ok|screen_area)$/.test(e.id)).flatMap(e => [e.metrics['出流尖峰 Qp,o'], e.metrics['最大水位 Hmax']].map(v => v.split(' ')[0]));
  const miss = need.filter(v => !text.includes(v));
  ok('B7', need.length >= 20 && !miss.length, 'every Qp,o and Hmax of the Part II runs appears in the book text', `${need.length} numbers; missing ${miss}`);
  const fake = '0.0913'; ok('B7n', !text.includes(fake), 'negative control: a wrong peak (0.0913) does not appear in the book', fake);
  // B8 beginner check shows the drain-down row
  const p8 = await page(b, port); await set(p8, 'weirOn', false); await set(p8, 'oriOn', true); await p8.evaluate(() => document.getElementById('run').click()); await p8.waitForTimeout(2500);
  const v8 = await p8.evaluate(() => document.getElementById('pgVerdict').innerText);
  ok('B8', /排空殘留（Te \+ Td）\s*5\.41 %/.test(v8) && /不夠用/.test(v8), 'beginner check flags the 5.41 % drain-down residual of the 0.010 m² opening', v8.split('\n')[2]);
  await set(p8, 'weirOn', true); await set(p8, 'oriOn', false); await p8.evaluate(() => document.getElementById('run').click()); await p8.waitForTimeout(2500);
  const v8n = await p8.evaluate(() => document.getElementById('pgVerdict').innerText);
  ok('B8n', /排空殘留（Te \+ Td）\s*0\.03 %\s*容許 1\.00 %\s*未超過/.test(v8n), 'negative control: the weir case residual 0.03 % is shown as within the limit', v8n.split('\n').find(l => /排空/.test(l)));
  // B9 blocked screening no longer says "not yet run"
  const p9 = await page(b, port);
  for (const id of ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation']) await set(p9, id, true);
  await set(p9, 'freeEvidenceRecord', '教學假設'); await set(p9, 'screeningLimitRecord', '教學假設'); await set(p9, 'qallow', '0.040'); await set(p9, 'hallow', '0.30');
  await p9.evaluate(() => document.getElementById('run').click()); await p9.waitForTimeout(2200);
  const pre = await p9.evaluate(() => document.querySelector('.diagnostic-guide .three-step').innerText);
  await p9.evaluate(() => document.getElementById('optimize').click());
  for (let i = 0; i < 60; i++) { await p9.waitForTimeout(500); if (/^阻擋/.test(await p9.evaluate(() => document.getElementById('optout').innerText.trim()))) break; }
  await p9.waitForTimeout(800);
  const g9 = await p9.evaluate(() => document.querySelector('.diagnostic-guide .three-step').innerText);
  ok('B9', /阻擋/.test(g9) && /受限篩選已執行，沒有任何候選同時符合限制/.test(g9) && !/受限篩選尚未執行/.test(g9), 'after a blocked screening, the condition rows say screening ran with no feasible candidate', g9.replace(/\s+/g, ' ').slice(0, 120));
  ok('B9n', /受限篩選尚未執行/.test(pre), 'negative control: before screening, the rows still say screening has not run', pre.replace(/\s+/g, ' ').slice(0, 80));
  // B10 negative control on v1.0.2: no book
  const q = await page(b, basePort);
  const n10 = await q.evaluate(() => ({ tab: !!document.querySelector('[data-hc-tab="book"]'), api: !!window.PondGateBook }));
  ok('B10n', !n10.tab && !n10.api, 'negative control: v1.0.2 has no book tab or book search (the checks above can fail)', JSON.stringify(n10));
  // B11 core files unchanged
  const core = { 'dist/routing-core.js': 'f8b7c450', 'dist/physics-refinement.js': '54a882a7', 'dist/module-shell.js': '337e2da0' };
  const bad = Object.entries(core).filter(([f, h]) => !sha(f).startsWith(h));
  ok('B11', !bad.length, 'RK4 core files are byte-identical to v1.0.2', bad.map(x => x[0]).join(',') || 'routing-core, physics-refinement, module-shell');
  ok('B12', !p.errs.length && !p8.errs.length && !p9.errs.length, 'no page errors during the checks', p.errs.concat(p8.errs, p9.errs).join(' | '));
  await b.close();
  const pass = R.filter(r => r.pass).length; console.log(`${pass}/${R.length}`);
  if (out) fs.writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), pass, total: R.length, results: R }, null, 1));
  process.exit(pass === R.length ? 0 : 1);
})();
