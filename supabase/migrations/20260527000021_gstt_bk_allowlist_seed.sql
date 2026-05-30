-- Migration: Seed allowlist cho 51 bảng kiểm
-- Slice 6 (session-level RCA v5): mỗi bảng kiểm tự khai 8-12 reason allowlist,
-- mapping theo `phan_loai_chuyen_mon`. 3 template đặc thù (BM.07.01 VST,
-- BM.12.01 chất thải, BM.22.04 QC tiệt khuẩn) có wording override sát ngữ cảnh.
-- Date: 27/05/2026

begin;

-- ============================================================================
-- 1. HELPER FUNCTION: build allowlist entry từ ma_loi
-- ============================================================================
create or replace function pg_temp.fn_build_allow_entry(
  p_ma_loi text,
  p_ten_hien_thi text default null,
  p_mo_ta_chi_tiet text default null,
  p_vi_du text default null,
  p_thu_tu int default null
) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'master_reason_id', r.id::text,
    'ten_hien_thi',     coalesce(p_ten_hien_thi, r.mo_ta_canonical, r.mo_ta),
    'mo_ta_chi_tiet',   p_mo_ta_chi_tiet,
    'vi_du_thuc_te',    p_vi_du,
    'thu_tu_hien_thi',  p_thu_tu
  )
    from public.gstt_dm_failure_reason r
   where r.ma_loi = p_ma_loi and r.is_active = true
   limit 1;
$$;

-- ============================================================================
-- 2. ALLOWLIST MẶC ĐỊNH theo phan_loai_chuyen_mon (generic, 6-10 reason / nhóm)
-- ============================================================================

-- PHONG_NGUA_CHUAN: VST / PPE / Tiêm an toàn / Phòng theo đường lây
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('101', NULL, 'Thiếu cồn rửa tay, khăn lau, PPE tại điểm chăm sóc', NULL, 1),
     pg_temp.fn_build_allow_entry('102', NULL, 'Bồn rửa/giá cồn/giá PPE bố trí xa giường bệnh', NULL, 2),
     pg_temp.fn_build_allow_entry('108', NULL, 'Layout phòng/khoa không thuận tiện cho tuân thủ', NULL, 3),
     pg_temp.fn_build_allow_entry('201', NULL, 'Quy trình VST/PPE chưa rõ với tình huống cụ thể', NULL, 4),
     pg_temp.fn_build_allow_entry('202', NULL, 'NV chưa được tập huấn đầy đủ', NULL, 5),
     pg_temp.fn_build_allow_entry('203', NULL, 'Quá tải BN/giường — thiếu thời gian thực hiện đủ', NULL, 6),
     pg_temp.fn_build_allow_entry('303', NULL, 'Đi tắt quy trình do thói quen', NULL, 7),
     pg_temp.fn_build_allow_entry('306', NULL, 'Quên/sơ suất không cố ý', NULL, 8),
     pg_temp.fn_build_allow_entry('305', NULL, 'Nhận thức sai (vd găng tay thay VST)', NULL, 9),
     pg_temp.fn_build_allow_entry('401', NULL, 'Tình huống cấp cứu khẩn cấp ưu tiên tính mạng', NULL, 10),
     pg_temp.fn_build_allow_entry('402', NULL, 'BN kích thích/mê sảng/không hợp tác', NULL, 11)
   )
 where phan_loai_chuyen_mon = 'PHONG_NGUA_CHUAN'
   and (nguyen_nhan_cho_phep_jsonb is null
        or jsonb_array_length(nguyen_nhan_cho_phep_jsonb) = 0);

