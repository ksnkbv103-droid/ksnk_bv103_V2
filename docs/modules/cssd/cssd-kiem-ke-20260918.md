# Kiểm kê dụng cụ CSSD — SSOT (2026-09-18)

Tab `/cssd-dung-cu?tab=KIEM_KE`. Nhân viên **nhập số đếm thực trước**; tồn bộ / kho / tổng loại derive từ đó.

## Công thức hiển thị

`so_luong_tong = so_luong_kho_du_phong + Σ so_luong_thuc_te(trong bộ)`  
→ `splitLoaiStock` trong `src/lib/master-data/cssd-loai-list-map.ts`.

## Tồn thực tế trong bộ (runtime)

`so_luong_thuc_te = chi_tiet.so_luong + SUM(cssd_fact_kho_giao_dich.so_luong_thay_doi)`  
→ view `v_cssd_bo_dung_cu_chi_tiet_realtime`.

## Ghi sổ kiểm kê

| Cửa | Ghi |
|-----|-----|
| **Kiểm kê bộ** | Insert `cssd_fact_kho_giao_dich` với `loai_giao_dich='KIEM_KE'`, `bo_dung_cu_id` + `loai_dung_cu_id`, `so_luong_thay_doi = dem − thuc_te`. Skip delta 0. Reject `dem < 0`. Cập nhật `cssd_dm_bo_dung_cu.ngay_kiem_ke_gan_nhat`; nếu `trang_thai=INVENTORY` → `ACTIVE`. |
| **Kiểm kê kho** | Set `cssd_dm_loai_dung_cu.so_luong_kho_du_phong = dem_kho` **và** insert giao dịch `KIEM_KE` (`bo_dung_cu_id=null`, `so_luong_thay_doi = dem_kho − kho_cu`) để audit. Reject `dem < 0`. |

Code: `src/lib/domain/cssd-kiem-ke.ts` · `src/lib/master-data/cssd-kiem-ke-core.ts` · `src/modules/cssd-erp/actions/cssd-kiem-ke.actions.ts`.

## Invariant luân chuyển (pure)

- **kho↔bộ** / **bộ↔bộ**: giữ `tong` loại (`preserveTongKhoToBo` / `preserveTongBoToKho` / `preserveTongBoToBo`).
- **Hỏng/Mất** vật lý: giảm `tong` (`decreaseTongPhysicalLoss`) — UI ở `/cssd-su-co`, không trên tab Kiểm kê.

## Quyền

Submit: `verifyAnyPermission` — `CSSD_KHO_DUNGCU` create|edit **hoặc** `BO_DC` create|edit.

## Blocker schema (A3)

Prod check `fact_kho_dung_cu_giao_dich_loai_giao_dich_check` hiện chỉ:

`NHAP_KHO | BAO_HONG | BAO_MAT | BO_SUNG | DIEU_CHUYEN`

Cần migration (chưa apply trong slice A):

```sql
ALTER TABLE public.cssd_fact_kho_giao_dich
  DROP CONSTRAINT IF EXISTS fact_kho_dung_cu_giao_dich_loai_giao_dich_check;
ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD CONSTRAINT fact_kho_dung_cu_giao_dich_loai_giao_dich_check
  CHECK (loai_giao_dich = ANY (ARRAY[
    'NHAP_KHO','BAO_HONG','BAO_MAT','BO_SUNG','DIEU_CHUYEN','KIEM_KE'
  ]));
```

Không migrate trong đợt A (PO: no migrate).

## UI

- Sub-mode: Kiểm kê bộ | Kiểm kê kho.
- Banner: nhập số thực → cập nhật tồn; luân chuyển không đổi tổng; hỏng/mất ở Sự cố.
- Footer: xuất phiếu Excel (reuse `SetReconcileCampaignPanel`) — vẫn còn trên tab Bộ.
