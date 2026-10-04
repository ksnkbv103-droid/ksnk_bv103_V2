# Soft audit — Quy trình P0 toast QC→Kiểm bộ — 2026-09-28

| Tip | `7f0fc61` |
| File | `src/modules/cssd-erp/workflow/domain/cssd-state-engine.ts` |
| Change | Import `stationLabel`; sai trạm / trạng thái không hợp lệ dùng nhãn SSOT («Kiểm bộ» không raw `QC`). |
| Spec | `cssd-state-engine.spec.ts` — wrong-station + invalid status label tests. |
| Không | commit · đổi RPC DB · invent trạm. |