-- GOI_CAN_THIEP: Bundle SSI/CLABSI/CAUTI/VAP/CVC/WHO
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('101', NULL, 'Thiếu PPE/vật tư trong bộ gói', NULL, 1),
     pg_temp.fn_build_allow_entry('107', NULL, 'Vật tư tiêu hao không đạt quy chuẩn', NULL, 2),
     pg_temp.fn_build_allow_entry('201', NULL, 'SOP gói can thiệp chưa cập nhật', NULL, 3),
     pg_temp.fn_build_allow_entry('202', NULL, 'Kíp chưa tập huấn bộ gói (SSI/CLABSI/VAP/CAUTI)', NULL, 4),
     pg_temp.fn_build_allow_entry('203', NULL, 'Quá tải khối lượng phẫu thuật/thủ thuật', NULL, 5),
     pg_temp.fn_build_allow_entry('204', NULL, 'Lỗi giao tiếp / bàn giao ca thiếu thông tin', NULL, 6),
     pg_temp.fn_build_allow_entry('303', NULL, 'Đi tắt bước trong checklist', NULL, 7),
     pg_temp.fn_build_allow_entry('306', NULL, 'Quên / sơ suất bước trong gói', NULL, 8),
     pg_temp.fn_build_allow_entry('401', NULL, 'Tình huống cấp cứu — không kịp checklist đủ', NULL, 9),
     pg_temp.fn_build_allow_entry('404', NULL, 'Giải phẫu đặc thù gây khó tuân thủ', NULL, 10)
   )
 where phan_loai_chuyen_mon = 'GOI_CAN_THIEP'
   and (nguyen_nhan_cho_phep_jsonb is null
        or jsonb_array_length(nguyen_nhan_cho_phep_jsonb) = 0);

-- XU_LY_DUNG_CU: CSSD (đóng gói/lưu trữ/QC tiệt khuẩn/làm sạch)
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('105', NULL, 'Hỏng máy tiệt khuẩn/máy rửa/máy nội soi', NULL, 1),
     pg_temp.fn_build_allow_entry('104', NULL, 'Nước RO / khí y tế không đạt chuẩn', NULL, 2),
     pg_temp.fn_build_allow_entry('106', NULL, 'Vật tư hết hạn / bao bì hỏng / nghi ngờ hàng giả', NULL, 3),
     pg_temp.fn_build_allow_entry('107', NULL, 'Túi/cuộn đóng gói/test BI/CI không đạt quy chuẩn', NULL, 4),
     pg_temp.fn_build_allow_entry('108', NULL, 'Layout dây chuyền CSSD chưa tách bẩn–sạch–vô khuẩn', NULL, 5),
     pg_temp.fn_build_allow_entry('201', NULL, 'SOP CSSD chưa đủ cho công nghệ mới', NULL, 6),
     pg_temp.fn_build_allow_entry('202', NULL, 'NV CSSD chưa được tập huấn QC/đóng gói', NULL, 7),
     pg_temp.fn_build_allow_entry('206', NULL, 'SOP có nhưng không cập nhật với thiết bị mới', NULL, 8),
     pg_temp.fn_build_allow_entry('303', NULL, 'Đi tắt bước (bỏ qua test BI/CI)', NULL, 9),
     pg_temp.fn_build_allow_entry('306', NULL, 'Quên/sơ suất ghi nhật ký mẻ tiệt khuẩn', NULL, 10)
   )
 where phan_loai_chuyen_mon = 'XU_LY_DUNG_CU'
   and (nguyen_nhan_cho_phep_jsonb is null
        or jsonb_array_length(nguyen_nhan_cho_phep_jsonb) = 0);

