-- Core domain RLS policies for KSNK
-- ADR-002

-- Add RLS for all core tables
ALTER TABLE IF EXISTS fact_giam_sat_vst ENABLE ROW LEVEL SECURITY;

-- Policy examples
CREATE POLICY "Authenticated read" ON fact_giam_sat_vst FOR SELECT USING (auth.role() = 'authenticated');

-- More policies for GSC, NKBV, CSSD
