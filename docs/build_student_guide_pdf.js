// Prints the full step-by-step guide to PDF exactly as the in-app download produces it.
// Usage: serve dist/ on a port, then: node docs/build_student_guide_pdf.js <port> <output.pdf>
const { chromium } = require('playwright');
const port = process.argv[2] || 8765, out = process.argv[3] || 'PondGate_student_guide_v1.1.0_zh-Hant.pdf';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
  const html = await p.evaluate(() => window.PondGateHelp.guideDocument());
  const q = await b.newPage(); await q.setContent(html, { waitUntil: 'load' });
  await q.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true, headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size:9px;width:100%;text-align:center;color:#666">PondGate v1.1.0 完整版操作手冊　第 <span class="pageNumber"></span> / <span class="totalPages"></span> 頁</div>' });
  console.log('saved', out, html.length);
  await b.close();
})();
