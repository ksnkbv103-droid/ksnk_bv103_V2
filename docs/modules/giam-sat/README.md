# Giám sát (VST / GSC)

> Bản đồ: [`../../ssot-map.md`](../../ssot-map.md). Việc còn mở: [`../../core/handover-roadmap.md`](../../core/handover-roadmap.md) §5.

| Đọc khi | File |
|---------|------|
| Nghiệp vụ | [`../../core/domain-specification.md`](../../core/domain-specification.md) + [`../../wiki/entities.md`](../../wiki/entities.md#giám-sát-vst--gsc) |
| Bảng kiểm 36 mẫu | [`bang-kiem-overview.md`](bang-kiem-overview.md) — **không** mở `data/bang-kiem/canonical-36.md` |
| Inventory seed giám sát | [`12-BANG-KIEM-inventory-from-KSNK-final.md`](12-BANG-KIEM-inventory-from-KSNK-final.md) |
| Hub vệ sinh tay (3 mẫu / 3 chỉ số) | [`13-VE-SINH-TAY-hub.md`](13-VE-SINH-TAY-hub.md) |
| Phạm vi khoa & đối tượng | [`16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md`](16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md) |
| Khóa sổ module | [`module-lock.md`](module-lock.md) |
| Layout / scoring | [`../../wiki/concepts.md`](../../wiki/concepts.md) · [`../../ux/principles.md`](../../ux/principles.md) |
| Seed catalog (người) | [`bang-kiem-seed/README.md`](bang-kiem-seed/README.md) |

Rule: `13-giam-sat-spec-context.mdc`, `16-bang-kiem-spec-context.mdc`

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
