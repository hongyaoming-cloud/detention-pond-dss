/* Pipeline M1 -> M2 -> M3 -> DSS adapter, with a reproducible run record. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const deps = isNode
    ? [require('./rainfall.js'), require('./losses.js'), require('./transform.js'), require('./dss-adapter.js')]
    : [root.TPHYDRainfall, root.TPHYDLosses, root.TPHYDTransform, root.TPHYDDSSAdapter];
  const api = factory(...deps);
  if (isNode) module.exports = api;
  if (root) root.TPHYDPipeline = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Rainfall, Losses, Transform, Adapter) {
  const SOFTWARE = Object.freeze({ name: 'TPHYD catchment hydrograph', version: '0.1.2' });

  function buildRain(spec) {
    switch (spec && spec.method) {
      case 'uniform': return Rainfall.uniform(spec);
      case 'alternating-block': return Rainfall.alternatingBlock(spec);
      case 'custom': return Rainfall.custom(spec);
      case 'observed': return Rainfall.observed(spec);
      default: throw new Error(`Unknown rainfall method: ${spec && spec.method}`);
    }
  }
  function warningsFor(cfg) {
    const w = [];
    if (cfg.loss.method === 'runoff-coefficient') w.push('C is user-supplied; no catchment C values are built in. Document the source of C in the run record.');
    if (cfg.transform.source === 'empirical-formula') w.push('Empirical Tc formulas (e.g. Kirpich) can differ strongly from observed Tc in small steep catchments; compare with observed Tc.');
    return w;
  }

  /* cfg: {catchment:{id, area_ha, source}, rainfall:{...}, loss:{...}, transform:{...}, output:{baseflow_m3s, max_points}} */
  function run(cfg) {
    if (!cfg || !cfg.catchment) throw new Error('Configuration with a catchment is required.');
    const area_ha = cfg.catchment.area_ha;
    const rain = buildRain(cfg.rainfall);
    const excess = Losses.apply(rain, cfg.loss);
    const hydro = Transform.apply(excess, { ...cfg.transform, area_ha });
    /* model continuity: routed direct-runoff volume vs excess volume */
    const contRel = hydro.excess_volume_m3 > 0 ? Math.abs(hydro.volume_m3 - hydro.excess_volume_m3) / hydro.excess_volume_m3 : 0;
    if (contRel > Adapter.VOLUME_TOLERANCE) throw new Error(`Transform continuity error ${(contRel * 100).toFixed(3)}% exceeds 0.5%.`);
    const dss = Adapter.toDSS(hydro, cfg.output || {});
    const ratio = Math.round(rain.dt_min / hydro.dt_min);
    const full = ['time_min,rain_mm,excess_mm,inflow_m3s'];
    const base = (cfg.output && cfg.output.baseflow_m3s) || 0;
    hydro.time_min.forEach((t, k) => {
      const j = Math.floor(k / ratio);
      const onStart = k % ratio === 0 && j < rain.rain_mm.length;
      full.push(`${t},${onStart ? rain.rain_mm[j] : ''},${onStart ? excess.excess_mm[j] : ''},${hydro.q_m3s[k] + base}`);
    });
    const record = {
      software: SOFTWARE,
      dss_target: Adapter.DSS_TARGET,
      created_utc: new Date().toISOString(),
      catchment: cfg.catchment,
      rainfall: { ...cfg.rainfall, rows: cfg.rainfall.rows ? `${cfg.rainfall.rows.length} rows` : undefined, total_mm: Rainfall.total(rain) },
      loss: { ...excess.params, method: excess.method, excess_total_mm: excess.excess_mm.reduce((s, v) => s + v, 0) },
      transform: { ...hydro.params, method: hydro.method, dt_out_min: hydro.dt_min },
      checks: {
        transform_continuity_rel: contRel,
        dss_volume_rel: dss.volume_rel_error,
        dss_n_points: dss.n_points,
        peak_inflow_m3s: Math.max(...dss.pairs.map(p => p[1])),
        tolerance: Adapter.VOLUME_TOLERANCE
      },
      output: { baseflow_m3s: base },
      warnings: [...warningsFor(cfg), ...dss.warnings]
    };
    return { rain, excess, hydro, dss, fullCsv: full.join('\n') + '\n', record };
  }
  return Object.freeze({ SOFTWARE, run, buildRain });
});
