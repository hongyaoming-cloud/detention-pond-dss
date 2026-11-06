// v1.1.0 checks: help centre, assistant, language completion, and unchanged routed values.
// Usage: node help_checks.js <port_v1_1_0> <port_v1_0_2> <out.json>
// Positive checks must hold on v1.1.0; negative controls must fail on v1.0.2 (proving each check can fail).
const { chromium } = require('playwright'); const fs = require('fs');
const [port, basePort, out] = process.argv.slice(2);
const url = p => `http://localhost:${p}/index.html`;
const results = []; const rec = (id, ok, detail) => { results.push({ id, ok, detail }); console.log((ok ? 'OK  ' : 'FAIL') + ' ' + id + (detail ? ' | ' + JSON.stringify(detail).slice(0, 300) : '')); };

const setv = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
const metrics = p => p.evaluate(() => [...document.querySelectorAll('#metricbody tr')].map(r => r.cells[0].innerText.trim() + '=' + r.cells[1].innerText.trim()));
async function scenario(b, p0, lang) {
  const p = await b.newPage(); p.on('dialog', d => d.accept()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url(p0)); await p.waitForTimeout(1500);
  if (lang === 'en') { await p.click('#lang'); await p.waitForTimeout(400); }
  const r = {};
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(1500); r.demo = await metrics(p);
  await setv(p, 'shape', 'long'); await setv(p, 'area', '95'); await setv(p, 'bw', '0.35');
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(1500); r.edited = await metrics(p);
  // eligible setup set field by field (the v1.0.2 English teaching button freezes, see P27/N3)
  await setv(p, 'case', 'tri'); await p.waitForTimeout(300);
  await p.evaluate(() => { const $ = id => document.getElementById(id), ev = (e, t) => e.dispatchEvent(new Event(t, { bubbles: true }));
    const chk = (id, v) => { const e = $(id); if (e && e.checked !== v) { e.checked = v; ev(e, 'change'); } };
    chk('weirOn', true); chk('oriOn', false); chk('riserOn', false); chk('pipeOn', false);
    ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'].forEach(id => chk(id, true));
    for (const [id, v] of [['freeEvidenceRecord', 'record'], ['screeningLimitRecord', 'basis'], ['qallow', '0.080'], ['hallow', '1.00']]) { $(id).value = v; ev($(id), 'input'); ev($(id), 'change'); } });
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('optimize').click()); await p.waitForTimeout(6000);
  r.screen = await p.evaluate(() => document.getElementById('optout').innerText.trim());
  await setv(p, 'qallow', '0.001'); await p.evaluate(() => document.getElementById('optimize').click()); await p.waitForTimeout(6000);
  r.infeasible = await p.evaluate(() => document.getElementById('optout').innerText.trim());
  r.errs = errs; await p.close(); return r;
}
const scan = p => p.evaluate(() => { const o = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const t = n.textContent.trim(), el = n.parentElement; if (!t || !el || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue; if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue; o.push(t); }
  document.querySelectorAll('[placeholder]').forEach(e => { if (e.offsetParent) o.push(e.placeholder); });
  document.querySelectorAll('button[title]').forEach(e => { if (e.offsetParent) o.push(e.title); }); return o; });
async function languageLeaks(b, p0) {
  const p = await b.newPage(); p.on('dialog', d => d.accept()); await p.goto(url(p0)); await p.waitForTimeout(1200);
  const zhEn = new Set(), enZh = new Set();
  const CITATION = /Sewerage System Design|Rainwater Runoff-Control|orifice coefficient generally|weir and orifice design formulations|experimentally obtained coefficients|free-surface weir and submerged-orifice/;
  for (const lang of ['zh', 'en']) {
    if (lang === 'en') { await p.click('#lang'); await p.waitForTimeout(600); }
    await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(1500);
    for (const pg of ['route', 'screen', 'evidence', 'learn']) {
      await p.evaluate(pg => window.DSSWorkspacePages.activate(pg), pg); await p.waitForTimeout(300);
      for (const t of await scan(p)) {
        if (lang === 'zh' && /[A-Za-z]{4,}(\s+[A-Za-z]{3,}){3,}/.test(t) && !/[一-鿿]/.test(t) && !CITATION.test(t)) zhEn.add(t.slice(0, 80));
        if (lang === 'en' && /[一-鿿]/.test(t) && t.replace(/^After pressing, an action message appears: /, '') !== '中文') enZh.add(t.slice(0, 80));
      }
    }
  }
  await p.close(); return { zhEn: [...zhEn], enZh: [...enZh] };
}

