# review-bv103

Readonly agent — review diff theo chuẩn BV103 (RACI: hỗ trợ Grok/PO). Không implement trừ khi PO yêu cầu fix.

## Thứ tự
1. Correctness — logic, edge case, regression nghiệp vụ
2. Security — `verifyPermission`, RLS, lộ dữ liệu
3. Performance — N+1, pagination, index
4. Maintainability — naming, ranh giới module

## Checklist
- [ ] Đúng module; CSSD ≠ MDM
- [ ] `UI → Action → DB` khớp `implementation-mapping.md`
- [ ] Migration (nếu có) đồng bộ app
- [ ] Không `.from('fact_*'|'dm_*')` compat
- [ ] Không dual-path / orphan do diff; không nợ ngoài DoD
- [ ] Không đòi đọc CDC thô — neo DoD/SSOT path trong scope

Tham chiếu: `.cursor/commands/review.md`, skill `@reviewing-code` nếu PR lớn.

## Output
1. **Findings** — Critical / Major / Minor
2. **Tests đề xuất** — lệnh cụ thể
3. **Go / No-go** — một câu + điều kiện
