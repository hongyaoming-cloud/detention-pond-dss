// v1.3.3 checks: Start here -> Tutorial videos tab (4 voiced MP4 videos) and assistant intent.
// Usage: node audit/videos_v1_3_3/video_check.js <port serving dist/> <out.json>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const { execFileSync } = require('child_process');
const port = process.argv[2] || 8765; const OUT = process.argv[3] || path.join(__dirname, 'video_check_v1_3_3.json'); const ROOT = path.join(__dirname, '..', '..');
const res = []; const ok = (id, pass, detail) => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, JSON.stringify(detail)); };
const FILES = ['pondgate_tutorial_1_login.mp4', 'pondgate_tutorial_2_first_run.mp4', 'pondgate_tutorial_3_change_design.mp4', 'pondgate_tutorial_4_screening.mp4'];
const probe = f => execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name:format=duration', '-of', 'json', f]).toString();
(async () => {
  for (const f of FILES) { const j = JSON.parse(probe(path.join(ROOT, 'dist/videos', f))); const c = j.streams.map(s => s.codec_name).sort().join();
    ok(`V1 ${f} is H.264 + AAC (has voice) and 80–130 s`, c === 'aac,h264' && +j.format.duration > 80 && +j.format.duration < 130, { codecs: c, dur: +j.format.duration }); }
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
  for (const lang of ['zh-Hant', 'en']) {
    if (await p.evaluate(() => document.documentElement.lang) !== lang) { await p.click('#lang'); await p.waitForTimeout(2500); }
    await p.evaluate(() => window.DSSWorkspacePages.openTarget('helpCenter')); await p.waitForTimeout(300);
    await p.click('[data-hc-tab="start"]'); await p.waitForTimeout(200);
    const hiddenBefore = await p.evaluate(() => !!document.querySelector('[data-hc-pane="videos"]')?.hidden);
    ok(`V2-neg [${lang}] videos pane is hidden until its tab is clicked`, hiddenBefore, hiddenBefore);
    await p.click('[data-hc-tab="videos"]'); await p.waitForTimeout(400);
    const v = await p.evaluate(() => [...document.querySelectorAll('[data-hc-pane="videos"] video')].map(x => ({ src: x.getAttribute('src'), vis: x.offsetWidth > 100, pre: x.preload })));
    ok(`V2 [${lang}] tab shows 4 visible players with the right files, preload none`, v.length === 4 && v.every((x, i) => x.src === 'videos/' + FILES[i] && x.vis && x.pre === 'none'), v);
    const tab = await p.evaluate(() => document.querySelector('[data-hc-tab="videos"]').textContent);
    ok(`V3 [${lang}] tab label in current language`, tab === (lang === 'en' ? 'Tutorial videos' : '教學影片'), tab);
  }
  // play test: media loads and plays with audio track
  const play = await p.evaluate(async () => { const el = document.getElementById('hcVid2'); el.muted = true; el.preload = 'auto'; el.load(); await el.play(); await new Promise(r => setTimeout(r, 1500)); const r = { t: el.currentTime, d: el.duration, err: el.error && el.error.code }; el.pause(); return r; });
  ok('V4 video 2 loads and plays in the browser', play.t > 0.5 && play.d > 80 && !play.err, play);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('[data-hc-pane="videos"] .hc-vid:nth-child(4) a[download]')]);
  ok('V5 download button gives the MP4', dl.suggestedFilename() === FILES[3], dl.suggestedFilename());
  const st = await p.evaluate(async () => [(await fetch('videos/pondgate_tutorial_1_login.mp4', { method: 'HEAD' })).status, (await fetch('videos/pondgate_tutorial_9_none.mp4', { method: 'HEAD' })).status]);
  ok('V6 existing video served 200, non-existent 404 (link check can fail)', st[0] === 200 && st[1] === 404, st);
  const a = await p.evaluate(() => { const z = window.PondGateHelp.answer('教學影片在哪裡'); const n = window.PondGateHelp.answer('孔口公式'); return { z: z.text || '', za: (z.actions || []).map(x => x[0]), n: (n.text || '') + JSON.stringify(n.actions || []) }; });
  ok('V7 assistant answers a video question and links to the tab', /教學影片|Tutorial videos/.test(a.z) && a.za.includes('help:videos'), a.za);
  ok('V7-neg an unrelated question does not get the video answer', !a.n.includes('help:videos'), a.n.slice(0, 80));
  const h = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'dist', f))).digest('hex').slice(0, 8);
  const core = ['routing-core.js', 'physics-refinement.js', 'module-shell.js'].map(h);
  ok('V8 core files unchanged', core.join() === 'f8b7c450,54a882a7,337e2da0', core);
  ok('V9 no page errors', errs.length === 0, errs);
  await b.close(); const pass = res.every(x => x.pass);
  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), pass, results: res }, null, 1)); console.log('RESULT', pass ? 'PASS' : 'FAIL', res.filter(x => x.pass).length + '/' + res.length);
})();
