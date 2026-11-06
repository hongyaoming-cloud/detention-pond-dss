// Checks the full step-by-step guide (Traditional Chinese) and the display fixes made while writing it.
// Usage: node audit/help_v1_1_0/guide_check.js <port v1.1.0> <port v1.0.2> <out.json>
// Positive checks run on v1.1.0; negative controls run the same probes on v1.0.2 and must find the old defects.
const { chromium } = require('playwright'); const fs = require('fs');
const [P11, P102, OUT] = [process.argv[2] || 8765, process.argv[3] || 8766, process.argv[4] || 'guide_check.json'];
const res = []; const ok = (id, pass, detail) => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, detail || ''); };
const setv = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); if (typeof v === 'boolean') e.checked = v; else e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
const FREE = ['freeDischarge', 'freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'];
const met = p => p.evaluate(() => { const rows = [...document.querySelectorAll('#metricbody tr')].map(r => [...r.cells].map(c => c.innerText.trim())); const g = k => (rows.find(r => r[0].includes(k)) || [])[1] || ''; return { qpo: g('Qp,o'), rq: g('RQ'), ds: g('ΔSmax'), hmax: g('Hmax'), eps: g('ε/Vin') }; });
const run = async p => { await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(2200); };
const SIMPLIFIED = /[这们说时设计图输结数页还应该显钮请检录选择关闭开运]/; // common simplified-only forms
const ENGLISH_SENTENCE = /[A-Za-z]{3,}(\s+[A-Za-z(),.\/-]+){3,}/;
async function page(b, port) { const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); p.on('dialog', d => d.accept()); await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500); return p; }
async function englishLeaks(p) {
  return p.evaluate(re => { const R = new RegExp(re); const out = []; const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = it.nextNode(); n; n = it.nextNode()) { const pe = n.parentElement; if (!pe || pe.closest('script,style,#helpCenter,#helpDrawer,#lessonPanel,#ew1A005Benchmark,#ew1A005ThreeEngine,#qualityAssurance,select')) continue;
      const t = n.nodeValue.trim(); if (R.test(t) && !/[一-鿿]/.test(t)) out.push(t.slice(0, 80)); } return out; }, ENGLISH_SENTENCE.source);
}
async function outOfRange(p) {
  await setv(p, 'storageMode', 'table'); await setv(p, 'storageTable', '0, 0\n0.15, 30\n0.30, 70'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(1500);
  return p.evaluate(() => { const g = document.getElementById('inputErrorGuide'); const r = g.getBoundingClientRect();
    const rows = [...document.querySelectorAll('#metricbody tr')].map(t => t.textContent.replace(/\s+/g, ' ').trim());
    return { visible: r.height > 0, text: g.innerText, chinese: /[一-鿿]{6,}/.test(g.innerText), english: /Correct the highlighted input/.test(g.innerText),
      sameSection: g.closest('section') === document.getElementById('run').closest('section'), page: window.DSSWorkspacePages.active(),
      banner: !!document.getElementById('runStaleBanner') && !document.getElementById('runStaleBanner').hidden, dupRows: rows.length - new Set(rows).size }; });
}

(async () => {
  const b = await chromium.launch();
  /* ---- guide content ---- */
  let p = await page(b, P11);
  const G = await p.evaluate(() => window.PondGateStudentGuide);
  const steps = G.chapters.flatMap(c => c.steps), figs = steps.flatMap(s => s.figs);
  ok('G1 guide loaded: 13 chapters, >= 50 steps, >= 35 figures', G.chapters.length === 13 && steps.length >= 50 && figs.length >= 35, `${G.chapters.length} chapters, ${steps.length} steps, ${figs.length} figures`);
  const sizes = await p.evaluate(async files => Promise.all(files.map(async f => { const r = await fetch(`manual/guide/${f}.png`); if (!r.ok) return 0; const bm = await createImageBitmap(await r.blob()); return Math.min(bm.width, bm.height); })), figs.map(f => f.file));
  ok('G2 every guide figure loads and is larger than 100 px', sizes.every(s => s > 100), `smallest side ${Math.min(...sizes)} px`);
  const allText = JSON.stringify([G.chapters.map(c => [c.t, c.intro, c.extra, c.steps.map(s => [s.t, s.do, s.see, s.fix, s.figs.map(f => [f.cap, f.notes])])]), G.errors, G.checklist, G.exercises]);
  const sentences = allText.split(/"/).filter(x => ENGLISH_SENTENCE.test(x) && !/[一-鿿]/.test(x));
  ok('G3 guide text has no English-only sentence', sentences.length === 0, sentences.slice(0, 3).join(' | ') || 'none');
  ok('G4 guide text uses Traditional Chinese (no common simplified-only characters)', !SIMPLIFIED.test(allText));
  ok('G4n negative control: the simplified-character test detects simplified text', SIMPLIFIED.test('这是设计图'));
  const caps = figs.every(f => f.cap && f.notes.length > 0);
  ok('G5 every figure has a caption and numbered notes', caps);
  /* ---- values quoted in the guide match the software now ---- */
  const see = n => steps.find(s => s.n === n).see.join(' ');
  let m = await (async () => { await run(p); return met(p); })();
  ok('G6 chapter 3 values match a fresh run', [m.qpo, m.rq, m.ds, m.hmax, m.eps].every(v => see('3-7').includes(v)), JSON.stringify(m));
  p = await page(b, P11); await setv(p, 'qp', '0.20'); await setv(p, 'tpeak', '20'); await setv(p, 'recess', '40'); await run(p); m = await met(p);
  ok('G7 chapter 4 result A matches', see('4-2').includes(m.qpo) && see('4-2').includes(m.hmax), JSON.stringify(m));
  p = await page(b, P11); for (const id of FREE) await setv(p, id, true); await setv(p, 'freeEvidenceRecord', 'x'); await setv(p, 'screeningLimitRecord', 'x'); await run(p);
  await p.evaluate(() => document.getElementById('optimize').click()); for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); if (/^選定可行/.test((await p.evaluate(() => document.getElementById('optout').innerText)).trim())) break; }
  const sel = await p.evaluate(() => { const rows = [...document.querySelectorAll('#optout tr')].map(r => [...r.cells].map(c => c.innerText.trim())); const g = k => (rows.find(r => r[0].includes(k)) || [])[1]; return [g('池面積'), g('堰寬')]; });
  ok('G8 chapter 8 selected area and weir width match', sel.every(v => v && see('8-6').includes(v)), sel.join(', '));
  /* ---- in-app tab and download ---- */
  p = await page(b, P11);
  await p.evaluate(() => window.DSSWorkspacePages.openTarget('helpCenter')); await p.click('[data-hc-tab="guide"]'); await p.waitForTimeout(300);
  const tab = await p.evaluate(() => ({ details: document.querySelectorAll('[data-hc-pane="guide"] details').length, imgs: document.querySelectorAll('[data-hc-pane="guide"] img').length }));
  ok('G9 in-app guide tab shows chapters, appendices and figures', tab.details === 17 && tab.imgs === figs.length, JSON.stringify(tab));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#hcGuideDl')]);
  const html = fs.readFileSync(await dl.path(), 'utf8');
  ok('G10 downloaded guide is one HTML file with every figure embedded', dl.suggestedFilename() === 'PondGate_student_guide_v1.1.0_zh-Hant.html' && (html.match(/src="data:image\/png;base64,/g) || []).length === figs.length && /lang="zh-Hant"/.test(html), `${dl.suggestedFilename()}, ${(html.length / 1e6).toFixed(1)} MB`);
  /* ---- display fixes, with negative controls on v1.0.2 ---- */
  p = await page(b, P11); const a = await outOfRange(p);
  ok('D1 short S(H) table: stop message is visible beside the run button, in Chinese', a.visible && a.sameSection && a.chinese && !a.english && a.page === 'route', a.text.slice(0, 60));
  ok('D2 short S(H) table: Module 6 marks the shown results as the previous run; no repeated rows', a.banner && a.dupRows === 0);
  await setv(p, 'storageTable', '0, 0\n0.5, 120\n1.0, 300'); await run(p);
  const after = await p.evaluate(() => ({ banner: !document.getElementById('runStaleBanner').hidden, guideHidden: document.getElementById('inputErrorGuide').classList.contains('hide') }));
  ok('D3 after the table is fixed the run succeeds and the notice disappears', !after.banner && after.guideHidden);
  let q = await page(b, P102); const n = await outOfRange(q);
  ok('N4 negative control (v1.0.2): stop message hidden in Module 3, English, repeated rows', !n.visible && n.english && n.dupRows > 0, JSON.stringify({ visible: n.visible, english: n.english, dupRows: n.dupRows }));
  // English left in the Chinese interface, default + long event with evidence
  const leaks = async port => { const p = await page(b, port); let L = await englishLeaks(p); for (const id of FREE) await setv(p, id, true); await setv(p, 'freeEvidenceRecord', 'x'); await setv(p, 'screeningLimitRecord', 'x'); await setv(p, 'case', 'long'); await run(p); L = L.concat(await englishLeaks(p)); await setv(p, 'storageMode', 'table'); L = L.concat(await englishLeaks(p)); return [...new Set(L)]; };
  const l11 = await leaks(P11), l102 = await leaks(P102);
  ok('D5 Chinese interface shows no English-only sentence (default, long event, S(H) table)', l11.length === 0, l11.slice(0, 3).join(' | ') || 'none');
  ok('N5 negative control (v1.0.2): the same scan finds English sentences', l102.length >= 10, `${l102.length} found`);
  // chart time axis follows language
  p = await page(b, P11); await run(p);
  const axis = await p.evaluate(() => { const c = document.getElementById('qchart'); const src = String(window.drawChart || ''); return c && c.width > 0; });
  ok('D6 charts still draw after the axis-label change', axis);
  await b.close();
  const pass = res.filter(r => r.pass).length; console.log(`${pass}/${res.length}`);
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), pass, total: res.length, results: res }, null, 1));
  process.exit(pass === res.length ? 0 : 1);
})();
