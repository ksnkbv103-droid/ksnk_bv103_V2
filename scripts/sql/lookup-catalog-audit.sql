SELECT category_type, COUNT(*) AS cnt,
       array_agg(code ORDER BY code) FILTER (WHERE is_active) AS active_codes_sample
FROM (
  SELECT category_type, code, is_active,
         row_number() OVER (PARTITION BY category_type ORDER BY code) AS rn
  FROM public.sys_lookup_value
  WHERE is_active
) t
WHERE rn <= 5
GROUP BY category_type
ORDER BY category_type;
