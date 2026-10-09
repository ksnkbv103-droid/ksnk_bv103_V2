# Kế hoạch tách PR — Vertical slices unstaged

> **Phiên bản:** 1.0 (30/05/2026)  
> **Mục đích:** Hướng dẫn tách diff lớn trên branch hiện tại thành PR reviewable theo bounded context.  
> **Lưu ý:** Chỉ commit khi owner yêu cầu — tài liệu này là SSOT quy trình, không tự động commit.

---

## Thứ tự đề xuất (4 PR)

### PR-1 — Architecture & ops foundation (độc lập)

**Phạm vi:**
- `docs/reference/architecture/*`
- `docs/reference/guides/migration-squash-runbook.md`
- `supabase/seeds/`, `supabase/config.toml`
- `supabase/migrations/20260530100000_drop_view_compat_aliases.sql`
- `scripts/generate-pilot-seeds.ts`, `scripts/migrate-view-alias-names.mjs`
- `.github/workflows/ci.yml` (verify:cssd, layout:drift-check)
- Cập nhật `docs/core/domain-specification.md`, changelog mapping

**Verify:** `npm run docs:links:check`, `npx supabase db reset --local`, `npm run verify:engineering`

---

### PR-2 — View alias cleanup (Phase 1)

**Phạm vi:** Toàn bộ `src/**` đổi `v_fact_*` / `v_dm_*` → prefix views (đã grep sạch).

**Verify:** `npm run verify:engineering`, `npm run verify:cssd`

**Phụ thuộc:** PR-1 (migration DROP alias)

---

### PR-3 — GSC + VST + scoring

**Phạm vi:**
- `src/modules/giam-sat-chung/**`
- `src/modules/giam-sat-vst/**` (import `vst-constants` thay `data.ts`)
- `src/lib/domain/giam-sat-*`
- `docs/data/bang-kiem/**` (nếu cần seed/spec)

**Verify:** tests domain GSC/VST, `verify:engineering`

---

### PR-4 — NKBV clinical expansion

**Phạm vi:**
- `src/modules/giam-sat-nkbv/**`
- `docs/data/nkbv/algorithms/**`, `docs/modules/nkbv/clinical-forms.md`

**Verify:** rules engine specs, `verify:engineering`

---

### PR-5 — CSSD ERP + QLDCPT P0 (tuỳ chọn gộp PR-2)

**Phạm vi:**
- `src/modules/cssd-erp/**` (Digital BOM, ledger, facade)
- `src/modules/cssd-su-co/**` (nếu có diff liên quan)

**Verify:** `npm run verify:cssd`

---

### PR-6 — MDM gateway + admin slice

**Phạm vi:**
- `src/lib/mdm-read-gateway.ts`
- `src/modules/quan-tri-he-thong/**`

---

## Lệnh git gợi ý (interactive staging)

```bash
# Ví dụ PR-1 only
git add docs/reference/architecture docs/reference/guides/migration-squash-runbook.md \
  supabase/seeds supabase/config.toml \
  supabase/migrations/20260530100000_drop_view_compat_aliases.sql \
  scripts/generate-pilot-seeds.ts scripts/migrate-view-alias-names.mjs \
  .github/workflows/ci.yml \
  docs/core/domain-specification.md \
  docs/core/implementation-mapping.md
```

---

## Checklist trước merge mỗi PR

- [ ] `npm run verify:engineering` pass
- [ ] Diff chỉ file thuộc slice
- [ ] Changelog 1 dòng trong `implementation-mapping.md`
- [ ] Không secret / `.env` trong staging
