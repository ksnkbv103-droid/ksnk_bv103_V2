# TÀI LIỆU CHUYỂN GIAO KSNK BV103

## Phần 2: Cấu trúc Database chi tiết

---

> **SSOT (chuẩn duy nhất):** Schema thực tế = **`supabase/migrations/`** đã apply trên DB + bảng map [`docs/specs/10-bv103-implementation-mapping.md`](../specs/10-bv103-implementation-mapping.md).  
> Mục §7 dưới là **tài liệu mô tả tham chiếu** (snapshot khi soạn); không dùng con số “48 bảng” thay cho kiểm tra migration / `\dt` trên môi trường pilot.

## 7. Danh mục bảng (tài liệu tham chiếu — ~48 thực thể cốt lõi đã mô tả)

### 7.1 Nhóm Danh mục (dm_*) — 18 bảng

#### `dm_khoa_phong` — Danh mục Khoa/Phòng
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_khoa | TEXT | Mã khoa |
| ten_khoa | TEXT NOT NULL | Tên khoa phòng |
| khoi_id | UUID FK → dm_khoi_khoa | Khối khoa |
| is_active | BOOL DEFAULT true | Soft delete |
| created_at / updated_at | TIMESTAMPTZ | |

#### `dm_khoi_khoa` — Danh mục Khối khoa
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_khoi | TEXT | Mã khối |
| ten_khoi | TEXT NOT NULL | Tên khối |
| is_active | BOOL DEFAULT true | |

#### `dm_nghe_nghiep` — Nghề nghiệp (Bác sĩ, Điều dưỡng...)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_nghe_nghiep | TEXT | Mã |
| ten_nghe_nghiep | TEXT | Tên |
| is_active | BOOL | |

#### `dm_chuc_vu` — Chức vụ
`id, ten_chuc_vu, is_active, created_at, updated_at`

#### `dm_chuc_danh` — Chức danh
`id, ten_chuc_danh, is_active, created_at, updated_at`

#### `dm_to_cong_tac` — Tổ công tác
`id, ten_to, is_active, created_at, updated_at`

#### `dm_khu_vuc_giam_sat` — Khu vực giám sát
`id, ma_khu_vuc, ten_khu_vuc, is_active, created_at, updated_at`

#### `dm_hinh_thuc_giam_sat` — Hình thức GS (Chuyên trách/Chéo/Tự GS)
`id, ma_hinh_thuc, ten_hinh_thuc, is_active`

#### `dm_cach_thuc_giam_sat` — Cách thức GS (Trực tiếp/Camera/Hồi cứu)
`id, ma_cach_thuc, ten_cach_thuc, is_active`

#### `dm_bang_kiem` — Danh mục Bảng kiểm
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_bk | TEXT NOT NULL | Mã bảng kiểm (unique) — dùng cho filter dashboard |
| ten_bang_kiem | TEXT NOT NULL | |
| nhom_chuyen_de | TEXT | Nhóm chuyên đề |
| loai_hinh_giam_sat | TEXT DEFAULT 'TRUC_TIEP' | |
| is_system | BOOL DEFAULT false | Bảng kiểm hệ thống (không xóa) |
| is_active | BOOL | |

#### `dm_tieu_chi_bang_kiem` — Tiêu chí trong bảng kiểm
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| bang_kiem_id | UUID FK → dm_bang_kiem | |
| noi_dung | TEXT | Nội dung tiêu chí |
| stt | INT | Thứ tự |
| is_active | BOOL | |

#### `dm_loai_dung_cu` — Loại dụng cụ CSSD
`id, ma_loai_dung_cu, ten_loai_dung_cu, is_active`

#### `dm_bo_dung_cu` — Bộ dụng cụ (template)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_bo | VARCHAR(50) NOT NULL | Mã bộ |
| ten_bo | TEXT NOT NULL | |
| loai_dung_cu_id | UUID FK → dm_loai_dung_cu | |
| khoa_su_dung_id | UUID FK → dm_khoa_phong | Khoa sử dụng |
| quy_cach | TEXT | Quy cách |
| is_active | BOOL | |

