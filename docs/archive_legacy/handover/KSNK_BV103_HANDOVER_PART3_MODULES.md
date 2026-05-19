# TÀI LIỆU CHUYỂN GIAO KSNK BV103

## Phần 3: Nghiệp vụ & Vận hành từng Module

---

## 11. MODULE: GIÁM SÁT VỆ SINH TAY (giam-sat-vst)

### 11.1 Nghiệp vụ
Theo chuẩn **WHO 5 Moments of Hand Hygiene** — quan sát nhân viên y tế tại các thời điểm T1–T5 và ghi nhận hành động (rửa tay/chà cồn/bỏ sót).

### 11.2 Luồng hoạt động
1. Giám sát viên chọn **khoa, khu vực, ngày**
2. Hệ thống tự xác định **hình thức** (Chuyên trách / Chéo / Tự GS) dựa trên `supervision-policy.ts`:
   - Nhân sự Khoa KSNK → **Chuyên trách**
   - Mạng lưới tại đúng khoa mình → **Tự giám sát**
   - Khoa khác → **Giám sát chéo**
3. Nhập tối đa **3 đối tượng/phiên** (trừ yêu cầu mới), mỗi đối tượng ghi: thời điểm WHO (T1-T5), hành động, kỹ thuật, thời gian, đeo găng
4. Lưu → tạo `fact_giam_sat_vst_sessions` + N dòng `fact_giam_sat_vst`
5. Hỗ trợ **sửa/xóa mềm** trong cửa sổ 30 phút (admin bypass)
6. Hỗ trợ **import từ Excel**, **export flat CSV**

### 11.3 Server Actions
| Action | File | Mô tả |
|--------|------|-------|
| `saveVSTSession` | `vst-write-save-session.actions.ts` | Lưu phiên + observations |
| `deleteVSTSessions` | `vst-write-delete.actions.ts` | Xóa mềm (is_active=false) |
| `importVSTData` | `vst-write-import.actions.ts` | Import từ Excel |
| `getVSTSessionHistory` | `vst-read.actions.ts` | Đọc danh sách phiên (phân trang) |
| `getVSTDashboard` | `vst-dashboard.actions.ts` | Gọi RPC dashboard |

### 11.4 Data (bảng chính)
- `fact_giam_sat_vst_sessions` — phiên
- `fact_giam_sat_vst` — dòng quan sát
- View: `v_fact_giam_sat_vst_sessions_full`, `v_fact_giam_sat_vst_full`
- RPC: `rpc_get_vst_dashboard`

### 11.5 Quyền: `GIAM_SAT_VST` (VIEW/CREATE/EDIT/DELETE/IMPORT)

---

## 12. MODULE: GIÁM SÁT CHUNG (giam-sat-chung)

### 12.1 Nghiệp vụ
Giám sát tuân thủ bằng **bảng kiểm động** (checklist template). Mỗi bảng kiểm có N tiêu chí; mỗi phiên chấm ĐẠT/KHÔNG ĐẠT/NA cho từng tiêu chí.

### 12.2 Luồng hoạt động
1. Chọn **bảng kiểm** (`dm_bang_kiem`) → load tiêu chí (`dm_tieu_chi_bang_kiem`)
2. Chọn khoa, khu vực, nhân viên được GS, người GS
3. Chấm từng tiêu chí: ĐẠT / KHÔNG ĐẠT / NA + ghi chú
4. Lưu → `fact_giam_sat_chung_sessions` + N dòng `fact_giam_sat_chung_results`
5. Tính điểm `tong_diem` = % tiêu chí ĐẠT
6. Dashboard GSC: thống kê theo khoa, nghề nghiệp, khu vực, xu hướng, top vi phạm

### 12.3 Server Actions
| Action | File | Mô tả |
|--------|------|-------|
| `saveGiamSatChung` | `giam-sat-chung-write.actions.ts` | Lưu phiên + results |
| `deleteGiamSatChungSessions` | (cùng file) | Xóa mềm |
| `importGiamSatChungData` | `giam-sat-chung-import.actions.ts` | Import Excel |
| `getGiamSatChungSessions` | `giam-sat-chung-read.actions.ts` | Đọc danh sách |
| `getComplianceDashboard` | `giam-sat-chung-dashboard.actions.ts` | RPC dashboard |

