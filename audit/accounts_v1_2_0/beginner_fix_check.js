// Checks the fixes from the beginner walkthrough of the whole app (2026-11-07), with negative controls.
// Usage: node audit/accounts_v1_2_0/beginner_fix_check.js <account server url> <user> <password> <static port> <out.json>
// The user must be an engineer who has already changed the first password.
const { chromium } = require('playwright'); const fs = require('fs');
const [BASE, U, P, STATIC, OUT] = [process.argv[2] || 'http://127.0.0.1:8787', process.argv[3] || 'stu', process.argv[4] || 'Stu-Own-Pass1', process.argv[5] || 8765, process.argv[6] || 'beginner_fix_check.json'];
const res = []; const ok = (id, pass, detail = '') => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, detail); };
(async () => {
  const b = await chromium.launch();
  const ask = (pg, q) => pg.evaluate(q => { const r = window.PondGateHelp.answer(q); return JSON.stringify(r); }, q);
  // signed-in copy
  let pg = await b.newPage({ viewport: { width: 1280, height: 860 } }); pg.on('dialog', d => d.accept());
  await pg.goto(BASE + '/'); await pg.waitForTimeout(1600);
  await pg.fill('#acctUser', U); await pg.fill('#acctPass', P); await pg.click('#acctLoginBtn'); await pg.waitForTimeout(1500);
  let a = await ask(pg, '怎麼存檔？');
  ok('B1 signed in: "怎麼存檔？" explains saving a project (not only the report)', /存成專案/.test(a) && /分享給同公司/.test(a));
  a = await ask(pg, '忘記密碼怎麼辦');
  ok('B1b "忘記密碼怎麼辦" points to the organisation administrator', /管理者重設/.test(a));
  a = await ask(pg, '允許出流是什麼');
  ok('B2 "允許出流是什麼" finds the glossary term Qallow (was: "sorry")', /qallow/i.test(a) && !/抱歉/.test(a));
  a = await ask(pg, '我的池子要多大');
  ok('B3 "我的池子要多大" explains run first, then Module 5 screening', /模組 5/.test(a) && /不是最終設計/.test(a) && !/抱歉/.test(a));
  a = await ask(pg, '為什麼篩選按不下去');
  ok('B4 "為什麼篩選按不下去" answers about screening locks (was: about the run button)', /篩選/.test(a) && !/執行路由與評估」可以按/.test(a), a.slice(0, 120));
  a = await ask(pg, '為什麼按不下去');
  ok('B4n negative control: a plain "為什麼按不下去" still answers about the run button', /執行/.test(a) && !/受限設計篩選目前鎖定/.test(a));
  a = await ask(pg, '結果怎麼下載');
  ok('B5 "結果怎麼下載" still gives the report download', /download/.test(a));
  a = await ask(pg, '今天天氣如何');
  ok('B5n negative control: an off-topic question still gets the polite "only PondGate" answer', /抱歉/.test(a));
  // empty Qp: the blocked message names the field
  await pg.evaluate(() => window.DSSWorkspacePages.openTarget('mod-inflow')); await pg.fill('#qp', ''); await pg.press('#qp', 'Tab');
  await pg.evaluate(() => window.DSSWorkspacePages.openTarget('mod-routing')); await pg.waitForTimeout(300);
  await pg.dispatchEvent('#run', 'pointerdown'); await pg.waitForTimeout(500);
  const fb = await pg.evaluate(() => document.querySelector('.button-feedback')?.textContent || '');
  ok('B6 with Qp empty, the "cannot run" message names the field to fix', /入流尖峰 Qp/.test(fb), fb.slice(0, 120));
  await pg.evaluate(() => window.DSSWorkspacePages.openTarget('mod-inflow')); await pg.fill('#qp', '0.120'); await pg.press('#qp', 'Tab'); await pg.waitForTimeout(300);
  ok('B6n negative control: with valid inputs the run button is enabled', !(await pg.$eval('#run', e => e.disabled)));
  // static copy (no accounts)
  const st = await b.newPage(); await st.goto(`http://localhost:${STATIC}/index.html`); await st.waitForTimeout(1600);
  a = await ask(st, '怎麼存檔？');
  ok('B7 static copy (no sign-in): "怎麼存檔？" says projects need sign-in and points to the report', /沒有登入帳號/.test(a) && /download/.test(a));
  await b.close();
  const pass = res.filter(r => r.pass).length; console.log(`${pass}/${res.length}`);
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), base: BASE, pass, total: res.length, results: res }, null, 1));
  process.exit(pass === res.length ? 0 : 1);
})();
