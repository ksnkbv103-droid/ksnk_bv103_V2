# Pilot QLCV — checklist tay (KSNK-only)

> **Tiền đề:** Nhân sự KSNK + RBAC; migration `20260617120000_qlcv_ksnk_only_scope.sql` apply.

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| Q1 | Tạo việc trực tiếp | Tạo việc → giao NV **KSNK** | `trang_thai` = `DANG_LAM`; `khoa_thuc_hien_id` = KSNK |
| Q2 | Đề xuất → duyệt | Đề xuất → duyệt + giao NV KSNK | `DANG_LAM`; `nguoi_giao_viec_id` đúng |
| Q3 | Nghiệm thu | Checklist 100% → nghiệm thu / từ chối | `HOAN_THANH` hoặc `TU_CHOI`; không force từ &lt;100% |
| Q4 | Spawn định kỳ | Spawn 2 lần cùng ngày | Không trùng instance |
| Q5 | Checklist | Tick → Lưu → reload | JSONB giữ trạng thái |
| Q6 | Chặn ngoài KSNK | User khoa lâm sàng mở `/quan-ly-cong-viec` | 403 hoặc thông báo chỉ KSNK |

```bash
npm run mdm:migrate:local
npm run trial:qlcv:precheck:local
npm run verify:engineering
```

Chi tiết: [`intake-ksnk-only-202606.md`](intake-ksnk-only-202606.md)
