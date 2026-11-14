'use strict';
/* Positive and negative tests for M1, M2, M3, the DSS adapter and the pipeline. Run: node --test tests/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/rainfall.js');
const L = require('../src/losses.js');
const T = require('../src/transform.js');
const D = require('../src/dss-adapter.js');
const P = require('../src/pipeline.js');

const close = (a, b, rel, msg) => assert.ok(Math.abs(a - b) <= rel * Math.max(Math.abs(b), 1e-12), `${msg}: ${a} vs ${b}`);
const HORNER = { a: 1500, b: 20, c: 0.7 }; // synthetic test coefficients, not official values

/* ---------- M1 rainfall ---------- */
test('M1 uniform: total = intensity x duration', () => {
  const r = R.uniform({ intensity_mmh: 30, duration_min: 120, dt_min: 10 });
  close(R.total(r), 60, 1e-12, 'total');
});
test('M1 alternating block: every k-step window max equals Horner depth', () => {
  const r = R.alternatingBlock({ horner: HORNER, duration_min: 180, dt_min: 10 });
  close(R.total(r), R.hornerDepth(180, HORNER), 1e-10, 'total depth');
  for (const k of [1, 3, 6, 12]) {
    let best = 0;
    for (let i = 0; i + k <= r.rain_mm.length; i++) best = Math.max(best, r.rain_mm.slice(i, i + k).reduce((s, v) => s + v, 0));
    close(best, R.hornerDepth(k * 10, HORNER), 1e-10, `max ${k}-block depth`);
  }
});
test('M1 rejects invalid input', () => {
  assert.throws(() => R.uniform({ intensity_mmh: 10, duration_min: 25, dt_min: 10 }), /multiple/);
  assert.throws(() => R.custom({ dt_min: 10, rain_mm: [1, -2] }), /rain_mm\[1\]/);
  assert.throws(() => R.hornerIntensity(10, { a: 1500, b: -1, c: 0.7 }), /Horner b/);
  assert.throws(() => R.observed({ dt_min: 10, rows: [{ t_min: 0, rain_mm: 1 }, { t_min: 20, rain_mm: 1 }] }), /equally spaced/);
  assert.throws(() => R.observed({ dt_min: 10, rows: [{ t_min: 0, rain_mm: 1 }, { t_min: 10, rain_mm: 1 }], gaps: [{ start_min: 5, end_min: 50 }] }), /not zero rain/);
});

/* ---------- M2 losses ---------- */
const RAIN = R.custom({ dt_min: 10, rain_mm: [2, 5, 12, 20, 8, 3, 0, 1] });
test('M2 no-loss limits return rain unchanged', () => {
  for (const spec of [{ method: 'runoff-coefficient', C: 1 }, { method: 'scs-cn', CN: 100 }, { method: 'phi-index', phi_mmh: 0 }, { method: 'initial-constant', initial_mm: 0, constant_mmh: 0 }]) {
    const e = L.apply(RAIN, spec);
    e.excess_mm.forEach((v, i) => close(v, RAIN.rain_mm[i], 1e-12, `${spec.method} step ${i}`));
  }
});
test('M2 SCS-CN cumulative excess matches the closed form', () => {
  const e = L.scsCurveNumber(RAIN, { CN: 75 });
  const P = R.total(RAIN), S = 25400 / 75 - 254, Ia = 0.2 * S;
  close(e.excess_mm.reduce((s, v) => s + v, 0), (P - Ia) ** 2 / (P - Ia + S), 1e-12, 'Q');
});
test('M2 excess never exceeds rain and losses are non-negative', () => {
  for (const spec of [{ method: 'runoff-coefficient', C: 0.4 }, { method: 'scs-cn', CN: 60, lambda: 0.05 }, { method: 'phi-index', phi_mmh: 18 }, { method: 'initial-constant', initial_mm: 10, constant_mmh: 6 }]) {
    const e = L.apply(RAIN, spec);
    e.excess_mm.forEach((v, i) => { assert.ok(v >= 0 && v <= RAIN.rain_mm[i] + 1e-12); assert.ok(e.loss_mm[i] >= -1e-12); });
  }
});
test('M2 rejects out-of-range parameters', () => {
  assert.throws(() => L.runoffCoefficient(RAIN, { C: 1.2 }), /C must/);
  assert.throws(() => L.scsCurveNumber(RAIN, { CN: 20 }), /CN must/);
  assert.throws(() => L.phiIndex(RAIN, { phi_mmh: -1 }), /phi_mmh/);
  assert.throws(() => L.apply(RAIN, { method: 'magic' }), /Unknown loss/);
});

