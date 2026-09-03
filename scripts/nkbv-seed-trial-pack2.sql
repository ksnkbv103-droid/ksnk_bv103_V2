-- Gói 2 bệnh án thử nghiệm NKBV — bù site Chương 17 còn thiếu + cửa sổ / loại trừ.
-- Prefix BA-P2- — xóa rồi seed lại được. Không đụng BA-TRIAL-01..40, mau_so_*, không tạo phiếu.

BEGIN;

DELETE FROM public.nkbv_fact_benh_an WHERE ma_benh_an LIKE 'BA-P2-%';

-- Khoa (mdm_dm_khoa_phong) — bổ sung so với gói 1:
-- A08 Da liễu     276e4dd0-7323-42d0-9727-a524558dbd2e
-- B04 Mắt         3c4fd305-8793-4922-9744-31fd60b4f917
-- B06 TMH         8ac2ac58-fe81-4b73-a2e6-16d980453599
-- B08 Hàm mặt     c51ebc3c-6fb7-4665-92d5-91f826f3e28d
-- B10 Sản         d912c85e-cf2d-4e7e-aaf1-23541104bfc2
-- B14 Răng miệng  9467cda7-2bac-4205-bd8b-a4219aa987b0
-- B17 PT khớp     cc618343-54d2-45a2-af13-15118ef84d96
-- B18 Cột sống    4d822700-389d-4fc8-affd-98baa783517d
-- B20 Ngoại TM    5f5a4937-8c28-4d84-96a4-76a78b51da21
-- A12 Thận        13f9a000-fa4d-4a47-95f5-ac0a2c436aa6
-- A27 HSN         8cd1a9bc-7c88-4d68-b70a-ddb6f1381122
-- A11 Khớp        0e7f2494-7528-4f3c-be83-32c84cc969dd
-- A02 Tim mạch    fb3f21b3-5984-4373-b715-25d5c7105e33
-- A03 Phổi        c895038b-e242-43bc-a868-e17865308dac
-- A04 Thần kinh   72f6f3b6-5970-4817-84e0-b5c00487a041
-- B01 CTCH        af4b7f0f-19f7-40de-9173-a6bce43bdbaf
-- B02 Ngoại bụng  048dd4f9-b84e-44a3-9813-0b7f8090b564
-- B09 Ngoại TK    b838cf7f-dec6-4fec-bec4-580004521b6e
-- B12 Lồng ngực   dcd020a3-37ed-4d80-bf2f-ffaccbbf1948
-- B11 HSN ngoại   4c4f101c-e714-4f72-9910-db46becae2bc

