> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

# Re-audit Thiết bị + Hóa chất — 2026-09-07

> Local only · không commit/push · scope: `/cssd-thiet-bi`, `/cssd-hoa-chat`, quan-tri danh mục, `cssd-erp` BaoTri / kho-hoa-chat, FEFO/PM, su-co EQUIPMENT/CHEMICAL links.

## 1. Map hiện trạng (ops vs admin)

| Surface | Route | Vai trò | Ghi chú |
|---------|-------|---------|---------|
| Ops thiết bị | `/cssd-thiet-bi` | Fleet + Bảo dưỡng + lịch sử mẻ theo máy | CTA «Sửa tại Quản trị»; tab `?tab=maintenance` / `van-hanh` |
| Ops bảo trì (embed) | cùng route tab maintenance | `BaoTriThietBiPage` (`suppressShell`) | Checklist PM, khóa mẻ khi REPAIRING, mở phiếu từ su-co EQUIPMENT |
| Admin thiết bị | `/quan-tri-he-thong/danh-muc/thiet-bi` | CRUD `cssd_dm_thiet_bi` | Form Dialog + QR print; chu kỳ PM |
| Ops hóa chất | `/cssd-hoa-chat` | Kho XNT theo lô, FEFO, cảnh báo ngưỡng/HSD | Module `KSNK_KHO_HOACHAT`; su-co CHEMICAL → ghi xuất |
| Admin hóa chất | `/quan-tri-he-thong/danh-muc/hoa-chat` | CRUD `cssd_dm_hoa_chat` | Master + ngưỡng tồn (đã bổ sung) |
| Catalog read-only | CSSD ERP catalog tab hóa chất | Chỉ xem | Không dual CRUD |

**SSOT domain:** `src/lib/domain/cssd-kho-hoa-chat-fefo.ts`, `cssd-equipment-pm*.ts`, `cssd-hoa-chat-loai.ts`.

## 2. Lỗi / gap đã sửa (P0–P1)

| # | Mức | Vấn đề | Sửa |
|---|-----|--------|-----|
| 1 | **P0** | Admin không CRUD `nguong_ton_toi_thieu` → banner «dưới ngưỡng» trên kho gần như không cấu hình được qua UI (chỉ Excel mapping) | Thêm field form + cột bảng + save action + type |
| 2 | **P1** | FEFO UI gộp «cận hạn» cho cả lô đã hết hạn | Bảng tồn + banner chip: **quá hạn** (rose) vs **cận hạn** (amber) |
| 3 | **P1** | `ketThucBaoTri` ghi `ngay_bao_tri_*` theo UTC (`now.slice(0,10)`) — lệch lịch VN (UTC+7) | Dùng `todayYmdInVn()` + `addDaysYmd` |
| 4 | **P1** | `/cssd-hoa-chat` thiếu CTA sang Quản trị (thiết bị đã có) | Thêm «Sửa tại Quản trị» |
| 5 | **P1** | Select xuất lô: option rỗng `""` trùng nghĩa với khóa lô `\|` → cảnh báo FEFO sai / xuất không chọn lô | Placeholder «Chọn lô»; bắt buộc `lotKey` khi còn tồn; hint khi chưa có tồn |
| 6 | **P1** | Nhãn overview «Hạn ≤ 30 ngày» không phản ánh lô quá hạn đã đếm | Đổi «Cận / quá hạn» |
| 7 | **P2** | `parseDateOnly` master hóa chất có thể lệch nếu parse Date generic | Giữ nguyên YYYY-MM-DD như `normalizeHanIso` |
| 8 | **P2** | Form master: «Hạn sử dụng» dễ nhầm với HSD lô kho | Đổi nhãn «Hạn tham chiếu (danh mục)» + ghi chú |

## 3. Files changed

- `src/modules/quan-tri-he-thong/danh-muc/actions/hoa-chat.types.ts`
- `src/modules/quan-tri-he-thong/danh-muc/actions/hoa-chat.actions.ts`
- `src/modules/quan-tri-he-thong/danh-muc/hoa-chat/hoa-chat-form-modal.tsx`
- `src/modules/quan-tri-he-thong/danh-muc/hoa-chat/hoa-chat-columns.tsx`
- `src/modules/cssd-erp/components/kho-hoa-chat/kho-hoa-chat-tables.tsx`
- `src/modules/cssd-erp/components/kho-hoa-chat/kho-hoa-chat-move-sheet.tsx`
- `src/modules/cssd-erp/components/kho-hoa-chat/kho-hoa-chat-overview.tsx`
- `src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx`
- `src/modules/cssd-erp/actions/cssd-bao-tri-mutations.actions.ts`
- `docs/modules/cssd/_agent-thiet-bi-hoa-chat-reaudit-20260907.md` (file này)

## 4. Còn lại (không sửa trong pass này)

| # | Mức | Residual | Lý do bỏ qua |
|---|-----|----------|--------------|
| R1 | P2 | Dialog pattern `if (!open) return null` (move-sheet / bao-tri / QuanTri shell) — có thể abrupt unmount | Chuẩn hiện tại toàn MDM; redesign Dialog không scope P0 |
| R2 | P2 | Fleet `listThietBiFleetAction` đếm mẻ TK full-scan `cssd_fact_lo_tiet_khuan` | Perf; cần aggregate DB nếu data lớn |
| R3 | P2 | `listGiaoDichKhoHoaChatAction` / fact bảo trì client-side table (limit 120 giao dịch) | Đủ pilot; pagination server sau |
| R4 | P2 | HoaChatStatsPanel `daysDiff` dùng local Date, không `todayYmdInVn` | Panel phụ admin; không ảnh hưởng FEFO ops |
| R5 | P3 | Pilot checklist T1 còn nói «Tab Danh mục» — UI đã chuyển Fleet/Maintenance | Doc drift; cập nhật checklist riêng |
| R6 | — | Care-bundle | Explicit skip |
| R7 | — | Dual catalog CRUD | Đã tách ops/admin; catalog ERP read-only |

## 5. Test results

```text
npx vitest run \
  src/lib/domain/cssd-kho-hoa-chat-fefo.spec.ts \
  src/lib/domain/cssd-equipment-pm.spec.ts \
  src/lib/domain/cssd-hoa-chat-loai.spec.ts \
  src/lib/domain/cssd-hoa-chat-su-co-resolve.spec.ts \
  src/modules/cssd-erp/helpers/kho-hoa-chat-lot.spec.ts \
  src/modules/cssd-erp/helpers/assert-thiet-bi-cho-me-tiet-khuan.spec.ts

→ Test Files  6 passed (6)
→ Tests       23 passed (23)

npx tsc --noEmit → exit 0 (0 errors)
```

## 6. Verdict

**PASS có điều kiện (P0–P1 local đã đóng).** Ops/admin tách đúng; FEFO domain + PM checklist ổn; su-co EQUIPMENT/CHEMICAL đã nối vào bảo trì / ghi xuất. Residual chủ yếu P2 perf/Dialog/doc. Không redesign lớn, không đụng care-bundle / module ngoài scope.

**Khuyến nghị tiếp:** (1) smoke tay H1–H4 + T2–T4 trên data thật; (2) set `nguong_ton_toi_thieu` cho vài SKU pilot; (3) cập nhật pilot checklist thiet-bi T1 cho khớp tab Fleet.