### 12.4 Data
- `fact_giam_sat_chung_sessions`, `fact_giam_sat_chung_results`
- View: `v_fact_giam_sat_chung_sessions_full`
- RPC: `rpc_get_compliance_dashboard`

### 12.5 Quyền: `GIAM_SAT_CHUNG` (VIEW/CREATE/EDIT/DELETE/IMPORT)

---

## 13. MODULE: GIÁM SÁT NKBV (giam-sat-nkbv)

### 13.1 Nghiệp vụ
Ghi nhận ca nhiễm khuẩn bệnh viện (Hospital-Acquired Infection). **MVP — nhập tay**, chưa tích hợp HIS/LIS, chưa có Rules CDC tự động.

### 13.2 Luồng
1. Nhập: mã ca, bệnh nhân, ngày phát hiện, khoa ghi nhận, loại NKBV, vị trí, tác nhân vi khuẩn
2. Lưu → `fact_giam_sat_nkbv_ca`
3. Quản lý trạng thái ca: theo `dm_trang_thai_nkbv_ca`

### 13.3 Data
- `fact_giam_sat_nkbv_ca` + `dm_loai_nkbv` + `dm_trang_thai_nkbv_ca`
- Quyền: `GIAM_SAT_NKBV`

---

## 14. MODULE: CSSD-ERP (cssd-erp) — Tái xử lý dụng cụ

### 14.1 Nghiệp vụ
Quản lý toàn bộ chu trình tái xử lý dụng cụ y tế từ tiếp nhận → làm sạch → kiểm tra → đóng gói → tiệt khuẩn → cấp phát, sử dụng **QR code** để truy vết.

### 14.2 Quy trình 6 trạm (CSSD Workflow)

```
TIEP_NHAN → LAM_SACH → QC → DONG_GOI → TIET_KHUAN → CAP_PHAT
    ↑                                                      |
    └──────────── (vòng lặp mới) ──────────────────────────┘
```

- **5 trạm quét tay:** TIEP_NHAN, LAM_SACH, QC, DONG_GOI, CAP_PHAT (quét QR)
- **TIET_KHUAN:** chỉ qua phiếu mẻ (fact_lo_tiet_khuan) — không quét tay
- Quy tắc: phải đi đúng thứ tự, không nhảy trạm (trừ vòng lặp CAP_PHAT→TIEP_NHAN)
- Bộ đóng băng (`is_dong_bang`) không cho quét

### 14.3 Mẻ tiệt khuẩn (Sterilization Batch)
1. Tạo phiếu mẻ → chọn máy hấp (`dm_thiet_bi` — phải READY, không REPAIRING)
2. Quét QR bộ dụng cụ vào mẻ (bộ phải ở trạng thái DONG_GOI)
3. Chốt nạp (`tk_chot_nap_at`) → khóa, không thêm/bớt bộ
4. Kết thúc chu trình → mở form QC (`tk_mo_form_qc_at`)
5. Nhập kết quả QC (`ket_qua_test`, `tk_qc_json`)
6. Nếu ĐẠT: chuyển tất cả bộ sang CAP_PHAT
7. Nếu KHÔNG ĐẠT: domino rollback → bộ quay lại trạm trước

### 14.4 Tách/Gộp bộ (Component Split)
- Bộ MAIN có thể tách thành SUB (cấp phát riêng thành phần)
- `ma_vai_tro_bo`: MAIN / SUB
- `quy_trinh_cha_id`: liên kết SUB → MAIN
- Merge gate: chỉ cấp phát SUB khi MAIN đã cấp phát

### 14.5 Sự cố CSSD (`cssd-su-co`)
- Báo sự cố tại bất kỳ trạm nào
- `fact_su_co` + `fact_su_co_chi_tiet`
- `is_red_alert`: cảnh báo đỏ
- Domino policy: sự cố có thể rollback quy trình (`cssd-incident-policy.ts`)
- Quyền: `BAO_SU_CO`

### 14.6 Bảo trì thiết bị
- `fact_bao_tri_thiet_bi`: phiếu bảo trì
- Khi tạo phiếu → `dm_thiet_bi.trang_thai = 'REPAIRING'`
- Khi hoàn thành/hủy → `trang_thai = 'READY'`
- Máy REPAIRING: chặn tạo mẻ TK

