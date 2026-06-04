SELECT category_type, code, name, metadata, is_active
FROM public.sys_lookup_value
WHERE is_active = true
ORDER BY category_type, code;
