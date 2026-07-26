# QLCV — ma trận liên thông UI → Action → RPC/DB (2026-07-20)

> SSOT nghiệp vụ: [`domain-specification.md`](../../core/domain-specification.md) §2.3 · Mapping: [`implementation-mapping.md`](../../core/implementation-mapping.md) § Công việc.

| Thao tác UI | Server Action | RPC / bảng ghi | Guard |
|-------------|---------------|----------------|-------|
| Tạo công việc | `createCongViec` | INSERT `qlcv_fact_cong_viec` + `fn_qlcv_append_nhat_ky` | KSNK + CREATE; phụ trách KSNK |
| Đề xuất việc | `createDeXuat` | INSERT fact `is_active=false`, `trang_thai=MOI` + nhật ký | KSNK + CREATE |
| Phê / từ chối đề xuất | `pheDuyetDeXuat` / `pheDuyetVaCapNhatDeXuat` | `fn_qlcv_transition` `PHE_DUYET_DEXUAT` / `TU_CHOI_DEXUAT` | APPROVE |
| Sửa metadata / giao lại | `updateCongViec` | UPDATE fact; giao phụ trách `MOI`→`DANG_LAM` (canonical) | EDIT |
| Tick checklist / % | `updateQlcvChecklist` / `reportQlcvManualProgress` | `fn_qlcv_update_checklist` (+ nhật ký) | KSNK |
| Nghiệm thu | `xacNhanHoanThanh` | `fn_qlcv_transition` `NGHIEM_THU` | APPROVE + `isEligibleForNghiemThu` |
| Từ chối nghiệm thu | `tuChoiHoanThanhCongViec` | `fn_qlcv_transition` `TU_CHOI_NGHIEM_THU` | cùng cổng nghiệm thu |
| Hủy phiếu | `huyKhiChoNghiemThuKhongDat` / transition | `fn_qlcv_transition` → `DA_HUY` | DELETE/admin |
| Ghi chú tiến độ | `createHoatDong` | `fn_qlcv_append_nhat_ky` | phụ trách hoặc EDIT |
| Spawn định kỳ | `spawnCongViecDinhKyHomNay` | `fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay` | EDIT/admin |
| Import Excel | `importCongViecRows` | INSERT fact + nhật ký | IMPORT |
| Quá hạn (batch) | pg_cron | `fn_sync_overdue_tasks` → `trang_thai=QUA_HAN` | DB |
| Đọc list/detail | `getCongViecList*` / `getCongViecDetail` | `v_qlcv_cong_viec_full` (+ `is_qua_han`) | KSNK + scope |

**Trạng thái ghi:** chỉ 7 mã canonical qua `normalizeQlcvTrangThaiToCanonical` / `normalizeQlcvDmFields`.

**Kanban QUA_HAN:** `trang_thai=QUA_HAN` **hoặc** `is_qua_han` (view) **hoặc** hạn đã qua trên phiếu mở — xem `isQlcvBoardOverdue`.  
**Thứ tự lane:** đóng (`DA_HUY`/`HOAN_THANH`) → đề xuất chờ duyệt → quá hạn → chờ nghiệm thu → đang làm.  
**Nghiệm thu action:** `isEligibleForNghiemThu` (gồm `QUA_HAN`@100%); lane «Chờ nghiệm thu» chỉ `CHO_DUYET` / `DANG_LAM`@100% (không gồm quá hạn).
