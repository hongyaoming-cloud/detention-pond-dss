/* M2 Effective rainfall (loss models). Input/output are depth series {dt_min, rain_mm[]}.
 * Output: {dt_min, excess_mm[], loss_mm[], method, params}. Excess never exceeds rain. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TPHYDLosses = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function checkRain(r) {
    if (!r || !Array.isArray(r.rain_mm) || !(r.dt_min > 0)) throw new Error('A rainfall series {dt_min, rain_mm[]} is required.');
    r.rain_mm.forEach((v, i) => { if (!(Number.isFinite(v) && v >= 0)) throw new Error(`rain_mm[${i}] invalid.`); });
  }
  function pack(r, excess, method, params) {
    const loss = r.rain_mm.map((p, i) => p - excess[i]);
    excess.forEach((e, i) => {
      if (e < -1e-12 || e > r.rain_mm[i] + 1e-12) throw new Error(`Internal check failed: excess out of [0, rain] at step ${i}.`);
    });
    return { dt_min: r.dt_min, excess_mm: excess.map(e => Math.max(0, e)), loss_mm: loss, method, params };
  }

  /* Runoff coefficient: excess = C * rain. C is user-supplied; no catchment values are built in. */
  function runoffCoefficient(r, { C }) {
    checkRain(r);
    if (!(Number.isFinite(C) && C >= 0 && C <= 1)) throw new Error('C must lie in [0, 1].');
    return pack(r, r.rain_mm.map(p => C * p), 'runoff-coefficient', { C });
  }

  /* SCS Curve Number on cumulative rainfall; incremental excess by differencing.
   * S = 25400/CN - 254 (mm); Ia = lambda*S; Q = (P-Ia)^2/(P-Ia+S) for P > Ia. */
  function scsCurveNumber(r, { CN, lambda = 0.2 }) {
    checkRain(r);
    if (!(Number.isFinite(CN) && CN >= 30 && CN <= 100)) throw new Error('CN must lie in [30, 100].');
    if (!(Number.isFinite(lambda) && lambda >= 0 && lambda <= 0.3)) throw new Error('lambda must lie in [0, 0.3].');
    const S = 25400 / CN - 254, Ia = lambda * S;
    let P = 0, Qprev = 0;
    const ex = r.rain_mm.map(p => {
      P += p;
      const Q = S === 0 ? P : (P > Ia ? (P - Ia) * (P - Ia) / (P - Ia + S) : 0);
      const e = Q - Qprev; Qprev = Q; return e;
    });
    return pack(r, ex, 'scs-cn', { CN, lambda, S_mm: S, Ia_mm: Ia });
  }

  /* Phi index: loss rate phi (mm/h) applied each step, capped at rain. */
  function phiIndex(r, { phi_mmh }) {
    checkRain(r);
    if (!(Number.isFinite(phi_mmh) && phi_mmh >= 0)) throw new Error('phi_mmh must be >= 0.');
    const cap = phi_mmh * r.dt_min / 60;
    return pack(r, r.rain_mm.map(p => Math.max(0, p - cap)), 'phi-index', { phi_mmh });
  }

  /* Initial and constant loss: rain first fills Ia (mm), then constant loss fc (mm/h). */
  function initialConstant(r, { initial_mm, constant_mmh }) {
    checkRain(r);
    if (!(Number.isFinite(initial_mm) && initial_mm >= 0)) throw new Error('initial_mm must be >= 0.');
    if (!(Number.isFinite(constant_mmh) && constant_mmh >= 0)) throw new Error('constant_mmh must be >= 0.');
    let remainingIa = initial_mm;
    const cap = constant_mmh * r.dt_min / 60;
    const ex = r.rain_mm.map(p => {
      const toIa = Math.min(p, remainingIa); remainingIa -= toIa;
      return Math.max(0, p - toIa - cap);
    });
    return pack(r, ex, 'initial-constant', { initial_mm, constant_mmh });
  }

  function apply(r, spec) {
    switch (spec && spec.method) {
      case 'runoff-coefficient': return runoffCoefficient(r, spec);
      case 'scs-cn': return scsCurveNumber(r, spec);
      case 'phi-index': return phiIndex(r, spec);
      case 'initial-constant': return initialConstant(r, spec);
      default: throw new Error(`Unknown loss method: ${spec && spec.method}`);
    }
  }
  return Object.freeze({ runoffCoefficient, scsCurveNumber, phiIndex, initialConstant, apply });
});