INSERT INTO public.nkbv_fact_benh_an (
  ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh,
  ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, is_active
) VALUES
-- Ch.17 còn thiếu (01–22)
('BA-P2-01','PID-P201','Nguyễn Văn Đĩa','1960-04-11','Nam','2026-08-10 00:00:00+07',NULL,'4d822700-389d-4fc8-affd-98baa783517d',true),
('BA-P2-02','PID-P202','Trần Thị Khớp','1968-09-02','Nữ','2026-08-10 00:00:00+07',NULL,'0e7f2494-7528-4f3c-be83-32c84cc969dd',true),
('BA-P2-03','PID-P203','Lê Văn Não','1957-12-19','Nam','2026-08-10 00:00:00+07',NULL,'b838cf7f-dec6-4fec-bec4-580004521b6e',true),
('BA-P2-04','PID-P204','Phạm Thị Tủy','1971-06-08','Nữ','2026-08-10 00:00:00+07',NULL,'4d822700-389d-4fc8-affd-98baa783517d',true),
('BA-P2-05','PID-P205','Hoàng Văn Tim','1963-02-14','Nam','2026-08-10 00:00:00+07',NULL,'fb3f21b3-5984-4373-b715-25d5c7105e33',true),
('BA-P2-06','PID-P206','Võ Thị Trung','1966-10-21','Nữ','2026-08-10 00:00:00+07',NULL,'5f5a4937-8c28-4d84-96a4-76a78b51da21',true),
('BA-P2-07','PID-P207','Đặng Văn Kết','1974-01-30','Nam','2026-08-10 00:00:00+07',NULL,'3c4fd305-8793-4922-9744-31fd60b4f917',true),
('BA-P2-08','PID-P208','Bùi Thị Tai','1970-07-16','Nữ','2026-08-10 00:00:00+07',NULL,'8ac2ac58-fe81-4b73-a2e6-16d980453599',true),
('BA-P2-09','PID-P209','Ngô Văn Mắt','1959-05-05','Nam','2026-08-10 00:00:00+07',NULL,'3c4fd305-8793-4922-9744-31fd60b4f917',true),
('BA-P2-10','PID-P210','Đỗ Thị Miệng','1973-03-27','Nữ','2026-08-10 00:00:00+07',NULL,'9467cda7-2bac-4205-bd8b-a4219aa987b0',true),
('BA-P2-11','PID-P211','Lý Văn Xoang','1962-08-09','Nam','2026-08-10 00:00:00+07',NULL,'8ac2ac58-fe81-4b73-a2e6-16d980453599',true),
('BA-P2-12','PID-P212','Mai Thị Họng','1969-11-23','Nữ','2026-08-10 00:00:00+07',NULL,'8ac2ac58-fe81-4b73-a2e6-16d980453599',true),
('BA-P2-13','PID-P213','Phan Thị Mạc','1982-04-04','Nữ','2026-08-10 00:00:00+07',NULL,'d912c85e-cf2d-4e7e-aaf1-23541104bfc2',true),
('BA-P2-14','PID-P214','Trịnh Thị Tầng','1988-12-12','Nữ','2026-08-10 00:00:00+07',NULL,'d912c85e-cf2d-4e7e-aaf1-23541104bfc2',true),
('BA-P2-15','PID-P215','Hồ Thị Chậu','1980-06-18','Nữ','2026-08-10 00:00:00+07',NULL,'d912c85e-cf2d-4e7e-aaf1-23541104bfc2',true),
('BA-P2-16','PID-P216','Châu Thị Mỏm','1976-09-07','Nữ','2026-08-10 00:00:00+07',NULL,'d912c85e-cf2d-4e7e-aaf1-23541104bfc2',true),
('BA-P2-17','PID-P217','Tô Thị Vú','1975-02-02','Nữ','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-P2-18','PID-P218','Lương Văn Bỏng','1990-08-20','Nam','2026-08-10 00:00:00+07',NULL,'af4b7f0f-19f7-40de-9173-a6bce43bdbaf',true),
('BA-P2-19','PID-P219','Kiều Thị Loét','1954-03-15','Nữ','2026-08-10 00:00:00+07',NULL,'276e4dd0-7323-42d0-9727-a524558dbd2e',true),
('BA-P2-20','PID-P220','Ông Văn Da','1967-07-29','Nam','2026-08-10 00:00:00+07',NULL,'276e4dd0-7323-42d0-9727-a524558dbd2e',true),
('BA-P2-21','PID-P221','Yến Thị Mềm','1972-10-13','Nữ','2026-08-10 00:00:00+07',NULL,'276e4dd0-7323-42d0-9727-a524558dbd2e',true),
('BA-P2-22','PID-P222','Ấn Văn Thận','1961-01-26','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
-- Cửa sổ / loại trừ / tiêu chí sâu (23–45)
('BA-P2-23','PID-P223','Cát Văn MBI','1958-05-11','Nam','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-P2-24','PID-P224','Dương Thị PNU2','1964-11-08','Nữ','2026-08-10 00:00:00+07',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-P2-25','PID-P225','Ếch Văn PNU3','1956-08-03','Nam','2026-08-10 00:00:00+07',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-P2-26','PID-P226','Giang Thị Nấm','1970-04-22','Nữ','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-P2-27','PID-P227','Hồng Văn BaLoài','1965-09-17','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-P2-28','PID-P228','Khang Thị Crypto','1969-12-06','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-P2-29','PID-P229','Liễu Văn Flora','1963-06-01','Nam','2026-08-10 00:00:00+07',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-P2-30','PID-P230','Mai Thị Foley1','1974-02-14','Nữ','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-P2-31','PID-P231','Nam Văn Foley2','1966-07-25','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-P2-32','PID-P232','Oanh Thị Chuyển','1977-03-09','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-P2-33','PID-P233','Phúc Văn Echo','1955-10-30','Nam','2026-08-10 00:00:00+07',NULL,'fb3f21b3-5984-4373-b715-25d5c7105e33',true),
('BA-P2-34','PID-P234','Quang Thị PATOS','1979-01-18','Nữ','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-P2-35','PID-P235','Rạng Văn Bục','1962-05-27','Nam','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-P2-36','PID-P236','Sơn Thị Implant','1968-08-16','Nữ','2026-08-10 00:00:00+07',NULL,'af4b7f0f-19f7-40de-9173-a6bce43bdbaf',true),
('BA-P2-37','PID-P237','Tâm Văn SBSI','1965-11-04','Nam','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-P2-38','PID-P238','Uyên Thị PEEP','1972-09-21','Nữ','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-P2-39','PID-P239','Vũ Văn HaiSite','1960-12-28','Nam','2026-08-10 00:00:00+07',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-P2-40','PID-P240','Xuân Thị NCT','1976-03-03','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-P2-41','PID-P241','Đinh Văn CandidaETA','1964-06-19','Nam','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-P2-42','PID-P242','Kiều Thị VentNgắn','1971-04-07','Nữ','2026-08-10 00:00:00+07',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-P2-43','PID-P243','Long Văn ChỉKhâu','1963-08-22','Nam','2026-08-10 00:00:00+07',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-P2-44','PID-P244','Minh Thị ECMO','1969-02-11','Nữ','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-P2-45','PID-P245','Ngọc Văn QAD','1958-07-15','Nam','2026-08-10 00:00:00+07',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true);

INSERT INTO public.nkbv_fact_ba_ngay_khoa (ma_benh_an, ngay_lich, khoa_id)
SELECT
  b.ma_benh_an,
  gs::date,
  CASE
    WHEN b.ma_benh_an = 'BA-P2-32' AND gs::date >= DATE '2026-08-16'
      THEN '13f9a000-fa4d-4a47-95f5-ac0a2c436aa6'::uuid
    ELSE b.khoa_dieu_tri_id
  END
FROM public.nkbv_fact_benh_an b
CROSS JOIN LATERAL generate_series(
  (b.ngay_vao_vien AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  COALESCE((b.ngay_ra_vien AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, DATE '2026-08-27'),
  INTERVAL '1 day'
) AS gs
WHERE b.ma_benh_an LIKE 'BA-P2-%';

INSERT INTO public.nkbv_fact_ba_ngay_dung_cu (ma_benh_an, ngay_lich, loai_dung_cu)
SELECT s.ma, d::date, s.loai
FROM (
  VALUES
    ('BA-P2-23','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-26','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-27','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-28','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-30','FOLEY', DATE '2026-08-10', DATE '2026-08-15'),
    ('BA-P2-31','FOLEY', DATE '2026-08-10', DATE '2026-08-14'),
    ('BA-P2-32','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-33','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-38','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-39','FOLEY', DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-40','CVC',   DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-41','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-42','VENT',  DATE '2026-08-15', DATE '2026-08-16'),
    ('BA-P2-44','VENT',  DATE '2026-08-10', DATE '2026-08-27'),
    ('BA-P2-45','VENT',  DATE '2026-08-10', DATE '2026-08-27')
) AS s(ma, loai, d1, d2)
CROSS JOIN LATERAL generate_series(s.d1, s.d2, INTERVAL '1 day') AS d;

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
    -- Ch.17
    ('BA-P2-01','2026-08-16','Mảnh đĩa đệm','BONE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-01-BO',false,NULL,NULL,'DISC'),
    ('BA-P2-02','2026-08-16','Dịch khớp tự nhiên','JOINT_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-02-JF',false,NULL,NULL,'JNT'),
    ('BA-P2-03','2026-08-16','Mô não','BRAIN_TISSUE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-03-BT',false,NULL,NULL,'IC'),
    ('BA-P2-04','2026-08-16','Dịch áp xe ngoài màng cứng tủy','BRAIN_ABSCESS','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-04-SA',false,NULL,NULL,'SA'),
    ('BA-P2-05','2026-08-16','Dịch màng ngoài tim','PERICARDIAL','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-05-PC',false,NULL,NULL,'CARD'),
    ('BA-P2-06','2026-08-18','Dịch trung thất','SURGICAL_SITE_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-06-MD',false,NULL,NULL,'MED'),
    ('BA-P2-07','2026-08-16','Quệt kết mạc','SKIN_ST','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-07-CJ',false,NULL,NULL,'CONJ'),
    ('BA-P2-08','2026-08-16','Dịch tai giữa','URT','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-P2-08-EAR',false,NULL,NULL,'EAR'),
    ('BA-P2-09','2026-08-16','Dịch thủy tinh thể','SKIN_ST','Staphylococcus epidermidis',NULL,true,'DUONG_TINH','XN-P2-09-EYE',false,NULL,NULL,'EYE'),
    ('BA-P2-10','2026-08-16','Mô miệng','URT','Candida albicans',NULL,true,'DUONG_TINH','XN-P2-10-OR',false,NULL,NULL,'ORAL'),
    ('BA-P2-11','2026-08-16','Dịch xoang','URT','Streptococcus pneumoniae',NULL,true,'DUONG_TINH','XN-P2-11-SI',false,NULL,NULL,'SINU'),
    ('BA-P2-12','2026-08-16','Dịch hầu họng (UR, không phải nước tiểu)','URT','Streptococcus pyogenes',NULL,true,'DUONG_TINH','XN-P2-12-UR',false,NULL,NULL,'UR'),
    ('BA-P2-13','2026-08-16','Dịch nội mạc tử cung','REPRODUCTIVE','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-13-EM',false,NULL,NULL,'EMET'),
    ('BA-P2-14','2026-08-16','Dịch tầng sinh môn (episiotomy)','SKIN_ST','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-14-EP',false,NULL,NULL,'EPIS'),
    ('BA-P2-15','2026-08-16','Dịch phần phụ / chậu','REPRODUCTIVE','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-15-OR',false,NULL,NULL,'OREP'),
    ('BA-P2-16','2026-08-18','Dịch mỏm cắt âm đạo','REPRODUCTIVE','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-16-VC',false,NULL,NULL,'VCUF'),
    ('BA-P2-17','2026-08-16','Dịch / mô vú','SKIN_ST','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-17-BR',false,NULL,NULL,'BRST'),
    ('BA-P2-18','2026-08-16','Mô bỏng','SKIN_ST','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-P2-18-BU',false,NULL,NULL,'BURN'),
    ('BA-P2-19','2026-08-16','Loét tỳ đè','DECUBITUS','Proteus mirabilis',NULL,true,'DUONG_TINH','XN-P2-19-DE',false,NULL,NULL,'DECU'),
    ('BA-P2-20','2026-08-16','Da / mô nông','SKIN_ST','Streptococcus pyogenes',NULL,true,'DUONG_TINH','XN-P2-20-SK',false,NULL,NULL,'SKIN'),
    ('BA-P2-21','2026-08-16','Mô mềm sâu','SKIN_ST','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-21-ST',false,NULL,NULL,'ST'),
    ('BA-P2-22','2026-08-16','Dịch / mô thận (không phải nước tiểu)','SURGICAL_SITE_FLUID','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-22-US',false,NULL,NULL,'USI'),
    -- Tiêu chí sâu / loại trừ
    ('BA-P2-23','2026-08-16','Cấy máu','BLOOD_CULTURE','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-23-B1',false,NULL,NULL,'MBI-LCBI'),
    ('BA-P2-24','2026-08-16','Cấy máu','BLOOD_CULTURE','Streptococcus pneumoniae',NULL,true,'DUONG_TINH','XN-P2-24-B1',false,NULL,NULL,'PNU2'),
    ('BA-P2-24','2026-08-16','Dịch màng phổi','PLEURAL','Streptococcus pneumoniae',NULL,true,'DUONG_TINH','XN-P2-24-PL',false,NULL,NULL,'PNU2'),
    ('BA-P2-24','2026-08-16','Đờm','SPUTUM','Streptococcus pneumoniae',NULL,true,'DUONG_TINH','XN-P2-24-S1',false,NULL,NULL,'PNU2'),
    ('BA-P2-25','2026-08-16','Kháng nguyên nước tiểu Legionella','URINE_ANTIGEN','Legionella pneumophila',NULL,true,'DUONG_TINH','XN-P2-25-AG',false,NULL,NULL,'PNU3'),
    ('BA-P2-26','2026-08-16','Nước tiểu','URINE','Candida albicans','10^5 CFU/ml',true,'DUONG_TINH','XN-P2-26-U1',false,NULL,NULL,'EXCL-yeast-urine'),
    ('BA-P2-27','2026-08-16','Nước tiểu','URINE','E.coli + K.pneumoniae + P.mirabilis','3 loài',true,'DUONG_TINH','XN-P2-27-U1',false,NULL,NULL,'EXCL-gt2-spp'),
    ('BA-P2-28','2026-08-16','Cấy máu','BLOOD_CULTURE','Cryptococcus neoformans',NULL,true,'DUONG_TINH','XN-P2-28-B1',false,NULL,NULL,'EXCL-community-fungus'),
    ('BA-P2-29','2026-08-16','Đờm','SPUTUM','Viridans group streptococci (flora miệng)',NULL,true,'DUONG_TINH','XN-P2-29-S1',false,NULL,NULL,'EXCL-oral-flora'),
    ('BA-P2-30','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-P2-30-U1',false,NULL,NULL,'Foley-DOE-1'),
    ('BA-P2-31','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-P2-31-U1',false,NULL,NULL,'Foley-DOE-2'),
    ('BA-P2-32','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-P2-32-U1',false,NULL,NULL,'Transfer-DOE'),
    ('BA-P2-33','2026-08-16','Cấy máu','BLOOD_CULTURE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-33-B1',false,NULL,NULL,'ENDO-2blood'),
    ('BA-P2-33','2026-08-17','Cấy máu','BLOOD_CULTURE','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-33-B2',false,NULL,NULL,'ENDO-2blood'),
    ('BA-P2-34','2026-08-12','Dịch vết mổ','SURGICAL_SITE_FLUID','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-34-W1',false,NULL,NULL,'SSI-PATOS'),
    ('BA-P2-35','2026-08-18','Dịch vết mổ','SURGICAL_SITE_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-35-W1',false,NULL,NULL,'SSI-dehiscence'),
    ('BA-P2-36','2026-08-18','Dịch vết mổ khớp nhân tạo','SURGICAL_SITE_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-36-W1',false,NULL,NULL,'SSI-90d'),
    ('BA-P2-37','2026-08-18','Dịch vết mổ','SURGICAL_SITE_FLUID','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-37-W1',false,NULL,NULL,'SSI-SBSI'),
    ('BA-P2-37','2026-08-18','Cấy máu','BLOOD_CULTURE','Escherichia coli',NULL,true,'DUONG_TINH','XN-P2-37-B1',false,NULL,NULL,'SSI-SBSI'),
    ('BA-P2-38','2026-08-16','Dịch hút NKQ','ETA','—',NULL,false,'AM_TINH','XN-P2-38-E1',false,NULL,NULL,'VAE-PEEP'),
    ('BA-P2-39','2026-08-16','Nước tiểu','URINE','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-P2-39-U1',false,NULL,NULL,'Two-sites'),
    ('BA-P2-39','2026-08-16','Đờm','SPUTUM','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-P2-39-S1',false,NULL,NULL,'Two-sites'),
    ('BA-P2-40','2026-08-16','NCT máu (PCR)','BLOOD_NCT','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-40-N1',false,NULL,NULL,'BLOOD-NCT'),
    ('BA-P2-41','2026-08-16','Dịch hút NKQ','ETA','Candida albicans',NULL,true,'DUONG_TINH','XN-P2-41-E1',false,NULL,NULL,'EXCL-candida-ETA'),
    ('BA-P2-42','2026-08-16','Dịch hút NKQ','ETA','—',NULL,false,'AM_TINH','XN-P2-42-E1',false,NULL,NULL,'Vent-short'),
    ('BA-P2-43','2026-08-16','Dịch chỉ khâu','SURGICAL_SITE_FLUID','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-P2-43-W1',false,NULL,NULL,'EXCL-stitch'),
    ('BA-P2-44','2026-08-16','Dịch hút NKQ','ETA','—',NULL,false,'AM_TINH','XN-P2-44-E1',false,NULL,NULL,'EXCL-ECMO'),
    ('BA-P2-45','2026-08-16','Dịch hút NKQ','ETA','—',NULL,false,'AM_TINH','XN-P2-45-E1',false,NULL,NULL,'IVAC-QAD')
) AS x(ma, ngay, bp, chuan, tk, sl, duong, phan, ma_xn, mdro, phe, src, muc)
JOIN public.nkbv_fact_benh_an b ON b.ma_benh_an = x.ma;

INSERT INTO public.nkbv_fact_ba_timeline (
  ma_benh_an, milestone_kind, milestone_date, title, detail, criteria_key, is_active
)
SELECT ma, kind, d::date, title, muc, key, true
FROM (
  VALUES
    -- Ch.17
    ('BA-P2-01','SYMPTOM','2026-08-16','Sốt','DISC','fever'),
    ('BA-P2-01','NOTE','2026-08-16','Gợi ý phiếu Ch.17 DISC','Tích đau khoang đĩa + CĐHA khẳng định trên phiếu.',NULL),
    ('BA-P2-02','SYMPTOM','2026-08-16','Sốt','JNT','fever'),
    ('BA-P2-02','NOTE','2026-08-16','Gợi ý phiếu Ch.17 JNT','Khớp tự nhiên — không phải PJI. Tích sưng/đau/nóng khớp.',NULL),
    ('BA-P2-03','SYMPTOM','2026-08-16','Sốt','IC','fever'),
    ('BA-P2-03','NOTE','2026-08-16','Gợi ý phiếu Ch.17 IC','Tích đau đầu / dấu thần kinh định vị + CĐHA nội sọ.',NULL),
    ('BA-P2-04','SYMPTOM','2026-08-16','Sốt','SA','fever'),
    ('BA-P2-04','NOTE','2026-08-16','Gợi ý phiếu Ch.17 SA','Tích đau lưng / liệt + CĐHA áp xe ngoài màng cứng tủy.',NULL),
    ('BA-P2-05','SYMPTOM','2026-08-16','Sốt','CARD','fever'),
    ('BA-P2-05','NOTE','2026-08-16','Gợi ý phiếu Ch.17 CARD','Tích đau ngực + tràn dịch màng ngoài tim / ECG.',NULL),
    ('BA-P2-06','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật tim (Day 1)','MED','procedure_surgery'),
    ('BA-P2-06','SYMPTOM','2026-08-18','Sốt','MED','fever'),
    ('BA-P2-06','NOTE','2026-08-18','Gợi ý phiếu Ch.17 MED','Tích mất vững xương ức / chảy mủ trung thất + XQ giãn trung thất.',NULL),
    ('BA-P2-07','SYMPTOM','2026-08-16','Sốt','CONJ','fever'),
    ('BA-P2-07','NOTE','2026-08-16','Gợi ý phiếu Ch.17 CONJ','Viêm kết mạc — không nhầm SSI mắt.',NULL),
    ('BA-P2-08','SYMPTOM','2026-08-16','Sốt','EAR','fever'),
    ('BA-P2-08','NOTE','2026-08-16','Gợi ý phiếu Ch.17 EAR','Nhiễm trùng tai — bệnh phẩm URT, không phải nước tiểu.',NULL),
    ('BA-P2-09','SYMPTOM','2026-08-16','Sốt','EYE','fever'),
    ('BA-P2-09','NOTE','2026-08-16','Gợi ý phiếu Ch.17 EYE','Nhiễm trùng mắt / nội nhãn.',NULL),
    ('BA-P2-10','SYMPTOM','2026-08-16','Sốt','ORAL','fever'),
    ('BA-P2-10','NOTE','2026-08-16','Gợi ý phiếu Ch.17 ORAL','Nhiễm trùng khoang miệng — không đếm flora miệng cho PNEU.',NULL),
    ('BA-P2-11','SYMPTOM','2026-08-16','Sốt','SINU','fever'),
    ('BA-P2-11','NOTE','2026-08-16','Gợi ý phiếu Ch.17 SINU','Viêm xoang — CĐHA xoang trên phiếu nếu có.',NULL),
    ('BA-P2-12','SYMPTOM','2026-08-16','Sốt','UR','fever'),
    ('BA-P2-12','NOTE','2026-08-16','Gợi ý phiếu Ch.17 UR','UR = đường hô hấp trên. CẤM chọn CAUTI/UTI.',NULL),
    ('BA-P2-13','PROCEDURE_SURGERY','2026-08-12','Mổ lấy thai / sản (Day 1)','EMET','procedure_surgery'),
    ('BA-P2-13','SYMPTOM','2026-08-16','Sốt','EMET','fever'),
    ('BA-P2-13','SYMPTOM','2026-08-16','Đau bụng sau mổ sản','EMET','obgyn_abdominal_pain'),
    ('BA-P2-13','NOTE','2026-08-16','Gợi ý phiếu Ch.17 EMET','Chọn site EMET, không gộp SSI nông.',NULL),
    ('BA-P2-14','SYMPTOM','2026-08-16','Sốt','EPIS','fever'),
    ('BA-P2-14','SYMPTOM','2026-08-16','Chảy mủ tầng sinh môn','EPIS','purulent_drainage'),
    ('BA-P2-14','NOTE','2026-08-16','Gợi ý phiếu Ch.17 EPIS','Nhiễm trùng vết cắt tầng sinh môn — không phải SSI mổ bụng.',NULL),
    ('BA-P2-15','PROCEDURE_SURGERY','2026-08-12','Phẫu thuật sản phụ khoa (Day 1)','OREP','procedure_surgery'),
    ('BA-P2-15','SYMPTOM','2026-08-16','Sốt','OREP','fever'),
    ('BA-P2-15','SYMPTOM','2026-08-16','Đau bụng sau mổ sản','OREP','obgyn_abdominal_pain'),
    ('BA-P2-15','IMAGING_CHEST','2026-08-16','CĐHA ổ nhiễm chậu','OREP','abscess_imaging'),
    ('BA-P2-16','PROCEDURE_SURGERY','2026-08-12','Cắt tử cung / VHYS (Day 1)','VCUF','procedure_surgery'),
    ('BA-P2-16','SYMPTOM','2026-08-18','Sốt','VCUF','fever'),
    ('BA-P2-16','SYMPTOM','2026-08-18','Đau bụng sau mổ sản','VCUF','obgyn_abdominal_pain'),
    ('BA-P2-17','SYMPTOM','2026-08-16','Sốt','BRST','fever'),
    ('BA-P2-17','NOTE','2026-08-16','Gợi ý phiếu Ch.17 BRST','Áp xe / viêm vú — không gắn ngày mổ nên không đi nhánh SSI.',NULL),
    ('BA-P2-18','SYMPTOM','2026-08-16','Sốt','BURN','fever'),
    ('BA-P2-18','NOTE','2026-08-16','Gợi ý phiếu Ch.17 BURN','Nhiễm trùng vết bỏng.',NULL),
    ('BA-P2-19','SYMPTOM','2026-08-16','Sốt','DECU','fever'),
    ('BA-P2-19','NOTE','2026-08-16','Gợi ý phiếu Ch.17 DECU','Loét tỳ đè nhiễm trùng.',NULL),
    ('BA-P2-20','SYMPTOM','2026-08-16','Sốt','SKIN','fever'),
    ('BA-P2-20','NOTE','2026-08-16','Gợi ý phiếu Ch.17 SKIN','Nhiễm trùng da nông.',NULL),
    ('BA-P2-21','SYMPTOM','2026-08-16','Sốt','ST','fever'),
    ('BA-P2-21','NOTE','2026-08-16','Gợi ý phiếu Ch.17 ST','Nhiễm trùng mô mềm sâu (không phải SSI).',NULL),
    ('BA-P2-22','SYMPTOM','2026-08-16','Sốt','USI','fever'),
    ('BA-P2-22','IMAGING_CHEST','2026-08-16','CĐHA ổ nhiễm thận / khoang tiết niệu','USI','abscess_imaging'),
    ('BA-P2-22','NOTE','2026-08-16','Gợi ý phiếu Ch.17 USI','USI ≠ UTI. Không có cấy nước tiểu — CẤM CAUTI.',NULL),
    -- Tiêu chí sâu / loại trừ
    ('BA-P2-23','SYMPTOM','2026-08-16','Sốt','MBI-LCBI','fever'),
    ('BA-P2-23','NOTE','2026-08-16','Tích trên phiếu BSI (MBI)','Tích giảm bạch cầu (neutropenia) + tiêu chảy nặng MBI. Tác nhân ruột (E.coli).',NULL),
    ('BA-P2-24','IMAGING_CHEST','2026-08-16','X-quang phổi mới','PNU2','imaging_chest'),
    ('BA-P2-24','SYMPTOM','2026-08-16','Sốt','PNU2','fever'),
    ('BA-P2-24','SYMPTOM','2026-08-16','Ho','PNU2','cough'),
    ('BA-P2-24','SYMPTOM','2026-08-16','Đờm mủ mới','PNU2','new_purulent_sputum'),
    ('BA-P2-25','IMAGING_CHEST','2026-08-16','X-quang phổi mới','PNU3','imaging_chest'),
    ('BA-P2-25','SYMPTOM','2026-08-16','Sốt','PNU3','fever'),
    ('BA-P2-25','SYMPTOM','2026-08-16','Ho','PNU3','cough'),
    ('BA-P2-25','NOTE','2026-08-16','Tích trên phiếu HAP/PNU3','Tích ho ra máu (hemoptysis) và/hoặc đau ngực kiểu màng phổi. Legionella kháng nguyên NT.',NULL),
    ('BA-P2-26','SYMPTOM','2026-08-16','Sốt','EXCL-yeast-urine','fever'),
    ('BA-P2-26','NOTE','2026-08-16','Kỳ vọng loại trừ','Nấm men nước tiểu — không đạt SUTI/CAUTI. Không biến thành USI.',NULL),
    ('BA-P2-27','SYMPTOM','2026-08-16','Sốt','EXCL-gt2-spp','fever'),
    ('BA-P2-27','NOTE','2026-08-16','Kỳ vọng loại trừ','Một cấy NT >2 loài — không dùng cho UTI.',NULL),
    ('BA-P2-28','SYMPTOM','2026-08-16','Sốt','EXCL-community-fungus','fever'),
    ('BA-P2-28','NOTE','2026-08-16','Kỳ vọng loại trừ LCBI','Cryptococcus (nấm cộng đồng) — không báo LCBI/CLABSI.',NULL),
    ('BA-P2-29','IMAGING_CHEST','2026-08-16','X-quang phổi mới','EXCL-oral-flora','imaging_chest'),
    ('BA-P2-29','SYMPTOM','2026-08-16','Sốt','EXCL-oral-flora','fever'),
    ('BA-P2-29','SYMPTOM','2026-08-16','Ho','EXCL-oral-flora','cough'),
    ('BA-P2-29','NOTE','2026-08-16','Kỳ vọng loại trừ PNEU','Flora miệng trên đờm — không đủ PNU2.',NULL),
    ('BA-P2-30','SYMPTOM','2026-08-16','Sốt','Foley-DOE-1','fever'),
    ('BA-P2-30','SYMPTOM','2026-08-16','Đau trên xương mu','Foley-DOE-1','suprapubic_pain'),
    ('BA-P2-30','NOTE','2026-08-16','Kỳ vọng CAUTI','Foley có ngày 15 (DOE−1), rút ngày 16 (DOE). Vẫn CAUTI.',NULL),
    ('BA-P2-31','SYMPTOM','2026-08-16','Sốt','Foley-DOE-2','fever'),
    ('BA-P2-31','SYMPTOM','2026-08-16','Đái buốt','Foley-DOE-2','dysuria'),
    ('BA-P2-31','NOTE','2026-08-16','Kỳ vọng SUTI không CAUTI','Foley rút 14 (DOE−2). Không còn thiết bị DOE/DOE−1.',NULL),
    ('BA-P2-32','SYMPTOM','2026-08-16','Sốt','Transfer-DOE','fever'),
    ('BA-P2-32','SYMPTOM','2026-08-16','Đau trên xương mu','Transfer-DOE','suprapubic_pain'),
    ('BA-P2-32','NOTE','2026-08-16','Quy kết khoa chuyển đi','DOE = ngày chuyển HSN→Thận. Gán khoa chuyển đi (A27).',NULL),
    ('BA-P2-33','SYMPTOM','2026-08-16','Sốt','ENDO-2blood','fever'),
    ('BA-P2-33','NOTE','2026-08-16','Gợi ý phiếu Ch.17 ENDO','≥2 cấy máu S.aureus ≤1 ngày + tích Echo/TEE điển hình. Cửa sổ ENDO đặc biệt.',NULL),
    ('BA-P2-34','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-PATOS','procedure_surgery'),
    ('BA-P2-34','SYMPTOM','2026-08-12','Vết mổ chảy mủ (có sẵn lúc mổ)','SSI-PATOS','purulent_drainage'),
    ('BA-P2-34','NOTE','2026-08-12','Tích PATOS trên phiếu SSI','Nhiễm đã có lúc mổ — không báo SSI HAI.',NULL),
    ('BA-P2-35','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-dehiscence','procedure_surgery'),
    ('BA-P2-35','SYMPTOM','2026-08-18','Sốt','SSI-dehiscence','fever'),
    ('BA-P2-35','SYMPTOM','2026-08-18','Bục / mở vết mổ sâu','SSI-dehiscence','wound_opened'),
    ('BA-P2-35','NOTE','2026-08-18','Tích SSI sâu (dehiscence)','Tích bục/mở sâu + sốt trên phiếu SIS.',NULL),
    ('BA-P2-36','PROCEDURE_SURGERY','2026-06-01','PT khớp nhân tạo (cửa sổ 90 ngày)','SSI-90d','procedure_surgery'),
    ('BA-P2-36','SYMPTOM','2026-08-18','Vết mổ chảy mủ','SSI-90d','purulent_drainage'),
    ('BA-P2-36','NOTE','2026-08-18','Cửa sổ 90 ngày implant','Mổ 01/06, nhiễm 18/08 — trong 90 ngày. Tích mã PT NHSN có implant.',NULL),
    ('BA-P2-37','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','SSI-SBSI','procedure_surgery'),
    ('BA-P2-37','SYMPTOM','2026-08-18','Vết mổ chảy mủ','SSI-SBSI','purulent_drainage'),
    ('BA-P2-37','NOTE','2026-08-18','SSI + secondary BSI','Cùng E.coli vết mổ và máu trong cửa sổ SBAP.',NULL),
    ('BA-P2-38','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','VAE-PEEP','fever_or_wbc'),
    ('BA-P2-38','SYMPTOM','2026-08-16','Khí máu xấu đi','VAE-PEEP','worsening_gas'),
    ('BA-P2-38','NOTE','2026-08-16','Chép PEEP/FiO2 vào phiếu VAE','10–13/08: PEEP 5 FiO2 0.40; 14–17/08: PEEP 8 FiO2 0.60 (đủ VAC). Không dùng XQ cho VAE.',NULL),
    ('BA-P2-39','SYMPTOM','2026-08-16','Sốt','Two-sites','fever'),
    ('BA-P2-39','SYMPTOM','2026-08-16','Đau trên xương mu','Two-sites','suprapubic_pain'),
    ('BA-P2-39','IMAGING_CHEST','2026-08-16','X-quang phổi mới','Two-sites','imaging_chest'),
    ('BA-P2-39','SYMPTOM','2026-08-16','Ho','Two-sites','cough'),
    ('BA-P2-39','NOTE','2026-08-16','Hai site cùng đợt điều trị','Mở 2 phiếu: UTI (CAUTI) và HAP. Không gộp một loại.',NULL),
    ('BA-P2-40','SYMPTOM','2026-08-16','Sốt','BLOOD-NCT','fever'),
    ('BA-P2-40','SYMPTOM','2026-08-16','Ớn lạnh','BLOOD-NCT','chills'),
    ('BA-P2-40','NOTE','2026-08-16','NCT máu ≠ cấy','PCR máu — kiểm tra engine có chấp nhận LCBI hay loại.',NULL),
    ('BA-P2-41','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','EXCL-candida-ETA','fever_or_wbc'),
    ('BA-P2-41','SYMPTOM','2026-08-16','Khí máu xấu đi','EXCL-candida-ETA','worsening_gas'),
    ('BA-P2-41','NOTE','2026-08-16','Kỳ vọng không PVAP','Candida trên ETA — không đủ PVAP.',NULL),
    ('BA-P2-42','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','Vent-short','fever_or_wbc'),
    ('BA-P2-42','NOTE','2026-08-16','Thở máy < 3 ngày lịch','Chỉ 15–16/08 — không đủ cửa sổ VAE.',NULL),
    ('BA-P2-43','PROCEDURE_SURGERY','2026-08-12','Ngày phẫu thuật (Day 1 SSI)','EXCL-stitch','procedure_surgery'),
    ('BA-P2-43','NOTE','2026-08-16','Kỳ vọng loại trừ SSI','Chỉ áp xe chỉ khâu (stitch abscess) — không báo SSI.',NULL),
    ('BA-P2-44','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','EXCL-ECMO','fever_or_wbc'),
    ('BA-P2-44','SYMPTOM','2026-08-16','Khí máu xấu đi','EXCL-ECMO','worsening_gas'),
    ('BA-P2-44','NOTE','2026-08-16','Kỳ vọng loại trừ VAE','Tích ECMO trên phiếu — loại trừ VAE.',NULL),
    ('BA-P2-45','SYMPTOM','2026-08-16','Sốt hoặc BC tăng','IVAC-QAD','fever_or_wbc'),
    ('BA-P2-45','SYMPTOM','2026-08-16','Khí máu xấu đi','IVAC-QAD','worsening_gas'),
    ('BA-P2-45','NOTE','2026-08-16','Chép QAD kháng sinh vào phiếu','Kháng sinh mới 16–19/08 (≥4 ngày) sau VAC — đủ nhánh IVAC.',NULL)
) AS t(ma, kind, d, title, muc, key); -- key: text; NOTE dùng NULL

COMMIT;

-- Gói 2 (mã BA-P2-):
-- 01 DISC · 02 JNT · 03 IC · 04 SA · 05 CARD · 06 MED
-- 07 CONJ · 08 EAR · 09 EYE · 10 ORAL · 11 SINU · 12 UR (≠ UTI)
-- 13 EMET · 14 EPIS · 15 OREP · 16 VCUF · 17 BRST
-- 18 BURN · 19 DECU · 20 SKIN · 21 ST · 22 USI (≠ CAUTI)
-- 23 MBI-LCBI · 24 PNU2 · 25 PNU3
-- 26 nấm NT loại trừ · 27 >2 loài NT · 28 Cryptococcus máu · 29 flora miệng đờm
-- 30 Foley DOE−1 vẫn CAUTI · 31 Foley DOE−2 → SUTI · 32 chuyển khoa đúng DOE
-- 33 ENDO 2 máu · 34 SSI PATOS · 35 SSI bục sâu · 36 SSI 90 ngày implant · 37 SSI + BSI thứ phát
-- 38 VAE PEEP (chép phiếu) · 39 hai site · 40 NCT máu · 41 Candida ETA
-- 42 thở máy ngắn · 43 stitch abscess · 44 ECMO · 45 IVAC QAD (chép phiếu)
