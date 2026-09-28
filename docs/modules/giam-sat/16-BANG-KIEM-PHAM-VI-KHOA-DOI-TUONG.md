# 16 — Phạm vi khoa & đối tượng giám sát (bảng kiểm IN-SCOPE)

> **v2 · 2026-09-23 · PO feedback hệ thống→KSNK** — rewrite standards-grade; REJECT shallow allocation v1.

| | |
|--|--|
| Mã | `16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG` |
| Phiên bản | **v2** · 2026-09-23 Asia/Saigon |
| PO | Nghĩa · Soft · Domain |
| Phạm vi | 66 BM IN (1 WHO + 65 BK) từ `bang-kiem-seed` |
| DB / code / Cloud / git | **Không** |
| Khóa PO | Quy trình/bảng kiểm **hệ thống** → lớp `he_thong`, **Khoa KSNK chủ trì** (Hội đồng: KSNK thư ký). Tách bạch khỏi giám sát tuân thủ **tại điểm chăm sóc / đơn vị thực hành**. |
| Mirror | `ksnk_bv103_macwork/.../giam-sat/16-…md` · `ksnk-domain/16-…md` · seed `bang-kiem-seed` + `/home/box/bang-kiem-seed` |
| Neo liên quan | file **12** inventory · file **15** SURF_* · file **11/13/14** |
| Seed enriched v2 | `lop_giam_sat` · `co_quan_chu_tri` · `noi_quan_sat` · `ly_do_phan_bo` · `pham_vi_khoa` · `doi_tuong_goi_y` · `bat_buoc_filter_khoa` |

---

## 1. Hai lớp nghiệp vụ + định nghĩa Khoa KSNK chủ trì hệ thống

### 1.1 Hai lớp

| Lớp `lop_giam_sat` | Nghĩa nghiệp vụ | Cơ quan chủ trì mặc định | Ví dụ điển hình |
|-------------------|-----------------|---------------------------|-----------------|
| `he_thong` | Đánh giá / audit **chương trình–quản trị–Hội đồng–điều phối cấp viện** | **Khoa KSNK** (hoặc `Hoi_dong_KSNK` với KSNK thư ký/thường trực) | Đánh giá rủi ro HĐ, hoạt động Hội đồng, ICRA chương trình, hệ thống xử lý phơi nhiễm, xử lý vụ dịch, thiết lập Hệ thống KSNK, chương trình ATNN |
| `thuc_hanh_don_vi` | Giám sát tuân thủ **thao tác / tay nghề / bundle tại điểm chăm sóc hoặc đơn vị thực hành** | `Don_vi_thuc_hanh` (khoa LS, CSSD, PM, Giặt là…) | VST WHO/BM.02/03, PTPH, tiêm, VSMT, chất thải, SSI/CLABSI/CAUTI/VAP, CSSD thao tác, QĐ chuyên khoa |
| `hybrid` | Một form BM chứa **cả** phần thực hành tại khoa **và** phần điều phối hệ thống | `Mang_luoi` (+ KSNK điều phối) | QT.06 Mạng lưới — ưu tiên tách khái niệm trong prose/BCTH dù một form |

### 1.2 Khoa KSNK = cơ quan chủ trì lớp hệ thống

- Khoa KSNK là **cơ quan chủ trì** các hoạt động hệ thống KSNK (đánh giá hệ thống, điều phối chương trình, thư ký Hội đồng, ICRA, vụ dịch, ATNN chương trình…).
- Khi tạo **phiên giám sát hệ thống** (`lop_giam_sat=he_thong`): FE/BCTH **default `khoa_id` = Khoa KSNK**, `bat_buoc_filter_khoa=true`.
- **Không** gán Khoa KSNK cho mọi BM «do KSNK đi giám sát»: NV KSNK đi quan sát VST tại Nội A vẫn là phiên `thuc_hanh_don_vi` gắn khoa Nội A.
- QĐ có chữ «hệ thống» trong tên **không** tự thành `he_thong` nếu tiêu chí là quan sát tại khoa (VD QĐ.13 HS ngoại → `thuc_hanh_don_vi`).

### 1.3 Taxonomy phụ trợ (giữ từ v1, gắn vào từng lớp)

`pham_vi_khoa.loai`: `toan_vien` | `nhom_khoa` | `chuyen_khoa` | `don_vi_cu_the` — vẫn dùng để **filter picker theo khoa quan sát**.

- Với `he_thong`: thường `don_vi_cu_the` + `nhom=["Khoa KSNK"]` (ICRA: `nhom_khoa` gồm KSNK + khu ICRA).
- Với `thuc_hanh_don_vi`: giữ logic v1 (toàn viện / nhóm / chuyên khoa / đơn vị).

`doi_tuong_goi_y` = nhóm nghề (không tên cá nhân) — khớp file 11/15 X12.

---

## 2. Decision tree: BM → `he_thong` vs `thuc_hanh_don_vi`

```
                         ┌─ Đọc ten + toàn bộ tieu_chi ─┐
                         │                              │
                         ▼                              │
        Tiêu chí kiểm tổ chức cấp viện / HĐ / chương trình?
        (biên bản HĐ, kế hoạch năm, master hệ thống QT/QĐ,
         FTE, Fit-test chương trình, PEP 24/7, line-list vụ dịch
         điều phối, chấm ICRA chương trình, hồ sơ lưu KSNK…)
                    │                    │
                   CÓ                   KHÔNG
                    │                    │
                    ▼                    ▼
            lop = he_thong      Tiêu chí quan sát tay nghề /
            chu_tri = Khoa_KSNK   bundle / thao tác tại giường,
              hoặc Hoi_dong_KSNK   khoa LS, CSSD, PM, bếp…?
            filter=true            │              │
            default khoa=KSNK     CÓ            Mơ hồ
                                   │              │
                                   ▼              ▼
                         lop=thuc_hanh     Có cả thành viên tại
                         chu_tri=Don_vi     khoa VÀ điều phối KSNK?
                         filter theo        (VD Mạng lưới)
                         pham_vi v1              │
                                                CÓ → hybrid
```

