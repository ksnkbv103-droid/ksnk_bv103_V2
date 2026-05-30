-- 20260528000011_gstt_canonical_part34_slim.sql
-- Part 3–4 gọn: 1 ACT/bảng kiểm, nguyên nhân nhãn ngắn, sắp theo mã lookup
-- SSOT: docs/Giamsat/BANG_KIEM_CHUAN_4_PHAN.md (reform-bang-kiem-canonical.mjs)
begin;

-- BM.03.03 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":2},{"lookup_code":"106_SYS","ten_hien_thi":"Giao tiếp / bàn giao kém","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.03.03';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.03.03';

-- BM.07.02 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":1},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":2},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":3},{"lookup_code":"207_HUM","ten_hien_thi":"Sức khỏe nghề nghiệp","thu_tu_hien_thi":4},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":5},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.07.02';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Nhắc nhở / hướng dẫn lại tại chỗ","action_code":"ACT-100","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.07.02';

-- BM.07.03 allowlist (5 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":1},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":2},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":3},{"lookup_code":"207_HUM","ten_hien_thi":"Sức khỏe nghề nghiệp","thu_tu_hien_thi":4},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":5}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.07.03';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.07.03';

-- BM.08.01 allowlist (10 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"202_HUM","ten_hien_thi":"Nhận thức sai (at-risk)","thu_tu_hien_thi":6},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":7},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":8},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":9},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":10}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.08.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Nhắc nhở / hướng dẫn lại tại chỗ","action_code":"ACT-100","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.08.01';

-- BM.09.01 allowlist (11 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":8},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":9},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":10},{"lookup_code":"304_CLI","ten_hien_thi":"Giải phẫu / bệnh lý đặc thù","thu_tu_hien_thi":11}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.09.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.09.01';

-- BM.10.01 allowlist (10 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":8},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":9},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":10}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.10.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Lập biên bản / báo cáo sự cố","action_code":"ACT-500","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.10.01';

-- BM.14.01 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.14.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.14.01';

-- BM.31.03 allowlist (9 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":9}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.31.03';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.31.03';

-- BM.17.01 allowlist (9 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":9}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.17.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Nhắc nhở / hướng dẫn lại tại chỗ","action_code":"ACT-100","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.17.01';

-- BM.15.01 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"106_SYS","ten_hien_thi":"Giao tiếp / bàn giao kém","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.15.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.15.01';

-- BM.16.01 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"304_CLI","ten_hien_thi":"Giải phẫu / bệnh lý đặc thù","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.16.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.16.01';

-- BM.18.02 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.18.02';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.18.02';

-- BM.19.01 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.19.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Nhắc nhở / hướng dẫn lại tại chỗ","action_code":"ACT-100","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.19.01';

-- BM.19.02 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"206_HUM","ten_hien_thi":"Quy trình phức tạp","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.19.02';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.19.02';

-- BM.20.02 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.20.02';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.20.02';

-- BM.22.04 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":6},{"lookup_code":"206_HUM","ten_hien_thi":"Quy trình phức tạp","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.22.04';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.22.04';

-- BM.QĐ.19.03 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":2},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":3},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":4},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":5},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.19.03';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.19.03';

-- BM.21.04 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.21.04';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.21.04';

-- BM.25.01 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":1},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":2},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":3},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":4},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":5},{"lookup_code":"304_CLI","ten_hien_thi":"Giải phẫu / bệnh lý đặc thù","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.25.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Ghi nhận thiếu vật tư — đề xuất bổ sung","action_code":"ACT-300","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.25.01';

-- BM.25.03 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":3},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":4},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":5},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":6},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.25.03';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.25.03';

-- BM.27.01 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":1},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":2},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":3},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":4},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":5},{"lookup_code":"304_CLI","ten_hien_thi":"Giải phẫu / bệnh lý đặc thù","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.27.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.27.01';

-- BM.27.02 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":7},{"lookup_code":"304_CLI","ten_hien_thi":"Giải phẫu / bệnh lý đặc thù","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.27.02';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Ghi nhận thiếu vật tư — đề xuất bổ sung","action_code":"ACT-300","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.27.02';

-- BM.26.01 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7},{"lookup_code":"304_CLI","ten_hien_thi":"Giải phẫu / bệnh lý đặc thù","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.26.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.26.01';

-- BM.24.02 allowlist (9 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8},{"lookup_code":"304_CLI","ten_hien_thi":"Giải phẫu / bệnh lý đặc thù","thu_tu_hien_thi":9}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.24.02';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.24.02';

-- BM.11.01 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"106_SYS","ten_hien_thi":"Giao tiếp / bàn giao kém","thu_tu_hien_thi":4},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":5},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":6},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.11.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.11.01';

-- BM.QĐ.12.01 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.12.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.12.01';

-- BM.QĐ.20.01 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.20.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Ghi nhận thiếu vật tư — đề xuất bổ sung","action_code":"ACT-300","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.20.01';

-- BM.13.01 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.13.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.13.01';

-- BM.12.01 allowlist (9 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":7},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":8},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":9}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.12.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.12.01';

-- BM.QĐ.08.01 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.08.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.08.01';

-- BM.QĐ.02.01 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.02.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.02.01';

-- BM.QĐ.03.01 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":3},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":4},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":5},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.03.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.03.01';

-- BM.QĐ.09.01 allowlist (8 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":1},{"lookup_code":"103_SYS","ten_hien_thi":"Quá tải công việc / nhân sự","thu_tu_hien_thi":2},{"lookup_code":"105_SYS","ten_hien_thi":"Lỗ hổng quy trình","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"301_CLI","ten_hien_thi":"Cấp cứu khẩn cấp","thu_tu_hien_thi":7},{"lookup_code":"302_CLI","ten_hien_thi":"Hành vi / tâm lý người bệnh","thu_tu_hien_thi":8}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.09.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.09.01';

-- BM.QĐ.17.01 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":2},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":3},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":4},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":5},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.17.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.17.01';

-- BM.QĐ.16.01 allowlist (6 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":2},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":3},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":4},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":5},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":6}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.16.01';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Yêu cầu khắc phục ngay tại chỗ","action_code":"ACT-200","la_stop_the_line":false}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.16.01';

-- BM.QĐ.18.02 allowlist (7 nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements($jsonb$[{"lookup_code":"101_SYS","ten_hien_thi":"Thiếu vật tư / thiết bị","thu_tu_hien_thi":1},{"lookup_code":"102_SYS","ten_hien_thi":"Thiết kế môi trường bất hợp lý","thu_tu_hien_thi":2},{"lookup_code":"104_SYS","ten_hien_thi":"Lỗi thiết bị / hỏng hóc","thu_tu_hien_thi":3},{"lookup_code":"201_HUM","ten_hien_thi":"Kỹ năng / đào tạo chưa đạt","thu_tu_hien_thi":4},{"lookup_code":"203_HUM","ten_hien_thi":"Thói quen đi tắt","thu_tu_hien_thi":5},{"lookup_code":"204_HUM","ten_hien_thi":"Mất tập trung / quên","thu_tu_hien_thi":6},{"lookup_code":"205_HUM","ten_hien_thi":"Hành vi liều lĩnh","thu_tu_hien_thi":7}]$jsonb$::jsonb) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = 'BM.QĐ.18.02';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = $jsonb$[{"stt":1,"noi_dung":"Đình chỉ hoạt động (Stop the line)","action_code":"ACT-400","la_stop_the_line":true}]$jsonb$::jsonb
where bk.ma_bk = 'BM.QĐ.18.02';

notify pgrst, 'reload schema';

commit;

-- 36 templates