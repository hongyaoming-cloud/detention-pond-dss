// Captures the annotated screenshots used by the user manual (dist/manual/<lang>/fNN_*.png).
// Usage: serve dist/ on a port, then: node docs/capture_manual_figures.js <port>
// Each figure marks the controls it explains with numbered red boxes; the numbers match the
// figure notes in dist/help-content.js. Screenshots only read the interface; nothing is computed here.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const port = process.argv[2] || 8765; const OUT = path.join(__dirname, '..', 'dist', 'manual');

// [file, page/target to open, container selector, [[selector, number], ...], setup]
const FIGS = [
  ['f01_layout', 'route', 'body', [['#workspacePageTabs', 1], ['#lang', 2], ['#helpFab', 3], ['#workspacePageHost', 4]], null, true],
  ['f02_start', 'helpCenter', '#helpCenter', [['.hc-tabs', 1], ['#hcNextPage', 2], ['.hc-steps', 3]]],
  ['f03_inflow', 'mod-inflow', '#mod-inflow', [['#case', 1], ['#qp', 2], ['#shape', 3], ['#tpeak', 4], ['#dur', 5]]],
  ['f04_storage', 'mod-storage', '#mod-storage', [['#storageMode', 1], ['#floor', 2], ['#storageFile', 3], ['#area', 4], ['#h0', 5]]],
  ['f05_outlet', 'mod-outlet', '#mod-outlet', [['#weirOn', 1, 'label'], ['#cw', 2], ['#bw', 2], ['#crest', 2], ['#oriOn', 3, 'label'], ['#freeDischarge', 4, 'label'], ['#freeDischargeEvidence', 4], ['#freeEvidenceRecord', 5], ['#screeningLimitRecord', 5]], 'free'],
  ['f06_run_invalid', 'mod-routing', '#mod-routing', [['#hcRunFix', 1], ['#run', 2]], 'invalid'],
  ['f07_results', 'mod-evaluation', '#mod-evaluation', [['#qchart', 1], ['#hchart', 2], ['#metricbody', 3], ['#download', 4]], 'run', false, 1500],
  ['f08_screening', 'mod-optimization', '#mod-optimization', [['#qallow', 1], ['#hallow', 1], ['#optConfig', 2], ['#optBmin', 3], ['#optBmax', 3], ['#optimize', 4]], 'teach'],
  ['f09_screen_ok', 'mod-evaluation', '#optout', [['#optout', 1]], 'teach-screen'],
  ['f10_blocked', 'mod-evaluation', '.diagnostic-guide', [['.diagnostic-guide .three-step', 1], ['.diagnostic-guide .diagnostic-list', 2]], 'teach-infeasible'],
  ['f11_teaching', 'teachingAssistant', '#teachingAssistant', [['#teachDemo', 1], ['#teachRestore', 2]]],
  ['f12_assistant', 'helpCenter', '#helpDrawer', [['.hc-quick', 1], ['#hcInput', 2], ['#hcLog', 3]], 'assistant'],
  ['f14_lesson', 'mod-inflow', '#lessonPanel', [['.ls-bar', 1], ['#lessonPanel .ls-b .ls-acts', 2], ['#lessonPanel [data-ls=next]', 3]], 'lesson'],
  ['f13_crossmodel', 'mod-evaluation', 'CROSS', [['#crossReference', 1], ['#crossSource', 2], ['#crossFile', 3], ['#crossRun', 4]], 'run']
];

const ev = (p, id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);

