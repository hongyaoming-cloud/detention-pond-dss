// Checks the fixes from the ChatGPT (agent) novice tests (first and second run) of PondGate v1.2.0 (2026-11-07), with negative controls.
// Usage: node audit/chatgpt_novice_v1_2_1/gpt_fix_check.js <static port> <out.json>   (static server on dist/)
const { chromium } = require('playwright'); const fs = require('fs');
const [PORT, OUT] = [process.argv[2] || 8765, process.argv[3] || 'gpt_fix_check.json'];
const res = []; const ok = (id, pass, detail = '') => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, detail); };
(async () => {
  const b = await chromium.launch();
  const fresh = async () => { const pg = await b.newPage({ viewport: { width: 1280, height: 860 } }); pg.on('dialog', d => d.accept()); await pg.goto(`http://localhost:${PORT}/index.html`); await pg.waitForTimeout(1800); return pg; };
  const open = (pg, t) => pg.evaluate(t => window.DSSWorkspacePages.openTarget(t), t);
  const setv = async (pg, mod, id, v) => { await open(pg, mod); await pg.fill('#' + id, String(v)); await pg.press('#' + id, 'Tab'); await pg.waitForTimeout(200); };
  const run = async pg => { await open(pg, 'mod-routing'); await pg.click('#run'); await pg.waitForTimeout(1500); };
  const verdict = pg => pg.evaluate(() => window.PondGateBeginner.verdict());
  const panel = pg => pg.evaluate(() => { const e = document.getElementById('pgVerdict'); return e ? { cls: e.className, text: e.innerText.replace(/\s+/g, ' ') } : null; });
  const fb = pg => pg.evaluate(() => document.getElementById('buttonFeedback')?.textContent || '');
  const rowQin = pg => pg.evaluate(() => [...document.querySelectorAll('#metricbody tr')].find(r => /Qp,i$/.test(r.cells[0].textContent.trim()))?.cells[1].textContent.trim());
  const ask = (pg, q) => pg.evaluate(q => JSON.stringify(window.PondGateHelp.answer(q)), q);

  // G10 (third run) a note beside the language button says, before switching, that it will recompute
  { const q = await fresh(); await q.evaluate(() => window.DSSWorkspacePages.openTarget('mod-routing')); await q.click('#run'); await q.waitForTimeout(1500);
    const before = await q.evaluate(() => { const n = document.getElementById('pgLangNote'); return n && !n.hidden ? n.textContent : ''; });
    await q.evaluate(() => window.DSSWorkspacePages.openTarget('mod-inflow')); await q.fill('#qp', '0.3'); await q.press('#qp', 'Tab'); await q.waitForTimeout(400);
    const after = await q.evaluate(() => { const n = document.getElementById('pgLangNote'); return n && !n.hidden && n.getBoundingClientRect().height > 0 ? n.textContent : ''; });
    ok('G10 after changing an input, a note beside the language button warns before switching that it recomputes', /重新計算/.test(after), after);
    ok('G10n negative control: right after a run (nothing changed) there is no such note', before === '');
    await q.close(); }
  // G1 language switch after an unrun change: says it recomputed, and the result is no longer marked stale
  let pg = await fresh();
  await setv(pg, 'mod-inflow', 'qp', '0.5'); await run(pg);
  await setv(pg, 'mod-inflow', 'qp', '0.4');
  const staleBefore = (await panel(pg))?.cls === 'warn' && /上一次執行/.test((await panel(pg)).text);
  await pg.click('#lang'); await pg.waitForTimeout(900);
  const f1 = await fb(pg), st1 = await pg.evaluate(() => window.PondGateHelp.runState());
  ok('G1 after changing Qp (not run), switching language says routing was recomputed, and the result is current', /recomputed/i.test(f1) && !st1.changedAfterRun && /0\.4000/.test(await rowQin(pg)), f1.slice(0, 90));
  ok('G1b before switching, the beginner panel warned that the table is from the previous run', staleBefore);
  await pg.click('#lang'); await pg.waitForTimeout(900);
  const f1n = await fb(pg);
  ok('G1n negative control: switching back with no new change does not claim a recomputation', !/重新計算|recomputed/i.test(f1n), f1n.slice(0, 60));
  // G2 beginner verdict
  let v = await verdict(pg); let p = await panel(pg);
  ok('G2 Qp 0.4: Hmax and Qp,o are compared with Hallow and Qallow on the result page; "exceeds" is shown', v.overall === 'stop' && /超過/.test(p.text) && /修正前不可採用/.test(p.text), `H ${v.hmax} vs ${v.hallow}, Q ${v.qout} vs ${v.qallow}`);
  ok('G7 second test: when limits are exceeded, the panel says how each change moves level and outflow, and that free-discharge evidence is incomplete', /加大池面積/.test(p.text) && /縮小出口/.test(p.text) && /只供探索與學習/.test(p.text));
  await setv(pg, 'mod-optimization', 'qallow', '0.6'); await setv(pg, 'mod-optimization', 'hallow', '2.0'); await run(pg);
  v = await verdict(pg); p = await panel(pg);
  ok('G8 second test: the screening check below no longer says only "not yet run" for Hallow; it points to the Beginner check', await pg.evaluate(() => /受限篩選尚未執行（一般路由的比較請看上方「新手判讀」）；Hallow/.test(document.getElementById('diagnosticGuide')?.innerText || '')));
  ok('G2n negative control: with Hallow 2.0 and Qallow 0.6 the same pond reads "both within limits" and says it is not a final design', v.overall === 'ok' && p.cls === 'ok' && /不是最終設計/.test(p.text), `H ${v.hmax} vs ${v.hallow}, Q ${v.qout} vs ${v.qallow}`);
  await pg.close();
  // G2c equal after rounding is never a pass
  pg = await fresh(); await run(pg); v = await verdict(pg);
  await setv(pg, 'mod-optimization', 'qallow', v.qout.toFixed(4)); await setv(pg, 'mod-optimization', 'hallow', '2.0');
  v = await verdict(pg);
  ok('G2c a peak outflow equal to Qallow (after rounding) is reported as "check again", not as a pass', v.q === 'warn' && v.overall !== 'ok', `Q ${v.qout} vs ${v.qallow}`);
  await pg.close();
  // G3 missing items beside the screening button
  pg = await fresh(); await open(pg, 'mod-optimization'); await pg.waitForTimeout(400);
  let m = await pg.evaluate(() => { const e = document.getElementById('pgScreenMissing'); return e ? { cls: e.className, n: e.querySelectorAll('li').length, text: e.innerText, vis: e.getBoundingClientRect().height > 0, after: e.previousElementSibling?.id } : null; });
  ok('G9 second test: each missing screening item says what document to look for', await pg.evaluate(() => /要查：/.test(document.getElementById('pgScreenMissing')?.innerText || '') && /要填：/.test(document.getElementById('pgScreenMissing')?.innerText || '')));
  ok('G3 beside the screening button, the missing items are listed before pressing it', m && m.vis && m.after === 'optimize' && m.n >= 3 && /自由出流/.test(m.text), m && `${m.n} items`);
  await pg.evaluate(() => { for (const id of ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation']) { const e = document.getElementById(id); if (e && !e.checked) e.click(); } for (const id of ['freeEvidenceRecord', 'screeningLimitRecord']) { const e = document.getElementById(id); e.value = 'QA record 1'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } });
  await pg.waitForTimeout(500);
  m = await pg.evaluate(() => { const e = document.getElementById('pgScreenMissing'); return { cls: e.className, n: e.querySelectorAll('li').length, text: e.innerText }; });
  await run(pg); let pz = await panel(pg);
  ok('G7n negative control: with all free-discharge evidence ticked, the beginner panel has no "exploration only" scope note', pz && !/只供探索與學習/.test(pz.text));
  ok('G3n negative control: when every condition is complete, the box says screening can run and lists nothing', m.cls === 'ok' && m.n === 0 && /齊全/.test(m.text));
  await pg.close();
  // G4 assistant
  pg = await fresh(); await run(pg);
  let a = await ask(pg, '如何判斷這個滯洪池夠不夠用');
  ok('G4 "如何判斷這個滯洪池夠不夠用" explains Hmax vs Hallow and Qp,o vs Qallow (was: "sorry")', /Hallow/.test(a) && /Qallow/.test(a) && !/抱歉/.test(a));
  a = await ask(pg, '我的池子要多大');
  ok('G4b "我的池子要多大" still gets the pond-size answer (Module 5)', /模組 5/.test(a) && /不是最終設計/.test(a));
  a = await ask(pg, '今天天氣如何');
  ok('G4n negative control: an off-topic question still gets the "only PondGate" answer', /抱歉/.test(a));
  // G5 untranslated screening message follows the language
  await open(pg, 'mod-optimization'); await pg.click('#optimize'); await pg.waitForTimeout(900);
  const zhMsg = await pg.evaluate(() => document.getElementById('optout').textContent.trim());
  await pg.click('#lang'); await pg.waitForTimeout(900);
  const enMsg = await pg.evaluate(() => document.getElementById('optout').textContent.trim());
  ok('G5 the "screening not run" message is English after switching to English', /^尚未執行受限篩選/.test(zhMsg) && /^Screening was not run/.test(enMsg), enMsg.slice(0, 40));
  ok('G11 while screening has not run, the "selected feasible screening case" caption is not shown', await pg.evaluate(() => [...document.querySelectorAll('#optResultBox .meta')].every(e => e.style.display === 'none' || e.getBoundingClientRect().height === 0)));
  await pg.click('#lang'); await pg.waitForTimeout(900);
  ok('G5n negative control: back in Chinese the message is Chinese again', /^尚未執行受限篩選/.test(await pg.evaluate(() => document.getElementById('optout').textContent.trim())));
  // G6 quick start
  await pg.evaluate(() => window.DSSWorkspacePages.openTarget('teachingAssistant')); await pg.waitForTimeout(600);
  const q = await pg.evaluate(() => { const e = document.getElementById('pgQuickStart'); return e ? { t: e.innerText, top: e.previousElementSibling?.tagName } : null; });
  ok('G6 "How to start" opens with a three-step quick start before the equations', q && /最快上手/.test(q.t) && q.top === 'H2', q && q.top);
  await pg.close();
  // G11n negative control: after a real (teaching-case) screening run, the caption is shown again
  pg = await fresh();
  await pg.evaluate(() => window.DSSWorkspacePages.openTarget('teachingAssistant')); await pg.click('#teachDemo'); await pg.waitForTimeout(1800);
  await pg.evaluate(() => window.DSSWorkspacePages.openTarget('mod-optimization')); await pg.click('#optimize'); await pg.waitForTimeout(4000);
  const cap = await pg.evaluate(() => ({ t: document.getElementById('optout')?.textContent.trim().slice(0, 60), shown: [...document.querySelectorAll('#optResultBox .meta')].some(e => e.style.display !== 'none') }));
  ok('G11n negative control: after a screening run on the teaching case, the caption is shown', cap.shown && !/^尚未執行受限篩選/.test(cap.t), cap.t);
  await pg.close(); await b.close();
  const pass = res.filter(r => r.pass).length; console.log(`${pass}/${res.length}`);
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), port: PORT, pass, total: res.length, results: res }, null, 1));
  process.exit(pass === res.length ? 0 : 1);
})();
