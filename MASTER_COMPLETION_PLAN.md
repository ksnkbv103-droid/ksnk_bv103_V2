# MASTER COMPLETION PLAN — KSNK BV103

> **Phiên bản:** 2026-05-19 (Principal Engineer Review)  
> **Mục tiêu:** Biến repo thành production-ready, maintainable, scalable, secure, developer-friendly theo chuẩn 2025-2026.  
> **Quy trình:** Tuân thủ nghiêm ngặt 6 Giai đoạn Full Project Completion + Boy Scout Rule + OWASP + Test ≥80% + ADR.  
> **Branching:** GitHub Flow + tên nhánh `complete/[module]-[mô-tả]` hoặc `fix/[issue]`. Mọi thay đổi qua PR <300 lines.  

---

## Giai đoạn 1: Full Repo Onboarding & Deep Analysis (Đã hoàn thành 2026-05-19)

### Current State (từ static analysis + đọc toàn bộ key files)
- **Loại dự án**: Next.js 16.2.4 (App Router) + React 19 + TypeScript + Supabase (PostgreSQL + RLS + RPC) + TanStack Query v5 + Zod + Recharts.
- **Domain**: Hệ thống Kiểm soát Nhiễm khuẩn Bệnh viện 103 (KSNK BV103) — Quản lý VST, GSC, NKBV, CSSD ERP, Quản lý công việc (QLCV), Quản trị (MDM).
- **Kiến trúc**: DDD với `src/modules/<bounded-context>/` (actions, components, hooks, lib, types). SSOT quyền tại `permission-registry.ts`, `verifyPermission`. Server Actions + proxy.ts.
- **Governance & DX**: 
  - `AGENTS.md` (V8) — luật lệ chặt chẽ cho AI/dev (ưu tiên luồng nghiệp vụ ổn định + dữ liệu khớp DB).
  - `PROGRESS_REPORT.md` — phát triển theo **mảnh (slice)** + Pilot DoD (5 tiêu chí bắt buộc).
  - `.github/workflows/ci.yml` — Trufflehog secret scan, npm audit high, lint + lint:cssd-architecture, vitest coverage, verify:engineering, build, e2e (continue-on-error).
  - Hàng loạt script `package.json` cho MDM, CSSD audit, engineering gate, env bootstrap/check, pilot prep.
- **Trạng thái production**: Deployed on Vercel (https://ksnk-bv103.vercel.app). Badge coverage 87%, Security Passed.
- **Test & Quality**: Vitest + Playwright. Nhiều domain test (CSSD policy, state engine, NKBV aggregate). Engineering contract gate.
- **DB**: 98+ migrations (theo handover), nhiều RPC, fact_*, mdm_*, dm_*. RLS, index perf.
- **Recent Review (2026-05-18)**: Đánh giá 3–4/5 các khía cạnh. Kết luận: **Đủ nền tảng pilot theo mảnh**, không cần đập lại. Đã áp dụng nhiều fix lint, thêm test NKBV, cải thiện CI, handover.

### Gaps & Technical Debt (phát hiện)
- **Docs**: `MASTER_COMPLETION_PLAN.md` chỉ placeholder. Thiếu `CHANGELOG.md` (Keep a Changelog). Một số link README (DEPLOYMENT.md) có thể thiếu. Migration history có tên "fix" → khó đọc.
- **CI/CD**: e2e job `continue-on-error: true` → không chặn merge nếu fail. Chưa có dependency review hoặc SBOM.
- **DB/ Ops**: Migration history dài, cần catalog RPC + SOP apply rõ ràng hơn. DB pilot sync vẫn là rủi ro (như PROGRESS_REPORT ghi nhận).
- **Code**: Một số page.tsx có thể dài; UI drift theo LEAN_EXECUTION. Nhiều script custom cần maintain.
- **Coverage & Test**: Claim 87% nhưng cần verify thực tế trên CI. Thiếu golden test cho một số KPI/analytics.
- **Security**: npm audit trong CI tốt, nhưng cần theo dõi deps (Next 16, Supabase). Chưa explicit OWASP checklist trong ADR.
- **Observability**: Pino + Vercel Analytics có, nhưng cần structured logging nhất quán hơn.
- **No new debt**: Hiện tại không phát hiện debt mới nghiêm trọng; repo khá kỷ luật.

### Prioritized Backlog (Security → Stability → Coverage → DX → Features → Polish)
**Critical (P0 - ổn định pilot hiện tại)**
- Duy trì VST, GSC, QLCV, CSSD pilot slices chạy ổn (không regression).
- Đảm bảo DB migrations/RPC apply đúng trên pilot env.

**High (P1)**
- Cập nhật docs đầy đủ (Master Plan, CHANGELOG, RPC catalog, migration SOP).
- Cải thiện CI: e2e strict hoặc thêm check status, thêm dep audit.
- Pilot DoD cho mảnh ACTIVE hiện tại (nếu chưa).

**Medium (P2)**
- Catalog RPC đang dùng (1 trang).
- Sơ đồ state machine cho CSSD + QLCV.
- Harden permission & RLS audit.
- Thêm test cho NKBV full + KPI golden.

**Polish (P3)**
- UI polish mobile, layout drift fix theo script.
- Refactor dài page → views/lib (khi chạm file).
- Performance: bundle dashboard, RPC explain.
- ADR cho mọi thay đổi lớn.

---

## Giai đoạn 2: Master Completion Plan (Đang cập nhật)
- **Branching Strategy**: GitHub Flow. Tên nhánh: `complete/[module-short]-[desc]` (vd: complete/phase1-docs-update). PR < 300 LOC, có test/verify, mô tả Why-What-How, migration nếu cần.
- **ADR**: Tạo `docs/adr/` khi thay đổi lớn (ví dụ ADR-001 cho CI enhancement đã có dấu vết).
- **Ưu tiên**: Luôn theo slice ACTIVE trong PROGRESS_REPORT. Không mở nhiều mảnh cùng lúc.

## Giai đoạn 3-6: Thực thi & Delivery
- Thực thi từng PR nhỏ trên branch feature.
- Quality Gates: Luôn chạy `npm run verify:engineering` + build + lint trước PR.
- Final: Update README badges, full CHANGELOG, handover issue.
- Handover: Issue "Project Completion Complete" + next steps (monitoring, scaling, external audit).

**Nguyên tắc vàng áp dụng**: Boy Scout Rule — khi chạm file nào, để lại sạch hơn. Long-term DX & maintainability trên hết. Security & stability non-negotiable. Không introduce debt mới.

---

**Next Action**: Tạo PR cho docs update này. Sau đó rà soát chi tiết từng module đang active (VST/GSC/QLCV) và thực thi cleanup nhỏ an toàn.