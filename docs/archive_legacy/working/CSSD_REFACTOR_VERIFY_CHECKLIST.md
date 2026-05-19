# CSSD — Checklist xác minh sau phân rã module (BV103)

Chạy trên **pilot / dev** sau khi `npm run mdm:migrate` (cần `20260716014_cssd_tram_fk_ssot.sql`).

## A. Database

- [ ] `SELECT * FROM dm_tram_cssd` — đủ 6 mã: TIEP_NHAN … CAP_PHAT
- [ ] `scripts/sql/cssd-tram-fk-health-audit.sql` — `quy_trinh_thieu_tram = 0` (phiếu mở)
- [ ] `v_fact_quy_trinh_full.ma_trang_thai_hien_tai` khớp trạm thực tế khi quét

## B. Route & menu

- [ ] `/cssd-quy-trinh` — tab Quét trạm + Kho FEFO; link Mẻ tiệt khuẩn → `/cssd-erp/batch`
- [ ] `/cssd-dung-cu` — Danh mục + Lịch sử
- [ ] `/cssd-su-co` — form báo cáo (quyền BAO_SU_CO)
- [ ] `/cssd-thiet-bi` — Danh mục + Bảo trì
- [ ] `/cssd-hoa-chat` — kho HC-VT
- [ ] Legacy: `/cssd-erp` → redirect `/cssd-quy-trinh`; `/cssd-tiep-nhan` → quy trình

## C. Luồng nghiệp vụ

- [ ] Quét TIEP_NHAN → … → CAP_PHAT (không quét TK tại trang 6 trạm)
- [ ] Tạo mẻ TK, nạp bộ, QC mẻ — `/cssd-erp/batch`
- [ ] Báo sự cố tại trạm + trang `/cssd-su-co` — rollback theo policy
- [ ] Bảo trì máy → không tạo mẻ khi REPAIRING

## D. Kỹ thuật

- [ ] `npm run verify:cssd`
- [ ] `npm run verify:engineering`
- [ ] `npm run build`

## E. Quyền

- [ ] CSSD_WORKFLOW — quy trình
- [ ] CSSD_ME_TIET_KHUAN — mẻ + bảo trì
- [ ] CSSD_KHO_DUNGCU / DANH_MUC — dụng cụ
- [ ] BAO_SU_CO — sự cố
- [ ] KSNK_KHO_HOACHAT — hóa chất