**Ruthless checks đã áp dụng:**

| Câu hỏi | Kết luận v2 |
|---------|-------------|
| QT.01 văn bản — TC «tài liệu **tại khoa**» hay master list ban hành viện? | **Tại khoa** → `thuc_hanh_don_vi` (giữ toan_vien filter) |
| QĐ.13 «hệ thống KSNK tại HS ngoại» — TC giường hay audit viện? | TC giường/MDRO/băng vết mổ → `thuc_hanh_don_vi` |
| QT.10 «hệ thống xử lý PN» — sơ cứu tay nghề hay luồng tổ chức+hồ sơ KSNK? | Luồng tổ chức (KB/CC, PEP, hồ sơ KSNK) → `he_thong` |
| QĐ.02 ATNN — tiêm tại khoa hay chương trình viện? | Chương trình (ngân sách, Fit-test, PEP 24/7) → `he_thong` |
| QT.37 lấy mẫu VS — kỹ thuật lấy mẫu hay quản trị chương trình? | Kỹ thuật → `thuc_hanh_don_vi` (đơn vị thực hiện KSNK/XN) |

---

## 3. Bảng master 66 — `lop_giam_sat` + chủ trì + phạm vi + đối tượng + lý do

| Mã | Tên ngắn | Lớp | Chủ trì | `loai` | Phạm vi (`nhom`) | Đối tượng | Nơi QS | Filter? | Lý do phân bổ |
|----|----------|-----|---------|--------|------------------|-----------|--------|---------|---------------|
| `KSNK.QT.01.BM.03` | kiểm soát văn bản tại khoa | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | thu_ky_khoa, thanh_vien_mang_luoi, dieu_duong, can_bo_quan_ly | `tai_khoa_ls` | không | TC01–TC05 neo «tài liệu tại khoa», phiên bản tại khoa, dấu bản sao tại khoa — giám sát tuân thủ tại đơn vị thực hành, KHÔNG phải audit master list/ban hành cấp viện tại văn phòng KSNK. |
| `KSNK.QT.02.BM.04` | đánh giá rủi ro | `he_thong` | `Hoi_dong_KSNK` | `don_vi_cu_the` | Khoa KSNK | thanh_vien_hoi_dong, NV_ksnk, can_bo_quan_ly | `hoi_dong|van_phong_ksnk` | có | Tiêu chí TC01–TC07 neo BM.01 biên bản HĐ, chấm điểm rủi ro HD.01, kế hoạch BM.02 và báo cáo tiến độ tại họp HĐ.KSNK — đánh giá rủi ro cấp viện do Hội đồng/KSNK chủ trì. |
| `KSNK.QT.03.BM.03` | ICRA | `he_thong` | `Khoa_KSNK` | `nhom_khoa` | Khoa KSNK, Khu vực xây dựng / cải tạo (ICRA) | NV_ksnk, NV_xay_dung, can_bo_quan_ly, NVYT_khu_lan_can | `khu_xay_dung|cong_truong_icra` | có | ICRA là chương trình kiểm soát nhiễm khuẩn khi xây dựng/cải tạo do Khoa KSNK chủ trì điều phối; TC01–TC11 là checklist tuân thủ biện pháp ICRA tại công trường thuộc chương trình đó. |
| `KSNK.QT.05.BM.04` | hoạt động Hội đồng KSNK | `he_thong` | `Hoi_dong_KSNK` | `don_vi_cu_the` | Khoa KSNK | thanh_vien_hoi_dong, NV_ksnk, BGĐ | `hoi_dong|van_phong_ksnk` | có | TC01–TC10 kiểm quyết định thành lập HĐ, thành phần, kế hoạch năm, họp định kỳ, biên bản/nghị quyết và Khoa KSNK báo cáo tiến độ — audit hoạt động Hội đồng cấp viện. |
| `KSNK.QT.06.BM.03` | hoạt động Mạng lưới KSNK | `hybrid` | `Mang_luoi` | `toan_vien` | Toàn viện | thanh_vien_mang_luoi, NV_ksnk | `tai_khoa_ls|hop_mang_luoi|van_phong_ksnk` | không | TC01–TC04/TC07 quan sát tại khoa (cử thành viên, GS tại khoa, khắc phục); TC05–TC06 neo họp mạng lưới và báo cáo về Khoa KSNK — vừa thực hành đơn vị vừa điều phối hệ thống. |
| `KSNK.QT.07.BM.01` | VST 5 thời điểm WHO | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, bac_si, dieu_duong, ky_thuat_vien, ho_ly | `tai_khoa_ls|diem_cham_soc` | không | WHO 5 thời điểm — quan sát thực hành VST tại mọi điểm chăm sóc. Hub SURF_WHO. |
| `KSNK.QT.07.BM.02` | kỹ thuật VST thường quy | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, bac_si, dieu_duong, ky_thuat_vien | `tai_khoa_ls|diem_cham_soc` | không | TC kỹ thuật 6 bước ABHR/xà phòng — quan sát tay nghề tại điểm chăm sóc. Hub SURF_BM02. |
| `KSNK.QT.07.BM.03` | kỹ thuật VST ngoại khoa | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ, Phòng can thiệp mạch | phau_thuat_vien, gay_me, dieu_duong_mo, NVYT_khu_mo | `phong_mo|phong_can_thiep` | có | VST ngoại khoa — quan sát kỹ thuật tại khu mổ/can thiệp. Hub SURF_BM03. |
| `KSNK.QT.08.BM.01` | chỉ định PTPH | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, bac_si, dieu_duong | `tai_khoa_ls|diem_cham_soc` | không | Chỉ định PTPH theo nguy cơ — quan sát thực hành tại điểm chăm sóc. |
| `KSNK.QT.08.BM.02` | kỹ thuật mặc/cởi PTPH | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, bac_si, dieu_duong | `tai_khoa_ls|diem_cham_soc` | không | Quan sát doffing/donning PTPH — tay nghề tại đơn vị dùng PTPH. |
| `KSNK.QT.09.BM.01` | tiêm an toàn | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Khoa Cấp cứu, Khoa Khám bệnh – Ngoại trú, Nội / ICU / HSTC | dieu_duong, bac_si, NVYT | `tai_khoa_ls|cap_cuu|kham_benh` | có | Thực hành tiêm–truyền tại khoa/đơn vị có tiêm. |
| `KSNK.QT.10.BM.04` | hệ thống xử lý phơi nhiễm | `he_thong` | `Khoa_KSNK` | `don_vi_cu_the` | Khoa KSNK | NV_ksnk, NVYT, bac_si, dieu_duong, can_bo_quan_ly | `van_phong_ksnk|khoa_kham_benh|cap_cuu` | có | Tên «hệ thống xử lý phơi nhiễm»; TC03–TC10 kiểm luồng báo cáo tổ chức (KB/CC), PEP khung giờ vàng, lịch theo dõi và hồ sơ lưu tại Ban Quân y/Khoa KSNK — quy trình tổ chức chương trình, không phải quan sát tay nghề tại giường. |
| `KSNK.QT.11.BM.01` | công việc vệ sinh | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NV_ve_sinh, ho_ly, dieu_duong | `tai_khoa_ls` | không | Phân công/checklist công việc vệ sinh theo khoa/khu — thực hành đơn vị. |
| `KSNK.QT.11.BM.02` | thực hành VSMT bề mặt | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NV_ve_sinh, ho_ly | `tai_khoa_ls` | không | Kỹ thuật lau/pha hóa chất — quan sát tại đơn vị. |
| `KSNK.QT.11.BM.03` | chất lượng VSMT bề mặt | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NV_ve_sinh, NV_ksnk, dieu_duong | `tai_khoa_ls` | không | Audit kết quả bề mặt tại khoa/khu — thực hành/đơn vị. |
| `KSNK.QT.11.BM.04` | VSMT khu phẫu thuật | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Phòng mổ / khối mổ, Ngoại / PT / gây mê / can thiệp | NV_ve_sinh_khu_mo, dieu_duong_mo, NV_ksnk | `phong_mo` | có | VSMT riêng khối mổ — quan sát tại phòng mổ. |
| `KSNK.QT.12.BM.01` | quản lý chất thải y tế | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, NV_ve_sinh, ho_ly, NV_van_chuyen_chat_thai | `tai_khoa_ls|diem_phat_sinh` | không | Phân loại/thu gom tại điểm phát sinh — thực hành đơn vị. |
| `KSNK.QT.13.BM.01` | thu gom đồ vải | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, NV_ve_sinh, ho_ly, dieu_duong | `tai_khoa_ls` | không | Thu gom tại giường/phòng thủ thuật — thực hành đơn vị. |
| `KSNK.QT.13.BM.02` | quy trình Đơn vị Giặt là | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Đơn vị Giặt là | NV_giat_la, ky_thuat_vien_giat | `don_vi_giat_la` | có | Thao tác tại ĐV Giặt là — đơn vị thực hành. |
| `KSNK.QT.14.BM.01` | phòng ngừa đường lây | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, bac_si, dieu_duong | `tai_khoa_ls|phong_cach_ly` | không | Cách ly theo đường lây khi có NB — thực hành tại khoa đang cách ly. |
| `KSNK.QT.15.BM.01` | vận chuyển NB | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | dieu_duong, ho_ly, NV_van_chuyen, bac_si | `hanh_lang|thang_may|tai_khoa_ls` | không | Vận chuyển liên khoa — thực hành tại điểm bàn giao/hành trình. |
| `KSNK.QT.16.BM.01` | xử lý tử thi | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Khoa Cấp cứu, Nội / ICU / HSTC, Khoa Truyền nhiễm | NVYT, dieu_duong, bac_si, NV_nha_tang | `tai_khoa_ls|nha_tang` | có | Thực hành xử lý tử thi tại khoa có tử vong / nhà tang. |
| `KSNK.QT.17.BM.01` | PTPH cấp cao (chéo) | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa Truyền nhiễm, Đơn vị / khu Lao, Khoa Cấp cứu | NVYT, dieu_duong, bac_si, NV_ksnk | `khoa_truyen_nhiem|khu_lao|cap_cuu` | có | Quan sát mặc/cởi PTPH cấp cao tại khu cách ly cao. |
| `KSNK.QT.18.BM.02` | làm sạch dụng cụ | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Ngoại / PT / gây mê / can thiệp, CSSD / tiệt khuẩn | NVYT, dieu_duong, ky_thuat_vien_cssd | `tai_khoa_ls|cssd` | có | Làm sạch điểm sử dụng + CSSD — thao tác thực hành. |
| `KSNK.QT.19.BM.02` | kiểm tra bảo dưỡng dụng cụ | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | ky_thuat_vien_cssd | `cssd` | có | Thao tác khu sạch CSSD. |
| `KSNK.QT.20.BM.01` | đóng gói | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | ky_thuat_vien_cssd | `cssd` | có | Thao tác đóng gói CSSD. |
| `KSNK.QT.21.BM.01` | vận hành TK + sổ IUSS | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | ky_thuat_vien_cssd | `cssd` | có | Vận hành máy TK / IUSS — thao tác CSSD (IUSS tại OR: [PO]). |
| `KSNK.QT.22.BM.04` | lưu trữ–cấp phát | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | CSSD / tiệt khuẩn, Khoa lâm sàng chung, Ngoại / PT / gây mê / can thiệp | ky_thuat_vien_cssd, dieu_duong, NVYT | `cssd|tai_khoa_ls` | có | Kho vô khuẩn CSSD + tủ hết hạn tại khoa — thực hành đơn vị. |
| `KSNK.QT.23.BM.04` | QC CSSD | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | ky_thuat_vien_cssd, NV_ksnk | `cssd` | có | QC Bowie-Dick/BI/CI — thao tác/vận hành CSSD. |
| `KSNK.QT.24.BM.03` | xử lý sự cố CSSD | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | ky_thuat_vien_cssd, truong_cssd, NV_ksnk | `cssd` | có | Quy trình sự cố tại CSSD (cách ly mẻ, thu hồi) — đơn vị thực hành CSSD. |
| `KSNK.QT.25.BM.01` | KKMĐC | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | ky_thuat_vien_cssd | `cssd` | có | Thao tác KKMĐC tại khu xử lý CSSD. |
| `KSNK.QT.26.BM.02` | KKMĐC PTNS | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Đơn vị Nội soi, CSSD / tiệt khuẩn | ky_thuat_vien_noi_soi, ky_thuat_vien_cssd, NV_noi_soi | `noi_soi|cssd` | có | Thao tác KKMĐC dụng cụ PTNS tại nội soi/CSSD. |
| `KSNK.QT.27.BM.03` | PCI.03.01 / SUD | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | CSSD / tiệt khuẩn, Ngoại / PT / gây mê / can thiệp, Khoa lâm sàng chung | ky_thuat_vien_cssd, bac_si, dieu_duong, NV_trang_bi | `cssd|tai_khoa_ls|phong_mo` | có | Tuân thủ tái xử lý SUD tại CSSD + khoa dùng — thực hành đơn vị (TC10 KSNK thu thập dữ liệu là hỗ trợ, không đổi lớp). |
| `KSNK.QT.28.BM.02` | loaner | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | CSSD / tiệt khuẩn, Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ | ky_thuat_vien_cssd, NV_trang_bi, nha_cung_cap | `cssd|phong_mo` | có | Tiếp nhận/làm sạch/tiệt khuẩn dụng cụ mượn — thao tác CSSD + OR. |
| `KSNK.QT.29.BM.01` | an toàn PT / SSI QĐ 7482 | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ | phau_thuat_vien, gay_me, dieu_duong_mo, bac_si, dieu_duong | `phong_mo|tai_khoa_ls` | có | Bundle SSI trước/trong mổ — thực hành khối mổ/ngoại. |
| `KSNK.QT.29.BM.02` | gói phòng ngừa SSI | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ, Khoa Hồi sức ngoại | phau_thuat_vien, dieu_duong_mo, dieu_duong, bac_si | `phong_mo|hs_ngoai|tai_khoa_ls` | có | Gói SSI chu phẫu/hậu phẫu — thực hành đơn vị. |
| `KSNK.QT.30.BM.01` | đặt CVC (Insertion) | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại, Khoa Cấp cứu, Ngoại / PT / gây mê / can thiệp | bac_si, dieu_duong, phau_thuat_vien | `icu|hs|cap_cuu|phong_mo` | có | Insertion bundle — quan sát tại nơi đặt CVC. |
| `KSNK.QT.30.BM.02` | chăm sóc CVC (Maintenance) | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại, Khoa lâm sàng chung | dieu_duong, bac_si | `tai_khoa_ls|icu|hs` | có | Maintenance bundle tại khoa đang lưu CVC. |
| `KSNK.QT.31.BM.01` | gói CAUTI | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Nội / ICU / HSTC, Khoa Cấp cứu | dieu_duong, bac_si | `tai_khoa_ls|icu|cap_cuu` | có | Đặt/chăm sóc ống thông tiểu — thực hành khoa. |
| `KSNK.QT.32.BM.01` | gói VAP | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại | dieu_duong, bac_si, ky_thuat_vien_ho_hap | `icu|hs` | có | Gói VAP tại đơn vị thở máy. |
| `KSNK.QT.32.BM.02` | thực hành hằng ngày VPLQTM | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại | dieu_duong, bac_si, ky_thuat_vien_ho_hap | `icu|hs` | có | Checklist ca trực VPLQTM — thực hành ICU/HS. |
| `KSNK.QT.35.BM.04` | xử lý vụ dịch | `he_thong` | `Khoa_KSNK` | `don_vi_cu_the` | Khoa KSNK | NV_ksnk, can_bo_quan_ly, thanh_vien_mang_luoi, NVYT | `van_phong_ksnk|khu_vu_dich` | có | Xử lý vụ dịch là hoạt động chương trình cấp viện do Khoa KSNK điều phối (cách ly, cohort, đình chỉ vật tư, line-list, đầu mối phát ngôn TC01–TC10) — đánh giá hệ thống đáp ứng dịch, không phải bundle thường quy tại một khoa. |
| `KSNK.QT.36.BM.03` | phòng ngừa MDRO | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, dieu_duong, bac_si | `tai_khoa_ls|phong_cach_ly` | không | Cách ly tiếp xúc MDRO tại khoa có NB — thực hành đơn vị. |
| `KSNK.QT.37.BM.03` | lấy mẫu vi sinh môi trường | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa KSNK, Cận lâm sàng, Khoa Xét nghiệm | NV_ksnk, NV_xet_nghiem, ky_thuat_vien | `tai_khu_lay_mau|van_phong_ksnk|xn` | có | TC kỹ thuật lấy mẫu KK/bề mặt/nước — thực hành kỹ thuật do KSNK/XN thực hiện tại khu được chỉ định (không phải đánh giá hệ thống quản trị). |
| `KSNK.QT.38.BM.03` | quản lý hóa chất tại khoa | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, NV_ve_sinh, ky_thuat_vien_cssd, NV_pha_che | `tai_khoa_ls|cssd|pha_che` | không | Lưu/pha/dùng hóa chất tại đơn vị — thực hành. |
| `KSNK.QĐ.01.BM.01` | thiết lập Hệ thống KSNK | `he_thong` | `Khoa_KSNK` | `don_vi_cu_the` | Khoa KSNK | NV_ksnk, thanh_vien_hoi_dong, can_bo_quan_ly | `van_phong_ksnk|hoi_dong` | có | Tên «mức độ thiết lập và vận hành Hệ thống KSNK»; TC01–TC11 kiểm HĐ/Khoa/Mạng lưới, kế hoạch năm, bộ QT/QĐ, FTE, giám sát NKBV, KPI — đánh giá hệ thống cấp viện do Khoa KSNK chủ trì. |
| `KSNK.QĐ.02.BM.01` | ATNN (chương trình) | `he_thong` | `Khoa_KSNK` | `don_vi_cu_the` | Khoa KSNK | NV_ksnk, can_bo_quan_ly, NV_hanh_chinh | `van_phong_ksnk|ban_quan_y` | có | TC01–TC09 kiểm ngân sách khám SK, chương trình tiêm chủng, hạn chế công việc, hệ thống báo cáo PN 24/7, tủ PEP, Fit-test N95 — đánh giá chương trình ATNN cấp viện, không phải tuân thủ thực hành tại khoa LS. |
| `KSNK.QĐ.03.BM.01` | khách thăm / người nhà | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | NVYT, dieu_duong, khach_tham, nguoi_nha | `tai_khoa_ls|loi_vao` | không | Tuân thủ quy định khách thăm tại khoa có thăm — thực hành đơn vị. |
| `KSNK.QĐ.04.BM.01` | KSNK Khám bệnh – Ngoại trú | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Khám bệnh – Ngoại trú | NVYT, bac_si, dieu_duong, NV_tiep_don | `kham_benh` | có | QĐ chuyên khoa — quan sát tại KB–Ngoại trú. |
| `KSNK.QĐ.05.BM.01` | KSNK Cấp cứu | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Cấp cứu | NVYT, bac_si, dieu_duong | `cap_cuu` | có | QĐ chuyên khoa Cấp cứu — thực hành tại CC. |
| `KSNK.QĐ.06.BM.01` | KSNK Truyền nhiễm | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Truyền nhiễm | NVYT, bac_si, dieu_duong | `khoa_truyen_nhiem` | có | QĐ chuyên khoa Truyền nhiễm. |
| `KSNK.QĐ.07.BM.01` | kiểm soát lây nhiễm lao | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Đơn vị / khu Lao, Khoa Truyền nhiễm, Khoa Khám bệnh – Ngoại trú, Khoa Cấp cứu | NVYT, bac_si, dieu_duong, NV_tiep_don | `khu_lao|tn|kham_benh|cap_cuu` | có | Thực hành sàng lọc/cách ly lao tại điểm tiếp đón và đơn vị Lao. |
| `KSNK.QĐ.08.BM.01` | KSNK phòng mổ | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Phòng mổ / khối mổ | phau_thuat_vien, gay_me, dieu_duong_mo, NV_ve_sinh_khu_mo | `phong_mo` | có | Thực hành KSNK tại khối phòng mổ (dù tên có «hệ thống» khu vực — tiêu chí là quan sát tại OR). |
| `KSNK.QĐ.09.BM.01` | KSNK can thiệp mạch | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Phòng can thiệp mạch | bac_si, dieu_duong, ky_thuat_vien, NVYT_can_thiep | `phong_can_thiep` | có | Thực hành tại phòng can thiệp mạch. |
| `KSNK.QĐ.10.BM.01` | KSNK nha khoa | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Nha khoa | bac_si_nha_khoa, NV_nha_khoa, tro_ly_nha_khoa | `nha_khoa` | có | Thực hành tại nha khoa. |
| `KSNK.QĐ.11.BM.01` | an toàn KSNK nội soi | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Đơn vị Nội soi | bac_si_noi_soi, ky_thuat_vien_noi_soi, NV_noi_soi | `noi_soi` | có | Thực hành tại đơn vị nội soi. |
| `KSNK.QĐ.12.BM.01` | KSNK Hồi sức nội | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Hồi sức nội | bac_si, dieu_duong, ky_thuat_vien_ho_hap | `hs_noi` | có | Chính sách/thực hành tại HS nội — tiêu chí bundle tại giường (CVC/CAUTI/VAP/MDRO), không phải audit hệ thống viện. |
| `KSNK.QĐ.13.BM.01` | KSNK Hồi sức ngoại | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Hồi sức ngoại | bac_si, dieu_duong, phau_thuat_vien | `hs_ngoai` | có | Dù tên «hệ thống KSNK tại Khoa HS ngoại» — TC01–TC09 là thực hành tại khoa (VST giường, MDRO, băng vết mổ, KSDP) → thuc_hanh_don_vi, không phải lớp đánh giá hệ thống viện. |
| `KSNK.QĐ.14.BM.01` | vệ sinh lồng ấp / giường sưởi | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nhi / Sản / khu lồng ấp, Nội / ICU / HSTC | dieu_duong, NV_ve_sinh, bac_si | `nhi_san|icu` | có | Thao tác vệ sinh thiết bị tại Nhi/Sản/ICU. |
| `KSNK.QĐ.15.BM.01` | KSNK Lọc máu | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Đơn vị Lọc máu | dieu_duong, bac_si, ky_thuat_vien_loc_mau | `loc_mau` | có | Thực hành tại ĐV Lọc máu. |
| `KSNK.QĐ.16.BM.01` | môi trường bảo vệ (PE) | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Trung tâm / Khoa Ung bướu, Đơn vị Ghép tạng, Nội / ICU / HSTC, Khoa Hồi sức nội | NVYT, dieu_duong, bac_si, khach_tham | `ung_buou|ghep|icu|hs` | có | Thực hành PE tại khoa có NB giảm BC. |
| `KSNK.QĐ.17.BM.01` | KSNK Ung bướu | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Trung tâm / Khoa Ung bướu | NVYT, bac_si, dieu_duong | `ung_buou` | có | Thực hành tại TT/Khoa Ung bướu. |
| `KSNK.QĐ.18.BM.01` | KSNK ghép tạng | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Đơn vị Ghép tạng | bac_si, dieu_duong, NV_ksnk, NV_xet_nghiem | `ghep_tang` | có | Sàng lọc/an toàn môi trường tại ĐV Ghép tạng — thực hành đơn vị. |
| `KSNK.QĐ.19.BM.01` | ATSB Xét nghiệm | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Khoa Xét nghiệm | NV_xet_nghiem, ky_thuat_vien_xn, bac_si_xn | `xn` | có | Thực hành ATSB tại Khoa XN. |
| `KSNK.QĐ.20.BM.01` | KSNK pha chế | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Khu vực pha chế / Dược | NV_pha_che, duoc_si, ky_thuat_vien_duoc | `pha_che` | có | Thực hành tại khu pha chế. |
| `KSNK.QĐ.21.BM.02` | KSNK bếp ăn | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Bếp ăn | NV_bep, NV_dinh_duong | `bep_an` | có | Thực hành an toàn KSNK tại bếp. |

