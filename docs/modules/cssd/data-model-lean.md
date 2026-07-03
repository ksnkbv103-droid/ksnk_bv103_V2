# CSSD — Data model lean (P2 hub)

> Hub vận hành: **`cssd_fact_quy_trinh`**. Pilot 2026-06 — không thêm bảng fact phụ cho BOM/lifecycle.

## Giữ (fact)

| Bảng | Vai trò |
|------|---------|
| `cssd_fact_quy_trinh` | Vòng đời bộ QR, người/giờ trạm, **BOM runtime**, audit |
| `cssd_fact_lo_tiet_khuan` | Mẻ tiệt khuẩn |
| `cssd_fact_su_co` | Sự cố / domino |
| `cssd_fact_kho_giao_dich` | Biến động kho dụng cụ lẻ |
| `cssd_fact_kho_hoa_chat_giao_dich` | Hóa chất |
| `cssd_fact_bao_tri` | Bảo trì thiết bị |

## Gộp vào `cssd_fact_quy_trinh`

| Trước | Sau |
|-------|-----|
| `cssd_fact_quy_trinh_thanh_phan` | `metadata.bom_lines[]` |
| `cssd_fact_lifecycle_event` | `metadata.ngoai_le[]` + cột `bom_kiem_dem_at` / `bom_kiem_dem_boi_id` |
| `cssd_fact_dieu_chuyen_thanh_phan` | Cập nhật `bom_lines` hai quy trình + `ngoai_le` |
| `cssd_fact_kho_chi_tiet` | Bỏ (pilot); dùng `cssd_fact_kho_giao_dich` |

## Gate cấp phát

- **Mềm (Q2):** thiếu món so với thiết kế (`v_cssd_bo_dung_cu_chi_tiet_realtime`) → warning + tem, không hard block.
- **`bom_kiem_dem_at`:** ghi khi quét Đóng gói (audit); không còn gate bắt buộc modal BOM.

## Reset demo local

```bash
npm run cssd:demo:reset:local
```

Migration: `20260622120000_cssd_quy_trinh_hub_consolidation.sql`.