/* ---------- M3 transform ---------- */
const AREA = 534.73; // ha, WL2 official area (terrain_FABDEM_20261105.csv)
test('M3 linear reservoir matches the analytic solution for a single pulse', () => {
  const ex = { dt_min: 10, excess_mm: [10] };
  const K = 40, h = T.linearReservoir(ex, { area_ha: AREA, K_min: K, dt_out_min: 1 });
  const I = 10 / 1000 * AREA * 1e4 / 600, peak = I * (1 - Math.exp(-10 / K));
  close(h.q_m3s[10], peak, 1e-10, 'value at end of pulse');
  close(h.q_m3s[30], peak * Math.exp(-20 / K), 1e-10, 'recession');
  close(h.volume_m3, h.excess_volume_m3, 0.005, 'volume');
});
test('M3 every method conserves volume within 0.5%', () => {
  const ex = L.phiIndex(R.alternatingBlock({ horner: HORNER, duration_min: 120, dt_min: 10 }), { phi_mmh: 5 });
  for (const spec of [{ method: 'linear-reservoir', K_min: 45 }, { method: 'nash-cascade', n: 3, K_min: 15 }, { method: 'scs-unit-hydrograph', Tc_min: 60 }]) {
    const h = T.apply(ex, { ...spec, area_ha: AREA });
    close(h.volume_m3, h.excess_volume_m3, 0.005, spec.method);
    assert.equal(h.time_min[0], 0); assert.equal(h.q_m3s[0], 0);
  }
});
test('M3 Nash cascade with n = 1 equals the linear reservoir', () => {
  const ex = { dt_min: 10, excess_mm: [3, 8, 2] };
  const a = T.linearReservoir(ex, { area_ha: AREA, K_min: 30 }), b = T.nashCascade(ex, { area_ha: AREA, n: 1, K_min: 30 });
  for (let i = 0; i < 60; i++) close(b.q_m3s[i], a.q_m3s[i], 1e-9, `step ${i}`);
});
test('M3 Nash cascade peak timing follows (n-1)K for an impulse-like input', () => {
  const h = T.nashCascade({ dt_min: 1, excess_mm: [5] }, { area_ha: AREA, n: 3, K_min: 20, dt_out_min: 0.5 });
  const tp = h.time_min[h.q_m3s.indexOf(Math.max(...h.q_m3s))];
  assert.ok(Math.abs(tp - 40.5) <= 1.5, `peak time ${tp}`);
});
test('M3 rejects invalid parameters', () => {
  const ex = { dt_min: 10, excess_mm: [5] };
  assert.throws(() => T.linearReservoir(ex, { area_ha: AREA, K_min: 0 }), /K_min/);
  assert.throws(() => T.linearReservoir(ex, { area_ha: -1, K_min: 30 }), /area_ha/);
  assert.throws(() => T.linearReservoir(ex, { area_ha: AREA, K_min: 1, dt_out_min: 1 }), /K\/2/);
  assert.throws(() => T.linearReservoir(ex, { area_ha: AREA, K_min: 30, dt_out_min: 3 }), /integer multiple/);
  assert.throws(() => T.scsUnitHydrograph({ dt_min: 30, excess_mm: [5] }, { area_ha: AREA, Tc_min: 20 }), /too long/);
});

