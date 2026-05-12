/**
 * Một lần: nạp danh bảng khoa phòng (theo CSSD_Management - DM_KhoaPhong.csv) vào public.dm_khoa_phong.
 * Yêu cầu: .env.local có NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Chạy: node --env-file=.env.local scripts/seed-khoa-phong-bv103-csv.mjs
 */
import { createClient } from "@supabase/supabase-js";

const KHOI_MAP = {
  "NỘI KHOA": "KNOI",
  "NGOẠI KHOA": "KNGOAI",
  "CẬN LÂM SÀNG": "KCLS",
  "HÀNH CHÍNH": "KCOQUAN",
};

const ROWS = [
  ["A01", "KHOA NỘI TIÊU HÓA", "NỘI KHOA"],
  ["A02", "KHOA NỘI TIM MẠCH", "NỘI KHOA"],
  ["A03", "KHOA KHOA LAO", "NỘI KHOA"],
  ["A04", "KHOA NỘI THẦN KINH", "NỘI KHOA"],
  ["A05", "KHOA TRUYỀN NHIỄM", "NỘI KHOA"],
  ["A06", "KHOA TÂM THẦN", "NỘI KHOA"],
  ["A07", "KHOA MÁU, ĐỘC XẠ BỆNH NGHỀ NGHIỆP", "NỘI KHOA"],
  ["A08", "KHOA DA LIỄU", "NỘI KHOA"],
  ["A09", "KHOA ĐÔNG Y", "NỘI KHOA"],
  ["A10", "KHOA NHI", "NỘI KHOA"],
  ["A11", "KHOA NỘI TIẾT", "NỘI KHOA"],
  ["A12", "KHOA THẬN VÀ LỌC MÁU", "NỘI KHOA"],
  ["A14", "KHOA ĐỘT QUỴ", "NỘI KHOA"],
  ["A15", "KHOA PHỤC HỒI CHỨC NĂNG", "NỘI KHOA"],
  ["A16", "KHOA TIM MẠCH CAN THIỆP", "NỘI KHOA"],
  ["A17", "KHOA BỆNH PHỔI", "NỘI KHOA"],
  ["A19", "KHOA KHOA KHỚP", "NỘI KHOA"],
  ["A20", "KHOA HÓA TRỊ", "NỘI KHOA"],
  ["A21", "KHOA XẠ TRỊ", "NỘI KHOA"],
  ["A26", "KHOA CÁN BỘ CAO CẤP", "NỘI KHOA"],
  ["A27", "KHOA HỒI SỨC NỘI", "NỘI KHOA"],
  ["A29", "KHOA TUYỂN CHỌN, SÀNG LỌC VÀ CHĂM SÓC SAU GHÉP", "NỘI KHOA"],
  ["B01", "KHOA CHẤN THƯƠNG CHỈNH HÌNH", "NGOẠI KHOA"],
  ["B02", "KHOA NGOẠI BỤNG", "NGOẠI KHOA"],
  ["B04", "KHOA MẮT", "NGOẠI KHOA"],
  ["B05", "KHOA GÂY MÊ HỒI SỨC", "NGOẠI KHOA"],
  ["B06", "KHOA TAI MŨI HỌNG", "NGOẠI KHOA"],
  ["B07", "KHOA NGOẠI TIẾT NIỆU", "NGOẠI KHOA"],
  ["B08", "KHOA HÀM MẶT", "NGOẠI KHOA"],
  ["B09", "KHOA NGOẠI THẦN KINH", "NGOẠI KHOA"],
  ["B10", "KHOA SẢN KHOA", "NGOẠI KHOA"],
  ["B11", "KHOA HỒI SỨC NGOẠI", "NGOẠI KHOA"],
  ["B12", "KHOA PHẪU THUẬT LỒNG NGỰC VÀ MẠCH MÁU", "NGOẠI KHOA"],
  ["B14", "KHOA RĂNG MIỆNG", "NGOẠI KHOA"],
  ["B15", "KHOA CẤP CỨU NGOẠI", "NGOẠI KHOA"],
  ["B16", "KHOA CẤP CỨU NỘI", "NGOẠI KHOA"],
  ["B17", "KHOA PHẪU THUẬT KHỚP", "NGOẠI KHOA"],
  ["B18", "KHOA CHẤN THƯƠNG CHỈNH HÌNH CỘT SỐNG", "NGOẠI KHOA"],
  ["B19", "KHOA GAN MẬT TỤY", "NGOẠI KHOA"],
  ["B20", "KHOA NGOẠI TIM MẠCH", "NGOẠI KHOA"],
  ["B21", "KHOA HỒI SỨC SAU GHÉP TẠNG", "NGOẠI KHOA"],
  ["C01", "KHOA KHÁM BỆNH", "CẬN LÂM SÀNG"],
  ["C02", "KHOA HUYẾT HỌC TRUYỀN MÁU", "CẬN LÂM SÀNG"],
  ["C04", "KHOA SINH HÓA", "CẬN LÂM SÀNG"],
  ["C05", "KHOA DƯỢC", "CẬN LÂM SÀNG"],
  ["C06", "KHOA GIẢI PHẪU BỆNH LÝ", "CẬN LÂM SÀNG"],
  ["C07", "KHOA VI SINH VẬT", "CẬN LÂM SÀNG"],
  ["C09", "KHOA CHẨN ĐOÁN CHỨC NĂNG", "CẬN LÂM SÀNG"],
  ["C10", "TRUNG TÂM CHẨN ĐOÁN HÌNH ẢNH", "CẬN LÂM SÀNG"],
  ["C10-XQ", "KHOA XQ CHẨN ĐOÁN", "CẬN LÂM SÀNG"],
  ["C11", "KHOA XQ CAN THIỆP", "CẬN LÂM SÀNG"],
  ["C12", "KHOA SIÊU ÂM", "CẬN LÂM SÀNG"],
  ["C14", "KHOA Y HỌC HẠT NHÂN", "CẬN LÂM SÀNG"],
  ["C15", "KHOA TRANG BỊ", "CẬN LÂM SÀNG"],
  ["C18", "KHOA KIỂM SOÁT NHIỄM KHUẨN", "CẬN LÂM SÀNG"],
  ["KHTH", "PHÒNG KẾ HOẠCH TỔNG HỢP", "HÀNH CHÍNH"],
  ["TMHC", "PHÒNG THAM MƯU HÀNH CHÍNH", "HÀNH CHÍNH"],
  ["CT", "PHÒNG CHÍNH TRỊ", "HÀNH CHÍNH"],
  ["HC-KT", "PHÒNG HẬU CẦN - KỸ THUẬT", "HÀNH CHÍNH"],
  ["CĐT", "PHÒNG CHỈ ĐẠO TUYẾN", "HÀNH CHÍNH"],
  ["ĐD", "PHÒNG ĐIỀU DƯỠNG", "HÀNH CHÍNH"],
  ["TC", "BAN TÀI CHÍNH", "HÀNH CHÍNH"],
  ["KHQS", "BAN KHOA HỌC QUÂN SỰ", "HÀNH CHÍNH"],
  ["GV", "BAN GIÁO VỤ", "HÀNH CHÍNH"],
  ["QLCL", "BAN QUẢN LÝ CHẤT LƯỢNG BỆNH VIỆN", "HÀNH CHÍNH"],
  ["VHTN", "BAN QUẢN LÝ VẬN HÀNH TÒA NHÀ TRUNG TÂM", "HÀNH CHÍNH"],
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: khoiRows, error: khoiErr } = await supabase
  .from("dm_khoi_khoa")
  .select("id, ma_khoi")
  .eq("is_active", true);
if (khoiErr) {
  console.error("Không đọc dm_khoi_khoa:", khoiErr.message);
  process.exit(1);
}

const khoiByMa = new Map((khoiRows || []).map((r) => [String(r.ma_khoi).trim().toUpperCase(), r.id]));

const payloads = [];
for (const [ma, ten, label] of ROWS) {
  const mk = KHOI_MAP[label];
  if (!mk) {
    console.error("Thiếu map khối:", label);
    process.exit(1);
  }
  const kid = khoiByMa.get(mk.toUpperCase());
  if (!kid) {
    console.error("Không tìm thấy dm_khoi_khoa.ma_khoi =", mk);
    process.exit(1);
  }
  payloads.push({
    ma_khoa: ma.trim().toUpperCase(),
    ten_khoa: ten.trim(),
    khoi_id: kid,
    is_active: true,
    updated_at: new Date().toISOString(),
  });
}

const { error: upErr } = await supabase.from("dm_khoa_phong").upsert(payloads, {
  onConflict: "ma_khoa",
});
if (upErr) {
  console.error("Upsert lỗi:", upErr.message);
  process.exit(1);
}

console.log("OK: đã upsert", payloads.length, "dòng vào dm_khoa_phong.");
