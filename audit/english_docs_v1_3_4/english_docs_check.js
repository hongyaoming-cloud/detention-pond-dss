// v1.3.4 checks: full English book and full English step-by-step guide are shown in the English UI,
// the Chinese UI still shows the Chinese editions, and downloads/figures resolve.
// Usage: node audit/english_docs_v1_3_4/english_docs_check.js <port serving dist/> <out.json>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const { execFileSync } = require('child_process');
const port = process.argv[2] || 8765; const OUT = process.argv[3] || path.join(__dirname, 'english_docs_check_v1_3_4.json'); const ROOT = path.join(__dirname, '..', '..');
const res = []; const ok = (id, pass, detail) => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, JSON.stringify(detail).slice(0, 300)); };
const CJK = /[㐀-鿿]/;
const pages = f => +execFileSync('pdfinfo', [path.join(ROOT, 'dist', f)]).toString().match(/Pages:\s+(\d+)/)[1];
(async () => {
  // PDFs present and English text
  for (const [f, min] of [['book/PondGate_book_v1.3.4_en.pdf', 50], ['manual/PondGate_student_guide_v1.3.4_en.pdf', 50]]) {
    const n = pages(f); const t = execFileSync('pdftotext', ['-l', '5', path.join(ROOT, 'dist', f), '-']).toString();
    ok(`E1 ${f} has ${min}+ pages and English front pages`, n >= min && /PondGate/.test(t) && !CJK.test(t.replace(/中文/g, '')), { pages: n });
  }
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
  const openTab = async t => { await p.evaluate(() => window.DSSWorkspacePages.openTarget('helpCenter')); await p.waitForTimeout(300); await p.click(`[data-hc-tab="${t}"]`); await p.waitForTimeout(500); };
  // zh first (negative: Chinese UI must keep Chinese editions)
  await openTab('book');
  const zb = await p.evaluate(() => ({ lang: window.PondGateBook.lang, v: window.PondGateBook.version, title: window.PondGateBook.title, pdf: document.getElementById('bkPdf').getAttribute('href'), h: document.querySelector('#bkView h2')?.textContent }));
  ok('E2-neg [zh] book tab still shows the Chinese edition', zb.lang === 'zh-Hant' && CJK.test(zb.title) && !/_en\.pdf/.test(zb.pdf) && CJK.test(zb.h), zb);
  await openTab('guide');
  const zg = await p.evaluate(() => ({ pdf: document.getElementById('hcGuidePdf')?.getAttribute('href'), t: document.querySelector('[data-hc-pane="guide"] .hc-man')?.innerText.slice(0, 200), img: document.querySelector('[data-hc-pane="guide"] img')?.getAttribute('src') }));
  ok('E3-neg [zh] guide tab still shows the Chinese guide and zh PDF', /zh-Hant\.pdf$/.test(zg.pdf) && CJK.test(zg.t) && !/guide_en/.test(zg.img || ''), zg);
  // switch to English
  await p.click('#lang'); await p.waitForTimeout(2500);
  ok('E4 UI is English', await p.evaluate(() => document.documentElement.lang) === 'en', '');
  await openTab('book');
  const eb = await p.evaluate(() => ({ lang: window.PondGateBook.lang, v: window.PondGateBook.version, n: window.PondGateBook.chapters().length, title: window.PondGateBook.title, pdf: document.getElementById('bkPdf').getAttribute('href'), zip: document.getElementById('bkZip').getAttribute('href'), view: document.getElementById('bkView').innerText.slice(0, 400), toc: [...document.querySelectorAll('.bk-toc button')].map(x => x.textContent).join('|') }));
  ok('E5 [en] book tab shows the English edition (26 chapters, v1.3.4)', eb.lang === 'en' && eb.v === '1.3.4' && eb.n === 26 && !CJK.test(eb.title) && !CJK.test(eb.view) && !CJK.test(eb.toc), { lang: eb.lang, v: eb.v, n: eb.n, title: eb.title });
  ok('E6 [en] book download links point to the English files', eb.pdf === 'book/PondGate_book_v1.3.4_en.pdf' && eb.zip === 'book/PondGate_book_v1.3.4_examples_en.zip', [eb.pdf, eb.zip]);
  const st = await p.evaluate(async a => Promise.all(a.map(async u => (await fetch(u, { method: 'HEAD' })).status)), [eb.pdf, eb.zip, 'manual/PondGate_student_guide_v1.3.4_en.pdf', 'book/PondGate_book_v9.9.9_en.pdf']);
  ok('E7 English PDFs/ZIP served 200 and a wrong name 404 (link check can fail)', st.slice(0, 3).every(s => s === 200) && st[3] === 404, st);
  await p.fill('#bkSearch', 'orifice'); await p.waitForTimeout(400);
  const hits = await p.evaluate(() => [...document.querySelectorAll('#bkHits button')].map(x => x.textContent));
  ok('E8 English search "orifice" returns English hits', hits.length > 0 && hits.every(h => !CJK.test(h)), hits.slice(0, 3));
  await p.fill('#bkSearch', 'zzqxv nonsenseword'); await p.waitForTimeout(400);
  const none = await p.evaluate(() => document.getElementById('bkHits').innerText);
  ok('E8-neg nonsense search gives "not found", not a hit', !/data-bk-go/.test(none) && none.length > 5 && (await p.evaluate(() => document.querySelectorAll('#bkHits button').length)) === 0, none.slice(0, 80));
  await p.fill('#bkSearch', ''); 
  // all English book images load
  const bimgs = await p.evaluate(async () => { const src = new Set(); window.PondGateBook.chapters().forEach(() => {}); const html = window.PondGateBookDataEn.chapters.map(c => c.html).join(''); (html.match(/data-bk-src="([^"]+)"/g) || []).forEach(m => src.add(m.slice(13, -1))); const r = []; for (const s of src) r.push([s, (await fetch(s, { method: 'HEAD' })).status]); return r; });
  ok('E9 every English book figure resolves (200)', bimgs.length >= 15 && bimgs.every(x => x[1] === 200), { n: bimgs.length, bad: bimgs.filter(x => x[1] !== 200) });
  await openTab('guide');
  const eg = await p.evaluate(() => ({ pdf: document.getElementById('hcGuidePdf')?.getAttribute('href'), t: document.querySelector('[data-hc-pane="guide"] .hc-man')?.innerText, imgs: [...document.querySelectorAll('[data-hc-pane="guide"] img')].map(i => i.getAttribute('src')) }));
  ok('E10 [en] guide tab shows the English guide and English PDF', eg.pdf === 'manual/PondGate_student_guide_v1.3.4_en.pdf' && !CJK.test(eg.t.replace(/中文/g, '')) && eg.imgs.length >= 40 && eg.imgs.every(s => /guide_en\//.test(s)), { pdf: eg.pdf, imgs: eg.imgs.length });
  const gst = await p.evaluate(async a => { const r = []; for (const s of a) r.push((await fetch(s, { method: 'HEAD' })).status); return r; }, [...new Set(eg.imgs)]);
  ok('E11 every English guide figure resolves (200)', gst.every(s => s === 200), gst.filter(s => s !== 200).length);
  const steps = await p.evaluate(() => ({ ch: window.PondGateStudentGuideEn.chapters.length, st: window.PondGateStudentGuideEn.chapters.reduce((a, c) => a + c.steps.length, 0) }));
  ok('E12 English guide has 13 chapters and 54 steps (same as the Chinese guide)', steps.ch === 13 && steps.st === 54, steps);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#hcGuidePdf')]);
  ok('E13 guide PDF button downloads the English PDF', /_en\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  // switch back: Chinese again
  await p.click('#lang'); await p.waitForTimeout(2500); await openTab('book');
  const back = await p.evaluate(() => window.PondGateBook.lang);
  ok('E14-neg switching back to Chinese restores the Chinese book', back === 'zh-Hant', back);
  const h = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'dist', f))).digest('hex').slice(0, 8);
  const core = ['routing-core.js', 'physics-refinement.js', 'module-shell.js'].map(h);
  ok('E15 core files unchanged', core.join() === 'f8b7c450,54a882a7,337e2da0', core);
  ok('E16 no page errors', errs.length === 0, errs);
  await b.close(); const pass = res.every(x => x.pass);
  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), pass, results: res }, null, 1)); console.log('RESULT', pass ? 'PASS' : 'FAIL', res.filter(x => x.pass).length + '/' + res.length);
})();
