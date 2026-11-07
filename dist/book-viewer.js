/* PondGate v1.3.0 book viewer: reads window.PondGateBookData (dist/book-data.js),
   shows the book inside "Start here → Book", searches it offline for the AI assistant,
   and builds the downloadable single-file HTML. Display only: it never changes an input
   or a computed value. */
(function () {
  'use strict';
  const D = window.PondGateBookData; if (!D) return;
  const zh = () => document.documentElement.lang === 'zh-Hant';
  const T = (a, b) => (zh() ? a : b);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let cur = D.chapters[0].id, query = '';

  const CSS = `.bk-wrap{display:flex;gap:14px;align-items:flex-start}.bk-toc{flex:0 0 250px;max-height:80vh;position:sticky;top:10px;overflow:auto;border:1px solid #d6e3e8;border-radius:6px;background:#fff;padding:6px 0;font-size:14px}
.bk-toc button{display:block;width:100%;text-align:left;border:0;background:none;padding:5px 12px;font:inherit;color:#0b3c5d;cursor:pointer}.bk-toc button.on{background:#e6f1f6;font-weight:700}.bk-toc .bk-part{padding:8px 12px 2px;color:#6b7f8e;font-size:12px}
.bk-main{flex:1;min-width:0}.bk-view{border:1px solid #d6e3e8;border-radius:6px;background:#fff;padding:6px 18px 14px;line-height:1.75}
.bk-view h2{font-size:21px;color:#0b3c5d;border-bottom:2px solid #d6e3e8;padding-bottom:4px}.bk-view h3{font-size:17px;color:#0b557d;margin-top:20px}
.bk-t{border-collapse:collapse;margin:8px 0;font-size:14px}.bk-t th,.bk-t td{border:1px solid #c9d6de;padding:4px 8px;text-align:left;vertical-align:top}.bk-t th{background:#eef4f7}.bk-tw{overflow-x:auto}
.bk-eq{font-family:"Cambria Math","STIX Two Math","Times New Roman",serif;background:#f6f9fb;border-left:3px solid #0b557d;padding:8px 14px;margin:8px 0;font-size:16px}
.bk-fig{margin:12px 0;text-align:center}.bk-fig img{max-width:100%;border:1px solid #d6e3e8;border-radius:4px}.bk-fig figcaption{font-size:13px;color:#425b6d;margin-top:4px}
.bk-nav{display:flex;justify-content:space-between;gap:8px;margin-top:10px}.bk-search{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #9fb3c1;border-radius:5px;font:inherit;margin-bottom:6px}
.bk-hits{border:1px solid #d6e3e8;border-radius:6px;background:#fffbea;padding:6px 10px;margin-bottom:8px;font-size:14px}.bk-hits button{border:0;background:none;color:#0b557d;text-decoration:underline;cursor:pointer;font:inherit;padding:2px 0;text-align:left}
.bk-dl{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}@media(max-width:760px){.bk-wrap{display:block}.bk-toc{max-height:220px;margin-bottom:10px;position:static}}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  /* ---------- offline search: whole-word hits for Latin terms, two-character hits for Chinese ---------- */
  function terms(q) {
    const out = new Set();
    (q.toLowerCase().match(/[a-z0-9.,]+/g) || []).filter(w => w.length > 1).forEach(w => out.add(w));
    (q.match(/[㐀-鿿]+/g) || []).forEach(run => { if (run.length === 1) out.add(run); for (let i = 0; i + 1 < run.length; i++) out.add(run.slice(i, i + 2)); });
    ['什麼', '怎麼', '如何', '為什', '麼是', '請問', '可以', '是否', '一下', '我的', '這個', '要怎'].forEach(s => out.delete(s));
    return [...out];
  }
  function search(q, n) {
    const ts = terms(q || ''); if (!ts.length) return [];
    return D.index.filter(s => !/AI 助理/.test(s.title)).map(s => {
      const title = (s.chapter + ' ' + s.title).toLowerCase(), text = s.text.toLowerCase();
      let score = 0, hit = 0;
      ts.forEach(t => { const inT = title.includes(t), c = text.split(t).length - 1; if (inT || c) hit++; score += (inT ? 4 : 0) + Math.min(c, 4); });
      return { s, score: hit / ts.length >= 0.5 ? score * hit / ts.length : 0 };
    }).filter(x => x.score > 1).sort((a, b) => b.score - a.score).slice(0, n || 3).map(x => x.s);
  }
  function snippet(s, q) {
    const t = s.text; const ts = terms(q); let at = 0;
    for (const w of ts) { const k = t.toLowerCase().indexOf(w); if (k >= 0) { at = k; break; } }
    const a = Math.max(0, at - 30); return (a ? '…' : '') + t.slice(a, a + 90) + (t.length > a + 90 ? '…' : '');
  }
  const chapterOf = id => D.chapters.find(c => c.id === id || c.sec.some(s => s.id === id)) || D.chapters[0];

  /* ---------- rendering ---------- */
  function tocHtml() {
    let part = null;
    return D.chapters.map(c => { let h = ''; if (c.part !== part) { part = c.part; if (part) h += `<div class="bk-part">${esc(part)}</div>`; }
      return h + `<button type="button" data-bk-go="${c.id}" class="${c.id === cur ? 'on' : ''}">${esc(c.title)}</button>`; }).join('');
  }
  function chapterHtml(srcMap) {
    const c = chapterOf(cur), i = D.chapters.indexOf(c), prev = D.chapters[i - 1], next = D.chapters[i + 1];
    return fixImg(c.html, srcMap) + `<div class="bk-nav">${prev ? `<button type="button" class="hc-btn" data-bk-go="${prev.id}">← ${esc(prev.title)}</button>` : '<span></span>'}${next ? `<button type="button" class="hc-btn" data-bk-go="${next.id}">${esc(next.title)} →</button>` : ''}</div>`;
  }
  const fixImg = (html, srcMap) => html.replace(/data-bk-src="([^"]+)"/g, (m, f) => `src="${srcMap && srcMap[f] ? srcMap[f] : f}" loading="lazy"`);
  function hitsHtml() {
    if (!query.trim()) return '';
    const r = search(query, 6);
    return `<div class="bk-hits">${r.length ? r.map(s => `<div><button type="button" data-bk-go="${s.id}">${esc(s.chapter === s.title ? s.title : s.chapter + '｜' + s.title)}</button><br><span>${esc(snippet(s, query))}</span></div>`).join('') : T('書中找不到相關內容，請換個說法。', 'No match in the book; try other words.')}</div>`;
  }
  function paneHtml() {
    return `${zh() ? '' : '<p class="hc-lead">The book is written in Traditional Chinese. The short user manual is available in English.</p>'}
      <p class="hc-lead">${esc(D.title)}（v${esc(D.version)}）。${T('第一部是使用手冊，第二部用範例一步一步教您完成滯洪池檢核。書中所有數字都由本版軟體實際執行，再用獨立程式驗算。', 'Part I is the user manual; Part II teaches detention-pond checking step by step with worked examples. Every number was produced by this version and recomputed independently.')}</p>
      <div class="bk-dl"><a class="hc-btn primary" id="bkPdf" href="${esc(D.downloads.pdf)}" download>${T('下載 PDF', 'Download PDF')}</a><button type="button" class="hc-btn" id="bkHtml">${T('下載單一網頁版（HTML）', 'Download single-page HTML')}</button><a class="hc-btn" id="bkZip" href="${esc(D.downloads.zip)}" download>${T('下載範例資料（ZIP）', 'Download example data (ZIP)')}</a></div>
      <div class="bk-wrap"><nav class="bk-toc" aria-label="${T('目錄', 'Contents')}">${tocHtml()}</nav><div class="bk-main">
      <input type="search" class="bk-search" id="bkSearch" placeholder="${T('在書中搜尋，例如：孔口公式、RK4、無可行解', 'Search the book, e.g. orifice, RK4, no feasible solution')}" value="${esc(query)}">
      <div id="bkHits">${hitsHtml()}</div><article class="bk-view" id="bkView">${chapterHtml()}</article></div></div>`;
  }
  function refresh(scrollTo) {
    const v = document.getElementById('bkView'); if (!v) return;
    v.innerHTML = chapterHtml();
    document.querySelectorAll('.bk-toc button').forEach(b => b.classList.toggle('on', b.dataset.bkGo === chapterOf(cur).id));
    const el = scrollTo && document.getElementById(scrollTo); (el || v).scrollIntoView({ block: 'start' });
  }
  function open(id) { cur = chapterOf(id).id; setTimeout(() => refresh(id), 0); }

  /* ---------- downloadable single-file HTML (figures embedded) ---------- */
  async function images() {
    const map = {}; const files = [...new Set(D.chapters.flatMap(c => [...c.html.matchAll(/data-bk-src="([^"]+)"/g)].map(m => m[1])))];
    await Promise.all(files.map(async f => { try { const r = await fetch(f); if (!r.ok) return; const b = await r.blob();
      map[f] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(b); }); } catch (e) { /* left as a link */ } }));
    return map;
  }
  async function documentHtml() {
    const map = await images();
    const toc = D.chapters.map(c => `<li><a href="#${c.id}">${esc(c.title)}</a></li>`).join('');
    const body = D.chapters.map(c => `<section>${fixImg(c.html, map).replace(/ loading="lazy"/g, '')}</section>`).join('');
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(D.title)} v${esc(D.version)}</title><style>body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;line-height:1.75;color:#102a43}
.cover{text-align:center;padding:60px 0 30px;border-bottom:2px solid #0b557d;margin-bottom:20px}.cover h1{color:#0b3c5d;font-size:28px}.toc li{margin:2px 0}section{page-break-before:always}section h2{color:#0b3c5d;border-bottom:2px solid #d6e3e8;padding-bottom:4px}h3{color:#0b557d}
${CSS.replace(/\.bk-view /g, '')}@media print{a{color:inherit;text-decoration:none}.bk-tw{overflow:visible}figure{page-break-inside:avoid}table{page-break-inside:avoid}}</style></head><body>
<div class="cover"><h1>${esc(D.title)}</h1><p>PondGate v${esc(D.version)}｜繁體中文版</p><p>洪耀明（Yao-Ming Hong）　國立東華大學自然資源與環境學系</p><p>書中數字皆由本版軟體實際執行，並以獨立程式驗算。</p></div>
<h2>目錄</h2><ol class="toc">${toc}</ol>${body}</body></html>`;
  }
  async function downloadHtml() {
    const html = await documentHtml();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `PondGate_book_v${D.version}_zh-Hant.html`; document.body.appendChild(a); a.click(); a.remove();
  }

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-bk-go]'); if (g) { e.preventDefault(); query = ''; const h = document.getElementById('bkHits'); if (h) h.innerHTML = ''; const s = document.getElementById('bkSearch'); if (s) s.value = ''; open(g.dataset.bkGo); return; }
    if (e.target.closest('#bkHtml')) downloadHtml();
  });
  document.addEventListener('input', e => { if (e.target.id === 'bkSearch') { query = e.target.value; const h = document.getElementById('bkHits'); if (h) h.innerHTML = hitsHtml(); } });

  window.PondGateBook = Object.freeze({ version: D.version, title: D.title, paneHtml, open, search, snippet, documentHtml, chapters: () => D.chapters.map(c => ({ id: c.id, title: c.title })) });
})();
