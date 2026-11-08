## Chapter 18  The full design workflow: from failing to feasible, and reading "Blocked"

### 18.1 Problem

In Chapter 14 you found a few feasible designs by manual trial and error. This chapter uses the constrained design screening of Module 5 instead, so the software searches the declared range automatically. The limits are the same as in Chapter 10: Qallow = 0.080 m³/s, Hallow = 1.00 m and a residual of no more than 1 % within 24 hours.

### 18.2 Preparation: free-discharge evidence

The free-discharge evidence must be complete before constrained screening. This example is a teaching case, so the ticks and records are teaching assumptions.

1. Start from the base case (Start here → Book → press "Back to the base case").
2. In Module 3, tick "Free-discharge boundary confirmed" and the four checks.
3. In the "Free-discharge evidence record", enter: Teaching assumption (practice only): a single outlet with free discharge, not affected by tailwater, backwater, submergence or operational control.
4. In the "Screening-limit basis", enter: Teaching assumption (practice only): Qallow and Hallow are example values set in this book.

In a real project these two records must give the drawing or inspection number, the checker and the date, and the regulatory source of the limit values.

### 18.3 Example 1: minimum detention volume

1. In Module 5, enter Qallow = 0.080 and Hallow = 1.00, set the objective to "Minimum event-added detention volume ΔSmax", and keep the weir-width bounds at 0.05 to 1.00 m.
2. Press "Run constrained design screening".

![Screening result (minimum detention volume)](book/fig_en/screen_ok_optout.png)

Figure 18-1 shows the screening result. The software searches areas from 60 to 600 m² (on a 20 m² grid) and the declared weir-width range, and then runs 2 passes of local refinement.

| Item | Result |
| --- | --- |
| Plan area A | 460 m² |
| Weir width b | 0.53 m (the input field shows 0.525) |
| Event-added detention volume ΔSmax | 92.0 m³ |
| Peak outflow / allowable | 0.0798 / 0.0800 m³/s |
| Peak water level / allowable | 0.200 / 1.000 m |
| Drain-down residual | 0.07 / 1.00 % |

### 18.4 Example 2: minimum area

Change the objective to "Minimum plan area A" and press "Run constrained design screening" again.

| Item | Result |
| --- | --- |
| Plan area A | 100 m² |
| Weir width b | 0.05 m (at the declared lower bound) |
| Event-added detention volume ΔSmax | 94.6 m³ |
| Peak outflow / allowable | 0.0782 / 0.0800 m³/s |
| Peak water level / allowable | 0.946 / 1.000 m |

### 18.5 Reading the two results

- Both designs meet all limits, but the trade-offs are completely different. The minimum-volume design has very shallow water (0.200 m) and needs a large area. The minimum-area design needs only 100 m², but the water depth is close to the limit (0.946 m).
- In the minimum-area design the weir width stops at the lower bound of 0.05 m, and the screen marks it as a boundary case. This means the pond might be smaller still if a narrower weir were allowed. But a very narrow weir blocks easily, so the lower bound should follow the maintenance needs, not be relaxed to get a better number.
- Both results are only conditional screening within the declared range. Neither is a global optimum or a final design.

### 18.6 Example 3: Blocked

Make the limits very strict: Qallow = 0.040 m³/s and Hallow = 0.30 m. Set the objective back to minimum detention volume and press "Run constrained design screening" again.

The result says: "No feasible screening case was found within the declared physical bounds and discrete screening domain. Dominant constraints observed: peak-outflow limit, maximum-water-level limit, drain-down residual limit."

This block is reasonable. To bring a peak of 0.120 m³/s down to 0.040 m³/s, the pond must store a lot of water. But the level must not exceed 0.30 m, and even the upper area bound of 600 m² is not enough.

The right way to respond:

1. First check that the sources of Qallow and Hallow are correct. If they are, do not relax them just to get a solution.
2. Based on the dominant limits, consider adjustments with an engineering basis: for example, a larger area range if the land allows it, another outlet type, or several smaller facilities.
3. If a larger area is needed, use continuous optimization with a larger area range and check again.

### 18.7 Exercises

1. In Example 1, Qp,o = 0.0798 m³/s, very close to 0.080. Why do screening results often lie close to a limit?
2. In Example 3, relax only Hallow to 1.00 m (Qallow stays at 0.040) and run it in the software. Is it still blocked?
