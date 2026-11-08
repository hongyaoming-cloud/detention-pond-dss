// Builds the downloadable user-manual PDFs (Traditional Chinese and English) from the app itself.
// Usage: serve dist/ on a port, then: node docs/build_manual_pdfs.js <port>
// The HTML comes from the in-app "download manual" button, so the PDF always matches the in-app manual.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const port = process.argv[2] || 8765; const OUT = path.join(__dirname, '..', 'dist', 'manual');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
  for (const lang of ['zh-Hant', 'en']) {
    const cur = await p.evaluate(() => document.documentElement.lang);
    if (cur !== lang) { await p.click('#lang'); await p.waitForTimeout(2500); }
    await p.evaluate(() => { window.DSSWorkspacePages.openTarget('helpCenter'); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const t = [...document.querySelectorAll('#helpCenter button')].find(x => /使用手冊（精簡版）|User manual \(short\)/.test(x.textContent)); t && t.click(); });
    await p.waitForTimeout(500);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#hcManualDl')]);
    const name = dl.suggestedFilename(); const html = fs.readFileSync(await dl.path(), 'utf8');
    if (!html.includes('<html lang="' + lang + '"')) throw new Error('wrong language in ' + name);
    const q = await ctx.newPage(); await q.setContent(html, { waitUntil: 'load' }); await q.waitForTimeout(500);
    const pdf = path.join(OUT, name.replace(/\.html$/, '.pdf'));
    await q.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } }); await q.close();
    console.log(lang, name, '->', path.relative(process.cwd(), pdf), fs.statSync(pdf).size);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
