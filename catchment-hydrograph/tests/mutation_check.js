'use strict';
/* Negative control (S2): deliberately break the code in a temporary copy and confirm the
 * test suite FAILS for every mutant. Run: node tests/mutation_check.js */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MUTANTS = [
  ['src/dss-adapter.js', "if (pairs[pairs.length - 1][1] !== 0) pairs.push", 'if (false) pairs.push', 'no closing zero point'],
  ['src/dss-adapter.js', 'a[0][0] !== 0 ||', '', 'validator accepts non-zero start'],
  ['src/transform.js', 'const a = Math.exp(-dt / K_min);', 'const a = Math.exp(-dt / (2 * K_min));', 'wrong reservoir decay'],
  ['src/transform.js', 'const scale = (A / 1000) / trapz(u, dt);', 'const scale = (A / 1000) / trapz(u, dt) * 1.02;', 'UH not normalised'],
  ['src/losses.js', 'const S = 25400 / CN - 254, Ia = lambda * S;', 'const S = 25400 / CN - 254, Ia = 0;', 'SCS ignores Ia'],
  ['src/rainfall.js', 'inc.sort((x, y) => y - x);', 'inc.sort((x, y) => x - y);', 'blocks in wrong order'],
  ['src/pipeline.js', 'if (contRel > Adapter.VOLUME_TOLERANCE) throw', 'if (false) throw', 'continuity check disabled (with 3% volume leak)', ['src/transform.js', 'return finish(q, dt, excessVolume, \'linear-reservoir\'', 'q.forEach((v, i) => { q[i] = v * 0.97; }); return finish(q, dt, excessVolume, \'linear-reservoir\'']]
];

let failures = 0;
for (const [file, from, to, label, extra] of MUTANTS) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tphyd-mut-'));
  fs.cpSync(ROOT, dir, { recursive: true, filter: s => !s.includes(`${path.sep}.git`) });
  const edits = [[file, from, to], ...(extra ? [extra] : [])];
  for (const [f, a, b] of edits) {
    const p = path.join(dir, f), src = fs.readFileSync(p, 'utf8');
    if (!src.includes(a)) { console.log(`SETUP ERROR ${label}: pattern not found in ${f}`); failures++; continue; }
    fs.writeFileSync(p, src.replace(a, b));
  }
  const r = spawnSync(process.execPath, ['--test', 'tests/test_modules.js'], { cwd: dir, encoding: 'utf8' });
  const killed = r.status !== 0;
  console.log(`${killed ? 'KILLED  ' : 'SURVIVED'}  ${label}`);
  if (!killed) failures++;
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(failures ? `${failures} mutant(s) survived` : `all ${MUTANTS.length} mutants killed`);
process.exitCode = failures ? 1 : 0;
