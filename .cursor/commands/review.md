# /review — Review diff trước commit/merge

Review thay đổi hiện tại (diff / file vừa sửa). **Không implement thêm** trừ khi user yêu cầu fix.

## Thứ tự review

1. **Correctness** — logic, edge case, regression nghiệp vụ
2. **Security / permission** — `verifyPermission`, RLS, lộ dữ liệu
3. **Performance** — query nặng, N+1, thiếu index/pagination
4. **Maintainability** — naming, ranh giới module, dead code do diff

## BV103 checklist nhanh

- [ ] Đúng module; không lẫn CSSD vs MDM
- [ ] `UI → Action → DB` khớp `docs/core/implementation-mapping.md`
- [ ] Migration (nếu có) + code app đồng bộ
- [ ] Không `.from('dm_*'|'fact_*')` compat cũ

## Output bắt buộc

1. **Findings** — theo mức độ: Critical / Major / Minor (không chắc → nêu cách kiểm chứng)
2. **Tests đề xuất** — cụ thể, có thể chạy được
3. **Go / No-go** — một câu + điều kiện nếu No-go

Trả lời ngắn gọn, ưu tiên findings trước giải thích dài.
