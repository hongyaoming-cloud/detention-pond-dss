# Audit material

Scripts and outputs behind the verification results of the software paper. Paths inside the scripts are
relative to this repository. The browser audits drive `dist/` through headless Chromium (Playwright) and expect a
static server on the port given as the first argument. Result files named `*_334304c*` were produced on the
paper version; `continuous/continuous_mode_report.md` documents the earlier run on `151405b` and
`continuous/results/compare_vs_151405b.txt` shows the outputs are unchanged on `334304c`. Files named `*_v1_0_1*`
(and the folders `scenarios_v1_0_1/`, `language_v1_0_1/`) were produced on release v1.0.1, which changes display
text only; its misuse-audit outcomes and scenario decisions are identical to those on `334304c`.
`cross_engine/results/hec_hms_4_14_BLOCKED_log.txt` records that HEC-HMS 4.14 could not be downloaded in the
build environment; the HEC-HMS comparison therefore uses the archived 4.13 native run in `cross_engine/hec_hms_4_13/`.
