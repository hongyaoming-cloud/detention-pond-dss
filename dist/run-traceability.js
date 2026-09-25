/* Read-only on-screen traceability record. It never changes routing, screening, or downloads. */
(() => {
  const $ = id => document.getElementById(id);
  let current = null;
  let dirty = true;
  const fmt = (value, digits = 3, unit = '') => Number.isFinite(value) ? `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}` : '未提供';
  const text = value => String(value || '').trim() || '未提供';
  const freeIds = ['freeTailwater', 'freeBackwater', 'freeSubmergence', 'freeOperation'];

  function panel() {
    let node = $('runTraceability');
    if (node) return node;
    node = document.createElement('details');
    node.id = 'runTraceability';
    node.className = 'run-traceability';
    node.innerHTML = '<summary><strong>本次可追溯紀錄（唯讀）</strong></summary><div class="traceability-content"></div>';
    const download = $('download');
    if (download) download.insertAdjacentElement('beforebegin', node);
    const style = document.createElement('style');
    style.textContent = '.run-traceability{margin:14px 0;padding:11px 13px;border:1px solid #bfd1dc;border-radius:7px;background:#f8fbfd}.run-traceability summary{cursor:pointer;color:#0b557d}.traceability-content{margin-top:10px}.traceability-content ol{margin:0;padding-left:22px}.traceability-content li{margin:9px 0}.traceability-content strong{color:#102a43}.traceability-content .trace-note{font-size:13px;color:#526a78}';
    document.head.appendChild(style);
    return node;
  }

  function source(label, unit, value) {
    return `<strong>${label}</strong>：${fmt(value, label === 'H0' ? 2 : 3, unit)}；輸入來源：未提供；單位：${unit || '未提供'}。`;
  }
  function snapshot() { if (current?.p) return current.p; try { return typeof last !== 'undefined' && last?.p ? last.p : null; } catch (_) { return null; } }
  function normalRun() { try { return typeof last !== 'undefined' && last?.p && last?.r && last?.e ? last : null; } catch (_) { return null; } }
  function resultRecord() {
    if (dirty) return '<strong>本輪結果摘要</strong>：尚無有效本輪結果；前次摘要已清除，請重新執行路由或連續最佳化。';
    if (current?.kind === 'no-feasible') return `<strong>本輪結果摘要</strong>：無可行解；本輪主導限制：${(current.limits || []).join('、') || '未提供'}。`;
    const run = current?.kind === 'feasible' ? current : normalRun();
    if (!run?.e) return '<strong>本輪結果摘要</strong>：未提供。';
    const h = run.e.hp?.h, q = run.e.pout?.qo;
    const remain = current?.kind === 'feasible' ? current.remain : null;
    return `<strong>本輪結果摘要</strong>：最高水位 ${fmt(h, 3, 'm')}；尖峰出流 ${fmt(q, 4, 'm³/s')}；排空殘留 ${remain === null ? '未提供' : fmt(remain, 2, '%')}。`;
  }
  function render() {
    const root = panel(), out = root.querySelector('.traceability-content'), p = snapshot();
    const isFeasible = !dirty && current?.kind === 'feasible';
    const normal = !dirty && !current && normalRun();
    const mode = dirty ? '尚未完成本輪計算' : current?.kind === 'no-feasible' ? '進階連續最佳化（無可行解）' : isFeasible ? `進階連續最佳化（A+${current.mode === 'b' ? 'b' : 'Ao'}）` : normal ? '探索性路由' : '未提供';
    const when = dirty ? '未提供' : text(current?.time || normal?._traceabilityTime);
    const free = freeIds.map(id => `${$(id)?.checked ? '已完成' : '未完成'}：${({freeTailwater:'尾水位',freeBackwater:'回水／管摩阻',freeSubmergence:'淹沒',freeOperation:'操作控制'})[id]}`).join('；');
    const storage = p?.storageMode === 'table' ? '表列 S(H)；輸入來源：未提供；單位：m、m³。' : `固定平面積 S(H)；面積 ${fmt(p?.area, 2, 'm²')}；輸入來源：未提供；單位：m、m³。`;
    const outlet = p?.weir ? `單一堰流 Qout(H)，Cw=${fmt(p.cw, 2)}、b=${fmt(p.bw, 3, 'm')}` : p?.ori ? `單一矩形開口 Qout(H)，Cd=${fmt(p.cd, 2)}、Ao=${fmt(p.ao, 4, 'm²')}` : 'Qout(H) 關係未提供';
    out.innerHTML = `<ol><li><strong>模式與執行時間</strong>：${mode}；執行時間：${when}。</li><li>${source('入流 Qin(t)', 'm³/s', p?.qp)} ${storage} ${outlet}；輸入來源：未提供；單位：m³/s。 ${source('H0', 'm', p?.h0)}</li><li><strong>自由出流四項佐證狀態</strong>：${free}。佐證紀錄：${text($('freeEvidenceRecord')?.value)}。</li><li><strong>RK4 與時間步長設定</strong>：RK4；時間步長 Δt = 2 s。</li><li><strong>限制條件</strong>：Hallow=${fmt(Number($('hallow')?.value), 3, 'm')}；Qallow=${fmt(Number($('qallow')?.value), 4, 'm³/s')}；排空時間=${fmt(Number($('drainHours')?.value), 2, 'h')}；殘量=${fmt(Number($('residualPct')?.value), 2, '%')}；限制依據：${text($('screeningLimitRecord')?.value)}。</li><li>${resultRecord()}</li><li><strong>適用界線與工程責任警語</strong>：僅適用於已宣告入流、S(H)、Qout(H) 與限制條件下的本輪計算；不等同現地工程驗證或最終工程設計，工程責任仍須由合格專業人員完成。</li></ol><p class="trace-note">本區僅讀取目前工作階段的真實狀態；不寫入、儲存、下載、匯出、上傳或傳輸資料。</p>`;
  }
  function clear() { current = null; dirty = true; render(); }
  window.addEventListener('dss:continuous-result', event => { current = {...event.detail, time: new Date().toISOString()}; dirty = false; render(); });
  ['run', 'optimize'].forEach(id => $(id)?.addEventListener('click', () => setTimeout(() => { current = null; dirty = false; const run = normalRun(); if (run) run._traceabilityTime = new Date().toISOString(); render(); }, 0)));
  document.addEventListener('input', event => { if (!event.target.closest('#runTraceability')) clear(); }, true);
  document.addEventListener('change', event => { if (!event.target.closest('#runTraceability')) clear(); }, true);
  setTimeout(render, 220);
})();