**Counts v2:** `he_thong`=**7** · `thuc_hanh_don_vi`=**58** · `hybrid`=**1** · tổng=**66**.

---

## 4. Danh mục đánh giá hệ thống (Khoa KSNK)

Áp dụng lớp `he_thong`. Phiên tạo mới: **default `khoa_id` = Khoa KSNK**; `bat_buoc_filter_khoa=true`.

| Mã | Tên ngắn | Chủ trì | Nơi quan sát | Ghi chú vận hành |
|----|----------|---------|--------------|------------------|
| `KSNK.QT.02.BM.04` | đánh giá rủi ro | `Hoi_dong_KSNK` | `hoi_dong|van_phong_ksnk` | Phiên hệ thống mặc định gắn Khoa KSNK (thư ký HĐ). Quan sát tại họp Hội đồng / văn phòng KSNK — không phải quan sát tại khoa LS. |
| `KSNK.QT.03.BM.03` | ICRA | `Khoa_KSNK` | `khu_xay_dung|cong_truong_icra` | Chương trình ICRA do Khoa KSNK điều phối/chấm. Quan sát thực địa tại công trường active; phiên hệ thống default khoa=KSNK. |
| `KSNK.QT.05.BM.04` | hoạt động Hội đồng KSNK | `Hoi_dong_KSNK` | `hoi_dong|van_phong_ksnk` | Hội đồng KSNK — Khoa KSNK là thư ký/cơ quan thường trực. Phiên hệ thống default khoa=KSNK. |
| `KSNK.QT.10.BM.04` | hệ thống xử lý phơi nhiễm | `Khoa_KSNK` | `van_phong_ksnk|khoa_kham_benh|cap_cuu` | v1=toan_vien → v2=he_thong. Hệ thống xử lý PN do KSNK chủ trì; quan sát luồng KB (trong giờ)/CC (ngoài giờ) + hồ sơ tại Ban Quân y/KSNK. Default filter Khoa KSNK. |
| `KSNK.QT.35.BM.04` | xử lý vụ dịch | `Khoa_KSNK` | `van_phong_ksnk|khu_vu_dich` | v1=toan_vien → v2=he_thong. Điều phối xử lý vụ dịch cấp viện do Khoa KSNK chủ trì; điểm quan sát = khu vụ dịch được chỉ định. Default phiên=KSNK. |
| `KSNK.QĐ.01.BM.01` | thiết lập Hệ thống KSNK | `Khoa_KSNK` | `van_phong_ksnk|hoi_dong` | Đánh giá thiết lập/vận hành Hệ thống KSNK cấp viện — audit chương trình. Default khoa=KSNK. |
| `KSNK.QĐ.02.BM.01` | ATNN (chương trình) | `Khoa_KSNK` | `van_phong_ksnk|ban_quan_y` | v1=toan_vien → v2=he_thong. Chương trình ATNN (tiêm chủng, Fit-test, PEP 24/7, hồ sơ miễn dịch) — audit quản trị do KSNK/Ban Quân y; không quan sát tay nghề tại giường. |

