-- 20260507005_scientific_workflow_traceability.sql
-- Nâng cấp hệ thống quản trị khoa học: Công việc & CSSV Traceability

-- 1. Nâng cấp bảng Công việc (fact_cong_viec)
ALTER TABLE "public"."fact_cong_viec" 
ADD COLUMN IF NOT EXISTS "ma_uu_tien" text DEFAULT 'TRUNG_BINH',
ADD COLUMN IF NOT EXISTS "estimated_hours" numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}';

COMMENT ON COLUMN "public"."fact_cong_viec"."ma_uu_tien" IS 'Độ ưu tiên: KHAN, CAO, TRUNG_BINH, THAP';
COMMENT ON COLUMN "public"."fact_cong_viec"."estimated_hours" IS 'Thời gian dự kiến thực hiện (giờ)';
COMMENT ON COLUMN "public"."fact_cong_viec"."tags" IS 'Nhãn dán công việc để phân loại nhanh';

-- 2. Tạo bảng Danh mục Vị trí kho (dm_vi_tri_kho)
CREATE TABLE IF NOT EXISTS "public"."dm_vi_tri_kho" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "ma_vi_tri" text UNIQUE NOT NULL,
    "ten_vi_tri" text NOT NULL,
    "ghi_chu" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."dm_vi_tri_kho" OWNER TO "postgres";
COMMENT ON TABLE "public"."dm_vi_tri_kho" IS 'Danh mục vị trí lưu kho dụng cụ vô khuẩn (Kệ, Tầng, Ô)';

-- 3. Nâng cấp bảng Quy trình (fact_quy_trinh) để truy vết sâu
ALTER TABLE "public"."fact_quy_trinh" 
ADD COLUMN IF NOT EXISTS "ma_ca_mo_id" text,
ADD COLUMN IF NOT EXISTS "vi_tri_kho_id" uuid REFERENCES "public"."dm_vi_tri_kho"("id"),
ADD COLUMN IF NOT EXISTS "ngay_het_han" timestamp with time zone;

COMMENT ON COLUMN "public"."fact_quy_trinh"."ma_ca_mo_id" IS 'Truy vết dụng cụ đến từng ca mổ/bệnh nhân';
COMMENT ON COLUMN "public"."fact_quy_trinh"."vi_tri_kho_id" IS 'Vị trí lưu trữ bộ dụng cụ sau khi tiệt khuẩn';
COMMENT ON COLUMN "public"."fact_quy_trinh"."ngay_het_han" IS 'Hạn sử dụng của bộ dụng cụ (tính từ ngày tiệt khuẩn đạt)';

-- 4. Nâng cấp bảng Loại dụng cụ (dm_loai_dung_cu) để hỗ trợ tính hạn dùng
ALTER TABLE "public"."dm_loai_dung_cu" 
ADD COLUMN IF NOT EXISTS "so_ngay_han_dung" integer DEFAULT 30;

COMMENT ON COLUMN "public"."dm_loai_dung_cu"."so_ngay_han_dung" IS 'Số ngày hạn dùng mặc định sau khi tiệt khuẩn';

-- 5. Cập nhật View v_fact_quy_trinh_full để hiển thị thông tin mới (nếu cần)
-- Lưu ý: v_fact_quy_trinh_full thường được định nghĩa lại trong migration remote_schema. 
-- Ở đây ta chỉ thêm cột vào bảng fact, view select * sẽ tự nhận (tùy cấu hình Postgres).
