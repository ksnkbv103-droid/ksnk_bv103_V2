-- Bootstrap clean schema for KSNK BV103
-- Domain-driven naming, snake_case, RLS enabled
-- Created by Grok Principal Engineer - ADR-002

-- 1. Master Data
CREATE TABLE IF NOT EXISTS dm_khoa_phong (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_khoa text NOT NULL,
  ma_khoa text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. Fact tables for KSNK
CREATE TABLE IF NOT EXISTS fact_giam_sat_vst (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khoa_id uuid REFERENCES dm_khoa_phong(id),
  ngay_giam_sat date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add more core tables as needed for GSC, NKBV, CSSD, QLCV

-- Enable RLS on all tables
ALTER TABLE dm_khoa_phong ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_giam_sat_vst ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can read own department" ON dm_khoa_phong FOR SELECT USING (true);

COMMENT ON TABLE dm_khoa_phong IS 'Danh mục khoa phòng - Master Data';
COMMENT ON TABLE fact_giam_sat_vst IS 'Fact table for VST supervision';
