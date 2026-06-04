import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function main() {
  if (!url || !serviceKey) {
    console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log("[Seed UAT] Đang kết nối tới Supabase...");

  // 1. Find first active department
  const { data: khoaData, error: khoaErr } = await sb
    .from("mdm_dm_khoa_phong")
    .select("id, ten_khoa")
    .eq("is_active", true)
    .limit(1);

  if (khoaErr) throw khoaErr;
  const khoaId = khoaData?.[0]?.id;
  const khoaTen = khoaData?.[0]?.ten_khoa || "Hồi sức tích cực";
  if (!khoaId) {
    console.error("Không tìm thấy khoa phòng hoạt động nào để gán.");
    process.exit(1);
  }
  console.log(`[Seed UAT] Gán khoa điều trị mặc định: ${khoaTen} (ID: ${khoaId})`);

  // 2. Fetch lookup categories & status IDs
  const { data: categories } = await sb
    .from("nkbv_dm_loai")
    .select("id, ma_loai")
    .eq("is_active", true);

  const getCategoryId = (code: string) => {
    const matched = categories?.find(c => c.ma_loai === code || c.ma_loai?.toUpperCase() === code);
    return matched?.id || categories?.[0]?.id;
  };

  const { data: statusRow } = await sb
    .from("nkbv_dm_trang_thai_ca")
    .select("id")
    .eq("ma_trang_thai", "DANG_GHI_NHAN")
    .eq("is_active", true)
    .maybeSingle();

  let defaultStatusId = statusRow?.id;
  if (!defaultStatusId) {
    const { data: altStatus } = await sb
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("ma_trang_thai", "CHO_XAC_NHAN")
      .eq("is_active", true)
      .maybeSingle();
    defaultStatusId = altStatus?.id;
  }

  // 3. Clear old test records from renamed tables
  console.log("[Seed UAT] Đang làm sạch mẫu UAT cũ...");
  const uatStayIds = [
    "BA-UAT-UTI",
    "BA-UAT-VAE",
    "BA-UAT-SSI",
    "BA-UAT-BSI",
    "BA-UAT-SECONDARY-BSI"
  ];
  await sb.from("nkbv_fact_su_kien").delete().in("ma_benh_an", uatStayIds);
  await sb.from("nkbv_fact_vi_sinh").delete().in("ma_benh_an", uatStayIds);
  await sb.from("nkbv_fact_benh_an").delete().in("ma_benh_an", uatStayIds);

  // 4. Define 5 stays
  const uatStays = [
    {
      ma_benh_an: "BA-UAT-UTI",
      ma_benh_nhan: "PID-UAT-UTI",
      ho_ten_benh_nhan: "Trần Văn Tiểu",
      ngay_sinh: "1975-03-20",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
      khoa_dieu_tri_id: khoaId,
      is_active: true
    },
    {
      ma_benh_an: "BA-UAT-VAE",
      ma_benh_nhan: "PID-UAT-VAE",
      ho_ten_benh_nhan: "Lê Văn Phổi",
      ngay_sinh: "1960-08-15",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-12T09:00:00Z").toISOString(),
      khoa_dieu_tri_id: khoaId,
      is_active: true
    },
    {
      ma_benh_an: "BA-UAT-SSI",
      ma_benh_nhan: "PID-UAT-SSI",
      ho_ten_benh_nhan: "Phạm Thị Mổ",
      ngay_sinh: "1988-12-05",
      gioi_tinh: "Nữ",
      ngay_vao_vien: new Date("2026-05-11T10:00:00Z").toISOString(),
      khoa_dieu_tri_id: khoaId,
      is_active: true
    },
    {
      ma_benh_an: "BA-UAT-BSI",
      ma_benh_nhan: "PID-UAT-BSI",
      ho_ten_benh_nhan: "Đỗ Văn Máu",
      ngay_sinh: "1980-04-12",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-14T07:30:00Z").toISOString(),
      khoa_dieu_tri_id: khoaId,
      is_active: true
    },
    {
      ma_benh_an: "BA-UAT-SECONDARY-BSI",
      ma_benh_nhan: "PID-UAT-SEC",
      ho_ten_benh_nhan: "Nguyễn UAT Dịch Tễ",
      ngay_sinh: "1972-11-25",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
      khoa_dieu_tri_id: khoaId,
      is_active: true
    }
  ];

  console.log("[Seed UAT] Đang chèn hồ sơ bệnh án vật lý...");
  const { error: staysErr } = await sb.from("nkbv_fact_benh_an").insert(uatStays);
  if (staysErr) throw staysErr;

  // 5. Define cấy LIS positive vi sinh records
  const uatViSinh = [
    {
      ma_benh_nhan: "PID-UAT-UTI",
      ma_benh_an: "BA-UAT-UTI",
      ma_benh_pham: "BP-UTI-01",
      ho_ten_benh_nhan: "Trần Văn Tiểu",
      ngay_sinh: "1975-03-20",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
      ngay_lay_mau: new Date("2026-05-18T09:30:00Z").toISOString(),
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: "Urine (Nước tiểu)",
      tac_nhan: "Pseudomonas aeruginosa",
      so_luong: "10^5 CFU/ml",
      ket_qua_duong_tinh: true,
      is_active: true,
      metadata: {
        unique_key: crypto.createHash("md5").update("PID-UAT-UTI_BA-UAT-UTI_BP-UTI-01_Pseudomonas aeruginosa").digest("hex")
      }
    },
    {
      ma_benh_nhan: "PID-UAT-VAE",
      ma_benh_an: "BA-UAT-VAE",
      ma_benh_pham: "BP-VAE-01",
      ho_ten_benh_nhan: "Lê Văn Phổi",
      ngay_sinh: "1960-08-15",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-12T09:00:00Z").toISOString(),
      ngay_lay_mau: new Date("2026-05-19T10:15:00Z").toISOString(),
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: "Đờm (Sputum)",
      tac_nhan: "Acinetobacter baumannii",
      so_luong: "10^6 CFU/ml",
      ket_qua_duong_tinh: true,
      is_active: true,
      metadata: {
        unique_key: crypto.createHash("md5").update("PID-UAT-VAE_BA-UAT-VAE_BP-VAE-01_Acinetobacter baumannii").digest("hex")
      }
    },
    {
      ma_benh_nhan: "PID-UAT-SSI",
      ma_benh_an: "BA-UAT-SSI",
      ma_benh_pham: "BP-SSI-01",
      ho_ten_benh_nhan: "Phạm Thị Mổ",
      ngay_sinh: "1988-12-05",
      gioi_tinh: "Nữ",
      ngay_vao_vien: new Date("2026-05-11T10:00:00Z").toISOString(),
      ngay_lay_mau: new Date("2026-05-20T14:30:00Z").toISOString(),
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: "Dịch vết mổ (Surgical wound)",
      tac_nhan: "Staphylococcus aureus",
      so_luong: "Dương tính (Khá nhiều)",
      ket_qua_duong_tinh: true,
      is_active: true,
      metadata: {
        unique_key: crypto.createHash("md5").update("PID-UAT-SSI_BA-UAT-SSI_BP-SSI-01_Staphylococcus aureus").digest("hex")
      }
    },
    {
      ma_benh_nhan: "PID-UAT-BSI",
      ma_benh_an: "BA-UAT-BSI",
      ma_benh_pham: "BP-BSI-01",
      ho_ten_benh_nhan: "Đỗ Văn Máu",
      ngay_sinh: "1980-04-12",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-14T07:30:00Z").toISOString(),
      ngay_lay_mau: new Date("2026-05-21T08:45:00Z").toISOString(),
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: "Cấy máu (Blood culture)",
      tac_nhan: "Klebsiella pneumoniae",
      so_luong: "Dương tính (2/2 chai cấy)",
      ket_qua_duong_tinh: true,
      is_active: true,
      metadata: {
        unique_key: crypto.createHash("md5").update("PID-UAT-BSI_BA-UAT-BSI_BP-BSI-01_Klebsiella pneumoniae").digest("hex")
      }
    },
    // Multi-specimen sequential stayed records
    {
      ma_benh_nhan: "PID-UAT-SEC",
      ma_benh_an: "BA-UAT-SECONDARY-BSI",
      ma_benh_pham: "BP-SEC-UTI",
      ho_ten_benh_nhan: "Nguyễn UAT Dịch Tễ",
      ngay_sinh: "1972-11-25",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
      ngay_lay_mau: new Date("2026-05-15T09:30:00Z").toISOString(),
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: "Urine (Nước tiểu)",
      tac_nhan: "Escherichia coli",
      so_luong: "10^5 CFU/ml",
      ket_qua_duong_tinh: true,
      is_active: true,
      metadata: {
        unique_key: crypto.createHash("md5").update("PID-UAT-SEC_BA-UAT-SECONDARY-BSI_BP-SEC-UTI_Escherichia coli").digest("hex")
      }
    },
    {
      ma_benh_nhan: "PID-UAT-SEC",
      ma_benh_an: "BA-UAT-SECONDARY-BSI",
      ma_benh_pham: "BP-SEC-BSI",
      ho_ten_benh_nhan: "Nguyễn UAT Dịch Tễ",
      ngay_sinh: "1972-11-25",
      gioi_tinh: "Nam",
      ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
      ngay_lay_mau: new Date("2026-05-18T10:15:00Z").toISOString(),
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: "Cấy máu (Blood culture)",
      tac_nhan: "Escherichia coli",
      so_luong: "Dương tính",
      ket_qua_duong_tinh: true,
      is_active: true,
      metadata: {
        unique_key: crypto.createHash("md5").update("PID-UAT-SEC_BA-UAT-SECONDARY-BSI_BP-SEC-BSI_Escherichia coli").digest("hex")
      }
    }
  ];

  console.log("[Seed UAT] Đang chèn kết quả cấy dương tính LIS...");
  const { data: insertedLis, error: lisErr } = await sb
    .from("nkbv_fact_vi_sinh")
    .insert(uatViSinh)
    .select();
  if (lisErr) throw lisErr;

  // 6. Create corresponding KSNK Events manually for robust tests
  const uatEvents = (insertedLis || []).map((r) => {
    const maCa = `NK-${r.ma_benh_an}-${r.ma_benh_pham}`;
    let viTri = "BSI";
    let loaiCode = "BSI";
    const lower = (r.loai_benh_pham || "").toLowerCase();
    
    if (lower.includes("tiểu") || lower.includes("urine")) {
      viTri = "Đường tiết niệu";
      loaiCode = "UTI";
    } else if (
      lower.includes("đờm") ||
      lower.includes("phế quản") ||
      lower.includes("phế nang") ||
      lower.includes("phổi") ||
      lower.includes("hút") ||
      lower.includes("sputum") ||
      lower.includes("bronchial")
    ) {
      viTri = "Đường hô hấp";
      loaiCode = "VAE";
    } else if (
      lower.includes("mủ") ||
      lower.includes("vết mổ") ||
      lower.includes("vết thương") ||
      lower.includes("dịch vết mổ") ||
      lower.includes("surgical") ||
      lower.includes("wound") ||
      lower.includes("pus")
    ) {
      viTri = "Vết mổ";
      loaiCode = "SSI";
    } else {
      viTri = "Máu";
      loaiCode = "BSI";
    }

    return {
      ma_ca: maCa,
      khoa_ghi_nhan_id: r.khoa_yeu_cau_id,
      ma_benh_nhan: r.ma_benh_nhan,
      ho_ten_benh_nhan: r.ho_ten_benh_nhan,
      ngay_sinh: r.ngay_sinh,
      gioi_tinh: r.gioi_tinh,
      ngay_vao_vien: r.ngay_vao_vien,
      ngay_phat_hien: r.ngay_lay_mau ? r.ngay_lay_mau.slice(0, 10) : new Date().toISOString().slice(0, 10),
      vi_tri_nhiem_khuan: viTri,
      tac_nhan_vi_khuan: r.tac_nhan,
      clinical_notes: {
        tom_tat_dien_bien: `Tự động tạo sự kiện giám sát từ kết quả vi sinh dương tính: cấy phát hiện ${r.tac_nhan} trong mẫu ${r.loai_benh_pham}.`,
        bien_phap_phong_ngua: null,
        ly_do_loai_tru: null,
      },
      vi_sinh_record_id: r.id,
      verification_data: {},
      loai_nkbv_id: getCategoryId(loaiCode),
      trang_thai_id: defaultStatusId,
      nguoi_ghi_id: null,
      ma_benh_an: r.ma_benh_an,
      ma_benh_pham: r.ma_benh_pham,
      loai_benh_pham: r.loai_benh_pham,
      so_luong: (r as any).so_luong || null,
      is_active: true
    };
  });

  console.log("[Seed UAT] Đang chèn các sự kiện nhiễm khuẩn...");
  const { error: eventErr } = await sb.from("nkbv_fact_su_kien").insert(uatEvents);
  if (eventErr) throw eventErr;

  console.log("\n--- KẾT QUẢ SEED UAT ĐỒNG BỘ NKBV THÀNH CÔNG ---");
  console.log("Đã tạo thành công 5 đợt bệnh án vật lý với các kịch bản kiểm thử độc lập:");
  console.log("  1. BA-UAT-UTI: Ca cấy nước tiểu (Pseudomonas aeruginosa) -> Kiểm thử chẩn đoán CAUTI.");
  console.log("  2. BA-UAT-VAE: Ca cấy đờm (Acinetobacter baumannii) -> Kiểm thử chẩn đoán VAE/VAP.");
  console.log("  3. BA-UAT-SSI: Ca cấy dịch mổ (Staphylococcus aureus) -> Kiểm thử chẩn đoán SSI.");
  console.log("  4. BA-UAT-BSI: Ca cấy máu (Klebsiella pneumoniae) -> Kiểm thử chẩn đoán CLABSI.");
  console.log("  5. BA-UAT-SECONDARY-BSI: 2 mẫu cấy (Nước tiểu ngày 15/05, Cấy máu ngày 18/05 - E. coli) -> Kiểm thử Secondary BSI & Phân tích tuần tự.");
  console.log("\n💡 Bạn đã có thể mở tab 'Hồ sơ Bệnh án', gõ tìm kiếm và trải nghiệm toàn bộ thuật toán lâm sàng!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
