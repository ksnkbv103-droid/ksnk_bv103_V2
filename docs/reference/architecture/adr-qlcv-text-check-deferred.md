# ADR — QLCV TEXT+CHECK

> **Trạng thái:** **Superseded → Implemented (2026-06-04)**  
> **Debt:** D-QLCV-01 — **Closed**  
> **Migration:** `20260604120000_qlcv_text_check_codes.sql`

## Decision

Cột `trang_thai` và `loai_cong_viec` kiểu `text` + CHECK trên `qlcv_fact_cong_viec`; trigger `trg_qlcv_sync_code_from_fk` giữ FK lookup đồng bộ trong giai đoạn chuyển tiếp. App dual-write mã text + FK id.

## Verify

```bash
npm run verify:engineering
npm run test -- src/modules/quan-ly-cong-viec
```

## Deferred (post slice)

Drop cột FK `trang_thai_id` / `loai_cong_viec_id` sau 1 sprint dual-read ổn định — backlog riêng, không block pilot.
