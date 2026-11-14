# TPHYD 集水區降雨—入流歷線軟體 v0.1.0（第一階段）

把「降雨」算成「集水區出口的入流歷線」，輸出可以**直接貼進滯洪池 DSS V112** 的入流資料。DSS 本身不做任何修改。

本工具是滯洪池 DSS（PondGate / Software I）的上游模組：Software I 只處理「已知入流 → 滯洪池」，本工具負責「降雨 → 入流」。

## 一、三分鐘上手

需要 Node.js 18 以上（不需要安裝任何套件）。

```bash
node cli.js examples/design_storm_WL2.json out/example
```

會產生四個檔案：

| 檔案 | 用途 |
|---|---|
| `…_inflow_for_DSS.txt` | **貼進 DSS 用**。沒有標題列，每列「分鐘, m³/s」 |
| `…_inflow.csv` | 同樣內容加上標題列，給 Excel 或其他程式 |
| `…_hydrograph_full.csv` | 每分鐘的雨量、有效雨量、流量，方便檢查 |
| `…_run.json` | 執行紀錄：參數、版本、檢查結果、各輸出檔 SHA-256 |

### 貼進 DSS 的步驟

1. 打開滯洪池 DSS，入流歷線選「Imported time-discharge pairs（匯入時間—流量對）」。
2. 用記事本打開 `…_inflow_for_DSS.txt`，全選、複製。
3. 貼進 DSS 的入流文字框（標籤為「minutes, m3/s; one pair per line」）。
4. 照平常方式設定滯洪池幾何與出口，按執行。

## 二、設定檔怎麼寫

```json
{
  "name": "輸出檔名前綴",
  "catchment": { "id": "WL2", "area_ha": 534.73, "source": "面積來源" },
  "rainfall":  { "method": "alternating-block", "horner": {"a":..., "b":..., "c":...}, "duration_min": 180, "dt_min": 10 },
  "loss":      { "method": "scs-cn", "CN": 70 },
  "transform": { "method": "linear-reservoir", "K_min": 45, "dt_out_min": 1 },
  "output":    { "baseflow_m3s": 0.2, "max_points": 5000 }
}
```

| 模組 | `method` | 參數 |
|---|---|---|
| M1 降雨 | `uniform` | `intensity_mmh`, `duration_min`, `dt_min` |
| | `alternating-block`（交替區塊法，Horner I = a/(t+b)^c，mm/h、分鐘） | `horner{a,b,c}`, `duration_min`, `dt_min`, `peak_position`（0–1，預設 0.5） |
| | `custom` | `dt_min`, `rain_mm[]`（每個時段的雨量深度） |
| | `observed` | `dt_min`, `rows[{t_min, rain_mm}]`, `gaps[{start_min,end_min}]`（缺測時段，碰到就停算） |
| M2 有效降雨 | `runoff-coefficient` | `C`（0–1，**須自行輸入**，軟體不內建任何集水區的 C 值） |
| | `scs-cn` | `CN`（30–100）, `lambda`（預設 0.2） |
| | `phi-index` | `phi_mmh` |
| | `initial-constant` | `initial_mm`, `constant_mmh` |
| M3 匯流 | `linear-reservoir`（建議預設） | `K_min`, `dt_out_min`（預設 1） |
| | `nash-cascade` | `n`, `K_min`, `dt_out_min` |
| | `scs-unit-hydrograph` | `Tc_min`, `lag_ratio`（預設 0.6） |

## 三、自動檢查（每次執行都會做）

1. 輸入檢查：時間間隔、負值、參數範圍、缺測時段，不合格就停下並說明原因。
2. 匯流水量守恆：歷線體積與有效雨量體積差 ≤ 0.5%。
3. DSS 合約：輸出文字用與 DSS V112 `parsePoints()` 相同的規則再檢查一次（首點時間 0、時間遞增、流量 ≥ 0、無標題列），最後一點補 0（DSS 在最後一點之後一律當 0），且輸出體積與模式體積差 ≤ 0.5%。
4. 歷線沒退完就被截斷時會拒絕輸出，避免 DSS 少算水量。

**注意**：

1. DSS 在最後一點之後入流當 0，所以若有設基流，基流也會在事件結束時一起歸零。
2. DSS 要求匯入歷線從 0 起算才會報告洪峰比 RQ；有基流（t=0 流量大於 0）時 DSS 仍會演算，但 RQ 顯示「Not reported」。做 DSS 事件篩選時建議 `baseflow_m3s` 設 0，軟體會對此發出警告。

## 三之一、DSS V112 實際試算紀錄（2026-11-14）

在雲端容器以無頭瀏覽器執行 DSS V112 副本（commit 2b3a2583，與當時的 Sites 正式站同一份程式）：

| 試算 | 結果 |
|---|---|
| 範例入流（無基流）貼入 | DSS 接受並演算；DSS 入流體積 212,152.3 m³，本軟體 212,152 m³（差 0.0001%）；尖峰 32.6582 m³/s 一致；DSS 水量平衡殘差 0.000% |
| 範例入流（基流 0.2）貼入 | 可演算，但 RQ 顯示 Not reported（需從 0 起算） |
| 反向：加上標題列再貼 | DSS 拒絕，訊息與本軟體驗證器相同 |


## 四、測試

```bash
node --test tests/test_modules.js   # 19 項正向＋反向測試
node tests/mutation_check.js        # 負對照：故意改壞 7 處，測試必須全部失敗
```

## 五、程式結構

每個模組都是純函式（輸入 → 輸出，不碰畫面），同一個檔案可在瀏覽器（`window.TPHYD…`）與 Node（`require`）使用，寫法比照 DSS 的 `routing-core.js`。

```
src/rainfall.js      M1 降雨輸入
src/losses.js        M2 有效降雨
src/transform.js     M3 匯流
src/dss-adapter.js   DSS V112 轉接與合約檢查
src/pipeline.js      串接 M1→M2→M3→轉接器，產生執行紀錄
cli.js               命令列入口
```