### 14.7 Kho hóa chất / vật tư
- `fact_kho_hoa_chat_giao_dich`: ledger giao dịch (NHAP/XUAT/DIEU_CHINH)
- Tồn kho = tổng `so_luong` theo `hoa_chat_id` (có dấu +/-)
- `dm_hoa_chat.nguong_ton_toi_thieu`: cảnh báo tồn thấp
- Quyền: `KSNK_KHO_HOACHAT`

### 14.8 Đăng ký nhãn QR
- Tạo mã QR cho bộ dụng cụ vật lý
- In nhãn QR
- Quét QR để tra lịch sử (`fact_nhat_ky_quet`, `fact_cssd_lifecycle_event`)

### 14.9 CSSD Component Modules (8 bounded context)

| ID | Tên | Route | Quyền |
|----|-----|-------|-------|
| processing-lifecycle | Quy trình quét trạm | /cssd-quy-trinh | CSSD_WORKFLOW |
| sterilization-batch | Mẻ tiệt khuẩn | /cssd-quy-trinh | CSSD_ME_TIET_KHUAN |
| incident | Báo cáo sự cố | /cssd-su-co | BAO_SU_CO |
| maintenance | Bảo trì thiết bị | /cssd-thiet-bi | CSSD_ME_TIET_KHUAN |
| inventory-instrument | Kho dụng cụ | /cssd-dung-cu | CSSD_KHO_DUNGCU |
| inventory-chemical | Kho hóa chất | /cssd-hoa-chat | KSNK_KHO_HOACHAT |
| instrument-catalog | Danh mục & QR | /cssd-dung-cu | CSSD_KHO_DUNGCU, DANH_MUC |
| reporting | Báo cáo CSSD | /cssd-erp/report | CSSD_REPORT |

---

## 15. MODULE: QUẢN LÝ CÔNG VIỆC (quan-ly-cong-viec)

### 15.1 Nghiệp vụ
Quản lý công việc nội bộ Khoa KSNK: giao việc, theo dõi tiến độ, nghiệm thu, đánh giá KPI.

### 15.2 Workflow Track B (3 cổng)

```
Đề xuất (MOI, is_active=false)
    → Cổng 1: Phê duyệt đề xuất → MOI + is_active=true + nguoi_giao_viec_id
        → Cổng 2: Nhận việc → DANG_LAM
            → Báo cáo tiến độ → phan_tram_hoan_thanh++
            → Báo cáo 100% → CHO_DUYET
                → Cổng 3: Nghiệm thu
                    → Duyệt → HOAN_THANH
                    → Từ chối → TU_CHOI (về DANG_LAM)
```

### 15.3 Trạng thái công việc (CHECK constraint)
`MOI` → `DANG_LAM` → `CHO_DUYET` → `HOAN_THANH` / `TU_CHOI` / `QUA_HAN` / `DA_HUY`

### 15.4 Việc định kỳ
- `fact_cong_viec_dinh_ky`: mẫu (tần suất: HANG_NGAY/HANG_TUAN/HANG_THANG)
- RPC `fn_fact_cong_viec_spawn_dinh_ky_hom_nay()`: idempotent, tạo instance cho hôm nay
- `fact_cong_viec.dinh_ky_mau_id`: liên kết instance → mẫu
- Preview lịch: `lib/qlcv-dinh-ky-schedule.ts`

### 15.5 Đánh giá KPI tháng (Track A)
- `fact_qlcv_danh_gia_thang`: lưu đánh giá
- RPC `fn_qlcv_tong_hop_thang`: tổng hợp (chỉ phiếu gốc `cong_viec_cha_id IS NULL`)
- Công thức điểm: on_time_pct, completion_pct, quality_score → final_score

### 15.6 Timeline hoạt động
`fact_cong_viec_hoat_dong`: ghi lại mọi thay đổi (PHAN_CONG, XAC_NHAN_NHAN, BAO_CAO_TIEN_DO, DUYET_HOAN_THANH, TU_CHOI_HOAN_THANH, GIA_HAN...)

### 15.7 Quyền: `CONG_VIEC` (VIEW/CREATE/EDIT/DELETE/IMPORT/APPROVE)

