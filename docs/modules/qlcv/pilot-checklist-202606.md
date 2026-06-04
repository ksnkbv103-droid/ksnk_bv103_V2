# Pilot QLCV — checklist tay

> **Tiền đề:** Nhân sự + RBAC Phase 1; `qlcv_*` migration đã apply.  
> **Verify DB:** `npm run trial:db:precheck` — `qlcv_fact_*`, `qlcv_spawn_rpc_ok`, `qlcv_checklist_rpc_ok` = true.

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| Q1 | Tạo việc trực tiếp | `/quan-ly-cong-viec` → tạo việc → giao người phụ trách | `trang_thai` = `DANG_LAM`; timeline có dòng PHAN_CONG |
| Q2 | Đề xuất → duyệt | Đề xuất → user có `approve` duyệt | Chuyển `DANG_LAM`; `nguoi_giao_viec_id` đúng |
| Q3 | Nghiệm thu | Hoàn thành công việc → duyệt hoàn thành / từ chối | `HOAN_THANH` hoặc `TU_CHOI` đúng cổng |
| Q4 | Spawn định kỳ | Chạy spawn hôm nay (UI hoặc RPC) **2 lần** | Không trùng instance cùng mẫu/ngày |
| Q5 | Checklist | Tick checklist → Lưu → reload | JSONB giữ trạng thái |
| Q6 | Scope list | User khoa A chỉ thấy việc được phép | Không lộ việc khoa B |

**Ghi nhận pilot:** ngày ___ | tester ___ | Q1–Q6 ___

**Lỗi thường gặp:** xem [`README.md`](README.md).

```bash
npm run mdm:migrate:local      # local
npx supabase stop && npx supabase start
npm run trial:qlcv:precheck:local
npm run verify:engineering
```
