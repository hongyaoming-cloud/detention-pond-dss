/* Adapter to the existing Detention Pond DSS (Software I), Production V112,
 * commit 2b3a2583b847fe38175be4b92dc2280283cc4dca. The DSS is NOT modified.
 *
 * V112 behaviour read (not executed) from dist/index.html parsePoints() and inflow():
 *  - inflow is pasted into textarea #points, "minutes, m3/s; one pair per line";
 *  - every line must split on /[ ,;\t]+/ into two finite numbers (a header line fails);
 *  - at least 2 pairs; first time exactly 0; times strictly increasing; discharge >= 0;
 *  - linear interpolation between pairs; inflow is 0 after the last pair;
 *  - RQ is reported only when the imported hydrograph starts from a zero baseline (seen in a headless run of a local V112 copy, 2026-11-14).
 * validateDSSText() mirrors those rules so that our output is checked against the same contract. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TPHYDDSSAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const DSS_TARGET = Object.freeze({ name: 'Detention Pond DSS (Software I)', version: 'V112', commit: '2b3a2583b847fe38175be4b92dc2280283cc4dca' });
  const VOLUME_TOLERANCE = 0.005;

  /* Mirror of V112 parsePoints(): returns pairs in minutes or throws the DSS message. */
  function validateDSSText(text) {
    const a = String(text).trim().split(/\n+/).map(x => x.trim().split(/[ ,;\t]+/).map(Number));
    if (a.length < 2 || a.some(x => x.length < 2 || !Number.isFinite(x[0]) || !Number.isFinite(x[1]) || x[1] < 0) ||
        a[0][0] !== 0 || a.some((x, i) => i && x[0] <= a[i - 1][0])) {
      throw new Error('Imported hydrograph needs at least two increasing time, discharge pairs beginning at 0.');
    }
    return a;
  }
  /* Volume the DSS will see: linear interpolation between pairs, 0 afterwards. */
  function dssVolume(pairs) {
    let v = 0;
    for (let i = 1; i < pairs.length; i++) v += (pairs[i - 1][1] + pairs[i][1]) / 2 * (pairs[i][0] - pairs[i - 1][0]) * 60;
    return v;
  }
  function fmt(x, digits) {
    if (x === 0) return '0';
    const s = x.toPrecision(digits);
    return String(Number(s));
  }

  /* hydro: {time_min[], q_m3s[], volume_m3}; options: baseflow_m3s, max_points, digits */
  function toDSS(hydro, { baseflow_m3s = 0, max_points = 5000, digits = 6 } = {}) {
    const t = hydro.time_min, q = hydro.q_m3s;
    if (!Array.isArray(t) || !Array.isArray(q) || t.length !== q.length || t.length < 2) throw new Error('Hydrograph needs matching time_min and q_m3s arrays (>= 2 points).');
    if (!(Number.isFinite(baseflow_m3s) && baseflow_m3s >= 0)) throw new Error('baseflow_m3s must be >= 0.');
    if (t[0] !== 0) throw new Error('Hydrograph must start at time 0.');
    const warnings = [];
    /* thin if needed (keep the peak), never below the native step */
    let stride = Math.max(1, Math.ceil(t.length / (max_points - 1)));
    const idx = [];
    for (let i = 0; i < t.length; i += stride) idx.push(i);
    if (idx[idx.length - 1] !== t.length - 1) idx.push(t.length - 1);
    if (stride > 1) {
      const ip = q.indexOf(Math.max(...q));
      if (!idx.includes(ip)) { idx.push(ip); idx.sort((x, y) => x - y); }
      warnings.push(`Output thinned to every ${stride} steps to respect max_points=${max_points}.`);
    }
    const pairs = idx.map(i => [t[i], q[i] + baseflow_m3s]);
    const step = t[1] - t[0];
    /* DSS treats inflow after the last pair as 0: close the hydrograph explicitly */
    if (pairs[pairs.length - 1][1] !== 0) pairs.push([pairs[pairs.length - 1][0] + step * stride, 0]);
    const rounded = pairs.map(([tm, qq]) => [Number(fmt(tm, 10)), Number(fmt(qq, digits))]);
    for (let i = 1; i < rounded.length; i++) {
      if (!(rounded[i][0] > rounded[i - 1][0])) throw new Error('Rounding produced non-increasing times; increase precision.');
    }
    const text = rounded.map(([tm, qq]) => `${tm}, ${qq}`).join('\n') + '\n';
    const csv = 'time_min,inflow_m3s\n' + rounded.map(([tm, qq]) => `${tm},${qq}`).join('\n') + '\n';
    validateDSSText(text);
    /* volume check against the model volume (direct runoff + baseflow over the model window) */
    const modelVolume = hydro.volume_m3 + baseflow_m3s * t[t.length - 1] * 60;
    const outVolume = dssVolume(rounded);
    const rel = modelVolume > 0 ? Math.abs(outVolume - modelVolume) / modelVolume : 0;
    if (rel > VOLUME_TOLERANCE) throw new Error(`DSS output volume differs from model volume by ${(rel * 100).toFixed(3)}% (> 0.5%).`);
    if (rounded[0][1] > 0) warnings.push('Inflow at t = 0 is above zero (baseflow). DSS V112 then does not report the peak ratio RQ ("Imported hydrograph must begin at a zero event baseline"); set baseflow_m3s to 0 for the event-based DSS screen.');
    if (step > 1) warnings.push('Output step exceeds 1 min; check that the DSS interpolation does not clip the peak.');
    return { text, csv, pairs: rounded, n_points: rounded.length, model_volume_m3: modelVolume, output_volume_m3: outVolume, volume_rel_error: rel, warnings, dss_target: DSS_TARGET };
  }
  return Object.freeze({ DSS_TARGET, VOLUME_TOLERANCE, validateDSSText, dssVolume, toDSS });
});
