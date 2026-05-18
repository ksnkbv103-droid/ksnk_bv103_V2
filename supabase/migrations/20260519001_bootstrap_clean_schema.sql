-- Bootstrap clean schema for KSNK BV103
-- Domain-driven naming, snake_case, proper RLS

-- 1. Master Data (dm_)
CREATE TABLE IF NOT EXISTS dm_khoa_phong (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_khoa text UNIQUE NOT NULL,
  ten_khoa text NOT NULL,
  loai_khoa text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Fact tables for core KSNK modules
CREATE TABLE IF NOT EXISTS fact_vst (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_benh_nhan text,
  ten_benh_nhan text,
  khoa_id uuid REFERENCES dm_khoa_phong(id),
  thoi_diem timestamp with time zone,
  -- ... other fields
  created_at timestamptz DEFAULT now()
);

-- Add more core tables for GSC, NKBV, CSSD, QLCV...
-- RLS policies will be added in next migration

COMMENT ON TABLE dm_khoa_phong IS 'Danh mục khoa phòng';
COMMENT ON TABLE fact_vst IS 'Fact table cho giám sát VST';
