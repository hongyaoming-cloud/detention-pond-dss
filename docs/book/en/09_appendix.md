# Appendices

## Appendix A  Terms and symbols

| Symbol | Term | Chinese term | Unit |
| --- | --- | --- | --- |
| Qp, Qp,i | Peak inflow | 入流尖峰 | m³/s |
| Qp,o | Peak outflow | 出流尖峰 | m³/s |
| Tp, Tr | Time to peak, recession time | 洪峰到達時間、退水時間 | min |
| T, Te | Event duration, event end | 總事件延時、事件結束時間 | min |
| Vin | Inflow volume | 入流體積 | m³ |
| S(H) | Stage–storage relation | 水位—蓄水量關係 | m³ |
| A | Plan area | 平面面積 | m² |
| Hfloor | Floor elevation | 池底高程 | m |
| H0 | Initial level | 初始水位 | m |
| Hmax | Peak water level | 最高水位 | m |
| ΔSmax | Event-added detention volume | 事件新增滯洪量 | m³ |
| Cw | Weir coefficient | 堰流係數 | — |
| b | Weir width | 堰寬 | m |
| P | Crest elevation | 堰頂高程 | m |
| Cd | Discharge coefficient | 流量係數 | — |
| Ao | Opening area | 開口面積 | m² |
| RQ | Peak ratio Qp,o ÷ Qp,i | 尖峰比 | — |
| RS | Storage ratio ΔSmax ÷ Vin | 蓄水比 | — |
| RT | Normalized lag | 無因次遲滯 | — |
| FPI95 | Near-peak flatness index | 近洪峰平坦指標 | — |
| ε/Vin | Mass-balance residual | 質量平衡殘差 | % |
| Qallow | Allowable peak outflow | 容許出流尖峰 | m³/s |
| Hallow | Allowable water level | 容許水位 | m |
| Td | Maximum drain-down time | 最長排空時間 | h |
| Href | Reference level | 參考水位 | m |
| Δt | Time step | 時間步長 | s |

For fuller explanations of the terms, see "Start here → Glossary" in the software.

## Appendix B  Error messages and what to do

| Message or situation on screen | Meaning | What to do |
| --- | --- | --- |
| The run button is grey, with a red list above it | A field is unreasonable | Click a field name in the list and fix the field outlined in red |
| "Screening not yet run" | Only normal routing was done | For normal routing read the "Beginner check"; to screen, go to Module 5 |
| Module 5 lists missing conditions | The conditions for constrained screening are not met | Complete what the list says to check and to enter |
| "No feasible screening case was found …" | No feasible design within the bounds | Adjust according to the dominant limits; see Chapter 18 |
| Results are marked out of date | Inputs changed after the run | Press "Run routing and evaluation" again |
| Mass-balance residual above 0.5 % | A numerical problem | Check the units, the datum and the range of the stage–storage table |
| Importing time–discharge pairs fails | Format error | The first time is 0, times increase, discharges are not negative, at least two lines |
| No results after opening a project | A project stores only the inputs | Press "Run routing and evaluation" in Module 4 |
| A viewer cannot save | Role setting | Ask the company administrator to change the role, or ask an engineer to save |

## Appendix C  Answers to the exercises

All numerical answers were obtained by running this version of the software and were checked with an independent program. For explanation questions, the key points are given.

