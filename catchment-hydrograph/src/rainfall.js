/* M1 Rainfall input. Produces equally spaced depth series {dt_min, rain_mm[]}.
 * Series convention: rain_mm[i] is the depth falling in [i*dt, (i+1)*dt) minutes.
 * Works in browser (window.TPHYDRainfall) and Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TPHYDRainfall = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function assertPositive(name, v) {
    if (!(Number.isFinite(v) && v > 0)) throw new Error(`${name} must be a positive number (got ${v}).`);
  }
  function checkStep(duration_min, dt_min) {
    assertPositive('duration_min', duration_min);
    assertPositive('dt_min', dt_min);
    const n = Math.round(duration_min / dt_min);
    if (Math.abs(n * dt_min - duration_min) > 1e-9 * duration_min) {
      throw new Error('duration_min must be an integer multiple of dt_min.');
    }
    return n;
  }

  /* Horner intensity I = a / (t + b)^c, t in minutes, I in mm/h. */
  function hornerIntensity(t_min, { a, b, c }) {
    assertPositive('Horner a', a);
    if (!(Number.isFinite(b) && b >= 0)) throw new Error('Horner b must be >= 0.');
    assertPositive('Horner c', c);
    assertPositive('t_min', t_min);
    return a / Math.pow(t_min + b, c);
  }
  /* Cumulative depth (mm) of the most intense t minutes. */
  function hornerDepth(t_min, coef) {
    return hornerIntensity(t_min, coef) * t_min / 60;
  }

  function uniform({ intensity_mmh, duration_min, dt_min }) {
    const n = checkStep(duration_min, dt_min);
    if (!(Number.isFinite(intensity_mmh) && intensity_mmh >= 0)) throw new Error('intensity_mmh must be >= 0.');
    return { dt_min, rain_mm: Array(n).fill(intensity_mmh * dt_min / 60), method: 'uniform' };
  }

  /* Alternating block method: block increments from the Horner IDF curve,
   * largest block at the centre, then alternately right/left (Chow et al., 1988). */
  function alternatingBlock({ horner, duration_min, dt_min, peak_position = 0.5 }) {
    const n = checkStep(duration_min, dt_min);
    if (!(peak_position >= 0 && peak_position <= 1)) throw new Error('peak_position must lie in [0, 1].');
    const inc = [];
    let prev = 0;
    for (let k = 1; k <= n; k++) {
      const d = hornerDepth(k * dt_min, horner);
      inc.push(d - prev);
      prev = d;
    }
    inc.sort((x, y) => y - x);
    const out = Array(n).fill(0);
    let centre = Math.min(n - 1, Math.max(0, Math.round(peak_position * (n - 1))));
    let left = centre - 1, right = centre + 1;
    out[centre] = inc[0];
    let toRight = true;
    for (let k = 1; k < n; k++) {
      if ((toRight && right < n) || left < 0) out[right++] = inc[k];
      else out[left--] = inc[k];
      toRight = !toRight;
    }
    return { dt_min, rain_mm: out, method: 'alternating-block', horner: { ...horner } };
  }

  function custom({ dt_min, rain_mm }) {
    assertPositive('dt_min', dt_min);
    if (!Array.isArray(rain_mm) || rain_mm.length < 1) throw new Error('rain_mm must be a non-empty array.');
    rain_mm.forEach((v, i) => {
      if (!(Number.isFinite(v) && v >= 0)) throw new Error(`rain_mm[${i}] must be a finite value >= 0 (got ${v}).`);
    });
    return { dt_min, rain_mm: rain_mm.slice(), method: 'custom' };
  }

  /* Observed gauge records: rows [{t_min, rain_mm}] with equal spacing dt_min.
   * gaps: [{start_min, end_min}] periods with no record (missing, NOT zero rain).
   * An event touching a gap is refused rather than silently treated as dry. */
  function observed({ rows, dt_min, gaps = [] }) {
    assertPositive('dt_min', dt_min);
    if (!Array.isArray(rows) || rows.length < 1) throw new Error('rows must be a non-empty array.');
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!Number.isFinite(r.t_min) || !Number.isFinite(r.rain_mm) || r.rain_mm < 0) {
        throw new Error(`Observed row ${i} is invalid (time and rain must be finite, rain >= 0).`);
      }
      if (i > 0 && Math.abs(r.t_min - rows[i - 1].t_min - dt_min) > 1e-6) {
        throw new Error(`Observed rows must be equally spaced at ${dt_min} min (break at row ${i}).`);
      }
    }
    const t0 = rows[0].t_min, t1 = rows[rows.length - 1].t_min + dt_min;
    for (const g of gaps) {
      if (g.start_min < t1 && g.end_min > t0) {
        throw new Error(`Event overlaps a no-record gap (${g.start_min}–${g.end_min} min); missing data is not zero rain.`);
      }
    }
    return { dt_min, rain_mm: rows.map(r => r.rain_mm), method: 'observed' };
  }

  function total(series) { return series.rain_mm.reduce((s, v) => s + v, 0); }

  return Object.freeze({ hornerIntensity, hornerDepth, uniform, alternatingBlock, custom, observed, total });
});