-- MOI_TRUONG_CHAT_THAI: VSMT / Chất thải / Đồ vải / Hóa chất / ICRA
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('101', NULL, 'Hết túi đúng màu / hộp kháng thủng / hóa chất VSMT', NULL, 1),
     pg_temp.fn_build_allow_entry('107', NULL, 'Túi mỏng dễ bục / thùng hỏng nắp đạp chân', NULL, 2),
     pg_temp.fn_build_allow_entry('108', NULL, 'Thùng/giá để rác xa điểm chăm sóc', NULL, 3),
     pg_temp.fn_build_allow_entry('109', NULL, 'Khu lưu giữ quá tải / lịch thu gom thưa', NULL, 4),
     pg_temp.fn_build_allow_entry('201', NULL, 'SOP phân loại rác/VSMT chưa rõ', NULL, 5),
     pg_temp.fn_build_allow_entry('202', NULL, 'NV chưa được tập huấn phân loại/VSMT', NULL, 6),
     pg_temp.fn_build_allow_entry('203', NULL, 'Quá tải khối lượng — không kịp phân loại', NULL, 7),
     pg_temp.fn_build_allow_entry('303', NULL, 'Đi tắt: dùng tay/chân nén rác, không buộc miệng túi', NULL, 8),
     pg_temp.fn_build_allow_entry('304', NULL, 'Cố ý liều lĩnh: vứt kim vào túi nilon vàng', NULL, 9),
     pg_temp.fn_build_allow_entry('306', NULL, 'Quên/sơ suất khi vội', NULL, 10),
     pg_temp.fn_build_allow_entry('406', NULL, 'Người nhà BN tự ý vứt rác sai chỗ', NULL, 11)
   )
 where phan_loai_chuyen_mon = 'MOI_TRUONG_CHAT_THAI'
   and (nguyen_nhan_cho_phep_jsonb is null
        or jsonb_array_length(nguyen_nhan_cho_phep_jsonb) = 0);

-- CHUYEN_KHOA: phòng mổ, ICU, nội soi, lọc máu, BSC, nha khoa, ATSH labo
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('103', NULL, 'HVAC: phòng áp lực âm/dương không đạt chuẩn', NULL, 1),
     pg_temp.fn_build_allow_entry('104', NULL, 'Nước RO / khí y tế không đạt chuẩn', NULL, 2),
     pg_temp.fn_build_allow_entry('105', NULL, 'Hỏng thiết bị y tế chuyên khoa', NULL, 3),
     pg_temp.fn_build_allow_entry('108', NULL, 'Layout phòng/khoa không thuận tiện', NULL, 4),
     pg_temp.fn_build_allow_entry('201', NULL, 'SOP chuyên khoa chưa rõ', NULL, 5),
     pg_temp.fn_build_allow_entry('202', NULL, 'Kíp chưa tập huấn quy trình chuyên khoa', NULL, 6),
     pg_temp.fn_build_allow_entry('203', NULL, 'Quá tải BN/ca trực', NULL, 7),
     pg_temp.fn_build_allow_entry('303', NULL, 'Đi tắt quy trình', NULL, 8),
     pg_temp.fn_build_allow_entry('401', NULL, 'Cấp cứu khẩn cấp đe dọa tính mạng', NULL, 9),
     pg_temp.fn_build_allow_entry('404', NULL, 'Bệnh lý/giải phẫu đặc thù', NULL, 10)
   )
 where phan_loai_chuyen_mon = 'CHUYEN_KHOA'
   and (nguyen_nhan_cho_phep_jsonb is null
        or jsonb_array_length(nguyen_nhan_cho_phep_jsonb) = 0);

-- QUAN_TRI_HE_THONG: miễn dịch NVYT
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('201', NULL, 'Chưa có SOP tiêm chủng nội bộ', NULL, 1),
     pg_temp.fn_build_allow_entry('202', NULL, 'NV chưa được tập huấn về tiêm chủng', NULL, 2),
     pg_temp.fn_build_allow_entry('203', NULL, 'Quá tải lịch tiêm — bỏ sót NV', NULL, 3),
     pg_temp.fn_build_allow_entry('204', NULL, 'Lỗi giao tiếp / bàn giao danh sách', NULL, 4),
     pg_temp.fn_build_allow_entry('206', NULL, 'SOP có nhưng không cập nhật vaccine mới', NULL, 5),
     pg_temp.fn_build_allow_entry('306', NULL, 'Quên / sơ suất ghi nhận', NULL, 6),
     pg_temp.fn_build_allow_entry('405', NULL, 'Bệnh da liễu / dị ứng của NVYT', NULL, 7)
   )
 where phan_loai_chuyen_mon = 'QUAN_TRI_HE_THONG'
   and (nguyen_nhan_cho_phep_jsonb is null
        or jsonb_array_length(nguyen_nhan_cho_phep_jsonb) = 0);

