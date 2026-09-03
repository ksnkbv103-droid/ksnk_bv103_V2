# Pilot QLCV — checklist tay (KSNK-only)

> **Tiền đề:** Nhân sự KSNK + RBAC; migration KSNK-only + lean (`20260617120000`…`20260617160000`) đã apply. Scope runtime = staff KSNK + `ensureQlcvKsnkAccess` (không còn cột `khoa_thuc_hien_id` trên fact).

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| Q1 | Tạo việc trực tiếp | Tạo việc → giao NV **KSNK** | `trang_thai` = `DANG_LAM`; phụ trách là NV KSNK; hiện ở cột/hàng Đang thực hiện |
| Q2 | Đề xuất → duyệt | Đề xuất → duyệt + giao NV KSNK | `is_active=true`; `DANG_LAM`; `nguoi_giao_viec_id` đúng |
| Q3 | Nghiệm thu (đột xuất) | Checklist 100% → nghiệm thu / từ chối | `HOAN_THANH` hoặc `TU_CHOI`; không force từ &lt;100% |
| Q3c | Định kỳ tick đủ | Việc `DINH_KY` tick checklist 100% → Lưu | `HOAN_THANH` ngay, không chờ nghiệm thu |
| Q3b | Quá hạn + 100% | Phiếu `QUA_HAN` (hoặc hạn đã qua) đã 100% → Nghiệm thu | Ở cột **Đang thực hiện** kèm nhãn Quá hạn; chi tiết có nút nghiệm thu → `HOAN_THANH` |
| Q4 | Spawn định kỳ | Spawn 2 lần cùng ngày | Không trùng instance |
| Q5 | Checklist | Tick → Lưu → reload | JSONB giữ trạng thái |
| Q6 | Chặn ngoài KSNK | User khoa lâm sàng mở `/quan-ly-cong-viec` | 403 hoặc thông báo chỉ KSNK |

## Kanban mobile (điện thoại thật hoặc DevTools ≤ 400px)

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| M1 | Vuốt ngang cột | Mở `/quan-ly-cong-viec` trên điện thoại → vuốt ngang | Mỗi lần vuốt dừng đúng 1 cột (snap); cột rộng ~92% màn hình, không tràn ngang trang |
| M2 | Mở chi tiết bằng chạm | Chạm 1 thẻ việc → panel chi tiết mở → đổi trạng thái từ panel | Chạm 1 lần ăn ngay (không double-tap); panel không che mất nút đóng |
| M3 | Tick checklist trên màn nhỏ | Trong chi tiết việc: tick/bỏ tick tiêu chí → Lưu | Ô tick đủ lớn để chạm chính xác; sau Lưu + reload trạng thái giữ nguyên |

```bash
npm run mdm:migrate:local
npm run trial:qlcv:precheck:local
npm run verify:engineering
```

Chi tiết: [`intake-ksnk-only-202606.md`](intake-ksnk-only-202606.md) · Ma trận liên thông: [`continuity-matrix-20260720.md`](continuity-matrix-20260720.md)