#### `dm_bo_dung_cu_chi_tiet` — Chi tiết bộ dụng cụ (thành phần)
`id, bo_dung_cu_id (FK), ten_dung_cu_le, so_luong, ma_chi_tiet, loai_dung_cu_id, max_suds_count, trong_luong, is_active`

#### `dm_thiet_bi` — Thiết bị CSSD (máy hấp/máy rửa)
`id, ten_thiet_bi, ma_thiet_bi, loai_may, hang_san_xuat, nam_san_xuat, trang_thai (READY/REPAIRING), is_active`

#### `dm_hoa_chat` — Hóa chất / vật tư
`id, ten_hoa_chat, ma_hoa_chat, don_vi_tinh, nguong_ton_toi_thieu, is_active`

#### `dm_loai_su_co` — Loại sự cố CSSD
`id, ten_loai, ma_loai, is_active`

#### `dm_loai_may_tiet_khuan` — Loại máy tiệt khuẩn
`id, ten_loai, ma_loai, is_active`

### 7.2 Nhóm Master Data (mdm_*) — 3 bảng

#### `mdm_nhan_su` — Nhân sự (SSOT)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_nv | TEXT | Mã nhân viên (unique khi active) |
| ho_ten | TEXT NOT NULL | |
| email | TEXT | Email (unique partial khi active) |
| so_dien_thoai | TEXT | |
| khoa_id | UUID FK → dm_khoa_phong | Khoa trực thuộc |
| nghe_nghiep_id | UUID FK → dm_nghe_nghiep | |
| chuc_vu_id | UUID FK → dm_chuc_vu | |
| chuc_danh_id | UUID FK → dm_chuc_danh | |
| vai_tro_he_thong_id | UUID FK → dm_roles | Vai trò RBAC |
| auth_user_id | UUID FK → auth.users | Liên kết tài khoản Supabase Auth |
| is_active | BOOL | |

#### `mdm_field_registry` — Registry quản trị trường/FK
`id, table_name, column_name, field_role, source_table, is_active, created_at, updated_at`

#### `mdm_governance_suggestion` — Gợi ý governance tự động
`id, table_name, column_name, suggestion_type, confidence, reason, status, proposed_field_role, proposed_source_table`

### 7.3 Nhóm Auth/RBAC — 4 bảng

#### `dm_roles` — Vai trò
`id, name (ADMIN, CAN_BO_KSNK...), description, is_active`

#### `dm_permissions` — Quyền
`id, name (MODULE_ACTION), module_name, action, description`

#### `rel_user_roles` — Gán vai trò cho user
`id, user_id (FK → auth.users), role_id (FK → dm_roles)`

#### `rel_role_permissions` — Gán quyền cho vai trò
`id, role_id (FK → dm_roles), permission_id (FK → dm_permissions)`

### 7.4 Nhóm Fact — Giám sát VST (2 bảng)

#### `fact_giam_sat_vst_sessions` — Phiên giám sát VST
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ngay_giam_sat | DATE | Ngày thực hiện |
| khoa_id | UUID FK → dm_khoa_phong | Khoa được giám sát |
| khu_vuc_id | UUID FK → dm_khu_vuc_giam_sat | |
| nguoi_giam_sat_id | UUID FK → mdm_nhan_su | |
| hinh_thuc_id | UUID FK → dm_hinh_thuc_giam_sat | |
| cach_thuc_id | UUID FK → dm_cach_thuc_giam_sat | |
| hinh_thuc_giam_sat | TEXT | (legacy text, giữ cho tương thích) |
| cach_thuc_giam_sat | TEXT | (legacy text) |
| vi_tri_cu_the | TEXT | |
| is_active | BOOL | Soft delete |
| created_at | TIMESTAMPTZ | |

