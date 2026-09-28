# Soft audit — 25c QLCV NGHIEM_THU × DINH_KY harden — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 ~06:50 ICT (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-…` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `7f0fc61` · branch `cursor/me-sync-recall-print` |
| Neo | `25c-QLCV-P1-Q14-AB2-NGHIEM-THU-AB-20260928.md` Domain A |
| Không | commit / push / prod migrate · Q-14 FE · AB-2 cột DB |

## Done Soft Soft-safe

1. **Draft migrate** `supabase/migrations/20260928065000_qlcv_nghiem_thu_dinh_ky_harden.sql`
   - `fn_qlcv_transition` `NGHIEM_THU` / `TU_CHOI_NGHIEM_THU` → **reject** khi `loai_cong_viec=DINH_KY` (message rõ).
   - `SET_TRANG_THAI` → cấm `CHO_DUYET` cho DINH_KY.
   - `fn_qlcv_update_checklist` → DINH_KY @100% coerce `HOAN_THANH`; cấm `CHO_DUYET`.
2. FE đã Soft-safe sẵn: `isEligibleForNghiemThu` false for DINH_KY; `trangThaiCongViecSauBaoCaoTienDo` → HOAN_THANH @100%. SQL đóng dual-path admin bypass.
3. **Park:** Q-14 RPC kỳ · AB-2 UI «Người duyệt cuối» (không cột `nguoi_duyet_id`).

## UAT (sau Nghĩa apply migrate)

1. RPC thẳng `fn_qlcv_transition(…, 'NGHIEM_THU', …)` trên phiếu DINH_KY → error chứa «định kỳ».
2. DINH_KY checklist 100% → `HOAN_THANH` (không `CHO_DUYET`).
3. DOT_XUAT/KHAN_CAP @100% / CHO_DUYET → nghiệm thu vẫn pass.
4. Không đụng gate «Chờ tôi» (24).
