-- Verify KHU_VUC_GIAM_SAT: không còn nhom_mau, chỉ thu_tu + chức năng phòng.
SELECT code, name, metadata->>'thu_tu' AS thu_tu, is_active
  FROM public.sys_lookup_value
 WHERE category_type = 'KHU_VUC_GIAM_SAT'
   AND is_active = true
 ORDER BY COALESCE((metadata->>'thu_tu')::integer, 999), name;
