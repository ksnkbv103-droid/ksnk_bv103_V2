# /go-live-check — Cổng sẵn sàng vận hành (không deploy)

Readonly trừ khi PO bảo sửa. **Không** Vercel, **không** migrate remote/prod. **Không** đọc CDC thô — neo DoD/SSOT Grok đã chốt.

## Checklist
1. Domain SSOT repo khớp hành vi app?
2. FE ↔ Action ↔ DB + verifyPermission/RLS đường chính?
3. Verify đúng mức (`verify` / `verify:cssd` / `verify:engineering`)
4. ≥3 kịch bản tay (`/uat-cases` hoặc `@acceptance-ui`)
5. Không CRITICAL nợ mới (dual-path, bypass, đoán schema)
6. Migration chỉ local — prod chỉ khi PO yêu cầu

## Output
```markdown
## Go-live check — <module/luồng>
- Kết luận: SẴN SÀNG PILOT | CHƯA — thiếu …
- Evidence:
- Blocker P0/P1:
- Lát tiếp (1–3):
```
