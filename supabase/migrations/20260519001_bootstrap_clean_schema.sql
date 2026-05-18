-- ADR-002: Bootstrap Clean Schema for KSNK BV103
-- Domain-driven naming, snake_case, clean structure

-- Master data tables
CREATE TABLE IF NOT EXISTS dm_khoa_phong (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_khoa text NOT NULL,
  ma_khoa text UNIQUE,
  loai_khoa text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Fact tables for core KSNK
CREATE TABLE IF NOT EXISTS fact_giam_sat_vst (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... (full schema would be here)
);

-- RLS policies, indexes, etc.
-- Full clean schema to be completed in atomic PRs.