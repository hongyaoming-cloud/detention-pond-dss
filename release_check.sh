#!/usr/bin/env bash
# Release completeness check: required files present, tests pass, regression MARE unchanged.
set -u; fail=0
for f in LICENSE README.md CITATION.cff .zenodo.json dist/index.html dist/routing-core.js test_core.js regression_176.js; do
  [ -f "$f" ] || { echo "MISSING: $f"; fail=1; }
done
node test_core.js >/dev/null || { echo "FAILED: test_core.js"; fail=1; }
out=$(node regression_176.js 2>&1) || { echo "FAILED: regression_176.js"; fail=1; }
echo "$out" | grep -q "A: 2.924, B: 2.954, C: 4.104, D: 4.649" || { echo "FAILED: 176-case MARE changed"; fail=1; }
[ $fail -eq 0 ] && echo "release check: passed"; exit $fail