-- ============================================================================
-- 3. WORDING OVERRIDE cho 3 template đặc thù
-- ============================================================================

-- BM.07.01 VST 5 thời điểm — wording sát "vệ sinh tay"
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('101', 'Hết cồn rửa tay / xà phòng / khăn lau tại điểm chăm sóc',
       'Cồn khô, vòi rửa hỏng, không có khăn lau giấy.', NULL, 1),
     pg_temp.fn_build_allow_entry('108', 'Bồn rửa / giá cồn bố trí xa giường bệnh (>5m)',
       'Bố trí gây bất tiện, NV phải đi xa để thực hiện VST.', NULL, 2),
     pg_temp.fn_build_allow_entry('201', 'SOP 5 thời điểm chưa rõ cho tình huống thực tế',
       'NV không xác định được "thời điểm" áp dụng (vd trước hay sau).', NULL, 3),
     pg_temp.fn_build_allow_entry('202', 'NV chưa được tập huấn về 5 thời điểm WHO',
       'Đặc biệt nhân viên mới hoặc luân chuyển khoa.', 'ĐD mới vừa từ ngoại khoa sang nội khoa.', 4),
     pg_temp.fn_build_allow_entry('203', 'Quá tải BN / ca trực — không đủ thời gian VST đầy đủ',
       'Workload cao khiến NV bỏ bước.', 'Đêm cấp cứu 30 BN/ca trực.', 5),
     pg_temp.fn_build_allow_entry('303', 'Đi tắt: chỉ chà cồn 5 giây thay vì 20-30 giây',
       'Routine violation — biết quy trình nhưng cố tình rút gọn.', NULL, 6),
     pg_temp.fn_build_allow_entry('305', 'Nhận thức sai: dùng găng tay thay cho VST đầy đủ',
       'Tin rằng găng tay đã bảo vệ → bỏ qua VST giữa các BN.', NULL, 7),
     pg_temp.fn_build_allow_entry('306', 'Quên / sơ suất không cố ý',
       'Slip-lapse không phải vi phạm chủ ý.', NULL, 8),
     pg_temp.fn_build_allow_entry('401', 'Tình huống cấp cứu khẩn cấp (Code Blue)',
       'Ưu tiên cứu sống BN, không kịp VST đủ.', NULL, 9),
     pg_temp.fn_build_allow_entry('405', 'NVYT có bệnh da liễu / dị ứng cồn',
       'Khô da, eczema → khó VST 5 lần/giờ.', NULL, 10)
   )
 where ma_bk = 'BM.07.01';

