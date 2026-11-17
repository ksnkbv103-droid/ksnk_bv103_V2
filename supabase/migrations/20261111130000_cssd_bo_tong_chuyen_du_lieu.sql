-- Lát S2 / plan C′ (PO đã duyệt, plan rippling-churning-flurry): chuyển dữ liệu một lần — dòng BOM của bộ con
-- tách nhiệt (vai_tro_tach ∈ CHIU_NHIET/KHONG_CHIU_NHIET) về bộ tổng; sổ kho trỏ con về tổng; đồng bộ bộ con.
-- Chỉ DML + khối DO kiểm bất biến; không tạo/đổi đối tượng schema. Idempotent (chạy lần 2 không đổi gì).
-- Áp trong MỘT giao dịch (psql -1). Bộ con KHONG_CHIU_NHIET_EO không đụng (G3).
--
-- Quyết định:
--   D1. Gộp trùng (bộ tổng, loại) active trong họ (không tính con EO): giữ dòng trên bộ tổng (nếu có, rồi
--       created_at, id), cộng so_luong các dòng kia vào, tắt các dòng kia (ghi chú «S2 gộp vào <id>»).
--       Tắt TRƯỚC rồi mới dời, vì guard (ii) chặn dời dòng active khi họ còn dòng cùng loại.
--   D2. Dời dòng: chỉ UPDATE bo_dung_cu_id của dòng đang nằm trên con CN/KCN (cả active lẫn không) → parent_bo_id.
--       Guard trg_cssd_bom_chi_tiet_guard_ho chỉ chặn dời VÀO con; dời con → tổng hợp lệ, không cần cờ bỏ qua.
--   D3. Biến động kho: sổ kho đã khóa theo (họ, loại) từ S1 và view hiệu lực cộng biến động cả họ, nên không cần
--       bút toán bù. Giao dịch nào còn trỏ con (prod có thể có) → UPDATE về tổng (trigger S1 cũng quy về tổng).
--       so_luong_thuc_te (view hiệu lực) = so_luong + biến động (họ, loại): không đổi khi họ không trùng loại;
--       nhóm trùng trước đây đếm biến động n lần → sau gộp đúng một lần (khẳng định dạng đã chỉnh).
--   D4. Họ hết điều kiện tách (đúng biểu thức v_can của core): quy trình chờ tiếp nhận (TIEP_NHAN, chưa tiếp nhận)
--       của bộ -CN active được trỏ về bộ tổng (bo_dung_cu_id + mã QR = ma_bo tổng) khi: bộ tổng active, không con
--       CN/KCN nào của họ có quy trình đang chạy, bộ tổng chưa có quy trình active, mã tổng chưa bị quy trình active
--       khác dùng. Còn lại để core vô hiệu như thường.
--   D5. Gọi fn_cssd_dong_bo_tach_nhiet_core(tổng, false) cho mọi bộ tổng có con CN/KCN.
--   D6. Quy trình kẹt trên bộ tổng còn con active: chỉ RAISE NOTICE (SQL ở cuối file), không sửa.
--   D7. Tồn «trong bộ» theo loại (realtime, bộ active) KHÔNG giữ nguyên tuyệt đối: dòng trên con đã tắt (vd UAT
--       B99.SET.99) nay nằm trên bộ tổng active nên được tính. Khẳng định: sau = phần ngoài họ (trước) + Σ thực tế
--       view hiệu lực của họ có bộ tổng active (trước, không tính dòng con EO); báo chênh lệch thô bằng NOTICE.

-- Exclusion quy trình là DEFERRABLE INITIALLY DEFERRED: kiểm ngay từng lệnh, không để vỡ lúc COMMIT.
SET CONSTRAINTS ALL IMMEDIATE;

