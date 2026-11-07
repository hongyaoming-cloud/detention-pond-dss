// Walks all seven guided lessons as a learner would (using "Show me", "I see it" and the quiz),
// checks every step turns complete, and that ending a lesson restores the learner's own inputs.
// Negative checks: a step does not complete before it is done; a wrong quiz answer does not complete.
// Usage: node lessons_check.js <port> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
const [port, out] = process.argv.slice(2); const R = [];
const rec = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'OK  ' : 'FAIL') + ' ' + id + (d ? ' | ' + JSON.stringify(d).slice(0, 200) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const lang of ['zh', 'en']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1200);
    if (lang === 'en') { await p.click('#lang'); await p.waitForTimeout(400); }
    await p.evaluate(() => { const e = document.getElementById('area'); e.value = '333'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    const ids = await p.evaluate(() => window.PondGateLessons.list());
    for (const id of ids) {
      await p.evaluate(id => window.PondGateLessons.begin(id), id); await p.waitForTimeout(500);
      let steps = 0, notEarly = true, wrongQuiz = true;
      for (let k = 0; k < 20; k++) {
        const st = await p.evaluate(() => window.PondGateLessons.state()); if (!st) break;
        const hasQuiz = await p.$('#lessonPanel input[name=lsq]');
        if (hasQuiz) {
          const n = await p.$$eval('#lessonPanel input[name=lsq]', x => x.length);
          // try a wrong answer first (option 0 is wrong in every quiz)
          await p.click('#lessonPanel input[name=lsq][value="0"]'); await p.waitForTimeout(150);
          if (await p.evaluate(() => window.PondGateLessons.state().ok)) wrongQuiz = false;
          for (let i = 1; i < n; i++) { await p.click(`#lessonPanel input[name=lsq][value="${i}"]`); await p.waitForTimeout(150); if (await p.evaluate(() => window.PondGateLessons.state().ok)) break; }
        } else {
          if (await p.$('#lessonPanel [data-ls=demo]')) { if (await p.evaluate(() => window.PondGateLessons.state().ok)) notEarly = false; await p.click('#lessonPanel [data-ls=demo]'); await p.waitForTimeout(1800); }
          await p.waitForTimeout(700);
          if (await p.$('#lessonPanel [data-ls=seen]')) { await p.click('#lessonPanel [data-ls=seen]'); await p.waitForTimeout(200); }
        }
        await p.waitForTimeout(600);
        const ok = await p.evaluate(() => window.PondGateLessons.state()?.ok);
        if (!ok) { rec(`${lang} ${id} step ${st.step + 1} completes`, false, await p.evaluate(() => document.getElementById('lessonPanel').innerText.slice(0, 200))); break; }
        steps++; await p.click('#lessonPanel [data-ls=next]'); await p.waitForTimeout(400);
      }
      const finished = await p.evaluate(() => window.PondGateLessons.state() === null);
      rec(`${lang} ${id} all ${steps} steps completed`, finished, { steps });
      rec(`${lang} ${id} no step completed before the learner acted`, notEarly);
      rec(`${lang} ${id} wrong quiz answer not accepted`, wrongQuiz);
      const area = await p.evaluate(() => document.getElementById('area').value);
      rec(`${lang} ${id} own inputs restored after the lesson`, area === '333', { area });
    }
    rec(`${lang} no page errors`, errs.length === 0, errs);
    await p.close();
  }
  await b.close();
  fs.writeFileSync(out, JSON.stringify({ total: R.length, failed: R.filter(r => !r.ok).length, results: R }, null, 1));
  console.log(`${R.filter(r => r.ok).length}/${R.length} OK`); process.exit(R.some(r => !r.ok) ? 1 : 0);
})();
