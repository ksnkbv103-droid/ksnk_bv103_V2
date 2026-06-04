SELECT id, category_type, code, name
FROM public.sys_lookup_value
WHERE is_active = true
  AND category_type NOT IN ('KHU_VUC_GIAM_SAT', 'TRAM_CSSD', 'KHOI_KHOA', 'LOAI_CONG_VIEC', 'TRANG_THAI_CONG_VIEC', 'TRANG_THAI_NKBV_CA', 'LOAI_NKBV')
ORDER BY category_type, code;
