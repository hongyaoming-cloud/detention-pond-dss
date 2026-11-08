## Chapter 20  Capstone project: checking the detention pond of a site

This chapter brings the earlier chapters together in one complete check. The site and the numbers are a fictitious teaching case.

### 20.1 Case conditions

The post-development design inflow hydrograph of a development site is given in Table 20-1 (ch20_site_inflow.csv in the download package).

| Time (min) | 0 | 10 | 20 | 30 | 40 | 50 | 60 | 80 | 100 | 120 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Discharge (m³/s) | 0 | 0.03 | 0.09 | 0.21 | 0.25 | 0.18 | 0.12 | 0.06 | 0.025 | 0 |

Design limits (teaching assumption): Qallow = 0.15 m³/s, Hallow = 0.80 m, and a residual of no more than 1 % within 24 hours. The outlet is a sharp-crested weir with Cw = 1.70 and the crest at the pond floor.

### 20.2 Step 1: compute the inflow volume by hand

Use the trapezoidal rule: multiply the mean discharge of each pair of neighbouring points by the time interval, and add them up:

```formula
Vin = Σ (Qi + Qi+1) ÷ 2 × Δti = 666 m³
```

You can use this number to check whether the RS values later are reasonable.

### 20.3 Step 2: enter the hydrograph and try a design

1. In Module 1, set "Standard case" to the user-defined event and the inflow shape to imported time-discharge pairs. Paste Table 20-1 (one "time, discharge" pair per line).
2. In Module 2, enter A = 300 m²; in Module 3, enter the weir width b = 0.30 m.
3. In Module 5, enter Qallow = 0.15 and Hallow = 0.80.
4. Press "Run routing and evaluation" and read the "Beginner check".

| Trial | A (m²) | b (m) | Qp,o (m³/s) | Hmax (m) | ΔSmax (m³) | Reading |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 300 | 0.30 | 0.2037 | 0.542 | 162.703 | Outflow exceeds |
| 2 | 500 | 0.30 | 0.1662 | 0.474 | 236.763 | Outflow still exceeds |

For trial 1, RS = 162.703 ÷ 666 = 0.244, the same as in the results table. A larger area lowers the outflow, but not enough, while the water level still has a large margin. From the lesson of Chapter 14, the weir should be made narrower at the same time.

### 20.4 Step 3: constrained screening

1. Complete the free-discharge evidence (teaching assumption, as in Chapter 18).
2. In Module 5, set the weir-width bounds to 0.10 to 0.60 m and the objective to "Minimum event-added detention volume ΔSmax".
3. Press "Run constrained design screening".

![Screening result of the capstone project](book/fig_en/site_screen_optout.png)

Figure 20-1 shows the screening result.

| Item | Result |
| --- | --- |
| Plan area A | 520 m² |
| Weir width b | 0.23 m (the input field shows 0.225) |
| Event-added detention volume ΔSmax | 274.5 m³ |
| Peak outflow / allowable | 0.1467 / 0.1500 m³/s |
| Peak water level / allowable | 0.528 / 0.800 m |
| Drain-down residual | 0.17 / 1.00 % |

### 20.5 Step 4: check and record

1. Check that the mass-balance residual is close to 0 %.
2. Use the property from Chapter 11: the outflow peak should lie on the falling limb of the inflow.
3. Press "Download reproducible decision-support report" and file the report together with Table 20-1 and the basis of the limits.
4. Readers who are signed in can save this case as a project and share it with the colleague who reviews it.

### 20.6 Step 5: write the conclusion

A good conclusion gives the source of the inputs, the source of the limits, the selected sizes, the comparison with the limits and the scope of application. For example:

"For the design inflow of Table 20-1, Qallow = 0.15 m³/s and Hallow = 0.80 m, a detention pond with an area of 520 m² and a weir width of 0.23 m gives a peak outflow of 0.1467 m³/s, a peak water level of 0.528 m and a drain-down residual of 0.17 %, all within the limits. This result assumes free discharge and fixed coefficients. The freeboard, structural safety and blockage risk must be checked separately."

### 20.7 Exercises

1. If the site allows a pond of only 400 m², screen again with the minimum-area objective and see whether a feasible case exists.
2. Write a short conclusion that explains why the pond size cannot be decided from the peak inflow of 0.25 m³/s alone.
