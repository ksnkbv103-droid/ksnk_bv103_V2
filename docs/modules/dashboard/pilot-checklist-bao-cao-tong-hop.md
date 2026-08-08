# Pilot checklist — Báo cáo tổng hợp KSNK (`/bao-cao-tong-hop`)

> Đối soát số liệu với module nguồn (VST / GSC / NKBV) trước khi gửi BGĐ/HĐ KSNK.  
> SSOT chỉ số: [`metric-dictionary.md`](./metric-dictionary.md) · Module: [`bao-cao-tong-hop.md`](./bao-cao-tong-hop.md)

## Người dùng / môi trường

- Vai trò: NV KSNK hoặc ADMIN có shell Command Center
- Staging hoặc local đã `mdm:migrate` (không lỗi `v_auth_user_permissions`)

## Kịch bản tay (≥3)

### K1 — Báo cáo tuần

- [ ] Lọc khoảng **7 ngày** (một tuần ISO) + ≥1 khoa có dữ liệu VST/GSC
- [ ] KPI `ty_le_vst` / `ty_le_gsc` / `ty_le_ccs` khớp tab Thống kê `/thong-ke/vst` và `/thong-ke/gsc` **cùng kỳ + cùng khoa**
- [ ] Badge «Δ 2 tuần ISO» và «vs kỳ trước» **tách nhãn** (không trùng ý nghĩa)
- [ ] Xu hướng tab **Theo tuần** có ≥1 điểm

### K2 — Báo cáo tháng

- [ ] Lọc **1 tháng lịch** (vd. 01→cuối tháng)
- [ ] Tab xu hướng **Theo tháng** gộp đúng (cộng mẫu số/mẫu tử, không TB % tuần)
- [ ] So sánh khoa (VST/GSC): khoa đủ TGS+KSNK hiện đối soát; khoa thiếu một nguồn vào bảng loại trừ

### K3 — Chuyên đề hybrid + deep-link

- [ ] Tab chuyên đề **VST / GSC / NKBV**: tóm tắt + «Phân tích đầy đủ» mở `/thong-ke/vst` hoặc `/thong-ke/gsc` **giữ** `tu_ngay`, `den_ngay`, `khoa_ids`
- [ ] NKBV: outcome riêng, **không** làm lệch CCS; thiếu chiều → hiện N/A
- [ ] So sánh đa chiều: chỉ hiện Khối/Khu vực/Đối tượng khi matrix nguồn có dữ liệu — không nội suy

### K4 — In A4 (export)

- [ ] Nhập **Nhận xét đánh giá** + **Kiến nghị đề xuất** (hoặc «Tạo gợi ý») trước khi in
- [ ] In A4: có bìa kỳ/phạm vi, block process (CCS), NKBV sau process, **Phần III** có nội dung vừa nhập
- [ ] Không in từ Trung tâm điều hành (`/`) — chỉ từ trang này

## Verify kỹ thuật

```bash
npx vitest run src/modules/dashboard/lib/bao-cao-tong-hop-core.spec.ts src/modules/dashboard/lib/bao-cao-tong-hop-narrative-draft.spec.ts
npm run verify:engineering
```

## Ký duyệt

| Vai trò | Họ tên | Ngày | Kết quả |
|---------|--------|------|---------|
| NV KSNK | | | ☐ Pass / ☐ Fail |
| Chủ nhiệm / HĐ (tuỳ chọn) | | | ☐ Pass / ☐ Fail |

**Ghi chú lệch số (nếu có):** …
