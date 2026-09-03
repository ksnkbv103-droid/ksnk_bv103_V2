-- 40 bệnh án thử nghiệm NKBV (lưới ngày–khoa / ngày–dụng cụ).
-- Prefix BA-TRIAL- — xóa rồi seed lại được. Không đụng mau_so_*. Không tạo phiếu.

BEGIN;

DELETE FROM public.nkbv_fact_benh_an WHERE ma_benh_an LIKE 'BA-TRIAL-%';

-- Khoa (mdm_dm_khoa_phong):
-- A12 Thận 13f9a000-fa4d-4a47-95f5-ac0a2c436aa6
-- A27 HSN  8cd1a9bc-7c88-4d68-b70a-ddb6f1381122
-- B11 HSN ngoại 4c4f101c-e714-4f72-9910-db46becae2bc
-- B02 Ngoại bụng 048dd4f9-b84e-44a3-9813-0b7f8090b564
-- B07 Ngoại TN fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb
-- A03 Phổi c895038b-e242-43bc-a868-e17865308dac
-- A05 Truyền nhiễm b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c
-- A04 Thần kinh 72f6f3b6-5970-4817-84e0-b5c00487a041
-- A11 Khớp 0e7f2494-7528-4f3c-be83-32c84cc969dd
-- B12 Lồng ngực dcd020a3-37ed-4d80-bf2f-ffaccbbf1948
-- A01 Tiêu hóa 6b01a774-e0a7-43d4-b0b0-ceb8fc8719f0
-- A02 Tim mạch fb3f21b3-5984-4373-b715-25d5c7105e33
-- B01 CTCH af4b7f0f-19f7-40de-9173-a6bce43bdbaf
-- B09 Ngoại TK b838cf7f-dec6-4fec-bec4-580004521b6e
-- B05 GMHS 423d75da-99cf-41b0-9c48-26e630b369b4
-- A10 Nhi 84ae0898-b572-4533-8bfd-4df56c474122

