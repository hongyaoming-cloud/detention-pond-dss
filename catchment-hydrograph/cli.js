#!/usr/bin/env node
/* Usage: node cli.js <config.json> <output_dir> [prefix]
 * Writes <prefix>_inflow_for_DSS.txt (paste into DSS V112 "Imported time-discharge pairs"),
 * <prefix>_inflow.csv, <prefix>_hydrograph_full.csv and <prefix>_run.json. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { run } = require('./src/pipeline.js');

function main(argv) {
  const [cfgPath, outDir, prefixArg] = argv;
  if (!cfgPath || !outDir) {
    console.error('Usage: node cli.js <config.json> <output_dir> [prefix]');
    return 2;
  }
  const raw = fs.readFileSync(cfgPath);
  const cfg = JSON.parse(raw.toString('utf8'));
  const prefix = prefixArg || cfg.name || path.basename(cfgPath, '.json');
  const result = run(cfg);
  fs.mkdirSync(outDir, { recursive: true });
  const record = { ...result.record, config_file: path.basename(cfgPath), config_sha256: crypto.createHash('sha256').update(raw).digest('hex') };
  const files = {
    [`${prefix}_inflow_for_DSS.txt`]: result.dss.text,
    [`${prefix}_inflow.csv`]: result.dss.csv,
    [`${prefix}_hydrograph_full.csv`]: result.fullCsv
  };
  record.outputs = {};
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), body);
    record.outputs[name] = crypto.createHash('sha256').update(body).digest('hex');
  }
  fs.writeFileSync(path.join(outDir, `${prefix}_run.json`), JSON.stringify(record, null, 2) + '\n');
  console.log(`peak ${record.checks.peak_inflow_m3s.toFixed(4)} m3/s, ${record.checks.dss_n_points} points, ` +
    `DSS volume error ${(record.checks.dss_volume_rel * 100).toFixed(4)}%`);
  for (const w of record.warnings) console.log('WARNING: ' + w);
  return 0;
}
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error('ERROR: ' + e.message); process.exitCode = 1; }
}
module.exports = { main };
