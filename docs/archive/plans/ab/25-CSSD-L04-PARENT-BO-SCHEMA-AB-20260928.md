# 25 — CSSD-L04 `parent_bo_id` / heat-split catalog schema (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Soft-ready | Có — Domain **chốt A** |
| Date | 2026-09-28 (Asia/Saigon) |
| Neo | `17` Lock A §0/§4/§9 M1·M3·M10 · §12; backlog CSSD-L04; `18` §1-6 / M-26·M-27 |
| Mac tip | **Offline** (`6bad1c57-…`) — schema DoD từ Lock A neo; Soft verify tip Desktop `ksnk_bv103` khi online |
| Không | Invent CDC; UI tách tại Đóng gói; reopen merge-gate; sửa code từ Domain |

## Vấn đề
Tách nhiệt phải ở **danh mục**: hai `BoDungCu` thành phần + liên kết bộ mẹ; dual-track tới CP; chặn steam hỗn hợp. Soft cần DoD schema/FK/RPC trước khi migrate — không đoán cột tip khi Mac offline.

## Phương án

| Tiêu chí | A — Catalog 2 bộ + `parent_bo_id` (chốt) | B — SUB metadata một bộ / `registerSplitSub` Đóng gói | C — Reassembly tem mẹ sau TK |
|----------|------------------------------------------|------------------------------------------------------|------------------------------|
| Mô tả | Mẹ = master; 2 thành phần = `BoDungCu` vận hành; `parent_bo_id` → mẹ; `vai_tro_tach` ∈ `CHIU_NHIET`\|`KHONG_CHIU_NHIET`; mỗi nhánh `ChuTrinhBo` riêng | Một bộ + SUB pack không tem quét riêng; tách trên UI Đóng gói | Sau 2 mẻ ĐẠT «lắp lại» 1 tem mẹ |
| Đúng Lock A | M1-A · M3-A · M10-A · §12-2…4 | Lệch PO «cùng cách qua trạm»; conflict G1 | M3-B — trạm 7 ngầm |
| Khớp Soft hiện có | Khớp hướng bỏ UI tách Đóng gói (17c/L01); migrate `requireSplit` | Tip cũ SUB / `registerSplitSub` — phải gỡ | Không có neo Soft-safe |
| Side-effect | Migrate bộ hỗn hợp hiện có | Giữ debt Đóng gói | Phức tạp CP/in |
| Kiểm chứng | Mẹ ¬quét workflow; 2 thành phần vào 2 phiếu đúng PP; steam hỗn hợp fail | — | — |

**Chốt A.** Loại B (SUB / tách Đóng gói). Loại C (reassembly). Residual tem mẹ ghép nhận khoa = Lead detail — **không** chặn schema.

## Schema DoD (khái niệm — Soft map tên bảng tip khi online)

1. Cột/quan hệ trên `BoDungCu` (hoặc tương đương tip): `parent_bo_id` nullable FK → bộ mẹ; chỉ thành phần có parent; mẹ không parent vòng.
2. Cờ `vai_tro_tach` trên thành phần: `CHIU_NHIET` \| `KHONG_CHIU_NHIET` (khớp BOM `is_chiu_nhiet`).
3. `requireSplit` (derive hoặc persist): BOM mẹ lẫn nhiệt → true; chặn chốt `DONG_GOI` / nạp steam hỗn hợp đến khi đủ 2 nhánh vận hành (§12-3).
4. M10: tem/mã mẹ **không** advance 6 trạm; chỉ thành phần quét.
5. RPC/gate: bỏ / không gọi `registerSplitSub` từ Đóng gói; nạp mẻ M-26/M-27 chặn PP sai + mẹ vào phiếu.
6. Dual-track: 2 thành phần tới `CAP_PHAT` độc lập; phiếu/tem giao ghi mẹ + 2 mã thành phần.

## DoD Soft (tick)
- [ ] Migration: `parent_bo_id` + `vai_tro_tach` (hoặc map tip tương đương) + FK/index; idempotent.
- [ ] Fixture: mẹ `requireSplit` → không quét workflow; 2 thành phần quét như bộ thường.
- [ ] Steam hỗn hợp / nạp sai PP → hard fail (M-26/M-27).
- [ ] Đóng gói: 0 UI tách / BOM split; verify tip khi Mac online.
- [ ] Không đụng L07 used / L08 ledger / 18b AB trong lát schema này.

## PO blocker
Không chặn schema. Residual: quy ước mã tem `-H`/`-N` + QR Hub (Lead); tiêu chí «đủ set» nhận khoa đã LOCKED dual-track.

## Nhật ký lát — _audit-soft-25-L04-parent-bo-2026-09-28.md

# Soft audit — 25 CSSD-L04 parent_bo_id schema draft — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 ~06:51 ICT |
| Tip | `7f0fc61` · table **verified** `public.cssd_dm_bo_dung_cu` (+ `is_implant`) |
| Neo | `25-CSSD-L04-PARENT-BO-SCHEMA-AB-20260928.md` Domain A |
| Không | apply migrate · UI tách Đóng gói · L07/L08/18b |

## Done

- Draft `supabase/migrations/20260928065100_cssd_parent_bo_heat_split.sql`
  - `parent_bo_id` uuid NULL FK → `cssd_dm_bo_dung_cu(id)` ON DELETE RESTRICT
  - `vai_tro_tach` CHECK `CHIU_NHIET`\|`KHONG_CHIU_NHIET`
  - self-parent check · index partial
  - view `v_cssd_bo_heat_split_hint` derive `require_split` từ BOM `is_chiu_nhiet` lẫn
- Tip còn `registerSplitSub` trên CompositionReconcilePanel — **không gỡ trong lát schema**; wire/gỡ UI = lát sau khi migrate applied.

## UAT (sau apply)

1. Mẹ BOM lẫn nhiệt → `require_split=true` trên view.
2. Thành phần có `parent_bo_id` + `vai_tro_tach`; mẹ `parent_bo_id` NULL.
3. Đóng gói: chưa bắt buộc 0 UI tách cho đến Soft wire (DoD tick riêng).

## Nhật ký lát — _audit-soft-25-L04-dong-goi-gatesplit-2026-09-28.md

# Soft audit — L04 Đóng gói requireSplit Soft Soft Soft-safe — 2026-09-28

| Tip | `CSSDERPPage` Đóng gói → `CompositionReconcilePanel` **gateMode** |
| Status | **Verified Soft Soft Soft-safe** — 0 `registerSplitSub` trên Đóng gói |
| Neo | 25 L04 Domain A · 17c Lock A · migrate draft `20260928065100_cssd_parent_bo_heat_split.sql` (chưa apply) |

gateMode: `requireSplit` → amber warn «tách ở danh mục», không nút tách.
`!gateMode` catalog path vẫn giữ nút tách (không phải trạm Đóng gói).