---

## 16. MODULE: DASHBOARD COMMAND CENTER (dashboard)

### 16.1 Nghiệp vụ
Tổng hợp KPI toàn bệnh viện cho lãnh đạo Khoa KSNK.

### 16.2 Các Tab
| Tab | Nội dung | Widget Key |
|-----|----------|------------|
| Cơ cấu nguồn & Tổng hợp | Tổng phiên, cơ hội, tỷ lệ tuân thủ; bảng xếp hạng khoa; biểu đồ trend | DASHBOARD_CC_OVERVIEW |
| Chuyên trách / Chéo / Tự GS | Thống kê theo hình thức giám sát, nhân viên KSNK | DASHBOARD_CC_SUPERVISION |
| Đối soát & Lệch | So sánh, phát hiện bất thường | DASHBOARD_CC_GAP |

### 16.3 Data Sources
- **VST Dashboard**: RPC `rpc_get_vst_dashboard` → KPI, trend tháng, theo khoa, nghề nghiệp
- **GSC Dashboard**: RPC `rpc_get_compliance_dashboard` → tổng hợp bảng kiểm, vi phạm
- **Khoa overview**: RPC `rpc_dashboard_khoa_overview_rows` → tự GS theo khoa
- **Staff stats**: RPC `rpc_dashboard_ksnk_staff_supervision_stats`
- Bộ lọc: khoảng ngày (mặc định `BV103_ANALYTICS_DEFAULT_MONTHS`), khối, khoa, bảng kiểm

### 16.4 Quyền: `DASHBOARD` + `DASHBOARD_CC_*`

---

## 17. MODULE: QUẢN TRỊ HỆ THỐNG (quan-tri-he-thong)

### 17.1 Sub-modules

#### Danh mục (danh-muc/)
- Hub trung tâm: tile → route từng `dm_*`
- CRUD: khoa phòng, loại dụng cụ, bộ dụng cụ, chi tiết bộ, thiết bị, hóa chất
- Smart Import: import Excel theo template
- Export: xuất danh mục theo template
- Gateway: `mdm-gateway.actions.ts` — bundle nhiều danh mục cho form giám sát (1 lần gọi)
- Registry RPC: `rpc_get_registry_options` — đọc nhiều danh mục cùng lúc

#### Bảng kiểm (bang-kiem/)
- CRUD bảng kiểm (`dm_bang_kiem`) + tiêu chí (`dm_tieu_chi_bang_kiem`)
- Sắp thứ tự tiêu chí: RPC `rpc_reorder_tieu_chi_bang_kiem`
- Import bảng kiểm từ Excel

#### Nhân sự (nhan-su/)
- CRUD `mdm_nhan_su`
- Import hàng loạt từ Excel
- Gán khoa, nghề nghiệp, chức vụ, chức danh

#### Tài khoản nhân sự (tai-khoan-nhan-su/)
- Tạo tài khoản Supabase Auth cho nhân sự
- Gán vai trò RBAC (`rpc_assign_staff_ksnk_role`)
- Liên kết `mdm_nhan_su.auth_user_id` ↔ `auth.users.id`

#### Phân quyền (phan-quyen/)
- Ma trận phân quyền: vai trò × module × action
- CRUD `rel_role_permissions`
- Đồng bộ `dm_permissions` từ `permission-registry.ts`

### 17.2 Quyền: `DANH_MUC`, `NHAN_SU`, `BANG_KIEM`, `PHAN_QUYEN`, `KHOA_PHONG`, `LOAI_DC`, `BO_DC`, `DC_LE`, `THIET_BI`, `HOA_CHAT`, `BANG_KIEM_DETAIL`

---

## 18. MODULE: AUTH (auth)

### 18.1 Luồng
- **Đăng nhập**: mã NV hoặc email → tìm `mdm_nhan_su` → Supabase `signInWithPassword`
- **Quên mật khẩu**: Supabase `resetPasswordForEmail`
- **Đổi mật khẩu**: route `/tai-khoan`
- **Đăng xuất**: Supabase `signOut` + redirect `/login`
- **Offline support**: `OfflineSyncManager` — lưu phiên giám sát khi mất mạng, đồng bộ khi có lại

---