### 4.1 Khoa KSNK chủ trì — ý nghĩa picker

- Picker «Đánh giá hệ thống / chương trình»: chỉ list các mã §4.
- Không trộn với picker «Giám sát thực hành theo chuyên đề» (§5).
- ICRA (`QT.03`): vẫn `he_thong`; điểm quan sát = công trường; phiên vẫn gắn KSNK (điều phối chương trình).
- Phơi nhiễm (`QT.10`) / vụ dịch (`QT.35`): quan sát có thể tại KB/CC/khu dịch nhưng **chủ trì phiên = KSNK**.

---

## 5. Giám sát thực hành theo chuyên đề

Lớp `thuc_hanh_don_vi` (+ 1 hybrid tách khái niệm). Group theo chuyên đề.

### Vệ sinh tay (hub SURF_*)

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.07.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.07.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.07.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ, Phòng can thiệp mạch | có |

### PTPH / tiêm

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.08.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.08.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.09.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Khoa Cấp cứu, Khoa Khám bệnh – Ngoại trú, Nội / ICU / HSTC | có |
| `KSNK.QT.17.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa Truyền nhiễm, Đơn vị / khu Lao, Khoa Cấp cứu | có |

### Vệ sinh môi trường / chất thải / đồ vải

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.11.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.11.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.11.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.11.BM.04` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Phòng mổ / khối mổ, Ngoại / PT / gây mê / can thiệp | có |
| `KSNK.QT.12.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.13.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.13.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Đơn vị Giặt là | có |

### Đường lây / vận chuyển / tử thi / MDRO / hóa chất

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.14.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.15.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.16.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Khoa Cấp cứu, Nội / ICU / HSTC, Khoa Truyền nhiễm | có |
| `KSNK.QT.36.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.38.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |

