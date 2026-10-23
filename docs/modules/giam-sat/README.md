# Giám sát (VST / GSC)

> Bản đồ: [`../../ssot-map.md`](../../ssot-map.md). Việc còn mở: [`../../core/handover-roadmap.md`](../../core/handover-roadmap.md) §5.

| Đọc khi | File |
|---------|------|
| Nghiệp vụ | [`../../core/domain-specification.md`](../../core/domain-specification.md) + [`../../wiki/entities.md`](../../wiki/entities.md#giám-sát-vst--gsc) |
| Bảng kiểm 36 mẫu | [`bang-kiem-overview.md`](bang-kiem-overview.md) — **không** mở `data/bang-kiem/canonical-36.md` |
| Inventory seed giám sát | [`12-BANG-KIEM-inventory-from-KSNK-final.md`](12-BANG-KIEM-inventory-from-KSNK-final.md) |
| Hub vệ sinh tay (3 mẫu / 3 chỉ số) | mục **Hub vệ sinh tay** trong file này |
| Phạm vi khoa & đối tượng | [`16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md`](16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md) |
| Khóa sổ module | mục **Khóa sổ GSC / VST** trong file này |
| Layout / scoring | [`../../wiki/concepts.md`](../../wiki/concepts.md) · [`../../ux/principles.md`](../../ux/principles.md) |
| Seed catalog (người) | [`bang-kiem-seed/README.md`](bang-kiem-seed/README.md) |

Rule: `.claude/rules/giam-sat.md`

## IA (khóa)

Bốn tầng, một chiều: Ghi nhận → Lịch sử → Thống kê khoa (`/thong-ke`) → Báo cáo chính thức (in). ModeNav là công tắc duy nhất trong module. BCTH chỉ điều hành/in; «Chi tiết thống kê» là link 1 chiều.

- **Báo cáo chính thức** (`/bao-cao-tong-hop`) là cửa nhìn số + in; `/` redirect vào đây.
- **Công việc** (`/quan-ly-cong-viec`) tách riêng — không tạo việc từ Tổng quan / Thống kê GSC.

## Route

| Chức năng | VST | GSC (tất cả loại) | GSC theo loại |
|-----------|-----|-------------------|---------------|
| Form nhập liệu | `/giam-sat-vst` | `/giam-sat-chung` | `/giam-sat-chung/tuan-thu`, `/nhat-ky`, `/he-thong` |
| Thống kê | `/thong-ke/vst` | `/thong-ke/gsc` | Deep link `/thong-ke/gsc?loai=` |
| Lịch sử | `/lich-su/vst` | `/lich-su/gsc` | edit quay về `basePath?edit=id` |

**`?loai=` SSOT:** `/thong-ke/gsc` mặc định = tuân thủ (`TUAN_THU`). Query nhận kebab `tuan-thu|nhat-ky|he-thong` và enum `TUAN_THU|NHAT_KY_VAN_HANH|DANH_GIA_HE_THONG`. Bookmark cũ → `next.config.ts`.

**Import Excel phiên GSC/VST:** đã gỡ. Pilot chỉ nhập qua form.

Go-live 3 module: [`../../core/pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md)

```bash
npm run test:e2e -- e2e/gsc-vst-supervision.spec.ts
```

---

## Hub vệ sinh tay — 3 mẫu, 3 chỉ số

| Trường | Giá trị |
|--------|---------|
| Mã | `13-VE-SINH-TAY-hub` |
| Phiên bản | 2026-09-22 |
| Domain lock | Hub vệ sinh tay trong file này (PO 2026-09-22) |
| Inventory | [`12-BANG-KIEM-inventory-from-KSNK-final.md`](./12-BANG-KIEM-inventory-from-KSNK-final.md) § QT.07 |

## Điều hướng (nhập liệu)

Cổng `/giam-sat` → khối **Vệ sinh tay** (3 lối, **không** gộp form):

| # | Mẫu | Route |
|---|-----|-------|
| 1 | Quan sát 5 thời điểm (WHO / QT.07 BM.01) | `/giam-sat-vst` |
| 2 | Kỹ thuật VST thường quy (QT.07 BM.02) | `/giam-sat-chung/tuan-thu?bk=KSNK.QT.07.BM.02` |
| 3 | VST ngoại khoa (QT.07 BM.03) | `/giam-sat-chung/tuan-thu?bk=KSNK.QT.07.BM.03` |

Map mã SSOT: `src/lib/domain/ve-sinh-tay-catalog.ts` (`chuyen_de = VE_SINH_TAY`).

**Cấm:** BM.01 / `VST_WHO` trong picker bảng kiểm GSC — lọc tại `getBangKiemsForGiamSat`.

Chuyên đề khác (PTPH, môi trường, …) → «Giám sát tuân thủ khác» + catalog GSC.

## Báo cáo / thống kê (3 chỉ số cạnh nhau)

Trên **Báo cáo tổng hợp** (`/bao-cao-tong-hop`) tab **Vệ sinh tay** (và Tổng hợp):

| Khối | Engine | Nguồn % |
|------|--------|---------|
| WHO 5 thời điểm | VST strategic | `vst.kpis.ty_le_tuan_thu` |
| Kỹ thuật TQ | GSC · `BM.07.02` | `checklist_overview` / `dynamic_checklists` |
| Ngoại khoa | GSC · `BM.07.03` | cùng |

- **Không** average ba khối thành một %.
- Cùng filter kỳ / khoa / lens TGS|KSNK của BCTH.
- Tab chuyên đề VST cũng tải GSC (để có BM.02/03) — `shouldFetchSource("VST", "GSC") === true`.

Deep-link thống kê từng khối: `/thong-ke/vst` · `/thong-ke/gsc?bk=KSNK.QT.07.BM.02` · `?bk=KSNK.QT.07.BM.03` (mã ngắn `BM.07.0x` vẫn được nhận như alias).

## UAT nhanh

1. `/giam-sat` → mở đủ 3 lối (cần quyền VST + GSC).
2. BM.02/03 mở form GSC đúng mẫu preselected.
3. Picker GSC không có BM.07.01 / WHO.
4. BCTH → tab Vệ sinh tay → 3 card cạnh nhau (N/A nếu chưa có phiên).

### 3 kịch bản tay L1 (điều dưỡng chạy, bấm giờ)

Chạy trên bản local/staging, tài khoản có quyền VST + GSC. Ghi giờ bắt đầu → bấm «Lưu». Đạt: mỗi phiếu **< 60 giây**.

| # | Kịch bản | Các bước | Kết quả đúng | Giây |
|---|---|---|---|---|
| 1 | Nhập phiên VST 5 mốc | `/giam-sat-vst` → chọn khoa, người được giám sát → chọn hành động cho mốc 1 (Rửa tay bằng nước) → thêm mốc thứ 2, 3, 4, 5 trên cùng một hàng → «Lưu» | Lưu thành công; mốc đạt tối đa 2 thời điểm WHO, vượt trần thì bỏ mốc cũ nhất, không hiện toast; «Bỏ sót» chỉ 1 mốc; ô chọn nền xanh `#026f17` chữ trắng | |
| 2 | Nhập phiên GSC | `/giam-sat-chung/tuan-thu` → chọn khoa, mẫu → tick các mục → «Lưu» | Lưu thành công; phiên xuất hiện đầu `/lich-su/gsc` | |
| 3 | Xem thống kê một kỳ và in | `/thong-ke/vst` → chọn kỳ (tháng vừa nhập) → xem KPI tổng, bảng khoa → in/xuất; lặp lại ở `/thong-ke/gsc` | KPI tổng ở đầu trang; khoa có < 20 cơ hội VST (< 30 GSC) hiện «mẫu mỏng», không tô cảnh báo; phiên vừa nhập có trong số liệu; số khớp lịch sử | |

### Đối soát VST: RPC so với tính tay (L1-2, 2026-10-24, DB local)

Tính tay = đếm trực tiếp từ `gstt_fact_vst` (phiên `is_active`, hành động hợp lệ theo `fn_vst_is_valid_opportunity`), mẫu = `tong_co_hoi`, đạt = khác «Bỏ sót», `ty_le = round(đạt/tổng×100, 1)`. So với `rpc_dashboard_vst_strategic_analytics`.

| Tình huống | Kết quả |
|---|---|
| A. Một tháng, toàn viện | Khớp tổng cơ hội, đạt, tỉ lệ |
| B. Kỳ dài, toàn viện | Khớp tổng cơ hội, đạt, tỉ lệ |
| C. Tháng 2026-09, từng khoa (`matrix_khoa`) | 39 khoa ở cả hai phía, **0 lệch** |
| D. Lọc một khoa | 109 cơ hội · 89,0% cả hai phía |

Kết luận: không lệch, không sửa hàm KPI. GSC chưa đối soát (ngoài phạm vi L1-2).

---

## Khóa sổ GSC / VST

> Pilot Phase 1 — SSOT vận hành khóa sổ giám sát trước chốt báo cáo.

## Nghiệp vụ

Admin KSNK đặt **ngày khóa đến** (`locked_until_date`) trên module **GSC** hoặc **VST**. Mọi phiên có `ngay_giam_sat` **≤ ngày khóa** không được ghi/sửa/xóa/import.

| Module | Bảng | Trigger DB |
|--------|------|------------|
| GSC | `sys_module_locks` (`module_name = 'GSC'`) | `trg_assert_gsc_sessions_not_locked` → `fn_assert_vst_gsc_not_locked` |
| VST | `sys_module_locks` (`module_name = 'VST'`) | `trg_assert_vst_sessions_not_locked` |

## Code path

| Layer | File |
|-------|------|
| Domain | [`src/lib/supervision-module-lock.ts`](../../../src/lib/supervision-module-lock.ts) |
| GSC action (read status) | [`gsc-module-lock.actions.ts`](../../../src/modules/giam-sat-chung/actions/gsc-module-lock.actions.ts) |
| GSC UI hook + banner | `use-gsc-module-lock.ts`, `GscModuleLockBanner.tsx` |
| Write guard | `giam-sat-chung-write.actions.ts`, `giam-sat-chung-session-meta.actions.ts` |
| VST write | `vst-write-save-session.actions.ts`, `vst-write-delete.actions.ts` |

## UX

- Form GSC hiển thị banner vàng khi ngày phiên nằm trong khoảng khóa.
- Lưu/xóa/import → lỗi server với message tiếng Việt từ `assertSupervisionNotLockedForDate`.

## Pilot checklist (G3)

1. Admin bật khóa GSC (UI quản trị hoặc insert `sys_module_locks`).
2. Mở phiên GSC trong khoảng ngày bị khóa → banner hiện.
3. Thử **Lưu** / **Xóa** → bị chặn, message rõ.

## Verify

```bash
npm run verify:engineering   # sau sửa action
npm run trial:db:precheck    # trigger + sys_module_locks
```

## Ghi chú

- Khóa **theo ngày phiên**, không khóa toàn module vô thời hạn (trừ khi `locked_until_date` rất xa).
- VST dùng cùng helper; banner VST (nếu có) qua hook tương tự trên form VST.
