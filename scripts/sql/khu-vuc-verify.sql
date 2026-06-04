SELECT code, name, metadata->>'nhom_mau' AS nhom, is_active
FROM public.sys_lookup_value
WHERE category_type = 'KHU_VUC_GIAM_SAT'
ORDER BY (metadata->>'thu_tu')::int NULLS LAST, code;