#### `fact_giam_sat_vst` — Dòng quan sát VST (cơ hội vệ sinh tay)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| session_id | UUID FK → fact_giam_sat_vst_sessions | |
| thoi_diem | TEXT | Thời điểm WHO (T1–T5) |
| hanh_dong | TEXT | "Rửa tay bằng nước" / "Chà tay bằng cồn" / "Bỏ sót" |
| nghe_nghiep | TEXT | (legacy text) |
| nghe_nghiep_id | UUID FK → dm_nghe_nghiep | |
| khu_vuc_id | UUID FK → dm_khu_vuc_giam_sat | |
| dung_ky_thuat | BOOL | Đúng kỹ thuật? |
| du_thoi_gian | BOOL | Đủ thời gian? |
| co_deo_gang | BOOL | Có đeo găng? |

### 7.5 Nhóm Fact — Giám sát chung (2 bảng)

#### `fact_giam_sat_chung_sessions` — Phiên giám sát bảng kiểm
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ngay_giam_sat | DATE | |
| khoa_id | UUID FK | Khoa được giám sát |
| khu_vuc_id | UUID FK | |
| nhan_vien_id | UUID FK → mdm_nhan_su | Nhân viên được giám sát |
| nguoi_giam_sat_id | UUID FK → mdm_nhan_su | |
| bang_kiem_id | UUID FK → dm_bang_kiem | |
| loai_bang_kiem | TEXT | Mã bảng kiểm (dùng cho filter RPC) |
| nghe_nghiep_id | UUID FK | |
| hinh_thuc_id / cach_thuc_id | UUID FK | |
| tong_diem | NUMERIC | Điểm tổng |
| ghi_chu_chung | TEXT | |
| is_active | BOOL | |

#### `fact_giam_sat_chung_results` — Kết quả từng tiêu chí
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| session_id | UUID FK | |
| criterion_id | UUID FK → dm_tieu_chi_bang_kiem | |
| value | TEXT | 'DAT' / 'KHONG_DAT' / 'NA' |
| note | TEXT | Ghi chú |

### 7.6 Nhóm Fact — NKBV (1 bảng)

#### `fact_giam_sat_nkbv_ca` — Ca nhiễm khuẩn bệnh viện
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_ca | TEXT | Mã ca bệnh |
| ho_ten_benh_nhan | TEXT | |
| ma_benh_nhan | TEXT | |
| ngay_phat_hien | DATE | |
| khoa_ghi_nhan_id | UUID FK → dm_khoa_phong | |
| loai_nkbv_id | UUID FK → dm_loai_nkbv | |
| trang_thai_id | UUID FK → dm_trang_thai_nkbv_ca | |
| vi_tri_nhiem_khuan | TEXT | |
| tac_nhan_vi_khuan | TEXT | |
| nguoi_ghi_id | UUID FK → mdm_nhan_su | |
| is_active | BOOL | |

### 7.7 Nhóm Fact — CSSD (8 bảng)

#### `fact_quy_trinh` — Quy trình CSSD (bộ dụng cụ vật lý đang lưu chuyển)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_qr_quy_trinh | TEXT | Mã QR bộ dụng cụ |
| ma_trang_thai_hien_tai | TEXT | TIEP_NHAN/LAM_SACH/QC/DONG_GOI/TIET_KHUAN/CAP_PHAT |
| tram_hien_tai_id | UUID FK → dm_tram_cssd | |
| bo_dung_cu_id | UUID FK → dm_bo_dung_cu | |
| lo_tiet_khuan_id | UUID FK → fact_lo_tiet_khuan | Mẻ tiệt khuẩn hiện tại |
| ma_vai_tro_bo | TEXT | Vai trò: MAIN / SUB |
| quy_trinh_cha_id | UUID FK → fact_quy_trinh | Bộ cha (khi tách SUB) |
| is_dong_bang | BOOL | Khóa an toàn (đóng băng) |
| is_active | BOOL | |

#### `fact_lo_tiet_khuan` — Mẻ tiệt khuẩn (Sterilization Batch)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| ma_lo / so_lo | TEXT | Mã mẻ |
| thiet_bi_id | UUID FK → dm_thiet_bi | Máy hấp |
| nhiet_do / ap_suat / thoi_gian | NUMERIC | Thông số |
| ket_qua_test | TEXT | Kết quả QC |
| tk_chot_nap_at | TIMESTAMPTZ | Bắt đầu tiệt khuẩn (khóa nạp bộ) |
| tk_mo_form_qc_at | TIMESTAMPTZ | Kết thúc chu trình, mở form QC |
| tk_qc_json | JSONB | Dữ liệu QC chi tiết |
| is_active | BOOL | |