### CSSD / dụng cụ / KKMĐC / PCI / loaner

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.18.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Ngoại / PT / gây mê / can thiệp, CSSD / tiệt khuẩn | có |
| `KSNK.QT.19.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | có |
| `KSNK.QT.20.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | có |
| `KSNK.QT.21.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | có |
| `KSNK.QT.22.BM.04` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | CSSD / tiệt khuẩn, Khoa lâm sàng chung, Ngoại / PT / gây mê / can thiệp | có |
| `KSNK.QT.23.BM.04` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | có |
| `KSNK.QT.24.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | có |
| `KSNK.QT.25.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | CSSD / tiệt khuẩn | có |
| `KSNK.QT.26.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Đơn vị Nội soi, CSSD / tiệt khuẩn | có |
| `KSNK.QT.27.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | CSSD / tiệt khuẩn, Ngoại / PT / gây mê / can thiệp, Khoa lâm sàng chung | có |
| `KSNK.QT.28.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | CSSD / tiệt khuẩn, Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ | có |

### SSI / CLABSI / CAUTI / VAP

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.29.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ | có |
| `KSNK.QT.29.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Ngoại / PT / gây mê / can thiệp, Phòng mổ / khối mổ, Khoa Hồi sức ngoại | có |
| `KSNK.QT.30.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại, Khoa Cấp cứu, Ngoại / PT / gây mê / can thiệp | có |
| `KSNK.QT.30.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại, Khoa lâm sàng chung | có |
| `KSNK.QT.31.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa lâm sàng chung, Nội / ICU / HSTC, Khoa Cấp cứu | có |
| `KSNK.QT.32.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại | có |
| `KSNK.QT.32.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nội / ICU / HSTC, Khoa Hồi sức nội, Khoa Hồi sức ngoại | có |

