-- Business views for KSNK hotpath
-- VST, GSC, NKBV dashboard views

CREATE OR REPLACE VIEW vw_vst_hotpath AS
SELECT * FROM fact_giam_sat_vst;

-- Add more views for GSC, NKBV, CSSD, QLCV

COMMENT ON VIEW vw_vst_hotpath IS 'Hotpath view for VST dashboard';
