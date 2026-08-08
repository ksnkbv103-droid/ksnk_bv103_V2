-- NKBV fact wipe + seed 30 BA demo.
-- Confirmed: NKBV fact tables only + ksnk-bv103-prod + rollback acknowledged.
-- Keeps nkbv_dm_* and all non-NKBV modules.

BEGIN;

DELETE FROM public.nkbv_fact_labid_event;
DELETE FROM public.nkbv_fact_su_kien;
DELETE FROM public.nkbv_fact_ba_timeline;
DELETE FROM public.nkbv_fact_device_registry;
DELETE FROM public.nkbv_fact_vi_sinh;
DELETE FROM public.nkbv_fact_mau_so_daily;
DELETE FROM public.nkbv_fact_mau_so_phau_thuat;
DELETE FROM public.nkbv_fact_benh_an;

-- ===== 30 bệnh án =====
INSERT INTO public.nkbv_fact_benh_an (
  ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh,
  ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, is_active
) VALUES
('BA-DEMO-01','PID-D01','Nguyễn Văn An','1968-03-12','Nam','2026-07-20 02:00:00+00',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-DEMO-02','PID-D02','Trần Thị Bình','1975-08-01','Nữ','2026-07-22 03:00:00+00',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true),
('BA-DEMO-03','PID-D03','Lê Văn Cường','1959-11-20','Nam','2026-07-18 01:00:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-04','PID-D04','Phạm Thị Dung','1982-05-09','Nữ','2026-07-25 04:00:00+00',NULL,'b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c',true),
('BA-DEMO-05','PID-D05','Hoàng Văn Em','1970-01-15','Nam','2026-07-15 02:30:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-06','PID-D06','Võ Thị Phương','1965-09-30','Nữ','2026-07-16 05:00:00+00',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-DEMO-07','PID-D07','Đặng Văn Giang','1955-12-02','Nam','2026-07-10 01:00:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-08','PID-D08','Bùi Thị Hoa','1962-07-18','Nữ','2026-07-12 02:00:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-09','PID-D09','Ngô Văn Hùng','1958-04-22','Nam','2026-07-11 03:00:00+00',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-DEMO-10','PID-D10','Đỗ Thị Lan','1978-02-28','Nữ','2026-07-21 06:00:00+00',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-DEMO-11','PID-D11','Lý Văn Minh','1960-06-14','Nam','2026-07-08 01:00:00+00',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-DEMO-12','PID-D12','Mai Thị Nga','1969-10-05','Nữ','2026-07-09 02:00:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-13','PID-D13','Phan Văn Oanh','1972-03-03','Nam','2026-07-05 01:00:00+00',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-DEMO-14','PID-D14','Trịnh Thị Phúc','1980-08-17','Nữ','2026-07-06 04:00:00+00',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-DEMO-15','PID-D15','Hồ Văn Quang','1966-01-25','Nam','2026-06-20 02:00:00+00','2026-07-28 08:00:00+00','048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-DEMO-16','PID-D16','Châu Thị Rạng','1974-12-11','Nữ','2026-07-14 03:00:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-17','PID-D17','Tô Văn Sơn','1957-05-19','Nam','2026-07-19 01:00:00+00',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-DEMO-18','PID-D18','Nguyễn Bé Tâm','2025-09-01','Nam','2026-07-24 05:00:00+00',NULL,'84ae0898-b572-4533-8bfd-4df56c474122',true),
('BA-DEMO-19','PID-D19','Lương Văn Uy','1963-07-07','Nam','2026-07-13 02:00:00+00',NULL,'423d75da-99cf-41b0-9c48-26e630b369b4',true),
('BA-DEMO-20','PID-D20','Kiều Thị Vân','1971-09-13','Nữ','2026-07-17 03:00:00+00',NULL,'dcd020a3-37ed-4d80-bf2f-ffaccbbf1948',true),
('BA-DEMO-21','PID-D21','Ông Văn Xuân','1964-11-08','Nam','2026-07-07 01:00:00+00',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true),
('BA-DEMO-22','PID-D22','Yến Thị Ánh','1985-04-04','Nữ','2026-07-23 04:00:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-23','PID-D23','Ấn Văn Bảo','1956-02-16','Nam','2026-07-12 06:00:00+00',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-DEMO-24','PID-D24','Cát Thị Châu','1977-06-21','Nữ','2026-07-04 02:00:00+00',NULL,'048dd4f9-b84e-44a3-9813-0b7f8090b564',true),
('BA-DEMO-25','PID-D25','Dương Văn Đạt','1961-08-29','Nam','2026-07-26 01:00:00+00',NULL,'c895038b-e242-43bc-a868-e17865308dac',true),
('BA-DEMO-26','PID-D26','Ếch Thị Yến','1973-10-10','Nữ','2026-07-10 03:00:00+00',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true),
('BA-DEMO-27','PID-D27','Giang Văn Hợi','1954-12-25','Nam','2026-07-01 01:00:00+00',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true),
('BA-DEMO-28','PID-D28','Hồng Thị Ích','1979-03-14','Nữ','2026-07-02 02:00:00+00','2026-07-27 09:00:00+00','13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true),
('BA-DEMO-29','PID-D29','Khang Văn Lộc','1967-07-31','Nam','2026-07-18 05:00:00+00',NULL,'b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c',true),
('BA-DEMO-30','PID-D30','Liễu Thị My','1981-01-09','Nữ','2026-07-20 07:00:00+00',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true);

-- ===== Device registry =====
INSERT INTO public.nkbv_fact_device_registry (
  ma_benh_an, ma_benh_nhan, device_type, insertion_date, removal_date, khoa_id, is_active, metadata
) VALUES
('BA-DEMO-01','PID-D01','FOLEY','2026-07-20',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true,'{}'),
('BA-DEMO-02','PID-D02','FOLEY','2026-07-22',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true,'{}'),
('BA-DEMO-03','PID-D03','FOLEY','2026-07-18',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-03','PID-D03','CENTRAL_LINE','2026-07-18',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-05','PID-D05','CENTRAL_LINE','2026-07-15',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-06','PID-D06','CENTRAL_LINE','2026-07-16',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true,'{}'),
('BA-DEMO-07','PID-D07','FOLEY','2026-07-10',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-07','PID-D07','CENTRAL_LINE','2026-07-10',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-08','PID-D08','VENTILATOR','2026-07-12',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-09','PID-D09','VENTILATOR','2026-07-11','2026-07-20','c895038b-e242-43bc-a868-e17865308dac',true,'{}'),
('BA-DEMO-11','PID-D11','VENTILATOR','2026-07-08',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true,'{}'),
('BA-DEMO-12','PID-D12','VENTILATOR','2026-07-09',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-12','PID-D12','CENTRAL_LINE','2026-07-09',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-16','PID-D16','FOLEY','2026-07-14',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-16','PID-D16','VENTILATOR','2026-07-14',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-16','PID-D16','CENTRAL_LINE','2026-07-14',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-17','PID-D17','FOLEY','2026-07-19',NULL,'13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true,'{}'),
('BA-DEMO-19','PID-D19','CENTRAL_LINE','2026-07-13',NULL,'423d75da-99cf-41b0-9c48-26e630b369b4',true,'{}'),
('BA-DEMO-19','PID-D19','FOLEY','2026-07-13',NULL,'423d75da-99cf-41b0-9c48-26e630b369b4',true,'{}'),
('BA-DEMO-21','PID-D21','FOLEY','2026-07-07',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true,'{}'),
('BA-DEMO-23','PID-D23','VENTILATOR','2026-07-12',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true,'{}'),
('BA-DEMO-26','PID-D26','VENTILATOR','2026-07-10',NULL,'8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',true,'{}'),
('BA-DEMO-27','PID-D27','VENTILATOR','2026-07-01',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true,'{}'),
('BA-DEMO-27','PID-D27','FOLEY','2026-07-01',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true,'{}'),
('BA-DEMO-27','PID-D27','CENTRAL_LINE','2026-07-01',NULL,'4c4f101c-e714-4f72-9910-db46becae2bc',true,'{}'),
('BA-DEMO-28','PID-D28','FOLEY','2026-07-02','2026-07-26','13f9a000-fa4d-4a47-95f5-ac0a2c436aa6',true,'{}'),
('BA-DEMO-30','PID-D30','FOLEY','2026-07-20',NULL,'fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb',true,'{}');

-- ===== Vi sinh (+) đa dạng =====
INSERT INTO public.nkbv_fact_vi_sinh (
  ma_benh_nhan, ma_benh_an, ho_ten_benh_nhan, ngay_sinh, gioi_tinh, ngay_vao_vien,
  ngay_lay_mau, khoa_yeu_cau_id, loai_benh_pham, tac_nhan, so_luong,
  ket_qua_duong_tinh, ket_qua_phan_loai, ma_xet_nghiem, is_active, is_mdro, mdro_phenotype, mdro_source, metadata
) VALUES
-- 01: 1 urine
('PID-D01','BA-DEMO-01','Nguyễn Văn An','1968-03-12','Nam','2026-07-20 02:00:00+00','2026-07-23 08:00:00+00','13f9a000-fa4d-4a47-95f5-ac0a2c436aa6','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D01-U1',true,false,NULL,NULL,'{}'),
-- 02: 2 urine same day
('PID-D02','BA-DEMO-02','Trần Thị Bình','1975-08-01','Nữ','2026-07-22 03:00:00+00','2026-07-25 09:00:00+00','fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb','Nước tiểu','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-D02-U1',true,false,NULL,NULL,'{}'),
('PID-D02','BA-DEMO-02','Trần Thị Bình','1975-08-01','Nữ','2026-07-22 03:00:00+00','2026-07-25 14:00:00+00','fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb','Nước tiểu','Enterococcus faecalis','10^5 CFU/ml',true,'DUONG_TINH','XN-D02-U2',true,false,NULL,NULL,'{}'),
-- 03: urine Index (22/7) + blood SBAP cùng ngày + urine RIT lặp (25/7, trong DOE→DOE+13)
('PID-D03','BA-DEMO-03','Lê Văn Cường','1959-11-20','Nam','2026-07-18 01:00:00+00','2026-07-22 10:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D03-U1',true,false,NULL,NULL,'{}'),
('PID-D03','BA-DEMO-03','Lê Văn Cường','1959-11-20','Nam','2026-07-18 01:00:00+00','2026-07-22 11:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Escherichia coli',NULL,true,'DUONG_TINH','XN-D03-B1',true,false,NULL,NULL,'{}'),
('PID-D03','BA-DEMO-03','Lê Văn Cường','1959-11-20','Nam','2026-07-18 01:00:00+00','2026-07-25 09:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D03-U2',true,false,NULL,NULL,'{}'),
-- 04: 1 urine no foley
('PID-D04','BA-DEMO-04','Phạm Thị Dung','1982-05-09','Nữ','2026-07-25 04:00:00+00','2026-07-28 08:00:00+00','b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c','Nước tiểu','Proteus mirabilis','10^5 CFU/ml',true,'DUONG_TINH','XN-D04-U1',true,false,NULL,NULL,'{}'),
-- 05: 1 blood
('PID-D05','BA-DEMO-05','Hoàng Văn Em','1970-01-15','Nam','2026-07-15 02:30:00+00','2026-07-19 07:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-D05-B1',true,false,NULL,NULL,'{}'),
-- 06: 3 blood
('PID-D06','BA-DEMO-06','Võ Thị Phương','1965-09-30','Nữ','2026-07-16 05:00:00+00','2026-07-20 08:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Máu','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-D06-B1',true,false,NULL,NULL,'{}'),
('PID-D06','BA-DEMO-06','Võ Thị Phương','1965-09-30','Nữ','2026-07-16 05:00:00+00','2026-07-20 12:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Máu','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-D06-B2',true,false,NULL,NULL,'{}'),
('PID-D06','BA-DEMO-06','Võ Thị Phương','1965-09-30','Nữ','2026-07-16 05:00:00+00','2026-07-21 09:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Máu','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-D06-B3',true,false,NULL,NULL,'{}'),
-- 07: urine then blood later
('PID-D07','BA-DEMO-07','Đặng Văn Giang','1955-12-02','Nam','2026-07-10 01:00:00+00','2026-07-14 08:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Nước tiểu','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-D07-U1',true,false,NULL,NULL,'{}'),
('PID-D07','BA-DEMO-07','Đặng Văn Giang','1955-12-02','Nam','2026-07-10 01:00:00+00','2026-07-16 10:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-D07-B1',true,false,NULL,NULL,'{}'),
-- 08: sputum
('PID-D08','BA-DEMO-08','Bùi Thị Hoa','1962-07-18','Nữ','2026-07-12 02:00:00+00','2026-07-16 09:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Đờm','Acinetobacter baumannii',NULL,true,'DUONG_TINH','XN-D08-S1',true,false,NULL,NULL,'{}'),
-- 09: sputum
('PID-D09','BA-DEMO-09','Ngô Văn Hùng','1958-04-22','Nam','2026-07-11 03:00:00+00','2026-07-15 08:00:00+00','c895038b-e242-43bc-a868-e17865308dac','Đờm','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-D09-S1',true,false,NULL,NULL,'{}'),
-- 10: sputum HAP
('PID-D10','BA-DEMO-10','Đỗ Thị Lan','1978-02-28','Nữ','2026-07-21 06:00:00+00','2026-07-25 07:00:00+00','c895038b-e242-43bc-a868-e17865308dac','Đờm','Streptococcus pneumoniae',NULL,true,'DUONG_TINH','XN-D10-S1',true,false,NULL,NULL,'{}'),
-- 11: ETA
('PID-D11','BA-DEMO-11','Lý Văn Minh','1960-06-14','Nam','2026-07-08 01:00:00+00','2026-07-14 08:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Dịch hút nội khí quản','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-D11-E1',true,false,NULL,NULL,'{}'),
-- 12: ETA + blood
('PID-D12','BA-DEMO-12','Mai Thị Nga','1969-10-05','Nữ','2026-07-09 02:00:00+00','2026-07-15 09:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Dịch hút nội khí quản','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-D12-E1',true,false,NULL,NULL,'{}'),
('PID-D12','BA-DEMO-12','Mai Thị Nga','1969-10-05','Nữ','2026-07-09 02:00:00+00','2026-07-16 10:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-D12-B1',true,false,NULL,NULL,'{}'),
-- 13: wound
('PID-D13','BA-DEMO-13','Phan Văn Oanh','1972-03-03','Nam','2026-07-05 01:00:00+00','2026-07-12 08:00:00+00','048dd4f9-b84e-44a3-9813-0b7f8090b564','Dịch vết mổ','Escherichia coli',NULL,true,'DUONG_TINH','XN-D13-W1',true,false,NULL,NULL,'{}'),
-- 14: wound
('PID-D14','BA-DEMO-14','Trịnh Thị Phúc','1980-08-17','Nữ','2026-07-06 04:00:00+00','2026-07-14 09:00:00+00','048dd4f9-b84e-44a3-9813-0b7f8090b564','Dịch vết mổ','Staphylococcus aureus',NULL,true,'DUONG_TINH','XN-D14-W1',true,false,NULL,NULL,'{}'),
-- 15: wound late
('PID-D15','BA-DEMO-15','Hồ Văn Quang','1966-01-25','Nam','2026-06-20 02:00:00+00','2026-07-10 08:00:00+00','048dd4f9-b84e-44a3-9813-0b7f8090b564','Dịch vết mổ','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-D15-W1',true,false,NULL,NULL,'{}'),
-- 16: multi specimen same BA
('PID-D16','BA-DEMO-16','Châu Thị Rạng','1974-12-11','Nữ','2026-07-14 03:00:00+00','2026-07-18 08:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D16-U1',true,false,NULL,NULL,'{}'),
('PID-D16','BA-DEMO-16','Châu Thị Rạng','1974-12-11','Nữ','2026-07-14 03:00:00+00','2026-07-18 09:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Đờm','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-D16-S1',true,false,NULL,NULL,'{}'),
('PID-D16','BA-DEMO-16','Châu Thị Rạng','1974-12-11','Nữ','2026-07-14 03:00:00+00','2026-07-19 10:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-D16-B1',true,false,NULL,NULL,'{}'),
-- 17: MDRO urine
('PID-D17','BA-DEMO-17','Tô Văn Sơn','1957-05-19','Nam','2026-07-19 01:00:00+00','2026-07-23 08:00:00+00','13f9a000-fa4d-4a47-95f5-ac0a2c436aa6','Nước tiểu','Klebsiella pneumoniae CRE','10^5 CFU/ml',true,'DUONG_TINH','XN-D17-U1',true,true,'CRE','LIS','{}'),
-- 18: infant urine
('PID-D18','BA-DEMO-18','Nguyễn Bé Tâm','2025-09-01','Nam','2026-07-24 05:00:00+00','2026-07-27 08:00:00+00','84ae0898-b572-4533-8bfd-4df56c474122','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D18-U1',true,false,NULL,NULL,'{}'),
-- 19: blood
('PID-D19','BA-DEMO-19','Lương Văn Uy','1963-07-07','Nam','2026-07-13 02:00:00+00','2026-07-17 07:00:00+00','423d75da-99cf-41b0-9c48-26e630b369b4','Máu','Candida albicans',NULL,true,'DUONG_TINH','XN-D19-B1',true,false,NULL,NULL,'{}'),
-- 20: sputum
('PID-D20','BA-DEMO-20','Kiều Thị Vân','1971-09-13','Nữ','2026-07-17 03:00:00+00','2026-07-21 08:00:00+00','dcd020a3-37ed-4d80-bf2f-ffaccbbf1948','Đờm','Haemophilus influenzae',NULL,true,'DUONG_TINH','XN-D20-S1',true,false,NULL,NULL,'{}'),
-- 21: 3 urine different days
('PID-D21','BA-DEMO-21','Ông Văn Xuân','1964-11-08','Nam','2026-07-07 01:00:00+00','2026-07-11 08:00:00+00','fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D21-U1',true,false,NULL,NULL,'{}'),
('PID-D21','BA-DEMO-21','Ông Văn Xuân','1964-11-08','Nam','2026-07-07 01:00:00+00','2026-07-18 08:00:00+00','fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D21-U2',true,false,NULL,NULL,'{}'),
('PID-D21','BA-DEMO-21','Ông Văn Xuân','1964-11-08','Nam','2026-07-07 01:00:00+00','2026-07-25 08:00:00+00','fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb','Nước tiểu','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-D21-U3',true,false,NULL,NULL,'{}'),
-- 22: 2 blood CoNS
('PID-D22','BA-DEMO-22','Yến Thị Ánh','1985-04-04','Nữ','2026-07-23 04:00:00+00','2026-07-26 08:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Staphylococcus epidermidis',NULL,true,'DUONG_TINH','XN-D22-B1',true,false,NULL,NULL,'{}'),
('PID-D22','BA-DEMO-22','Yến Thị Ánh','1985-04-04','Nữ','2026-07-23 04:00:00+00','2026-07-26 14:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Staphylococcus epidermidis',NULL,true,'DUONG_TINH','XN-D22-B2',true,false,NULL,NULL,'{}'),
-- 23: BAL + sputum same day
('PID-D23','BA-DEMO-23','Ấn Văn Bảo','1956-02-16','Nam','2026-07-12 06:00:00+00','2026-07-16 08:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','BAL','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-D23-BAL',true,false,NULL,NULL,'{}'),
('PID-D23','BA-DEMO-23','Ấn Văn Bảo','1956-02-16','Nam','2026-07-12 06:00:00+00','2026-07-16 09:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Đờm','Pseudomonas aeruginosa',NULL,true,'DUONG_TINH','XN-D23-S1',true,false,NULL,NULL,'{}'),
-- 26: multi resp
('PID-D26','BA-DEMO-26','Ếch Thị Yến','1973-10-10','Nữ','2026-07-10 03:00:00+00','2026-07-14 08:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Đờm','Acinetobacter baumannii',NULL,true,'DUONG_TINH','XN-D26-S1',true,false,NULL,NULL,'{}'),
('PID-D26','BA-DEMO-26','Ếch Thị Yến','1973-10-10','Nữ','2026-07-10 03:00:00+00','2026-07-15 08:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Dịch hút nội khí quản','Acinetobacter baumannii',NULL,true,'DUONG_TINH','XN-D26-E1',true,false,NULL,NULL,'{}'),
('PID-D26','BA-DEMO-26','Ếch Thị Yến','1973-10-10','Nữ','2026-07-10 03:00:00+00','2026-07-16 08:00:00+00','8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','Máu','Acinetobacter baumannii',NULL,true,'DUONG_TINH','XN-D26-B1',true,false,NULL,NULL,'{}'),
-- 27: blood + urine + sputum
('PID-D27','BA-DEMO-27','Giang Văn Hợi','1954-12-25','Nam','2026-07-01 01:00:00+00','2026-07-08 08:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Máu','Enterococcus faecium',NULL,true,'DUONG_TINH','XN-D27-B1',true,false,NULL,NULL,'{}'),
('PID-D27','BA-DEMO-27','Giang Văn Hợi','1954-12-25','Nam','2026-07-01 01:00:00+00','2026-07-09 08:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Nước tiểu','Enterococcus faecium','10^5 CFU/ml',true,'DUONG_TINH','XN-D27-U1',true,false,NULL,NULL,'{}'),
('PID-D27','BA-DEMO-27','Giang Văn Hợi','1954-12-25','Nam','2026-07-01 01:00:00+00','2026-07-10 08:00:00+00','4c4f101c-e714-4f72-9910-db46becae2bc','Đờm','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-D27-S1',true,false,NULL,NULL,'{}'),
-- 28: discharged UTI
('PID-D28','BA-DEMO-28','Hồng Thị Ích','1979-03-14','Nữ','2026-07-02 02:00:00+00','2026-07-08 08:00:00+00','13f9a000-fa4d-4a47-95f5-ac0a2c436aa6','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D28-U1',true,false,NULL,NULL,'{}'),
-- 29: blood + sputum
('PID-D29','BA-DEMO-29','Khang Văn Lộc','1967-07-31','Nam','2026-07-18 05:00:00+00','2026-07-22 08:00:00+00','b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c','Máu','Salmonella spp',NULL,true,'DUONG_TINH','XN-D29-B1',true,false,NULL,NULL,'{}'),
('PID-D29','BA-DEMO-29','Khang Văn Lộc','1967-07-31','Nam','2026-07-18 05:00:00+00','2026-07-22 09:00:00+00','b5a17d6b-4ad1-4a17-a0d1-5073fefbbb8c','Đờm','Klebsiella pneumoniae',NULL,true,'DUONG_TINH','XN-D29-S1',true,false,NULL,NULL,'{}'),
-- 30: 2 urine different days
('PID-D30','BA-DEMO-30','Liễu Thị My','1981-01-09','Nữ','2026-07-20 07:00:00+00','2026-07-23 08:00:00+00','fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb','Nước tiểu','Escherichia coli','10^5 CFU/ml',true,'DUONG_TINH','XN-D30-U1',true,false,NULL,NULL,'{}'),
('PID-D30','BA-DEMO-30','Liễu Thị My','1981-01-09','Nữ','2026-07-20 07:00:00+00','2026-07-27 08:00:00+00','fb63bd8f-d0ab-4001-a7d2-ab5a6e8043bb','Nước tiểu','Klebsiella pneumoniae','10^5 CFU/ml',true,'DUONG_TINH','XN-D30-U2',true,false,NULL,NULL,'{}');

-- ===== Timeline: CĐHA / TC SSI / ngày mổ =====
INSERT INTO public.nkbv_fact_ba_timeline (
  ma_benh_an, milestone_kind, milestone_date, title, detail, criteria_key, is_active, metadata
) VALUES
-- PNEU 1 XQ
('BA-DEMO-08','IMAGING_CHEST','2026-07-16','XQ ngực thâm nhiễm mới',NULL,'imaging_chest',true,'{}'),
-- PNEU ≥2 XQ
('BA-DEMO-09','IMAGING_CHEST','2026-07-14','XQ ngực ngày 1',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-09','IMAGING_CHEST','2026-07-15','XQ ngực ngày 2 tiến triển',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-09','IMAGING_CHEST','2026-07-16','CT ngực xác nhận',NULL,'imaging_chest',true,'{}'),
-- HAP 1 XQ
('BA-DEMO-10','IMAGING_CHEST','2026-07-25','XQ ngực thâm nhiễm',NULL,'imaging_chest',true,'{}'),
-- VAE/PNEU
('BA-DEMO-11','IMAGING_CHEST','2026-07-14','XQ ngực',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-12','IMAGING_CHEST','2026-07-15','XQ ngực',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-12','IMAGING_CHEST','2026-07-16','XQ ngực follow-up',NULL,'imaging_chest',true,'{}'),
-- SSI surgery + TC
('BA-DEMO-13','PROCEDURE_SURGERY','2026-07-06','Ngày phẫu thuật (Day 1 SP)',NULL,'procedure_surgery',true,'{}'),
('BA-DEMO-13','SYMPTOM','2026-07-12','Chảy mủ vết mổ',NULL,'purulent_drainage',true,'{}'),
('BA-DEMO-13','SYMPTOM','2026-07-12','Mở vết mổ',NULL,'wound_opened',true,'{}'),
('BA-DEMO-14','PROCEDURE_SURGERY','2026-07-07','Ngày phẫu thuật (Day 1 SP)',NULL,'procedure_surgery',true,'{}'),
('BA-DEMO-14','IMAGING_CHEST','2026-07-14','CĐHA áp xe',NULL,'abscess_imaging',true,'{}'),
('BA-DEMO-14','SYMPTOM','2026-07-14','Chảy mủ',NULL,'purulent_drainage',true,'{}'),
('BA-DEMO-15','PROCEDURE_SURGERY','2026-06-22','Ngày phẫu thuật có implant',NULL,'procedure_surgery',true,'{}'),
('BA-DEMO-15','SYMPTOM','2026-07-10','Chảy mủ sâu',NULL,'purulent_drainage',true,'{}'),
('BA-DEMO-24','PROCEDURE_SURGERY','2026-07-05','Ngày phẫu thuật',NULL,'procedure_surgery',true,'{}'),
('BA-DEMO-24','SYMPTOM','2026-07-11','Chảy mủ (không XN)',NULL,'purulent_drainage',true,'{}'),
-- chỉ 1 XQ không VS
('BA-DEMO-25','IMAGING_CHEST','2026-07-28','XQ ngực đơn độc',NULL,'imaging_chest',true,'{}'),
-- nhiều XQ
('BA-DEMO-26','IMAGING_CHEST','2026-07-14','XQ 1',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-26','IMAGING_CHEST','2026-07-15','XQ 2',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-26','IMAGING_CHEST','2026-07-16','CT ngực',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-20','IMAGING_CHEST','2026-07-21','XQ ngực sau mổ lồng ngực',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-23','IMAGING_CHEST','2026-07-16','XQ ngực',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-23','IMAGING_CHEST','2026-07-17','XQ ngực D+1',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-27','IMAGING_CHEST','2026-07-10','XQ ngực',NULL,'imaging_chest',true,'{}'),
('BA-DEMO-29','IMAGING_CHEST','2026-07-22','XQ ngực',NULL,'imaging_chest',true,'{}');

-- ===== Mẫu số daily (vài khoa) =====
INSERT INTO public.nkbv_fact_mau_so_daily (
  khoa_id, ngay_ghi_nhan, so_ngay_tho_may, so_ngay_catheter_cvc, so_ngay_sonde_tieu, so_ngay_dieu_tri, so_dot_tho_may_emv, metadata
) VALUES
('8cd1a9bc-7c88-4d68-b70a-ddb6f1381122','2026-07-25',12,10,8,40,2,'{"seed":"nkbv-demo-30"}'),
('4c4f101c-e714-4f72-9910-db46becae2bc','2026-07-25',15,9,7,35,3,'{"seed":"nkbv-demo-30"}'),
('c895038b-e242-43bc-a868-e17865308dac','2026-07-25',4,2,3,28,0,'{"seed":"nkbv-demo-30"}'),
('13f9a000-fa4d-4a47-95f5-ac0a2c436aa6','2026-07-25',0,1,10,30,0,'{"seed":"nkbv-demo-30"}'),
('048dd4f9-b84e-44a3-9813-0b7f8090b564','2026-07-25',1,2,4,25,0,'{"seed":"nkbv-demo-30"}');

INSERT INTO public.nkbv_fact_mau_so_phau_thuat (
  khoa_id, ngay_phau_thuat, ma_benh_nhan, ho_ten_benh_nhan, ten_phau_thuat, loai_phau_thuat_nhsn,
  phan_loai_vet_mo, co_dat_implant, thoi_gian_mo_phut, thoi_gian_nguong_nhsn, is_laparoscopic, expected_ssi_prob, is_active, metadata
) VALUES
('048dd4f9-b84e-44a3-9813-0b7f8090b564','2026-07-06','PID-D13','Phan Văn Oanh','Cắt ruột thừa','APPY','SACH_NHIEM',false,55,60,true,0.02,true,'{"seed":"nkbv-demo-30"}'),
('048dd4f9-b84e-44a3-9813-0b7f8090b564','2026-07-07','PID-D14','Trịnh Thị Phúc','Cắt đại tràng','COLO','NHIEM',false,180,180,false,0.05,true,'{"seed":"nkbv-demo-30"}'),
('048dd4f9-b84e-44a3-9813-0b7f8090b564','2026-06-22','PID-D15','Hồ Văn Quang','Thay khớp gối','KPRO','SACH',true,120,120,false,0.01,true,'{"seed":"nkbv-demo-30"}');

-- Không seed nkbv_fact_su_kien → tất cả XN (+) ở trạng thái Chưa PT (đúng luồng tạo phiếu muộn).

-- Chuẩn hóa bệnh phẩm CDC (loai_benh_pham_chuan) — giữ chuỗi LIS gốc trong loai_benh_pham
UPDATE public.nkbv_fact_vi_sinh SET loai_benh_pham_chuan = 'URINE'
WHERE ma_xet_nghiem LIKE 'XN-D%' AND loai_benh_pham ILIKE '%nước tiểu%';
UPDATE public.nkbv_fact_vi_sinh SET loai_benh_pham_chuan = 'BLOOD_CULTURE'
WHERE ma_xet_nghiem LIKE 'XN-D%' AND loai_benh_pham ILIKE '%máu%';
UPDATE public.nkbv_fact_vi_sinh SET loai_benh_pham_chuan = 'SPUTUM'
WHERE ma_xet_nghiem LIKE 'XN-D%' AND loai_benh_pham ILIKE '%đờm%';
UPDATE public.nkbv_fact_vi_sinh SET loai_benh_pham_chuan = 'ETA'
WHERE ma_xet_nghiem LIKE 'XN-D%' AND (
  loai_benh_pham ILIKE '%nội khí quản%' OR loai_benh_pham ILIKE '%hút khí%'
);
UPDATE public.nkbv_fact_vi_sinh SET loai_benh_pham_chuan = 'BAL'
WHERE ma_xet_nghiem LIKE 'XN-D%' AND upper(loai_benh_pham) LIKE '%BAL%';
UPDATE public.nkbv_fact_vi_sinh SET loai_benh_pham_chuan = 'SURGICAL_SITE_FLUID'
WHERE ma_xet_nghiem LIKE 'XN-D%' AND loai_benh_pham ILIKE '%vết mổ%';

COMMIT;