### Quản trị tài liệu tại khoa / lấy mẫu VS (thực hành kỹ thuật)

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.01.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QT.37.BM.03` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Khoa KSNK, Cận lâm sàng, Khoa Xét nghiệm | có |

### QĐ chuyên khoa / đơn vị / khách thăm

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QĐ.03.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `toan_vien` | Toàn viện | không |
| `KSNK.QĐ.04.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Khám bệnh – Ngoại trú | có |
| `KSNK.QĐ.05.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Cấp cứu | có |
| `KSNK.QĐ.06.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Truyền nhiễm | có |
| `KSNK.QĐ.07.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Đơn vị / khu Lao, Khoa Truyền nhiễm, Khoa Khám bệnh – Ngoại trú, Khoa Cấp cứu | có |
| `KSNK.QĐ.08.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Phòng mổ / khối mổ | có |
| `KSNK.QĐ.09.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Phòng can thiệp mạch | có |
| `KSNK.QĐ.10.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Nha khoa | có |
| `KSNK.QĐ.11.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Đơn vị Nội soi | có |
| `KSNK.QĐ.12.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Hồi sức nội | có |
| `KSNK.QĐ.13.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Khoa Hồi sức ngoại | có |
| `KSNK.QĐ.14.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Nhi / Sản / khu lồng ấp, Nội / ICU / HSTC | có |
| `KSNK.QĐ.15.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Đơn vị Lọc máu | có |
| `KSNK.QĐ.16.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `nhom_khoa` | Trung tâm / Khoa Ung bướu, Đơn vị Ghép tạng, Nội / ICU / HSTC, Khoa Hồi sức nội | có |
| `KSNK.QĐ.17.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Trung tâm / Khoa Ung bướu | có |
| `KSNK.QĐ.18.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `chuyen_khoa` | Đơn vị Ghép tạng | có |
| `KSNK.QĐ.19.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Khoa Xét nghiệm | có |
| `KSNK.QĐ.20.BM.01` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Khu vực pha chế / Dược | có |
| `KSNK.QĐ.21.BM.02` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | `don_vi_cu_the` | Bếp ăn | có |

### Hybrid — Mạng lưới

| Mã | Lớp | Chủ trì | `loai` | Nhóm | Filter? |
|----|-----|---------|--------|------|---------|
| `KSNK.QT.06.BM.03` | `hybrid` | `Mang_luoi` | `toan_vien` | Toàn viện | không |

---

## 6. FE / BCTH implications

### 6.1 Picker hệ thống

```
when user chọn chế độ «Đánh giá hệ thống»:
  list = BM where lop_giam_sat == he_thong
  default khoa_id = Khoa_KSNK
  bat_buoc_filter_khoa = true
  co_quan_chu_tri ∈ {Khoa_KSNK, Hoi_dong_KSNK}
