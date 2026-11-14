/* M3 Runoff transformation: effective rainfall -> outlet hydrograph (direct runoff, m3/s).
 * Input: excess {dt_min, excess_mm[]}, catchment area_ha.
 * Output: {dt_min (= output step), time_min[], q_m3s[], volume_m3, excess_volume_m3, method, params}.
 * q at time_min[k] is an instantaneous value; series starts at t = 0 with q = 0. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TPHYDTransform = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const MAX_STEPS = 200000;

  function setup(ex, area_ha, dt_out_min) {
    if (!ex || !Array.isArray(ex.excess_mm) || !(ex.dt_min > 0)) throw new Error('An excess series {dt_min, excess_mm[]} is required.');
    if (!(Number.isFinite(area_ha) && area_ha > 0)) throw new Error('area_ha must be a positive number.');
    const dt = dt_out_min === undefined ? Math.min(1, ex.dt_min) : dt_out_min;
    if (!(dt > 0)) throw new Error('dt_out_min must be positive.');
    const ratio = Math.round(ex.dt_min / dt);
    if (Math.abs(ratio * dt - ex.dt_min) > 1e-9) throw new Error('Rainfall step must be an integer multiple of the output step.');
    const A = area_ha * 1e4; // m2
    /* constant inflow rate (m3/s) during output sub-step k */
    const rate = [];
    ex.excess_mm.forEach(e => {
      if (!(Number.isFinite(e) && e >= 0)) throw new Error('excess_mm values must be finite and >= 0.');
      const q = e / 1000 * A / (ex.dt_min * 60);
      for (let j = 0; j < ratio; j++) rate.push(q);
    });
    const excessVolume = ex.excess_mm.reduce((s, e) => s + e, 0) / 1000 * A;
    return { dt, rate, A, excessVolume };
  }
  function trapz(q, dt_min) {
    let v = 0;
    for (let i = 1; i < q.length; i++) v += (q[i - 1] + q[i]) / 2 * dt_min * 60;
    return v;
  }
  function finish(q, dt, excessVolume, method, params) {
    const time_min = q.map((_, i) => +(i * dt).toFixed(10));
    return { dt_min: dt, time_min, q_m3s: q, volume_m3: trapz(q, dt), excess_volume_m3: excessVolume, method, params };
  }
  /* stop when excess has ended and flow has receded below tailFraction of the peak */
  function shouldStop(k, nRate, q, qmax, tailFraction) {
    return k >= nRate && qmax > 0 && q <= tailFraction * qmax;
  }

  /* Linear reservoir S = K Q, exact solution for piecewise-constant inflow. */
  function linearReservoir(ex, { area_ha, K_min, dt_out_min, tail_fraction = 0.001 }) {
    if (!(Number.isFinite(K_min) && K_min > 0)) throw new Error('K_min must be a positive number.');
    const { dt, rate, excessVolume } = setup(ex, area_ha, dt_out_min);
    if (dt > K_min / 2) throw new Error('Output step must not exceed K/2; reduce dt_out_min.');
    const a = Math.exp(-dt / K_min);
    const q = [0]; let Q = 0, qmax = 0;
    for (let k = 0; k < MAX_STEPS; k++) {
      const I = k < rate.length ? rate[k] : 0;
      Q = I + (Q - I) * a;
      q.push(Q); qmax = Math.max(qmax, Q);
      if (shouldStop(k + 1, rate.length, Q, qmax, tail_fraction)) break;
      if (qmax === 0 && k + 1 >= rate.length) break;
    }
    return finish(q, dt, excessVolume, 'linear-reservoir', { K_min, tail_fraction });
  }

  /* Nash cascade: n equal linear reservoirs (K each). Each reservoir uses the exact
   * single-reservoir update with the upstream sub-step mean outflow as inflow. */
  function nashCascade(ex, { area_ha, n, K_min, dt_out_min, substeps = 10, tail_fraction = 0.001 }) {
    if (!(Number.isInteger(n) && n >= 1 && n <= 20)) throw new Error('n must be an integer in [1, 20].');
    if (!(Number.isFinite(K_min) && K_min > 0)) throw new Error('K_min must be a positive number.');
    const { dt, rate, excessVolume } = setup(ex, area_ha, dt_out_min);
    if (dt > K_min / 2) throw new Error('Output step must not exceed K/2; reduce dt_out_min.');
    const h = dt / substeps, a = Math.exp(-h / K_min);
    const Qs = Array(n).fill(0);
    const q = [0]; let qmax = 0;
    for (let k = 0; k < MAX_STEPS; k++) {
      const I0 = k < rate.length ? rate[k] : 0;
      for (let s = 0; s < substeps; s++) {
        let I = I0;
        for (let r = 0; r < n; r++) {
          const before = Qs[r];
          Qs[r] = I + (before - I) * a;
          /* exact mean outflow over the sub-step for constant inflow I */
          I = I + (before - I) * (K_min / h) * (1 - a);
        }
      }
      const Q = Qs[n - 1];
      q.push(Q); qmax = Math.max(qmax, Q);
      if (shouldStop(k + 1, rate.length, Q, qmax, tail_fraction)) break;
      if (qmax === 0 && k + 1 >= rate.length) break;
    }
    return finish(q, dt, excessVolume, 'nash-cascade', { n, K_min, substeps, tail_fraction });
  }

  /* SCS dimensionless unit hydrograph (NEH Part 630, Ch. 16, Table 16-1). */
  const SCS_T = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4, 4.5, 5];
  const SCS_Q = [0, .03, .1, .19, .31, .47, .66, .82, .93, .99, 1, .99, .93, .86, .78, .68, .56, .46, .39, .33, .28, .207, .147, .107, .077, .055, .04, .029, .021, .015, .011, .005, 0];
  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let i = 1; while (xs[i] < x) i++;
    return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  }
  function scsUnitHydrograph(ex, { area_ha, Tc_min, lag_ratio = 0.6, dt_out_min }) {
    if (!(Number.isFinite(Tc_min) && Tc_min > 0)) throw new Error('Tc_min must be a positive number.');
    const { dt, A, excessVolume } = setup(ex, area_ha, dt_out_min);
    const D = ex.dt_min, tL = lag_ratio * Tc_min, Tp = D / 2 + tL;
    if (D > 0.29 * Tp * 1.0001) throw new Error('Rainfall step is too long for the SCS UH (D should be <= 0.29 Tp).');
    const nU = Math.ceil(5 * Tp / dt) + 1;
    const u = Array.from({ length: nU }, (_, i) => interp(i * dt / Tp, SCS_T, SCS_Q));
    /* normalise to 1 mm of excess over the catchment */
    const scale = (A / 1000) / trapz(u, dt);
    const U = u.map(v => v * scale);
    const lagSteps = Math.round(D / dt);
    const len = (ex.excess_mm.length - 1) * lagSteps + nU;
    const q = Array(len).fill(0);
    ex.excess_mm.forEach((e, j) => {
      if (e > 0) for (let i = 0; i < nU; i++) q[j * lagSteps + i] += e * U[i];
    });
    return finish(q, dt, excessVolume, 'scs-unit-hydrograph', { Tc_min, lag_ratio, Tp_min: Tp, D_min: D });
  }

  function apply(ex, spec) {
    switch (spec && spec.method) {
      case 'linear-reservoir': return linearReservoir(ex, spec);
      case 'nash-cascade': return nashCascade(ex, spec);
      case 'scs-unit-hydrograph': return scsUnitHydrograph(ex, spec);
      default: throw new Error(`Unknown transform method: ${spec && spec.method}`);
    }
  }
  return Object.freeze({ linearReservoir, nashCascade, scsUnitHydrograph, apply, trapz });
});