INSERT INTO public.nkbv_fact_benh_an (
  ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh,
  ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, is_active
) VALUES
('BA-TRIAL-01','PID-T01','Nguyễn Văn Cát','1962-03-12','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-TRIAL-02','PID-T02','Trần Thị Dung','1970-08-01','Nữ','2026-08-10 00:00:00+07',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true),
('BA-TRIAL-03','PID-T03','Lê Văn Em','1958-11-20','Nam','2026-08-10 00:00:00+07',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true),
('BA-TRIAL-04','PID-T04','Phạm Thị Phúc','1975-05-09','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-05','PID-T05','Hoàng Văn Giang','1968-01-15','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-TRIAL-06','PID-T06','Võ Thị Hoa','1965-09-30','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-07','PID-T07','Đặng Văn Hùng','1959-12-02','Nam','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-08','PID-T08','Bùi Thị Lan','1964-07-18','Nữ','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-TRIAL-09','PID-T09','Ngô Văn Minh','1961-04-22','Nam','2026-08-10 00:00:00+07',NULL,'b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c',true),
('BA-TRIAL-10','PID-T10','Đỗ Thị Nga','1972-02-28','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-11','PID-T11','Lý Văn Oanh','1957-06-14','Nam','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-TRIAL-12','PID-T12','Mai Thị Phương','1969-10-05','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-13','PID-T13','Phan Văn Quang','1966-03-03','Nam','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-TRIAL-14','PID-T14','Trịnh Thị Rạng','1974-08-17','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-15','PID-T15','Hồ Văn Sơn','1963-01-25','Nam','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-TRIAL-16','PID-T16','Châu Thị Tâm','1971-12-11','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-17','PID-T17','Tô Văn Uy','1955-05-19','Nam','2026-08-10 00:00:00+07',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-TRIAL-18','PID-T18','Lương Thị Vân','1954-09-01','Nữ','2026-08-10 00:00:00+07',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-TRIAL-19','PID-T19','Kiều Văn Xuân','1967-07-07','Nam','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-TRIAL-20','PID-T20','Ông Thị Yến','1978-09-13','Nữ','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-TRIAL-21','PID-T21','Yến Văn An','1960-11-08','Nam','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-TRIAL-22','PID-T22','Ấn Thị Bình','1976-04-04','Nữ','2026-08-10 00:00:00+07',NULL,'dcd020a3-37ed-4d80-bf2f-ffaccbbf1948',true),
('BA-TRIAL-23','PID-T23','Cát Văn Cường','1964-02-16','Nam','2026-08-10 00:00:00+07',NULL,'6b01a774-e0a7-43d4-b0b0-ceb8fc8719f0',true),
('BA-TRIAL-24','PID-T24','Dương Thị Đào','1973-06-21','Nữ','2026-08-10 00:00:00+07',NULL,'72f6f3b6-5970-4817-84e0-b5c00487a041',true),
('BA-TRIAL-25','PID-T25','Ếch Văn Đạt','1956-08-29','Nam','2026-08-10 00:00:00+07',NULL,'af4b7f0f-19f7-40de-9173-a6bce43bdbaf',true),
('BA-TRIAL-26','PID-T26','Giang Thị Em','1969-10-10','Nữ','2026-08-10 00:00:00+07',NULL,'0e7f2494-7528-4f3c-be83-32c84cc969dd',true),
('BA-TRIAL-27','PID-T27','Hồng Văn Phong','1961-12-25','Nam','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-TRIAL-28','PID-T28','Khang Thị Quỳnh','1977-03-14','Nữ','2026-08-10 00:00:00+07',NULL,'6b01a774-e0a7-43d4-b0b0-ceb8fc8719f0',true),
('BA-TRIAL-29','PID-T29','Liễu Văn Sáng','1958-07-31','Nam','2026-08-10 00:00:00+07',NULL,'fb3f21b3-5984-4373-b715-25d5c7105e33',true),
('BA-TRIAL-30','PID-T30','Mai Thị Trúc','1980-01-09','Nữ','2026-08-10 00:00:00+07',NULL,'b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c',true),
('BA-TRIAL-31','PID-T31','Nam Văn Út','1966-05-22','Nam','2026-08-10 00:00:00+07',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-TRIAL-32','PID-T32','Oanh Thị Vy','1974-11-03','Nữ','2026-08-10 00:00:00+07',NULL,'dcd020a3-37ed-4d80-bf2f-ffaccbbf1948',true),
('BA-TRIAL-33','PID-T33','Phúc Văn Vinh','1963-08-16','Nam','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-34','PID-T34','Quang Thị Xuân','1979-02-20','Nữ','2026-08-15 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-TRIAL-35','PID-T35','Rạng Văn Ý','1971-04-08','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-TRIAL-36','PID-T36','Sơn Thị Ánh','1968-06-30','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-TRIAL-37','PID-T37','Tâm Văn Bảo','1965-09-12','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-TRIAL-38','PID-T38','Uyên Thị Châu','1972-12-01','Nữ','2026-08-10 00:00:00+07',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true),
('BA-TRIAL-39','PID-T39','Vũ Văn Đức','1960-03-27','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-TRIAL-40','PID-T40','Xuân Thị Diệu','1976-07-19','Nữ','2026-08-10 00:00:00+07','2026-08-25 00:00:00+07','048dd4f9-b84e-44a3-9813-0b7f8090b564',true);

-- Khoa từng ngày (= khoa lúc nhập, trừ BA-33 chuyển khoa)
INSERT INTO public.nkbv_fact_ba_ngay_khoa (ma_benh_an, ngay_lich, khoa_id)
SELECT
  b.ma_benh_an,
  gs::date,
  CASE
    WHEN b.ma_benh_an = 'BA-TRIAL-33' AND gs::date >= DATE '2026-08-19'
      THEN '13f9a000-fa4d-4a47-95f5-ac0a2c436aa6'::uuid
    ELSE b.khoa_dieu_tri_id
  END
FROM public.nkbv_fact_benh_an b
CROSS JOIN LATERAL generate_series(
  (b.ngay_vao_vien AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  COALESCE((b.ngay_ra_vien AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, DATE '2026-08-27'),
  INTERVAL '1 day'
) AS gs
WHERE b.ma_benh_an LIKE 'BA-TRIAL-%';

-- Foley / máy / CVC (tích từng ngày)
INSERT INTO public.nkbv_fact_ba_ngay_dung_cu (ma_benh_an, ngay_lich, loai_dung_cu)
SELECT s.ma, d::date, s.loai
FROM (
  VALUES
    ('BA-TRIAL-01','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-02','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-04','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-04','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-05','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-06','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-07','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-08','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-10','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-11','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-12','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-13','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-14','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-15','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-16','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-29','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-32','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-33','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-34','FOLEY', DATE '2026-08-15', DATE '2026-08-27'),
    ('BA-TRIAL-35','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-36','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-36','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-36','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-37','FOLEY', DATE '2026-08-10', DATE '2026-08-14'),
    ('BA-TRIAL-37','FOLEY', DATE '2026-08-18', DATE '2026-08-27'),
    ('BA-TRIAL-38','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-TRIAL-39','FOLEY', DATE '2026-08-10', DATE '2026-08-27')
) AS s(ma, loai, d1, d2)
CROSS JOIN LATERAL generate_series(s.d1, s.d2, INTERVAL '1 day') AS d;

-- Xét nghiệm
INSERT INTO public.nkbv_fact_vi_sinh (
  ma_benh_nhan, ma_benh_an, ho_ten_benh_nhan, ngay_sinh, gioi_tinh, ngay_vao_vien,
  ngay_lay_mau, khoa_yeu_cau_id, loai_benh_pham, loai_benh_pham_chuan, tac_nhan, so_luong,
  ket_qua_duong_tinh, ket_qua_phan_loai, ma_xet_nghiem, is_active, is_mdro, mdro_phenotype, mdro_source, metadata
)
SELECT
  b.ma_benh_nhan, b.ma_benh_an, b.ho_ten_benh_nhan, b.ngay_sinh, b.gioi_tinh, b.ngay_vao_vien,
  (x.ngay || ' 08:00:00+07')::timestamptz, b.khoa_dieu_tri_id,
  x.bp, x.chuan, x.tk, x.sl,
  x.duong, x.phan, x.ma_xn, true, x.mdro, x.phe, x.src,
  jsonb_build_object('unique_key', x.ma_xn, 'trial_muc', x.muc)
FROM (
  VALUES
    ('BA-TRIAL-01','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-01-U1',false,NULL,NULL,'CAUTI'),
    ('BA-TRIAL-02','2026-08-16','Nước tiểu','URINE','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-02-U1',false,NULL,NULL,'CAUTI+RIT'),
    ('BA-TRIAL-02','2026-08-22','Nước tiểu','URINE','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-02-U2',false,NULL,NULL,'CAUTI+RIT'),
    ('BA-TRIAL-03','2026-08-16','Nước tiểu','URINE','Proteus mirabilis','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-03-U1',false,NULL,NULL,'SUTI'),
    ('BA-TRIAL-04','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-04-U1',false,NULL,NULL,'CAUTI+SBSI'),
    ('BA-TRIAL-04','2026-08-16','Cấy máu','BLOOD_CULTURE','Escherichia coli',NULL,true,'DUONG_TINH','XN-TRIAL-04-B1',false,NULL,NULL,'CAUTI+SBSI'),
    ('BA-TRIAL-05','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-05-U1',false,NULL,NULL,'ABUTI'),
    ('BA-TRIAL-05','2026-08-16','Cấy máu','BLOOD_CULTURE','Escherichia coli',NULL,true,'DUONG_TINH','XN-TRIAL-05-B1',false,NULL,NULL,'ABUTI'),
    ('BA-TRIAL-06','2026-08-16','Cấy máu','BLOOD_CULTURE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-06-B1',false,NULL,NULL,'CLABSI'),
    ('BA-TRIAL-07','2026-08-16','Cấy máu','BLOOD_CULTURE','Staphylococcus epidermidis',NULL,true,'DUONG_TINH','XN-TRIAL-07-B1',false,NULL,NULL,'LCBI-CoNS'),
    ('BA-TRIAL-07','2026-08-16','Cấy máu','BLOOD_CULTURE','Staphylococcus epidermidis',NULL,true,'DUONG_TINH','XN-TRIAL-07-B2',false,NULL,NULL,'LCBI-CoNS'),
    ('BA-TRIAL-08','2026-08-16','Cấy máu','BLOOD_CULTURE','Candida albicans',NULL,true,'DUONG_TINH','XN-TRIAL-08-B1',false,NULL,NULL,'CLABSI-Candida'),
    ('BA-TRIAL-09','2026-08-16','Cấy máu','BLOOD_CULTURE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-09-B1',false,NULL,NULL,'BSI-no-CVC'),
    ('BA-TRIAL-10','2026-08-16','Cấy máu','BLOOD_CULTURE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-10-B1',true,'MRSA','LIS','CLABSI-MRSA'),
    ('BA-TRIAL-11','2026-08-16','Cấy máu','BLOOD_CULTURE','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-TRIAL-11-B1',false,NULL,NULL,'CLABSI-3mau'),
    ('BA-TRIAL-11','2026-08-16','Cấy máu','BLOOD_CULTURE','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-TRIAL-11-B2',false,NULL,NULL,'CLABSI-3mau'),
    ('BA-TRIAL-11','2026-08-17','Cấy máu','BLOOD_CULTURE','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-TRIAL-11-B3',false,NULL,NULL,'CLABSI-3mau'),
    ('BA-TRIAL-12','2026-08-16','Dịch hút NKQ','ETA','—',NULL,false,'AM_TINH','XN-TRIAL-12-E1',false,NULL,NULL,'VAC'),
    ('BA-TRIAL-13','2026-08-16','Dịch hút NKQ','ETA','—',NULL,false,'AM_TINH','XN-TRIAL-13-E1',false,NULL,NULL,'IVAC'),
    ('BA-TRIAL-14','2026-08-16','Dịch hút NKQ','ETA','Pseudomonas aeruginosa','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-14-E1',false,NULL,NULL,'PVAP-ETA'),
    ('BA-TRIAL-15','2026-08-16','BAL','BAL','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-15-BAL',false,NULL,NULL,'PVAP-BAL'),
    ('BA-TRIAL-16','2026-08-16','Đờm','SPUTUM','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-TRIAL-16-S1',false,NULL,NULL,'VAP-PNEU'),
    ('BA-TRIAL-17','2026-08-16','Đờm','SPUTUM','Streptococcus pneumoniae',NULL,true,'DUONG_TINH','XN-TRIAL-17-S1',false,NULL,NULL,'HAP'),
    ('BA-TRIAL-18','2026-08-16','Đờm','SPUTUM','Haemophilus influenzae',NULL,true,'DUONG_TINH','XN-TRIAL-18-S1',false,NULL,NULL,'HAP-70'),
    ('BA-TRIAL-19','2026-08-18','Dịch vết mổ','SURGICAL_SITE_FLUID','Escherichia coli',NULL,true,'DUONG_TINH','XN-TRIAL-19-W1',false,NULL,NULL,'SSI-SIP'),
    ('BA-TRIAL-20','2026-08-18','Dịch vết mổ','SURGICAL_SITE_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-20-W1',false,NULL,NULL,'SSI-SIS'),
    ('BA-TRIAL-21','2026-08-18','Dịch ổ bụng','PERITONEAL','Escherichia coli',NULL,true,'DUONG_TINH','XN-TRIAL-21-P1',false,NULL,NULL,'SSI-organ'),
    ('BA-TRIAL-22','2026-08-18','Dịch vết mổ','SURGICAL_SITE_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-22-W1',false,NULL,NULL,'SSI-nguc'),
    ('BA-TRIAL-23','2026-08-16','Phân','STOOL','Clostridioides difficile',NULL,true,'DUONG_TINH','XN-TRIAL-23-ST',true,'CDI','LIS','CDI'),
    ('BA-TRIAL-24','2026-08-16','Dịch não tủy','CSF','Streptococcus pneumoniae',NULL,true,'DUONG_TINH','XN-TRIAL-24-CSF',false,NULL,NULL,'MEN'),
    ('BA-TRIAL-25','2026-08-16','Mô xương','BONE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-25-BO',false,NULL,NULL,'BONE'),
    ('BA-TRIAL-26','2026-08-16','Dịch khớp','JOINT_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-26-JF',false,NULL,NULL,'PJI'),
    ('BA-TRIAL-26','2026-08-16','Dịch quanh khớp nhân tạo','PERIPROSTHETIC','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-26-PP',false,NULL,NULL,'PJI'),
    ('BA-TRIAL-27','2026-08-16','Dịch ổ bụng','PERITONEAL','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-TRIAL-27-P1',false,NULL,NULL,'IAB'),
    ('BA-TRIAL-28','2026-08-16','Phân','STOOL','Salmonella enterica',NULL,true,'DUONG_TINH','XN-TRIAL-28-ST',false,NULL,NULL,'GIT'),
    ('BA-TRIAL-29','2026-08-16','Cấy máu','BLOOD_CULTURE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-29-B1',false,NULL,NULL,'ENDO'),
    ('BA-TRIAL-30','2026-08-16','Phân','STOOL','Norovirus (cấy âm / PCR+)',NULL,true,'DUONG_TINH','XN-TRIAL-30-ST',false,NULL,NULL,'GE'),
    ('BA-TRIAL-31','2026-08-16','Dịch màng phổi','PLEURAL','Streptococcus anginosus',NULL,true,'DUONG_TINH','XN-TRIAL-31-PL',false,NULL,NULL,'LUNG'),
    ('BA-TRIAL-32','2026-08-16','Bệnh phẩm mạch máu','CARDIOVASCULAR','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-TRIAL-32-CV',false,NULL,NULL,'VASC'),
    ('BA-TRIAL-33','2026-08-20','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-33-U1',false,NULL,NULL,'LOA-chuyen-khoa'),
    ('BA-TRIAL-34','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-34-U1',false,NULL,NULL,'POA-HD2'),
    ('BA-TRIAL-35','2026-08-16','Nước tiểu','URINE','—',NULL,false,'AM_TINH','XN-TRIAL-35-U1',false,NULL,NULL,'Khong-du-TC'),
    ('BA-TRIAL-36','2026-08-16','Cấy máu','BLOOD_CULTURE','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-TRIAL-36-B1',true,'CRE','LIS','Da-dung-cu'),
    ('BA-TRIAL-36','2026-08-16','Nước tiểu','URINE','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-36-U1',true,'CRE','LIS','Da-dung-cu'),
    ('BA-TRIAL-36','2026-08-16','Dịch hút NKQ','ETA','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-TRIAL-36-E1',true,'CRE','LIS','Da-dung-cu'),
    ('BA-TRIAL-37','2026-08-20','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-37-U1',false,NULL,NULL,'Foley-gap'),
    ('BA-TRIAL-38','2026-08-16','Nước tiểu','URINE','Enterococcus faecium','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-38-U1',true,'VRE','LIS','CAUTI-VRE'),
    ('BA-TRIAL-39','2026-08-16','Nước tiểu','URINE','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-TRIAL-39-U1',true,'CRE','LIS','CAUTI-CRE'),
    ('BA-TRIAL-40','2026-08-18','Dịch vết mổ','SURGICAL_SITE_FLUID','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-TRIAL-40-W1',false,NULL,NULL,'SSI-da-ra-vien')
) AS x(ma, ngay, bp, chuan, tk, sl, duong, phan, ma_xn, mdro, phe, src, muc)
JOIN public.nkbv_fact_benh_an b ON b.ma_benh_an = x.ma;

-- Mốc lưới (không device_*)
INSERT INTO public.nkbv_fact_ba_timeline (
  ma_benh_an, milestone_kind, milestone_date, title, detail, criteria_key, is_active
)
SELECT ma, kind, d::date, title, muc, key, true
FROM (
  VALUES
    ('BA-TRIAL-01','SYMPTOM','2026-08-16','Sốt','CAUTI','fever'),
    ('BA-TRIAL-01','SYMPTOM','2026-08-16','Đái buốt','CAUTI','dysuria'),
    ('BA-TRIAL-02','SYMPTOM','2026-08-16','Sốt','CAUTI+RIT','fever'),
    ('BA-TRIAL-02','SYMPTOM','2026-08-16','Đau trên xương mu','CAUTI+RIT','suprapubic_pain'),
    ('BA-TRIAL-03','SYMPTOM','2026-08-16','Sốt','SUTI','fever'),
    ('BA-TRIAL-03','SYMPTOM','2026-08-16','Đau trên xương mu','SUTI','suprapubic_pain'),
    ('BA-TRIAL-04','SYMPTOM','2026-08-16','Sốt','CAUTI+SBSI','fever'),
    ('BA-TRIAL-04','SYMPTOM','2026-08-16','Đau hố thắt lưng','CAUTI+SBSI','cva_pain'),
    ('BA-TRIAL-05','SYMPTOM','2026-08-16','Sốt','ABUTI','fever'),
    ('BA-TRIAL-06','SYMPTOM','2026-08-16','Sốt','CLABSI','fever'),
    ('BA-TRIAL-06','SYMPTOM','2026-08-16','Ớn lạnh','CLABSI','chills'),
    ('BA-TRIAL-07','SYMPTOM','2026-08-16','Sốt','LCBI-CoNS','fever'),
    ('BA-TRIAL-08','SYMPTOM','2026-08-16','Sốt','CLABSI-Candida','fever'),
    ('BA-TRIAL-09','SYMPTOM','2026-08-16','Sốt','BSI-no-CVC','fever'),
    ('BA-TRIAL-09','SYMPTOM','2026-08-16','Hạ huyết áp','BSI-no-CVC','hypotension'),
    ('BA-TRIAL-10','SYMPTOM','2026-08-16','Sốt','CLABSI-MRSA','fever'),
    ('BA-TRIAL-11','SYMPTOM','2026-08-16','Sốt','CLABSI-3mau','fever'),
    ('BA-TRIAL-12','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','VAC','fever_or_wbc'),
    ('BA-TRIAL-12','SYMPTOM','2026-08-16','Khí máu xấu đi','VAC','worsening_gas'),
    ('BA-TRIAL-13','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','IVAC','fever_or_wbc'),
    ('BA-TRIAL-13','SYMPTOM','2026-08-16','Khí máu xấu đi','IVAC','worsening_gas'),
    ('BA-TRIAL-14','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','PVAP-ETA','fever_or_wbc'),
    ('BA-TRIAL-14','SYMPTOM','2026-08-16','Khí máu xấu đi','PVAP-ETA','worsening_gas'),
    ('BA-TRIAL-15','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','PVAP-BAL','fever_or_wbc'),
    ('BA-TRIAL-15','SYMPTOM','2026-08-16','Khí máu xấu đi','PVAP-BAL','worsening_gas'),
    ('BA-TRIAL-16','IMAGING_CHEST','2026-08-16','X-quang phổi mới','VAP-PNEU','imaging_chest'),
    ('BA-TRIAL-16','SYMPTOM','2026-08-16','Sốt','VAP-PNEU','fever'),
    ('BA-TRIAL-16','SYMPTOM','2026-08-16','Ho','VAP-PNEU','cough'),
    ('BA-TRIAL-16','SYMPTOM','2026-08-16','Đờm mủ mới','VAP-PNEU','new_purulent_sputum'),
    ('BA-TRIAL-17','IMAGING_CHEST','2026-08-16','X-quang phổi mới','HAP','imaging_chest'),
    ('BA-TRIAL-17','SYMPTOM','2026-08-16','Sốt','HAP','fever'),
    ('BA-TRIAL-17','SYMPTOM','2026-08-16','Ho','HAP','cough'),
    ('BA-TRIAL-17','SYMPTOM','2026-08-16','Ran phổi','HAP','rales'),
    ('BA-TRIAL-18','IMAGING_CHEST','2026-08-16','X-quang phổi mới','HAP-70','imaging_chest'),
    ('BA-TRIAL-18','SYMPTOM','2026-08-16','Sốt','HAP-70','fever'),
    ('BA-TRIAL-18','SYMPTOM','2026-08-16','Lú lẫn (≥70 tuổi)','HAP-70','altered_mental_ge70'),
    ('BA-TRIAL-19','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-SIP','procedure_surgery'),
    ('BA-TRIAL-19','SYMPTOM','2026-08-18','Vết mổ chảy mủ','SSI-SIP','purulent_drainage'),
    ('BA-TRIAL-20','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-SIS','procedure_surgery'),
    ('BA-TRIAL-20','SYMPTOM','2026-08-18','Mở vết mổ chủ động + cấy (+)','SSI-SIS','wound_opened'),
    ('BA-TRIAL-20','SYMPTOM','2026-08-18','BS chẩn đoán SSI nông','SSI-SIS','physician_diagnosis'),
    ('BA-TRIAL-21','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-organ','procedure_surgery'),
    ('BA-TRIAL-21','IMAGING_CHEST','2026-08-18','Áp xe / CĐHA ổ nhiễm','SSI-organ','abscess_imaging'),
    ('BA-TRIAL-22','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-nguc','procedure_surgery'),
    ('BA-TRIAL-22','SYMPTOM','2026-08-18','Vết mổ chảy mủ','SSI-nguc','purulent_drainage'),
    ('BA-TRIAL-23','SYMPTOM','2026-08-16','Sốt','CDI','fever'),
    ('BA-TRIAL-24','SYMPTOM','2026-08-16','Sốt','MEN','fever'),
    ('BA-TRIAL-25','SYMPTOM','2026-08-16','Sốt','BONE','fever'),
    ('BA-TRIAL-26','SYMPTOM','2026-08-16','Sốt','PJI','fever'),
    ('BA-TRIAL-27','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','IAB','procedure_surgery'),
    ('BA-TRIAL-27','SYMPTOM','2026-08-16','Sốt','IAB','fever'),
    ('BA-TRIAL-28','SYMPTOM','2026-08-16','Sốt','GIT','fever'),
    ('BA-TRIAL-29','SYMPTOM','2026-08-16','Sốt','ENDO','fever'),
    ('BA-TRIAL-30','SYMPTOM','2026-08-16','Sốt','GE','fever'),
    ('BA-TRIAL-31','IMAGING_CHEST','2026-08-16','X-quang phổi / tràn mủ','LUNG','imaging_chest'),
    ('BA-TRIAL-31','SYMPTOM','2026-08-16','Sốt','LUNG','fever'),
    ('BA-TRIAL-32','SYMPTOM','2026-08-16','Sốt','VASC','fever'),
    ('BA-TRIAL-33','SYMPTOM','2026-08-20','Sốt','LOA-chuyen-khoa','fever'),
    ('BA-TRIAL-33','SYMPTOM','2026-08-20','Đái buốt','LOA-chuyen-khoa','dysuria'),
    ('BA-TRIAL-34','SYMPTOM','2026-08-16','Sốt','POA-HD2','fever'),
    ('BA-TRIAL-35','SYMPTOM','2026-08-16','Sốt','Khong-du-TC','fever'),
    ('BA-TRIAL-36','SYMPTOM','2026-08-16','Sốt','Da-dung-cu','fever'),
    ('BA-TRIAL-36','IMAGING_CHEST','2026-08-16','X-quang phổi mới','Da-dung-cu','imaging_chest'),
    ('BA-TRIAL-37','SYMPTOM','2026-08-20','Sốt','Foley-gap','fever'),
    ('BA-TRIAL-38','SYMPTOM','2026-08-16','Sốt','CAUTI-VRE','fever'),
    ('BA-TRIAL-38','SYMPTOM','2026-08-16','Đái buốt','CAUTI-VRE','dysuria'),
    ('BA-TRIAL-39','SYMPTOM','2026-08-16','Sốt','CAUTI-CRE','fever'),
    ('BA-TRIAL-40','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-da-ra-vien','procedure_surgery'),
    ('BA-TRIAL-40','SYMPTOM','2026-08-18','Vết mổ chảy mủ','SSI-da-ra-vien','purulent_drainage')
) AS t(ma, kind, d, title, muc, key);

COMMIT;

-- Gợi ý thử trên UI (mã BA):
-- 01 CAUTI · 02 CAUTI+RIT · 03 SUTI không Foley · 04 CAUTI+Secondary BSI · 05 ABUTI
-- 06 CLABSI S.aureus · 07 LCBI CoNS 2 chai · 08 Candida · 09 BSI không CVC · 10 MRSA
-- 11 Pseudomonas 3 máu · 12 VAC · 13 IVAC · 14 PVAP ETA · 15 PVAP BAL
-- 16 VAP-PNEU · 17 HAP · 18 HAP ≥70 · 19 SSI SIP · 20 SSI SIS · 21 SSI organ · 22 SSI ngực
-- 23 CDI · 24 MEN · 25 BONE · 26 PJI · 27 IAB · 28 GIT · 29 ENDO · 30 GE · 31 LUNG · 32 VASC
-- 33 chuyển khoa (quy kết) · 34 POA HD2 · 35 cấy âm · 36 CVC+Vent+Foley · 37 Foley ngắt quãng
-- 38 VRE · 39 CRE · 40 SSI đã ra viện