-- 0. Ảnh chụp trước --------------------------------------------------------------------------------------------
CREATE TEMP TABLE s2_ho ON COMMIT DROP AS
SELECT t.id AS tong_id, t.ma_bo, t.is_active IS TRUE AS tong_active
  FROM public.cssd_dm_bo_dung_cu t
 WHERE t.parent_bo_id IS NULL
   AND EXISTS (SELECT 1 FROM public.cssd_dm_bo_dung_cu k
                WHERE k.parent_bo_id = t.id AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET'));

CREATE TEMP TABLE s2_truoc ON COMMIT DROP AS
SELECT (SELECT count(*) FROM public.cssd_dm_bo_dung_cu_chi_tiet) AS tong_dong;

-- Σ so_luong active theo (bộ tổng, loại); loại NULL gom chung một khóa.
CREATE TEMP TABLE s2_sl_truoc ON COMMIT DROP AS
SELECT COALESCE(b.parent_bo_id, b.id) AS tong_id, c.loai_dung_cu_id, sum(c.so_luong)::bigint AS s
  FROM public.cssd_dm_bo_dung_cu_chi_tiet c
  JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
 WHERE c.is_active
 GROUP BY 1, 2;

-- Σ thực tế (view hiệu lực, hàng bộ tổng) + số dòng nguồn theo (tổng, loại) để chỉnh nhóm trùng.
CREATE TEMP TABLE s2_tt_truoc ON COMMIT DROP AS
SELECT v.bo_tong_id AS tong_id, v.loai_dung_cu_id, sum(v.so_luong_thuc_te)::bigint AS s,
       sum(v.so_luong)::bigint AS sl, count(*) AS n
  FROM public.v_cssd_bo_thanh_phan_hieu_luc v
 WHERE v.bo_dung_cu_id = v.bo_tong_id
 GROUP BY 1, 2;

-- Tồn trong bộ theo loại (như cssd-trong-bo-by-loai.ts), và giá trị kỳ vọng sau S2 (D7).
CREATE TEMP TABLE s2_trongbo_truoc ON COMMIT DROP AS
SELECT r.loai_dung_cu_id, sum(r.so_luong_thuc_te)::bigint AS s
  FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime r
  JOIN public.cssd_dm_bo_dung_cu b ON b.id = r.bo_dung_cu_id AND b.is_active IS TRUE
 WHERE r.is_active
 GROUP BY 1;

CREATE TEMP TABLE s2_trongbo_ky_vong ON COMMIT DROP AS
SELECT loai_dung_cu_id, sum(s)::bigint AS s FROM (
  -- phần ngoài họ (bộ thường, bộ tổng không con, con EO) giữ nguyên
  SELECT r.loai_dung_cu_id, r.so_luong_thuc_te AS s
    FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime r
    JOIN public.cssd_dm_bo_dung_cu b ON b.id = r.bo_dung_cu_id AND b.is_active IS TRUE
   WHERE r.is_active
     AND NOT EXISTS (SELECT 1 FROM s2_ho h WHERE h.tong_id = b.id)
     AND NOT (b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET'))
  UNION ALL
  -- phần họ: dòng active trên tổng + con CN/KCN (bất kể con active), bộ tổng active, loại tồn tại;
  -- thực tế = so_luong + biến động (họ, loại); nhóm trùng gộp → so_luong cộng, biến động một lần.
  SELECT x.loai_dung_cu_id, x.sl + COALESCE((
           SELECT sum(g.so_luong_thay_doi)
             FROM public.cssd_fact_kho_giao_dich g
             JOIN public.cssd_dm_bo_dung_cu gb ON gb.id = g.bo_dung_cu_id
            WHERE g.is_active AND g.loai_dung_cu_id = x.loai_dung_cu_id
              AND (gb.id = x.tong_id OR (gb.parent_bo_id = x.tong_id AND gb.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')))
         ), 0) AS s
    FROM (
      SELECT h.tong_id, c.loai_dung_cu_id, sum(c.so_luong) AS sl
        FROM s2_ho h
        JOIN public.cssd_dm_bo_dung_cu b ON b.id = h.tong_id
          OR (b.parent_bo_id = h.tong_id AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET'))
        JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = b.id AND c.is_active
        JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
       WHERE h.tong_active
       GROUP BY 1, 2
    ) x
) u
GROUP BY 1;

-- 1. Gộp trùng (D1) ------------------------------------------------------------------------------------------------
CREATE TEMP TABLE s2_gop ON COMMIT DROP AS
WITH dong AS (
  SELECT c.id, c.so_luong, c.loai_dung_cu_id, COALESCE(b.parent_bo_id, b.id) AS tong_id,
         row_number() OVER (PARTITION BY COALESCE(b.parent_bo_id, b.id), c.loai_dung_cu_id
                            ORDER BY (b.parent_bo_id IS NULL) DESC, c.created_at, c.id) AS rn,
         count(*) OVER (PARTITION BY COALESCE(b.parent_bo_id, b.id), c.loai_dung_cu_id) AS n
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
   WHERE c.is_active AND c.loai_dung_cu_id IS NOT NULL
     AND (b.parent_bo_id IS NULL OR b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET'))
)
SELECT d.id AS bo_id_dong, d.so_luong, k.id AS giu_id, d.tong_id, d.loai_dung_cu_id
  FROM dong d
  JOIN dong k ON k.tong_id = d.tong_id AND k.loai_dung_cu_id = d.loai_dung_cu_id AND k.rn = 1
 WHERE d.n > 1 AND d.rn > 1;

UPDATE public.cssd_dm_bo_dung_cu_chi_tiet c
   SET is_active = false,
       ghi_chu = concat_ws(' · ', NULLIF(btrim(COALESCE(c.ghi_chu, '')), ''), 'S2 gộp vào ' || g.giu_id::text),
       updated_at = now()
  FROM s2_gop g
 WHERE c.id = g.bo_id_dong;

UPDATE public.cssd_dm_bo_dung_cu_chi_tiet c
   SET so_luong = c.so_luong + x.them, updated_at = now()
  FROM (SELECT giu_id, sum(so_luong) AS them FROM s2_gop GROUP BY 1) x
 WHERE c.id = x.giu_id;

-- 2. Dời dòng con CN/KCN → bộ tổng (D2) ------------------------------------------------------------------------
CREATE TEMP TABLE s2_doi ON COMMIT DROP AS
WITH u AS (
  UPDATE public.cssd_dm_bo_dung_cu_chi_tiet c
     SET bo_dung_cu_id = k.parent_bo_id, updated_at = now()
    FROM public.cssd_dm_bo_dung_cu k
   WHERE k.id = c.bo_dung_cu_id
     AND k.parent_bo_id IS NOT NULL
     AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
  RETURNING c.id
)
SELECT count(*) AS n FROM u;

-- 3. Sổ kho trỏ con → tổng (D3) ---------------------------------------------------------------------------------
CREATE TEMP TABLE s2_kho ON COMMIT DROP AS
WITH u AS (
  UPDATE public.cssd_fact_kho_giao_dich g
     SET bo_dung_cu_id = k.parent_bo_id, updated_at = now()
    FROM public.cssd_dm_bo_dung_cu k
   WHERE k.id = g.bo_dung_cu_id
     AND k.parent_bo_id IS NOT NULL
     AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
  RETURNING g.id
)
SELECT count(*) AS n FROM u;

-- 4. Trỏ quy trình chờ tiếp nhận của -CN về bộ tổng ở họ sắp gộp (D4) -------------------------------------------
CREATE TEMP TABLE s2_tro ON COMMIT DROP AS
WITH can AS (
  SELECT h.tong_id, h.ma_bo,
         h.tong_active
           AND COALESCE(bool_or(l.is_chiu_nhiet IS NOT FALSE) FILTER (WHERE c.id IS NOT NULL), false)
           AND COALESCE(bool_or(l.is_chiu_nhiet IS FALSE) FILTER (WHERE c.id IS NOT NULL), false) AS v_can
    FROM s2_ho h
    JOIN public.cssd_dm_bo_dung_cu b ON b.id = h.tong_id OR b.parent_bo_id = h.tong_id
    LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = b.id AND c.is_active
    LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
   GROUP BY h.tong_id, h.ma_bo, h.tong_active
), ung_vien AS (
  SELECT DISTINCT ON (cn.tong_id) q.id AS quy_trinh_id, cn.tong_id, cn.ma_bo
    FROM can cn
    JOIN public.cssd_dm_bo_dung_cu k ON k.parent_bo_id = cn.tong_id AND k.vai_tro_tach = 'CHIU_NHIET' AND k.is_active IS TRUE
    JOIN public.cssd_fact_quy_trinh q ON q.bo_dung_cu_id = k.id AND q.is_active AND q.quy_trinh_cha_id IS NULL
    JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id AND t.ma_tram = 'TIEP_NHAN'
   WHERE NOT cn.v_can
     AND q.thoi_gian_tiep_nhan IS NULL
     AND EXISTS (SELECT 1 FROM public.cssd_dm_bo_dung_cu tt WHERE tt.id = cn.tong_id AND tt.is_active IS TRUE)
     -- không con CN/KCN active nào của họ có quy trình đang chạy
     AND NOT EXISTS (
       SELECT 1 FROM public.cssd_dm_bo_dung_cu k2
         JOIN public.cssd_fact_quy_trinh q2 ON q2.bo_dung_cu_id = k2.id AND q2.is_active
         LEFT JOIN public.cssd_dm_tram t2 ON t2.id = q2.tram_hien_tai_id
        WHERE k2.parent_bo_id = cn.tong_id AND k2.is_active IS TRUE
          AND k2.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
          AND NOT (t2.ma_tram IS NOT DISTINCT FROM 'TIEP_NHAN' AND q2.thoi_gian_tiep_nhan IS NULL))
     -- bộ tổng chưa có quy trình active; mã tổng chưa bị quy trình active khác dùng
     AND NOT EXISTS (SELECT 1 FROM public.cssd_fact_quy_trinh q3 WHERE q3.bo_dung_cu_id = cn.tong_id AND q3.is_active)
     AND NOT EXISTS (SELECT 1 FROM public.cssd_fact_quy_trinh q4
                      WHERE q4.is_active AND q4.id <> q.id
                        AND upper(btrim(COALESCE(q4.ma_qr_bo_vinh_vien, q4.ma_qr_quy_trinh::text))) = upper(btrim(cn.ma_bo)))
   ORDER BY cn.tong_id, q.updated_at DESC NULLS LAST, q.id
), u AS (
  UPDATE public.cssd_fact_quy_trinh q
     SET bo_dung_cu_id = v.tong_id, ma_qr_quy_trinh = v.ma_bo, ma_qr_bo_vinh_vien = v.ma_bo, updated_at = now()
    FROM ung_vien v
   WHERE q.id = v.quy_trinh_id
  RETURNING q.id, v.tong_id
)
SELECT * FROM u;

-- 5. Đồng bộ bộ con cho mọi họ (D5) --------------------------------------------------------------------------------
CREATE TEMP TABLE s2_core ON COMMIT DROP AS
SELECT h.tong_id, h.ma_bo, public.fn_cssd_dong_bo_tach_nhiet_core(h.tong_id, false) AS r
  FROM s2_ho h
 ORDER BY h.tong_id;

-- 6. Báo cáo + kiểm bất biến sau --------------------------------------------------------------------------------
DO $$
DECLARE
  v_n bigint;
  v_r record;
BEGIN
  SELECT n INTO v_n FROM s2_doi;          RAISE NOTICE 'S2 dời dòng con → tổng: %', v_n;
  SELECT count(*) INTO v_n FROM s2_gop;   RAISE NOTICE 'S2 dòng tắt do gộp trùng: %', v_n;
  SELECT n INTO v_n FROM s2_kho;          RAISE NOTICE 'S2 giao dịch kho chuyển về tổng: %', v_n;
  SELECT count(*) INTO v_n FROM s2_tro;   RAISE NOTICE 'S2 quy trình TIEP_NHAN -CN trỏ về tổng: %', v_n;
  RAISE NOTICE 'S2 core: created=% reactivated=% deactivated(bộ)=% pending(bộ)=% qt_created=% qt_deactivated=%',
    (SELECT COALESCE(sum(jsonb_array_length(r->'created')),0) FROM s2_core),
    (SELECT COALESCE(sum(jsonb_array_length(r->'reactivated')),0) FROM s2_core),
    (SELECT COALESCE(sum(jsonb_array_length(r->'deactivated')),0) FROM s2_core),
    (SELECT COALESCE(sum(jsonb_array_length(r->'pending')),0) FROM s2_core),
    (SELECT COALESCE(sum(jsonb_array_length(r->'quy_trinh_created')),0) FROM s2_core),
    (SELECT COALESCE(sum(jsonb_array_length(r->'quy_trinh_deactivated')),0) FROM s2_core);
  FOR v_r IN SELECT ma_bo, p->>'ma_bo' AS con, p->>'ma_tram' AS tram
               FROM s2_core, jsonb_array_elements(r->'pending') p ORDER BY 1, 2 LOOP
    RAISE NOTICE 'S2 pending: % / % (quy trình ở %)', v_r.ma_bo, v_r.con, v_r.tram;
  END LOOP;
  -- D6: quy trình kẹt trên bộ tổng vẫn còn con CN/KCN active
  FOR v_r IN
    SELECT b.ma_bo, t.ma_tram, q.id
      FROM public.cssd_fact_quy_trinh q
      JOIN public.cssd_dm_bo_dung_cu b ON b.id = q.bo_dung_cu_id AND b.parent_bo_id IS NULL
      LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
     WHERE q.is_active
       AND EXISTS (SELECT 1 FROM public.cssd_dm_bo_dung_cu k WHERE k.parent_bo_id = b.id AND k.is_active IS TRUE
                      AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET'))
     ORDER BY 1
  LOOP
    RAISE NOTICE 'S2 quy trình kẹt trên bộ tổng còn con (PO xử lý): % trạm % qt %', v_r.ma_bo, v_r.ma_tram, v_r.id;
  END LOOP;

  -- (a) tổng số dòng không đổi
  IF (SELECT count(*) FROM public.cssd_dm_bo_dung_cu_chi_tiet) <> (SELECT tong_dong FROM s2_truoc) THEN
    RAISE EXCEPTION 'S2: tổng số dòng chi tiết thay đổi';
  END IF;
  -- (b) Σ so_luong active theo (tổng, loại) không đổi
  SELECT count(*) INTO v_n FROM (
    (SELECT tong_id, loai_dung_cu_id, s FROM s2_sl_truoc
     EXCEPT
     SELECT COALESCE(b.parent_bo_id, b.id), c.loai_dung_cu_id, sum(c.so_luong)::bigint
       FROM public.cssd_dm_bo_dung_cu_chi_tiet c JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
      WHERE c.is_active GROUP BY 1, 2)
    UNION ALL
    (SELECT COALESCE(b.parent_bo_id, b.id), c.loai_dung_cu_id, sum(c.so_luong)::bigint
       FROM public.cssd_dm_bo_dung_cu_chi_tiet c JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
      WHERE c.is_active GROUP BY 1, 2
     EXCEPT
     SELECT tong_id, loai_dung_cu_id, s FROM s2_sl_truoc)) d;
  IF v_n > 0 THEN RAISE EXCEPTION 'S2: Σ so_luong theo (bộ tổng, loại) lệch % nhóm', v_n; END IF;
  -- (c) Σ thực tế view hiệu lực theo (tổng, loại): nhóm n dòng trước → biến động đếm n lần, sau đúng 1 lần
  SELECT count(*) INTO v_n FROM (
    (SELECT tong_id, loai_dung_cu_id,
            CASE WHEN n > 1 THEN sl + (s - sl) / n ELSE s END AS s
       FROM s2_tt_truoc
     EXCEPT
     SELECT v.bo_tong_id, v.loai_dung_cu_id, sum(v.so_luong_thuc_te)::bigint
       FROM public.v_cssd_bo_thanh_phan_hieu_luc v WHERE v.bo_dung_cu_id = v.bo_tong_id GROUP BY 1, 2)
    UNION ALL
    (SELECT v.bo_tong_id, v.loai_dung_cu_id, sum(v.so_luong_thuc_te)::bigint
       FROM public.v_cssd_bo_thanh_phan_hieu_luc v WHERE v.bo_dung_cu_id = v.bo_tong_id GROUP BY 1, 2
     EXCEPT
     SELECT tong_id, loai_dung_cu_id, CASE WHEN n > 1 THEN sl + (s - sl) / n ELSE s END FROM s2_tt_truoc)) d;
  IF v_n > 0 THEN RAISE EXCEPTION 'S2: Σ thực tế view hiệu lực theo (bộ tổng, loại) lệch % nhóm', v_n; END IF;
  -- (d) 0 dòng active trên con CN/KCN; 0 giao dịch kho trỏ con
  IF EXISTS (SELECT 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet c JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
              WHERE b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')) THEN
    RAISE EXCEPTION 'S2: còn dòng chi tiết trên bộ con CN/KCN';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cssd_fact_kho_giao_dich g JOIN public.cssd_dm_bo_dung_cu b ON b.id = g.bo_dung_cu_id
              WHERE b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')) THEN
    RAISE EXCEPTION 'S2: còn giao dịch kho trỏ bộ con CN/KCN';
  END IF;
  -- (e) tồn trong bộ theo loại = kỳ vọng (D7); báo chênh lệch thô so với trước
  WITH sau AS (
    SELECT r.loai_dung_cu_id, sum(r.so_luong_thuc_te)::bigint AS s
      FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime r
      JOIN public.cssd_dm_bo_dung_cu b ON b.id = r.bo_dung_cu_id AND b.is_active IS TRUE
     WHERE r.is_active GROUP BY 1)
  SELECT count(*) INTO v_n
    FROM sau FULL JOIN s2_trongbo_ky_vong k USING (loai_dung_cu_id)
   WHERE COALESCE(sau.s, 0) <> COALESCE(k.s, 0);
  IF v_n > 0 THEN RAISE EXCEPTION 'S2: tồn trong bộ theo loại lệch kỳ vọng ở % loại', v_n; END IF;
  FOR v_r IN
    WITH sau AS (
      SELECT r.loai_dung_cu_id, sum(r.so_luong_thuc_te)::bigint AS s
        FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime r
        JOIN public.cssd_dm_bo_dung_cu b ON b.id = r.bo_dung_cu_id AND b.is_active IS TRUE
       WHERE r.is_active GROUP BY 1)
    SELECT l.ma_loai, COALESCE(t.s, 0) AS truoc, COALESCE(sau.s, 0) AS sau
      FROM sau FULL JOIN s2_trongbo_truoc t USING (loai_dung_cu_id)
      LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = COALESCE(sau.loai_dung_cu_id, t.loai_dung_cu_id)
     WHERE COALESCE(sau.s, 0) <> COALESCE(t.s, 0)
  LOOP
    RAISE NOTICE 'S2 tồn trong bộ đổi (dòng từ con đã tắt/tổng): loại % trước % sau %', v_r.ma_loai, v_r.truoc, v_r.sau;
  END LOOP;
END $$;

-- CHƯA APPLY PROD — chờ PO. Apply SAU 20261111100000, 20261111110000, 20261111120000 (và code S3/S4a đã deploy).
-- Rủi ro prod: guard tạo một pg_advisory_xact_lock mỗi dòng active được dời (local ~4031 khóa trong một giao dịch);
-- bảng khóa dùng chung = max_locks_per_transaction × (max_connections + max_prepared_transactions) — đo trước.
-- Kiểm prod (chỉ đọc):
--   SHOW max_locks_per_transaction; SHOW max_connections;
--   SELECT
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET')) AS dong_tren_con,
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE c.is_active AND b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET')) AS dong_active_tren_con,
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE b.vai_tro_tach = 'KHONG_CHIU_NHIET_EO') AS dong_con_eo,
--     (SELECT count(*) FROM cssd_fact_kho_giao_dich g JOIN cssd_dm_bo_dung_cu b ON b.id = g.bo_dung_cu_id
--       WHERE b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET')) AS gd_kho_tren_con,
--     (SELECT count(*) FROM cssd_fact_quy_trinh q JOIN cssd_dm_bo_dung_cu b ON b.id = q.bo_dung_cu_id
--       WHERE q.is_active AND b.parent_bo_id IS NOT NULL) AS qt_active_tren_con,
--     (SELECT count(*) FROM (SELECT coalesce(b.parent_bo_id, b.id), c.loai_dung_cu_id
--        FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE c.is_active AND c.loai_dung_cu_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1) x) AS nhom_trung_loai;
-- Quy trình kẹt trên bộ tổng còn con active (sau S2, chỉ đọc):
--   SELECT b.ma_bo, t.ma_tram, q.id FROM cssd_fact_quy_trinh q
--     JOIN cssd_dm_bo_dung_cu b ON b.id = q.bo_dung_cu_id AND b.parent_bo_id IS NULL
--     LEFT JOIN cssd_dm_tram t ON t.id = q.tram_hien_tai_id
--    WHERE q.is_active AND EXISTS (SELECT 1 FROM cssd_dm_bo_dung_cu k WHERE k.parent_bo_id = b.id AND k.is_active
--                                   AND k.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET'));