/* ---------- DSS adapter (V112 contract) ---------- */
test('DSS validator mirrors V112: header, non-zero start, decreasing time and negatives fail', () => {
  assert.deepEqual(D.validateDSSText('0, 0\n25, 0.10\n50, 0.10\n75, 0'), [[0, 0], [25, 0.1], [50, 0.1], [75, 0]]); // DSS demo text
  assert.throws(() => D.validateDSSText('time_min,inflow_m3s\n0,0\n1,1'), /beginning at 0/);
  assert.throws(() => D.validateDSSText('1, 0\n2, 1'), /beginning at 0/);
  assert.throws(() => D.validateDSSText('0, 0\n2, 1\n2, 0'), /beginning at 0/);
  assert.throws(() => D.validateDSSText('0, 0\n2, -1'), /beginning at 0/);
  assert.throws(() => D.validateDSSText('0, 0'), /beginning at 0/);
});
test('DSS adapter closes the hydrograph with a zero point and keeps volume', () => {
  const h = { time_min: [0, 1, 2, 3, 4], q_m3s: [0, 2, 1, 0.5, 0.001], volume_m3: (1 + 1.5 + 0.75 + 0.2505) * 60 };
  const out = D.toDSS(h, { max_points: 5000 });
  assert.equal(out.pairs.at(-1)[1], 0);
  assert.deepEqual(out.pairs.at(-1), [5, 0]);
  assert.equal(out.pairs[0][0], 0);
  assert.ok(!out.text.startsWith('time'));
  assert.ok(out.csv.startsWith('time_min,inflow_m3s\n'));
  assert.ok(out.volume_rel_error <= 0.005);
});
test('DSS adapter refuses a hydrograph cut off before recession (DSS would drop the tail to 0)', () => {
  const h = { time_min: [0, 1, 2, 3], q_m3s: [0, 2, 1, 0.5], volume_m3: (1 + 1.5 + 0.75) * 60 };
  assert.throws(() => D.toDSS(h), /0.5%/);
});
test('DSS adapter thins long series but keeps the peak', () => {
  const ex = { dt_min: 10, excess_mm: Array(30).fill(4) };
  const h = T.linearReservoir(ex, { area_ha: AREA, K_min: 60, dt_out_min: 0.5 });
  const out = D.toDSS(h, { max_points: 300 });
  assert.ok(out.n_points <= 302);
  close(Math.max(...out.pairs.map(p => p[1])), Math.max(...h.q_m3s), 1e-5, 'peak kept');
  assert.ok(out.warnings.some(w => /thinned/.test(w)));
});

/* ---------- pipeline ---------- */
const CFG = {
  catchment: { id: 'WL2', area_ha: AREA, source: 'terrain_FABDEM_20261105.csv (official area)' },
  rainfall: { method: 'alternating-block', horner: HORNER, duration_min: 180, dt_min: 10 },
  loss: { method: 'scs-cn', CN: 70 },
  transform: { method: 'linear-reservoir', K_min: 45, dt_out_min: 1 },
  output: { baseflow_m3s: 0.2 }
};
test('pipeline output is accepted by the V112 parser and passes both volume checks', () => {
  const res = P.run(CFG);
  const pairs = D.validateDSSText(res.dss.text);
  assert.equal(pairs[0][0], 0); assert.equal(pairs.at(-1)[1], 0);
  assert.ok(res.record.checks.transform_continuity_rel <= 0.005);
  assert.ok(res.record.checks.dss_volume_rel <= 0.005);
  assert.equal(res.record.dss_target.version, 'V112');
  assert.ok(res.fullCsv.split('\n')[0] === 'time_min,rain_mm,excess_mm,inflow_m3s');
});
test('pipeline warns that C is user-supplied', () => {
  const res = P.run({ ...CFG, loss: { method: 'runoff-coefficient', C: 0.3 } });
  assert.ok(res.record.warnings.some(w => /user-supplied/.test(w)));
});
test('DSS adapter warns that a non-zero starting baseflow suppresses RQ in DSS', () => {
  const h = { time_min: [0, 1, 2, 3, 4], q_m3s: [0, 2, 1, 0.5, 0.001], volume_m3: (1 + 1.5 + 0.75 + 0.2505) * 60 };
  assert.ok(D.toDSS(h, { baseflow_m3s: 0.001 }).warnings.some(w => /RQ/.test(w)));
  assert.ok(!D.toDSS(h).warnings.some(w => /RQ/.test(w)));
});