(async () => {
  const b = await chromium.launch();
  for (const lang of ['zh', 'en']) {
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    for (const [file, target, box, marks, setup, viewportOnly, wait] of FIGS) {
      const p = await b.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
      p.on('dialog', d => d.accept());
      await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1200);
      if (lang === 'en') { await p.click('#lang'); await p.waitForTimeout(500); }
      if (setup === 'run' || setup === 'free') await p.evaluate(() => document.getElementById('run').click());
      if (setup === 'invalid') await ev(p, 'qp', '-1');
      if (setup && setup.startsWith('teach')) { await p.evaluate(() => document.getElementById('teachDemo').click()); await p.waitForTimeout(1800); }
      if (setup === 'teach-screen' || setup === 'teach-infeasible') {
        if (setup === 'teach-infeasible') await ev(p, 'qallow', '0.001');
        await p.evaluate(() => document.getElementById('optimize').click()); await p.waitForTimeout(6000);
      }
      await p.waitForTimeout(wait || 600);
      await p.evaluate(t => window.DSSWorkspacePages.openTarget(t), target); await p.waitForTimeout(400);
      if (setup === 'lesson') { await p.evaluate(() => window.PondGateLessons.begin('L2')); await p.waitForTimeout(800); }
      if (setup === 'assistant') { await p.evaluate(() => window.PondGateHelp.open()); await p.fill('#hcInput', lang === 'zh' ? '為什麼執行按鈕不能按？' : 'Why is the run button grey?'); await p.press('#hcInput', 'Enter'); await p.waitForTimeout(400); }
      // hide transient action toasts
      await p.addStyleTag({ content: '.button-feedback{display:none!important}' });
      const clip = await p.evaluate(([box, marks, viewportOnly]) => {
        const find = s => s === 'CROSS' ? document.getElementById('crossReference')?.closest('section,.panel,.card') : document.querySelector(s);
        const C = find(box); if (!C) return null;
        if (!viewportOnly) C.scrollIntoView({ block: 'start' });
        const layer = document.createElement('div'); layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:100000;pointer-events:none'; document.body.appendChild(layer);
        const fixedBox = ['helpDrawer', 'lessonPanel'].includes(C.id);
        const seen = {};
        for (const [sel, n, up] of marks) {
          let el = document.querySelector(sel); if (!el) continue; if (up) el = el.closest(up) || el.parentElement;
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          const x = r.left + (fixedBox ? 0 : scrollX), y = r.top + (fixedBox ? 0 : scrollY);
          const o = document.createElement('div'); o.style.cssText = `position:${fixedBox ? 'fixed' : 'absolute'};left:${x - 3}px;top:${y - 3}px;width:${r.width + 6}px;height:${r.height + 6}px;border:3px solid #d92d20;border-radius:6px;box-sizing:border-box`;
          layer.appendChild(o);
          if (!seen[n]) { seen[n] = 1; const c = document.createElement('div'); c.textContent = n; c.style.cssText = `position:${fixedBox ? 'fixed' : 'absolute'};left:${Math.max(0, x - 16)}px;top:${Math.max(0, y - 16)}px;width:26px;height:26px;border-radius:50%;background:#d92d20;color:#fff;font:700 15px/26px sans-serif;text-align:center;box-shadow:0 0 0 2px #fff`; layer.appendChild(c); }
        }
        if (viewportOnly) return { x: 0, y: 0, width: innerWidth, height: innerHeight, viewport: true };
        const r = C.getBoundingClientRect();
        return fixedBox ? { x: Math.max(0, r.left - 10), y: Math.max(0, r.top - 10), width: r.width + 20, height: r.height + 20, viewport: true }
          : { x: Math.max(0, r.left + scrollX - 12), y: Math.max(0, r.top + scrollY - 12), width: Math.min(r.width + 24, document.documentElement.scrollWidth), height: Math.min(r.height + 24, 1800) };
      }, [box, marks, !!viewportOnly]);
      if (!clip) { console.log('MISSING', lang, file); await p.close(); continue; }
      const f = path.join(OUT, lang, file + '.png');
      if (clip.viewport) { delete clip.viewport; await p.screenshot({ path: f, clip }); }
      else await p.screenshot({ path: f, clip, fullPage: true });
      console.log('saved', lang, file, Math.round(clip.width) + 'x' + Math.round(clip.height));
      await p.close();
    }
  }
  await b.close();
})();