```

### 6.2 Picker thực hành (giữ rule v1 đã sửa)

```
when user chọn chế độ «Giám sát thực hành» + khoa X:
  list = BM where lop_giam_sat == thuc_hanh_don_vi
         OR (lop_giam_sat == hybrid)  // hiện; đánh dấu hybrid trên UI
  visible(BM) =
    BM.pham_vi_khoa.loai == toan_vien
    OR NOT BM.bat_buoc_filter_khoa
    OR khoa_X maps_into BM.pham_vi_khoa.nhom[]
```

| Rule | Chi tiết |
|------|----------|
| R1 | BM `toan_vien` thực hành **luôn hiện** khi đã chọn khoa X — vẫn ghi `khoa_id` phiên = khoa đang quan sát |
| R2 | BM `nhom_khoa` / `chuyen_khoa` / `don_vi_cu_the` **ẩn** nếu khoa X ∉ `nhom` |
| R3 | Map MDM: khoa LS cụ thể ∈ `Khoa lâm sàng chung`; ICU ∈ `Nội / ICU / HSTC`; … |
| R4 | Hub VST: WHO/BM.02/BM.03 **không** vào list GSC generic (file 15); filter khoa vẫn áp trong card hub |
| R5 | **Tách picker:** hệ thống ≠ thực hành — không để QT.02/05/QĐ.01 lẫn list VST khi user chọn Nội A |
| R6 | Hybrid QT.06: hiện trên picker thực hành (theo khoa) **và** có entry điều phối trên góc hệ thống/KSNK (cùng mã, khác ngữ cảnh phiên) |
| R7 | Báo cáo so sánh khoa: chỉ tính phiên `thuc_hanh` thuộc khoa; phiên `he_thong` báo riêng (cột/Khoa KSNK) — không «phạt» khoa LS vì thiếu phiên hệ thống |
| R8 | ĐT trên BCTH = nhóm nghề — **cấm** tên cá nhân (file 15 X12) |

### 6.3 Hub VST (file 15) — không đổi

| BM | Surface | Lớp v2 |
|----|---------|--------|
| `KSNK.QT.07.BM.01` | `SURF_WHO` | `thuc_hanh_don_vi` |
| `KSNK.QT.07.BM.02` | `SURF_BM02` | `thuc_hanh_don_vi` |
| `KSNK.QT.07.BM.03` | `SURF_BM03` | `thuc_hanh_don_vi` |
| Các BM còn lại | `SURF_GSC` | theo §3 |

---

## 7. Diff vs v1 — BM reclassified

v1 **không** có `lop_giam_sat`; chỉ `pham_vi_khoa.loai`. Diff dưới đây = thay đổi phân lớp / chủ trì / filter so với suy luận v1 (đặc biệt các BM gán `toan_vien` kiểu «áp dụng mọi nơi» trong khi bản chất là chương trình hệ thống).

| Mã | v1 (phạm vi) | v2 lớp | v2 chủ trì | v2 phạm vi | Thay đổi then chốt |
|----|--------------|--------|------------|------------|-------------------|
| `KSNK.QT.10.BM.04` | `toan_vien` | `he_thong` | `Khoa_KSNK` | `don_vi_cu_the` · Khoa KSNK · filter=có | **Reclass** từ «toàn viện thực hành» → hệ thống PN do KSNK chủ trì |
| `KSNK.QT.35.BM.04` | `toan_vien` | `he_thong` | `Khoa_KSNK` | `don_vi_cu_the` · Khoa KSNK · filter=có | **Reclass** xử lý vụ dịch → chương trình điều phối KSNK |
| `KSNK.QĐ.02.BM.01` | `toan_vien` | `he_thong` | `Khoa_KSNK` | `don_vi_cu_the` · Khoa KSNK · filter=có | **Reclass** ATNN chương trình (Fit-test/PEP/tiêm chủng) → hệ thống |
| `KSNK.QT.02.BM.04` | đã `don_vi_cu_the` KSNK | `he_thong` | `Hoi_dong_KSNK` | giữ KSNK | Gắn lớp + chủ trì Hội đồng rõ |
| `KSNK.QT.03.BM.03` | `nhom_khoa` ICRA+KSNK | `he_thong` | `Khoa_KSNK` | giữ nhom | Khóa ICRA = chương trình hệ thống |
| `KSNK.QT.05.BM.04` | đã KSNK | `he_thong` | `Hoi_dong_KSNK` | giữ KSNK | Gắn lớp Hội đồng |
| `KSNK.QĐ.01.BM.01` | đã KSNK | `he_thong` | `Khoa_KSNK` | giữ KSNK | Gắn lớp đánh giá hệ thống |
| `KSNK.QT.06.BM.03` | `toan_vien` | `hybrid` | `Mang_luoi` | giữ `toan_vien` filter=không | **Reclass** hybrid (thực hành tại khoa + điều phối KSNK) |
| `KSNK.QT.01.BM.03` | `toan_vien` | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | giữ `toan_vien` | **Giữ thực hành** — TC tài liệu tại khoa (không nâng hệ thống) |
| `KSNK.QĐ.13.BM.01` | `chuyen_khoa` HS ngoại | `thuc_hanh_don_vi` | `Don_vi_thuc_hanh` | giữ | Tên «hệ thống…tại khoa» **không** → he_thong |

**Top reclassifications (impact FE):** QT.10 · QT.35 · QĐ.02 (ba mã từng `toan_vien` nay biến mất khỏi picker thực hành toàn viện, chuyển picker hệ thống/KSNK) · QT.06 (hybrid).

---

## 8. Residual `[PO xác nhận]` (chỉ chỗ còn mơ hồ sau đọc sâu TC)

| Mã | Vấn đề còn lại | Đề xuất tạm v2 |
|----|----------------|----------------|
| `KSNK.QT.03.BM.03` | MDM có cờ «khu ICRA active» động không? | `he_thong` + nhom KSNK∪khu ICRA; filter theo công trình active khi có MDM |
| `KSNK.QT.10.BM.04` | Phiên hệ thống chỉ KSNK hay cho phép gắn KB/CC khi QS tại chỗ? | Default KSNK; cho phép `noi_quan_sat` KB/CC trên cùng phiên hệ thống |
| `KSNK.QT.35.BM.04` | Một phần TC là hành vi tại khoa vụ dịch — có tách BM đơn vị sau này? | Giữ một BM `he_thong`; BCTH tách chiều «điều phối» vs «tuân thủ tại khu» nếu cần |
| `KSNK.QT.06.BM.03` | UI tách 2 entry (thực hành / điều phối) cùng mã hay 1 entry hybrid? | 1 mã; 2 ngữ cảnh phiên (R6) |
| `KSNK.QT.09.BM.01` | Mở `toan_vien` gồm CLS tiêm? | Giữ nhom LS+CC+KB+ICU |
| `KSNK.QT.16.BM.01` | Gộp `toan_vien`? | Giữ nhom LS+CC+ICU+TN |
| `KSNK.QT.17.BM.01` | Thêm khoa thường khi kích hoạt ca? | Giữ TN+Lao+CC; kích hoạt động = [PO] |
| `KSNK.QT.21.BM.01` | IUSS tại OR — mở Phòng mổ vào nhom? | CSSD; mở PM khi BV có IUSS tại OR |
| `KSNK.QT.25.BM.01` | Khoa tự KKMĐC? | CSSD; mở thêm khi có đơn vị tự xử lý |
| `KSNK.QT.30.BM.02` | Mọi khoa lưu CVC vs ICU-heavy? | Giữ gồm `Khoa lâm sàng chung` |
| `KSNK.QĐ.07.BM.01` | Lao: chỉ đơn vị Lao hay + KB/CC? | Giữ + KB/CC sàng lọc |
| `KSNK.QĐ.14.BM.01` | Map Nhi/Sản/ICU nhi MDM BVQY-103 | Giữ nhãn nhóm generic |
| `KSNK.QĐ.16.BM.01` | PE mọi khoa có NB giảm BC? | Giữ Ung bướu+Ghép+ICU/HS |

Tổng residual: **13** (giảm ambiguity lớp hệ thống — đã chốt QT.01/QĐ.13/QĐ.02/QT.10/QT.35 bằng evidence TC).

---

## 9. Link file 12 · 15

| File | Vai trò với file 16 v2 |
|------|------------------------|
| **12** | Nguồn IN/OUT · mã BM · không thay inventory |
| **15** | SURF_* hub VST — không đổi |
| **11/13/14** | Module · % · hình thức — filter khoa / lớp hệ thống độc lập lens HT |

---

*Soft · Domain · v2 2026-09-23 Asia/Saigon — docs + seed JSON only. NO DB / NO Cloud / NO code / NO git commit.*