-- BM.12.01 Quản lý chất thải y tế — wording theo file Quản lý chất thải JCI
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('101', '101-SYS Thiếu vật tư: hộp kháng thủng, túi đúng màu',
       'Hết hộp sắc nhọn, hết túi vàng/đen/xanh, thùng rác hỏng nắp đạp chân.',
       'Khoa hết túi vàng — phải dồn rác lây nhiễm vào túi xanh tạm.', 1),
     pg_temp.fn_build_allow_entry('108', '102-SYS Bố trí không thuận tiện',
       'Thùng đặt quá xa giường bệnh, khu lưu giữ chật, xe đẩy không vào được.',
       'Thùng VÀNG cách xe tiêm 8m — NV ngại đi.', 2),
     pg_temp.fn_build_allow_entry('109', '103-SYS Quá tải / tần suất thu gom kém',
       'Thùng rác đầy tràn, NVVS chưa đến lịch thu gom dẫn đến rác rơi vãi.', NULL, 3),
     pg_temp.fn_build_allow_entry('107', '105-SYS Lỗi vật tư cung cấp',
       'Túi mỏng dễ bục rách, thiếu xe chuyên dụng chở chung rác y tế và sinh hoạt.', NULL, 4),
     pg_temp.fn_build_allow_entry('202', '201-HUM Yếu tố kỹ năng / nhận thức',
       'NVYT phân loại sai do chưa nắm vững danh mục.',
       'Vứt vỏ chai dịch truyền sạch vào túi vàng; lọ thuốc vào túi sinh hoạt.', 5),
     pg_temp.fn_build_allow_entry('303', '203-HUM Hành vi đi tắt — thói quen',
       'NVVS dùng tay/chân nén rác; không buộc miệng túi; ném kim ra khay hạt đậu chờ cuối ca.',
       NULL, 6),
     pg_temp.fn_build_allow_entry('306', '204-HUM Yếu tố tâm sinh lý',
       'Bỏ nhầm rác do vội vã, phân tâm trong ca trực đông BN.', NULL, 7),
     pg_temp.fn_build_allow_entry('304', '205-HUM Hành vi liều lĩnh (cố tình vi phạm)',
       'Cố tình vứt kim tiêm sắc nhọn vào túi nilon vàng — rất nguy hiểm.',
       'Sentinel: NVVS bị kim đâm xuyên túi → phơi nhiễm HIV/HBV.', 8),
     pg_temp.fn_build_allow_entry('401', '301-CLI Tình huống cấp cứu khẩn cấp',
       'Xả rác/bông băng tạm bợ xuống sàn để ưu tiên cứu sống NB.', NULL, 9),
     pg_temp.fn_build_allow_entry('406', '302-CLI Người nhà NB tự ý vứt rác',
       'Người nhà BN tự ý vứt thức ăn thừa, rác sinh hoạt vào thùng vàng lây nhiễm.', NULL, 10)
   )
 where ma_bk = 'BM.12.01';

-- BM.22.04 Bảng kiểm QC tiệt khuẩn — wording theo nghiệp vụ CSSD
update public.gstt_dm_bang_kiem
   set nguyen_nhan_cho_phep_jsonb = jsonb_build_array(
     pg_temp.fn_build_allow_entry('105', 'Hỏng máy tiệt khuẩn — chu trình không đạt thông số',
       'Lò TK lệch nhiệt độ, áp suất, thời gian; cần báo VTYT can thiệp.', NULL, 1),
     pg_temp.fn_build_allow_entry('104', 'Nước RO / khí y tế không đạt chuẩn',
       'Nước cấp lò hơi đục, dẫn điện cao; ảnh hưởng tới chu trình.', NULL, 2),
     pg_temp.fn_build_allow_entry('106', 'BI / CI / test Bowie-Dick hết hạn / nghi ngờ hàng giả',
       'Lot BI hết hạn nhưng đã ra; CI lỗi không đổi màu chuẩn.', NULL, 3),
     pg_temp.fn_build_allow_entry('107', 'Cuộn đóng gói / túi sterile bags không đạt quy chuẩn',
       'Cuộn không đồng đều, mép hàn lỗi, lô không có MOF.', NULL, 4),
     pg_temp.fn_build_allow_entry('201', 'SOP QC tiệt khuẩn chưa rõ cho thiết bị mới',
       'Lò mới mua chưa có SOP riêng — vẫn dùng SOP lò cũ.', NULL, 5),
     pg_temp.fn_build_allow_entry('202', 'NV CSSD chưa được tập huấn QC chu trình',
       'Đặc biệt NV mới hoặc luân chuyển từ đơn vị khác.', NULL, 6),
     pg_temp.fn_build_allow_entry('303', 'Đi tắt: bỏ qua test BI / Bowie-Dick',
       'Routine violation — biết phải làm nhưng cố tình bỏ.', NULL, 7),
     pg_temp.fn_build_allow_entry('306', 'Quên / sơ suất ghi nhật ký mẻ',
       'Hoàn thành chu trình nhưng quên ghi BI lot, không lưu CI strip.', NULL, 8),
     pg_temp.fn_build_allow_entry('206', 'SOP có nhưng không cập nhật khi thay máy / đổi hóa chất',
       NULL, NULL, 9)
   )
 where ma_bk = 'BM.22.04';

-- ============================================================================
-- 4. Reload PostgREST schema cache
-- ============================================================================
notify pgrst, 'reload schema';

commit;
