// v1.3.2 checks: Chinese and English user-manual PDF download buttons in Start here -> User manual (short).
// Usage: node audit/manual_v1_3_2/manual_pdf_check.js <port serving dist/> <out.json>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const { execFileSync } = require('child_process');
const port = process.argv[2] || 8765; const OUT = process.argv[3] || path.join(__dirname, 'manual_pdf_check_v1_3_2.json'); const ROOT = path.join(__dirname, '..', '..');
const res = []; const ok = (id, pass, detail) => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, JSON.stringify(detail)); };
const text = f => execFileSync('pdftotext', ['-l', '2', f, '-']).toString();
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
  for (const lang of ['zh-Hant', 'en']) {
    if (await p.evaluate(() => document.documentElement.lang) !== lang) { await p.click('#lang'); await p.waitForTimeout(2500); }
    await p.evaluate(() => window.DSSWorkspacePages.openTarget('helpCenter')); await p.waitForTimeout(300);
    await p.evaluate(() => { const t = [...document.querySelectorAll('#helpCenter button')].find(x => /使用手冊（精簡版）|User manual \(short\)/.test(x.textContent)); t && t.click(); }); await p.waitForTimeout(400);
    const btn = await p.evaluate(() => ({ zh: document.getElementById('hcManualPdfZh')?.textContent, en: document.getElementById('hcManualPdfEn')?.textContent, msg: document.getElementById('hcManualMsg')?.textContent }));
    ok(`M1 [${lang}] both language buttons are shown`, btn.zh === '下載中文版（PDF）' && btn.en === 'Download English (PDF)', btn);
    ok(`M1-neg [${lang}] no message before clicking`, btn.msg === '', btn.msg);
    for (const [id, want, re] of [['hcManualPdfZh', 'PondGate_user_manual_v1.3.2_zh-Hant.pdf', /PondGate 使用手冊（v1\.3\.2）/], ['hcManualPdfEn', 'PondGate_user_manual_v1.3.2_en.pdf', /PondGate user manual \(v1\.3\.2\)/]]) {
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#' + id)]);
      const f = await dl.path(); const head = fs.readFileSync(f).subarray(0, 4).toString(); const t = text(f); const msg = await p.evaluate(() => document.getElementById('hcManualMsg').textContent);
      ok(`M2 [${lang}] ${id} downloads the right PDF and shows a message`, dl.suggestedFilename() === want && head === '%PDF' && re.test(t) && /下載|download/i.test(msg), { file: dl.suggestedFilename(), head, title: (t.match(re) || [''])[0], msg });
    }
    const [dh] = await Promise.all([p.waitForEvent('download'), p.click('#hcManualDl')]);
    ok(`M3 [${lang}] HTML download carries the current version and language`, dh.suggestedFilename() === `PondGate_user_manual_v1.3.2_${lang}.html`, dh.suggestedFilename());
  }
  const zhT = text(path.join(ROOT, 'dist/manual/PondGate_user_manual_v1.3.2_zh-Hant.pdf')), enT = text(path.join(ROOT, 'dist/manual/PondGate_user_manual_v1.3.2_en.pdf'));
  const cjk = s => (s.match(/[一-鿿]/g) || []).length;
  ok('M4 Chinese PDF is Chinese and English PDF is English', cjk(zhT) > 200 && cjk(enT) < 5, { zh: cjk(zhT), en: cjk(enT) });
  const r404 = await p.evaluate(async () => (await fetch('manual/PondGate_user_manual_v1.1.0_en.pdf')).status);
  ok('M4-neg a non-existent manual PDF is not served (link check can fail)', r404 === 404, r404);
  const h = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'dist', f))).digest('hex').slice(0, 8);
  const core = ['routing-core.js', 'physics-refinement.js', 'module-shell.js'].map(h);
  ok('M5 core files unchanged', core.join() === 'f8b7c450,54a882a7,337e2da0', core);
  ok('M6 no page errors', errs.length === 0, errs);
  await b.close(); const pass = res.every(x => x.pass);
  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), pass, results: res }, null, 1)); console.log('RESULT', pass ? 'PASS' : 'FAIL', res.filter(x => x.pass).length + '/' + res.length);
})();
