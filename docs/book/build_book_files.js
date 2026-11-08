// Builds the downloadable files of the book from the running page, exactly as a reader would get them.
// Usage: serve dist/ on a port, then: node docs/book/build_book_files.js <port> [en]
// Output: dist/book/PondGate_book_v<ver>_zh-Hant.pdf and dist/book/PondGate_book_v<ver>_examples.zip
//         (with 'en': the English edition, dist/book/PondGate_book_v<ver>_en.pdf and ..._examples_en.zip)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const port = process.argv[2] || 8765; const EN = process.argv[3] === 'en'; const ROOT = path.join(__dirname, '..', '..'); const OUT = path.join(ROOT, 'dist', 'book');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
  if (EN && await p.evaluate(() => document.documentElement.lang) !== 'en') { await p.click('#lang'); await p.waitForTimeout(2500); }
  if ((await p.evaluate(() => window.PondGateBook.lang)) !== (EN ? 'en' : 'zh-Hant')) throw new Error('wrong book edition');
  const ver = await p.evaluate(() => window.PondGateBook.version);
  const html = await p.evaluate(() => window.PondGateBook.documentHtml());
  const q = await b.newPage(); await q.setContent(html, { waitUntil: 'load' });
  const pdf = path.join(OUT, `PondGate_book_v${ver}_${EN ? 'en' : 'zh-Hant'}.pdf`);
  await q.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '15mm', right: '15mm' }, displayHeaderFooter: true, headerTemplate: '<div></div>',
    footerTemplate: EN ? `<div style="font-size:9px;width:100%;text-align:center;color:#666">PondGate v${ver} handbook — page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`
      : `<div style="font-size:9px;width:100%;text-align:center;color:#666">PondGate v${ver} 工具書　第 <span class="pageNumber"></span> / <span class="totalPages"></span> 頁</div>` });
  await b.close();
  const zip = path.join(OUT, `PondGate_book_v${ver}_examples${EN ? '_en' : ''}.zip`); if (fs.existsSync(zip)) fs.unlinkSync(zip);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bkzip-')); const dir = path.join(tmp, `PondGate_book_v${ver}_examples${EN ? '_en' : ''}`); fs.mkdirSync(dir);
  for (const f of fs.readdirSync(path.join(OUT, 'data'))) fs.copyFileSync(path.join(OUT, 'data', f), path.join(dir, f));
  for (const f of [EN ? 'examples_en.json' : 'examples.json', 'check_examples.py', 'hand_calc.py', 'run_examples.js']) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  if (EN) fs.writeFileSync(path.join(dir, 'README.txt'), `PondGate v${ver} handbook example data (English edition)\r\n\r\nch17_irregular_stage_storage.csv  stage-storage table of the irregular pond in Chapter 17\r\nch20_site_inflow.csv              inflow hydrograph of the capstone project in Chapter 20\r\nexamples_en.json                  full inputs and software readings of every Part II example (English interface)\r\ncheck_examples.py                 independent recomputation: python3 -I check_examples.py examples_en.json\r\nhand_calc.py                      hand-calculation numbers of Chapters 11 to 13\r\nrun_examples.js                   reruns every example in the software (needs Playwright): node run_examples.js <port> en\r\n\r\nThe free-discharge ticks and limit values in the examples are teaching assumptions and must not be used in real projects.\r\n`);
  else fs.writeFileSync(path.join(dir, 'README.txt'), `PondGate v${ver} 工具書範例資料\r\n\r\nch17_irregular_stage_storage.csv  第 17 章不規則池的水位—蓄水量表\r\nch20_site_inflow.csv              第 20 章綜合專題的入流歷線\r\nexamples.json                     第二部每個範例的完整輸入與軟體讀數\r\ncheck_examples.py                 獨立重算程式：python3 -I check_examples.py examples.json\r\nhand_calc.py                      第 11 至 13 章手算數字\r\nrun_examples.js                   在軟體中重跑所有範例的程式（需 Playwright）\r\n\r\n範例中的自由出流勾選與限制值都是教學假設，不可用於實際工程。\r\n`);
  execFileSync('zip', ['-qrX', zip, path.basename(dir)], { cwd: tmp }); fs.rmSync(tmp, { recursive: true });
  console.log('pdf', pdf, fs.statSync(pdf).size, 'zip', zip, fs.statSync(zip).size, 'html', html.length);
})();