(async () => {
  const b = await chromium.launch();
  // 1. Routed values, screening and blocking outcome identical to v1.0.2 (both languages)
  for (const lang of ['zh', 'en']) {
    const a = await scenario(b, port, lang), c = await scenario(b, basePort, lang);
    rec(`P1-${lang} demo routing table identical to v1.0.2`, JSON.stringify(a.demo) === JSON.stringify(c.demo) && a.demo.length > 10, { rows: a.demo.length });
    rec(`P2-${lang} edited-input routing table identical to v1.0.2`, JSON.stringify(a.edited) === JSON.stringify(c.edited) && a.edited.length > 10, a.edited.slice(1, 3));
    rec(`P3-${lang} teaching-case screening result identical to v1.0.2`, a.screen === c.screen && /選定可行|Selected feasible/.test(a.screen), a.screen.slice(0, 80));
    rec(`P4-${lang} infeasible case still blocked, identical to v1.0.2`, a.infeasible === c.infeasible && /^(阻擋|Blocked|No feasible)/.test(a.infeasible), a.infeasible.slice(0, 80));
    rec(`P5-${lang} no page errors`, a.errs.length === 0, a.errs);
  }
  // 2. Language completion; negative control on v1.0.2
  const L = await languageLeaks(b, port), L0 = await languageLeaks(b, basePort);
  rec('P6 no English-only sentences in the Chinese interface (citations excluded)', L.zhEn.length === 0, L.zhEn);
  rec('P7 no Chinese text in the English interface (language button excluded)', L.enZh.length === 0, L.enZh);
  rec('N1 negative control: the same scan finds leaks on v1.0.2', L0.zhEn.length > 0 && L0.enZh.length > 0, { zhEn: L0.zhEn.length, enZh: L0.enZh.length });

  // 3. Help centre behaviour on v1.1.0
  const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); p.on('dialog', d => d.accept()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const external = []; p.on('request', r => { if (!r.url().startsWith(`http://localhost:${port}/`) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  await p.goto(url(port)); await p.waitForTimeout(1500);
  const ns = () => p.evaluate(() => window.PondGateHelp.nextStep());
  rec('P8 help page and floating assistant present', await p.evaluate(() => !!document.getElementById('helpCenter') && !!document.getElementById('helpFab') && !!document.querySelector('[data-workspace-page="help"]')));
  let s = await ns(); rec('P9 next step before any run asks to run', /執行路由|Run routing/.test(s.title), s.title);
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(1500);
  s = await ns(); rec('P10 next step after routing points to results and lists screening locks', s.kind === 'info' && (s.list || []).length >= 3, { t: s.title, n: (s.list || []).length });
  await p.evaluate(() => document.getElementById('teachDemo').click()); await p.waitForTimeout(2000);
  s = await ns(); rec('P11 next step with eligible teaching case offers screening', /受限設計篩選|screening is available/i.test(s.title), s.title);
  await p.evaluate(() => document.getElementById('optimize').click()); await p.waitForTimeout(6000);
  s = await ns(); rec('P12 next step after feasible screening asks to read and download', s.kind === 'info' && /下載|download/i.test(s.title), s.title);
  await setv(p, 'qallow', '0.001'); await p.evaluate(() => document.getElementById('optimize').click()); await p.waitForTimeout(6000);
  s = await ns(); rec('P13 next step after infeasible screening is a block, never pass', s.kind === 'stop' && /阻擋|blocked/i.test(s.title) && !/通過|pass/i.test(s.title), s.title);
  const ansBlock = await p.evaluate(() => window.PondGateHelp.answer('出現無可行解怎麼辦？').text || '');
  rec('P14 assistant explains the block with the dominant limit', /阻擋/.test(ansBlock) && /主導限制/.test(ansBlock), ansBlock.slice(0, 80));
  // invalid input
  await setv(p, 'qp', '-1'); await p.waitForTimeout(500);
  const inv = await p.evaluate(() => ({ dis: document.getElementById('run').disabled, red: document.getElementById('qp').classList.contains('hc-invalid'), box: document.getElementById('hcRunFix')?.innerText || '' }));
  s = await ns();
  rec('P15 invalid Qp: run disabled, field outlined, fix list names Qp', inv.dis && inv.red && /Qp/.test(inv.box) && s.kind === 'stop', inv);
  await setv(p, 'qp', '0.120'); await p.waitForTimeout(500);
  rec('P16 valid again: outline and fix list removed', await p.evaluate(() => !document.querySelector('.hc-invalid') && !document.getElementById('hcRunFix').innerText.trim()));
  // field help buttons
  const q = await p.evaluate(() => ['qp', 'tpeak', 'area', 'floor', 'h0', 'cw', 'bw', 'cd', 'ao', 'freeDischarge', 'qallow', 'hallow'].filter(id => { const e = document.getElementById(id); let l = e.previousElementSibling; while (l && l.tagName !== 'LABEL') l = l.previousElementSibling; l = l || e.closest('label'); return !(l && l.querySelector('.hc-q')); }));
  rec('P17 "?" help button next to key fields', q.length === 0, { missing: q });
  // assistant
  const A = await p.evaluate(() => { const H = window.PondGateHelp; return { qallow: JSON.stringify(H.answer('Qallow 是什麼？')), privacy: H.answer('我的資料會傳出去嗎').text, junk: H.answer('今天天氣如何').text, en: JSON.stringify(H.answer('what is FPI95')) }; });
  rec('P18 assistant defines Qallow', /容許出流尖峰/.test(A.qallow), A.qallow.slice(0, 100));
  rec('P19 assistant answers privacy (offline, nothing sent)', /不會傳送/.test(A.privacy), A.privacy);
  rec('N2 assistant declines an unrelated question instead of inventing an answer', /只能回答 PondGate/.test(A.junk), A.junk);
  rec('P20 assistant answers in English', /flatness/i.test(A.en), A.en.slice(0, 100));
  // manual download
  await p.evaluate(() => window.DSSWorkspacePages.openTarget('helpCenter'));
  await p.click('[data-hc-tab="manual"]');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#hcManualDl')]);
  let manualOk = false; if (dl) { const f = await dl.path(); const t = fs.readFileSync(f, 'utf8'); manualOk = /PondGate 使用手冊/.test(t) && (t.match(/<h2>/g) || []).length === 13 && /受限設計篩選/.test(t) && /<dt>/.test(t); }
  rec('P21 manual downloads as HTML with all sections', manualOk, dl && dl.suggestedFilename());
  // navigation acceptance (existing QA button) still passes
  await p.evaluate(() => window.DSSWorkspacePages.activate('learn')); await p.click('#qaNavigationRun'); await p.waitForTimeout(500);
  const nav = await p.evaluate(() => document.getElementById('qaNavigationReason').innerText);
  rec('P22 navigation acceptance passes (its check now allows the three-step guide card under Module 6)', /全部導覽驗收通過/.test(nav), nav);
  rec('P23 no request leaves the local server (assistant is offline)', external.length === 0, external);
  rec('P24 no page errors during help checks', errs.length === 0, errs);
  // consistency: fix list is non-empty exactly when the run button is disabled (200 random input sets)
  let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let mism = [];
  for (let i = 0; i < 200; i++) {
    const v = { qp: ['0.12', '0', '-1', '', '0.5'][Math.floor(rnd() * 5)], area: ['180', '0', '-3', '50'][Math.floor(rnd() * 4)], h0: ['0', '-0.2', '0.3'][Math.floor(rnd() * 3)], floor: ['0', '0.1'][Math.floor(rnd() * 2)], cw: ['1.7', '0'][Math.floor(rnd() * 2)], bw: ['0.2', '0', ''][Math.floor(rnd() * 3)], crest: ['0', '-0.5', '0.2'][Math.floor(rnd() * 3)], weir: rnd() < 0.8, ori: rnd() < 0.4, cd: ['0.62', '0'][Math.floor(rnd() * 2)], ao: ['0.01', '0'][Math.floor(rnd() * 2)], invert: ['0.05', '-1'][Math.floor(rnd() * 2)], tpeak: ['30', '0'][Math.floor(rnd() * 2)], recess: ['30', '0'][Math.floor(rnd() * 2)] };
    const r = await p.evaluate(v => { const $ = id => document.getElementById(id), ev = (e, t) => e.dispatchEvent(new Event(t, { bubbles: true }));
      for (const id of ['qp', 'area', 'h0', 'floor', 'cw', 'bw', 'crest', 'cd', 'ao', 'invert', 'tpeak', 'recess']) { const e = $(id); if (!e) continue; e.value = v[id]; ev(e, 'input'); ev(e, 'change'); }
      for (const [id, c] of [['weirOn', v.weir], ['oriOn', v.ori]]) { const e = $(id); if (e.checked !== c) { e.checked = c; ev(e, 'change'); } }
      return { dis: $('run').disabled, n: window.PondGateHelp.inputProblems().length }; }, v);
    if (r.dis !== (r.n > 0)) mism.push({ i, v, r });
  }
  rec('P25 fix list matches the run-button state in 200 random input sets', mism.length === 0, { mismatches: mism.length, first: mism[0] });
  // English teaching example must not freeze the page (it froze in v1.0.2)
  const frozen = async p0 => { const q = await b.newPage(); q.on('dialog', d => d.accept()); await q.goto(url(p0)); await q.waitForTimeout(1000); await q.click('#lang'); await q.waitForTimeout(300);
    await q.evaluate(() => window.DSSWorkspacePages.activate('learn')); await Promise.race([q.click('#teachDemo', { timeout: 8000 }).catch(() => 0), new Promise(r => setTimeout(r, 9000))]);
    const r = await Promise.race([q.evaluate(() => 'ok'), new Promise(r => setTimeout(() => r('HUNG'), 8000))]); q.close().catch(() => 0); return r; };
  const fNew = await frozen(port), fOld = await frozen(basePort);
  rec('P27 English interface: loading the teaching example keeps the page responsive', fNew === 'ok', fNew);
  rec('N3 negative control: the same action freezes v1.0.2', fOld === 'HUNG', fOld);
  // mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 } }); await m.goto(url(port)); await m.waitForTimeout(1200);
  await m.evaluate(() => window.DSSWorkspacePages.openTarget('helpCenter')); await m.click('#helpFab'); await m.waitForTimeout(300);
  const mw = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, dw: document.getElementById('helpDrawer').getBoundingClientRect().right }));
  rec('P26 phone width: no horizontal scroll, drawer fits', mw.sw <= 390 && mw.dw <= 390, mw);
  await m.screenshot({ path: out.replace(/\.json$/, '_mobile.png') });
  await b.close().catch(() => 0);
  const summary = { version: '1.1.0', total: results.length, failed: results.filter(r => !r.ok).length, results };
  fs.writeFileSync(out, JSON.stringify(summary, null, 1)); console.log(`\n${summary.total - summary.failed}/${summary.total} checks OK`);
  process.exit(summary.failed ? 1 : 0);
})();