#### `fact_nhat_ky_quet` — Nhật ký quét QR
`id, quy_trinh_id, tram, thao_tac, nguoi_quet, created_at`

#### `fact_cssd_lifecycle_event` — Sự kiện vòng đời CSSD
`id, quy_trinh_id, event_code, metadata, created_at`

#### `fact_quy_trinh_thanh_phan` — Thành phần bộ dụng cụ (ledger)
`id, quy_trinh_id, chi_tiet_id, so_luong, is_active`

#### `fact_su_co` — Sự cố CSSD
`id, ma_vach_qr, tram_phat_hien, loai_su_co, mo_ta, is_red_alert, quy_trinh_id, is_active`

#### `fact_su_co_chi_tiet` — Chi tiết sự cố
`id, su_co_id, noi_dung, created_at`

#### `fact_bao_tri_thiet_bi` — Phiếu bảo trì thiết bị
`id, thiet_bi_id, loai_bao_tri, mo_ta, trang_thai (DANG_BAO_TRI/HOAN_THANH/HUY), ngay_bat_dau, ngay_ket_thuc, created_at`

#### `fact_kho_hoa_chat_giao_dich` — Giao dịch kho hóa chất (ledger)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| hoa_chat_id | UUID FK → dm_hoa_chat | |
| loai_giao_dich | TEXT | NHAP / XUAT / DIEU_CHINH |
| so_luong | NUMERIC | Có dấu (+/-) |
| so_lo | TEXT | Số lô |
| han_su_dung | DATE | |
| ghi_chu | TEXT | |
| created_at | TIMESTAMPTZ | |

### 7.8 Nhóm Fact — Công việc (3 bảng)

#### `fact_cong_viec` — Công việc
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| tieu_de | TEXT NOT NULL | |
| mo_ta | TEXT | |
| loai_cong_viec | TEXT CHECK | DINH_KY / DOT_XUAT / KHAN_CAP |
| muc_do_uu_tien | TEXT CHECK | THAP / TRUNG_BINH / CAO |
| trang_thai | TEXT CHECK | MOI / DANG_LAM / CHO_DUYET / HOAN_THANH / TU_CHOI / QUA_HAN / DA_HUY |
| phan_tram_hoan_thanh | INT DEFAULT 0 | |
| han_hoan_thanh | TIMESTAMPTZ | |
| nguoi_tao_id | UUID FK → mdm_nhan_su | |
| nguoi_giao_viec_id | UUID FK → mdm_nhan_su | Ghi khi phê duyệt |
| nguoi_phu_trach_id | UUID FK → mdm_nhan_su | |
| khoa_thuc_hien_id | UUID FK → dm_khoa_phong | |
| to_cong_tac_id | UUID FK → dm_to_cong_tac | |
| cong_viec_cha_id | UUID FK → fact_cong_viec | Việc cha (phân rã) |
| dinh_ky_mau_id | UUID FK → fact_cong_viec_dinh_ky | Mẫu định kỳ nguồn |
| is_active | BOOL | |

#### `fact_cong_viec_hoat_dong` — Timeline hoạt động
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| id_cong_viec | UUID FK | |
| loai_hoat_dong | TEXT | PHAN_CONG / DE_XUAT / BAO_CAO_TIEN_DO / PHE_DUYET / CAP_NHAT / HOAN_THANH / XAC_NHAN_NHAN / DUYET_HOAN_THANH / TU_CHOI_HOAN_THANH / GIA_HAN |
| nguoi_thuc_hien_id | UUID FK | |
| phan_tram_hoan_thanh | INT | |
| noi_dung | TEXT | |
| trang_thai | TEXT | |