## 19. CÁC TÍNH NĂNG NGANG (Cross-cutting)

### 19.1 Supervision Policy (`supervision-policy.ts`)
Tự động xác định hình thức giám sát dựa trên:
- Người GS thuộc Khoa KSNK → **Chuyên trách**
- Mạng lưới tại đúng khoa → **Tự giám sát**
- Khoa khác → **Giám sát chéo**

### 19.2 Offline Sync
- `offline-pending-supervision-save.ts`: lưu phiên GS vào localStorage khi offline
- `OfflineSyncManager`: component tự đồng bộ khi có mạng

### 19.3 Import/Export Excel
- `import-export-template.ts`: định nghĩa template
- `excel-service.ts`: đọc/ghi Excel
- Hỗ trợ: VST, GSC, danh mục, nhân sự, bảng kiểm

### 19.4 Layout System
- `bv103-layout-chrome.ts`: SSOT class CSS (panel, textarea, label, notice)
- `app-shell-scope.ts`: xác định trang nào dùng shell layout thống nhất
- `KsnkPageShell`: wrapper max-width + padding đồng bộ

### 19.5 Analytics Default Range
- `bv103-analytics-default-range.ts`: hằng số `BV103_ANALYTICS_DEFAULT_MONTHS` — khoảng ngày mặc định cho dashboard

---

## 20. DEPLOYMENT & VẬN HÀNH

### 20.1 Deployment
- **App**: Vercel (auto-deploy từ GitHub)
- **Database**: Supabase Cloud
- **Migration**: `npx supabase db push` (96 file SQL trong `supabase/migrations/`)

### 20.2 Pipeline kiểm tra
```bash
npm run verify:full          # Lint + CSSD test + engineering gate + build
npm run pilot:ship           # env:check + verify:engineering + build + migrate + DB precheck
```

### 20.3 Pilot Scope
Biến `KSNK_PILOT_FOUR_MODULES=1` chặn các module chưa pilot:
- ✅ Dashboard, Giám sát VST, Giám sát chung, Quản trị hệ thống
- ❌ CSSD, NKBV, Quản lý công việc (chặn khi pilot)

### 20.4 PWA Support
- `manifest.ts`: Web App Manifest
- Touch-optimized viewport
- Offline sync cho giám sát

---

## 21. TỔNG KẾT

| Module | Route chính | Bảng fact | Bảng DM liên quan | Quyền |
|--------|-------------|-----------|-------------------|-------|
| Dashboard | `/` | (đọc fact_*) | — | DASHBOARD_* |
| VST | `/giam-sat-vst` | fact_giam_sat_vst_sessions, fact_giam_sat_vst | dm_khoa_phong, dm_khu_vuc_giam_sat, dm_nghe_nghiep | GIAM_SAT_VST |
| GSC | `/giam-sat-chung` | fact_giam_sat_chung_sessions, fact_giam_sat_chung_results | dm_bang_kiem, dm_tieu_chi_bang_kiem, dm_khoa_phong | GIAM_SAT_CHUNG |
| NKBV | `/giam-sat-nkbv` | fact_giam_sat_nkbv_ca | dm_loai_nkbv, dm_trang_thai_nkbv_ca | GIAM_SAT_NKBV |
| CSSD | `/cssd-*` | fact_quy_trinh, fact_lo_tiet_khuan, fact_nhat_ky_quet, fact_su_co, fact_bao_tri_thiet_bi, fact_kho_hoa_chat_giao_dich | dm_bo_dung_cu, dm_loai_dung_cu, dm_thiet_bi, dm_hoa_chat | CSSD_*, KSNK_KHO_HOACHAT, BAO_SU_CO |
| QLCV | `/quan-ly-cong-viec` | fact_cong_viec, fact_cong_viec_hoat_dong, fact_cong_viec_dinh_ky, fact_qlcv_danh_gia_thang | dm_khoa_phong, dm_to_cong_tac | CONG_VIEC |
| Quản trị | `/quan-tri-he-thong` | — | dm_*, mdm_nhan_su, dm_roles, dm_permissions | DANH_MUC, NHAN_SU, BANG_KIEM, PHAN_QUYEN |
| Auth | `/login`, `/tai-khoan` | — | mdm_nhan_su, rel_user_roles | — |