| Exercise | Answer |
| --- | --- |
| 10.1 | Good enough (preliminary reading). Qp,o = 0.0903 ≤ 0.100 m³/s, Hmax = 0.413 ≤ 1.00 m and the drain-down residual 0.03 % ≤ 1 %. The beginner check says "Preliminary reading: all three limits are met". |
| 10.2 | A 0.20 m weir releases water too fast. The water flows away before it is stored, so the capacity of the pond is not fully used. |
| 11.1 | Vin = ½ × 0.120 × 5400 = 324 m³. |
| 11.2 | 74.385 ÷ 180 = 0.413 m, equal to Hmax, because the floor and the initial level are both 0. |
| 12.1 | 2 times. Weir flow is proportional to the weir width. |
| 12.2 | The opening rises from 0.0166 to 0.0253 m³/s, about 52 %. The weir rises from 0.1202 to 0.3400 m³/s, about 183 %. |
| 13.1 | A large step samples only at the end of each step, so it can miss the true peak. A larger step also gives a larger numerical error. |
| 13.2 | The units (L/s and m³/s, minutes and seconds), the datum, whether the stage–storage table covers the highest level, and any extreme or unreasonable input. |
| 14.1 | With b = 0.12 m, Qp,o = 0.0780 m³/s (Hmax = 0.527 m). With b = 0.13 m, Qp,o = 0.0801 m³/s, which exceeds the limit. So the largest weir width is 0.12 m. |
| 14.2 | Only A = 360 m² (Qp,o = 0.0636 m³/s, Hmax = 0.327 m). For b = 0.10 m, Hmax = 0.570 m, which exceeds 0.50 m. |
| 15.1 | It changes from 0.0243 to 0.0428 m³/s, about 1.76 times. With a larger opening the water level in the pond is lower, so the head is smaller, and the discharge of an opening grows only with about the 0.5 power of the head. |
| 15.2 | It becomes only slightly smaller: from 5.41 % to 5.36 %. The 9 m³ below the opening invert can never drain, so a longer drain-down time still cannot meet the 1 % limit. |
| 16.1 | 0.120 = 0.34 × H^1.5, so H = (0.120 ÷ 0.34)^(2/3) = 0.499 m, exactly the Hmax of the software. |
| 16.2 | Qp,o = 0.1191 m³/s, RQ = 0.993, Hmax = 0.497 m. Even with half the plateau, the peak reduction is still less than 1 %, because 36 minutes is still long enough for the pond to approach the equilibrium level. |
| 17.1 | (80 − 30) ÷ 0.25 = 200 m². |
| 17.2 | If the peak level goes beyond the table, routing does not extrapolate, the S(H) boundary check shows a block and the result must not be used. Add data for higher levels. |
| 18.1 | The objective is the minimum detention volume. A larger outflow means less water must be stored, so the best point pushes the outflow up to just below Qallow. |
| 18.2 | It is not blocked. Screening finds A = 260 m² and b = 0.05 m (at the lower bound), with Qp,o = 0.0393 m³/s, Hmax = 0.598 m and a drain-down residual of 0.70 %. The block in Example 3 came mainly from Hallow = 0.30 m; but limits may only be changed on a regulatory or design basis. |
| 19.1 | HEC-HMS uses the same stage–storage and outflow tables as PondGate, so the difference comes only from the numerical method. SWMM uses its own storage curve and outlet representation, so the difference is larger, but the peaks still differ by less than 0.1 %. |
| 19.2 | Most likely the time and discharge scale conversion (laboratory scale factor 240) was not applied. Check the comparison-scale setting and the units of the external model. |
| 20.1 | Yes. The minimum-area objective selects A = 380 m² and b = 0.12 m (the input field shows 0.123), with Qp,o = 0.1392 m³/s, Hmax = 0.761 m and a drain-down residual of 0.20 %. With a smaller area, the water level is closer to the 0.80 m limit. |
| 20.2 | Key point: for the same peak, a different inflow duration and shape give a different inflow volume (Chapter 16). In this case the inflow volume is 666 m³, and the storage needed depends on both the volume and the release capacity of the outlet. |

## Appendix D  References and software citation

- PondGate source code: GitHub hongyaoming-cloud/detention-pond-dss (MIT licence).
- PondGate v1.0.0: DOI 10.5281/zenodo.23296722.
- PondGate v1.0.1: DOI 10.5281/zenodo.23298538.
- PondGate v1.0.2: DOI 10.5281/zenodo.23299011.
- PondGate, all versions (concept DOI): 10.5281/zenodo.23296721, which resolves to the latest version.
- U.S. Army Corps of Engineers, HEC-HMS 4.13 user's manual (Modified Puls routing).
- U.S. EPA, Storm Water Management Model (SWMM) 5.2 user's manual.

Suggested citation: Hong, Y.-M. PondGate: open-source detention-pond routing software (version 1.3.4). Zenodo. Use the version DOI shown on the Zenodo page. Related journal papers will be added to a later edition after publication.