#### `fact_cong_viec_dinh_ky` — Mẫu việc định kỳ
`id, tieu_de, mo_ta, tan_suat (HANG_NGAY/HANG_TUAN/HANG_THANG), ngay_trong_tuan, ngay_trong_thang, nguoi_phu_trach_id, khoa_thuc_hien_id, is_active`

#### `fact_qlcv_danh_gia_thang` — Đánh giá KPI tháng
`id, nhan_su_id, thang (INT), nam (INT), quality_score, final_score, manager_comment, evaluated_at`

### 7.9 Bảng hỗ trợ còn lại

- `dm_loai_cong_viec`, `dm_trang_thai_cong_viec` — enum danh mục
- `dm_loai_nkbv` — Loại nhiễm khuẩn BV
- `dm_trang_thai_nkbv_ca` — Trạng thái ca NKBV
- `fact_kho_chi_tiet`, `fact_kho_giao_dich` — Kho dụng cụ CSSD (inventory)
- `fact_cssd_dieu_chuyen_thanh_phan` — Điều chuyển thành phần

---

## 8. VIEWS ĐỌC DỮ LIỆU

| View | Mô tả |
|------|-------|
| `v_dm_khoa_phong_full` | Join khoa + khối → có `ten_khoi`, `ma_khoi` |
| `v_fact_giam_sat_vst_sessions_full` | Session VST join khoa, khu vực, người GS, hình thức, cách thức |
| `v_fact_giam_sat_vst_full` | Observation VST join nghề nghiệp, khu vực |
| `v_fact_giam_sat_chung_sessions_full` | Session GSC join đầy đủ |
| `v_fact_cong_viec_full` | Công việc join người tạo, người giao, người phụ trách, khoa, tổ |
| `v_cong_viec_qua_han` | Công việc quá hạn |
| `v_fact_lo_tiet_khuan_full` | Mẻ tiệt khuẩn join thiết bị |
| `v_fact_su_co_full` | Sự cố join quy trình |
| `v_dm_thiet_bi_full` | Thiết bị join loại máy |
| `v_dm_bang_kiem_full` | Bảng kiểm + đếm tiêu chí |
| `v_gsc_dashboard_rows` | Dashboard GSC tổng hợp |
| `v_auth_user_permissions` | Quyền user (RBAC) |

---

## 9. RPC (Remote Procedure Call) QUAN TRỌNG

| RPC | Mô tả |
|-----|-------|
| `rpc_get_vst_dashboard` | Dashboard VST: KPI, theo tháng, theo khoa, theo nghề nghiệp, lỗi |
| `rpc_get_compliance_dashboard` | Dashboard GSC: tổng hợp, theo khoa/nghề/khu vực, trend, vi phạm |
| `rpc_get_registry_options` | Đọc danh mục theo categories (KHOA_PHONG, NGHE_NGHIEP...) — một RPC cho nhiều dropdown |
| `rpc_scan_workflow_station` | CSSD: quét QR chuyển trạm |
| `rpc_assign_staff_ksnk_role` | Gán vai trò KSNK cho nhân sự |
| `rpc_reorder_tieu_chi_bang_kiem` | Sắp lại thứ tự tiêu chí bảng kiểm |
| `fn_fact_cong_viec_spawn_dinh_ky_hom_nay` | Tạo việc định kỳ cho hôm nay (idempotent) |
| `fn_qlcv_tong_hop_thang` | Tổng hợp KPI QLCV theo tháng |
| `rpc_dashboard_ksnk_staff_supervision_stats` | Thống kê nhân viên KSNK giám sát |
| `rpc_dashboard_khoa_overview_rows` | Tổng quan khoa cho dashboard |

---

## 10. ROW LEVEL SECURITY (RLS)

- RLS được **bật tự động** trên mọi bảng mới qua event trigger `rls_auto_enable`
- Các bảng `dm_*` / `mdm_*`: policy SELECT cho `authenticated` role
- Các bảng `fact_*`: policy SELECT cho `authenticated` role; INSERT/UPDATE/DELETE qua admin client (sau `verifyPermission`)
- RPC dùng `SECURITY DEFINER` (chạy với quyền owner) — nhưng gate quyền ở tầng app

