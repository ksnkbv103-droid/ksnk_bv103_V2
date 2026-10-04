# Soft next — ME polish FE (post W4) — 2026-09-28

| Field | Value |
|-------|-------|
| Date | 2026-09-28 ~00:20 ICT (Asia/Saigon) |
| Machine | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Branch | `cursor/me-sync-recall-print` |
| Tip before | `1ed73c2` · ahead 50 |
| Scope | Thin FE only on `/cssd-erp/batch` + me-* panels after ME-S* RPC on prod |
| Không | push / PR / Cloud / Vercel / migrate · dirty WT để yên |

## Verdict

| | |
|--|--|
| **A thin copy+error+CTA** | Surveyed |
| **B broad redesign** | Rejected (task lock) |
| **Implement?** | **N/A — tip already polished** · stop inventing churn |

## Survey (evidence on tip)

| Check | Finding |
|-------|---------|
| Station QC → **Kiểm bộ** | me-scan badge already `stationLabel` (`50f7a76`); WaitingList verbs from `STATION_LABEL`. List/badge «Qc test / Chờ QC / Nhập QC» = **QC mẻ** (đánh giá lô), ≠ trạm Kiểm bộ — giữ đúng domain (FlowMap: «≠ QC mẻ»). |
| Toast RPC fail | `finishQc` / `submitBi` / add / remove / `bat_dau` / `ket_thuc` surface `r.error` \| `saved.error` (persist → `rpcErr.message`). |
| CTA thu hồi / kết luận đạt | List Thu hồi + header; PROCESS toolbar «Thu hồi mẻ»; QC «Nhả mẻ» + «Kết luận không đạt»; CHO_BI «Nhả mẻ» / «BI dương»; list status CTAs (`5b123d8`). |
| Heat filter / remove-set (S5) | Waiting `hiddenIncompatible` + «Bỏ khỏi phiếu» + RPC `rpc_cssd_me_remove_quy_trinh` (`f96a226`). |
| UX slices 1–4 | Done on tip (`a5d3137` · `5b123d8` · list limit · `42c0115`). |

## Soft Soft-queue

Empty after this beat (W4 DONE · W6 DONE · soft-next quy-trinh / report-print / GSC / VST already shipped). **Không** invent FE residual.

## UAT

N/A code change — re-smoke local optional: tab Mẻ → nạp/filter ẩn · bỏ bộ · Nhả / Không đạt toast có message RPC nếu fail · badge trạm lạ trên scan = Kiểm bộ khi `QC`.
