# KSNK BV103 — Hệ thống Kiểm soát Nhiễm khuẩn

Nền tảng quản lý KSNK cho Bệnh viện 103, đang trong **giai đoạn pilot** với khung governance cấp enterprise (migration SSOT, verify gates, visual language có drift-check). **Chưa phải production toàn bệnh viện** — triển khai theo wave W1 → W2 → W3.

## Trạng thái pilot

| Wave | Env | Module |
|------|-----|--------|
| **W1** (go-live) | Staging → Prod, `KSNK_PILOT_CORE_MODULES=1` | **MDM** (quản trị) + **GSC/VST** (giám sát) + **QLCV** (công việc) |
| **W2** (CSSD UAT) | Staging, tắt flag pilot | + **CSSD** (quy trình, hóa chất, thiết bị, cycle QR) |
| **W3** (mở rộng) | Prod | + **NKBV**, **Dashboard** (khi checklist pass) |

Chi tiết ký go-live: [`docs/core/pilot-go-live-signoff-202606.md`](docs/core/pilot-go-live-signoff-202606.md) · [`docs/core/pilot-core-modules-go-live.md`](docs/core/pilot-core-modules-go-live.md)

## Công nghệ

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend / DB:** Supabase (PostgreSQL + Auth + RLS)
- **State & validation:** TanStack Query v5, Zod
- **Deploy:** Vercel (preview staging)

## Quick start

```bash
cp .env.example .env.local
npm install
npm run trial:prep   # local Supabase + seed (cần Docker)
npm run dev
```

## Verify & go-live gates

```bash
npm run verify                  # lint + layout drift + CSSD + engineering + build
npm run verify:engineering      # contract app ↔ DB (bắt buộc trước push action/fact_*)
npm run pilot:go-live:gate      # linked: precheck DB/auth + verify + smoke
npm run pilot:go-live:gate:local
```

Pipeline schema & ship: [`docs/core/governance-pipeline.md`](docs/core/governance-pipeline.md) · Demo terminal gates: [`docs/core/demo-governance-gates.md`](docs/core/demo-governance-gates.md)

## Tài liệu cốt lõi

| Tài liệu | Mục đích |
|----------|----------|
| [`AGENTS.md`](AGENTS.md) | Cổng ship code — quy tắc agent & dev |
| [`docs/core/architecture-one-pager.md`](docs/core/architecture-one-pager.md) | Tổng quan kiến trúc một trang |
| [`docs/core/domain-specification.md`](docs/core/domain-specification.md) | Đặc tả nghiệp vụ y tế |
| [`docs/core/implementation-mapping.md`](docs/core/implementation-mapping.md) | Ánh xạ spec ↔ module ↔ bảng DB |
| [`docs/reference/guides/bv103-visual-language.md`](docs/reference/guides/bv103-visual-language.md) | Design tokens & layout governance |
| [`docs/README.md`](docs/README.md) | Mục lục tài liệu đầy đủ |

## Cấu trúc mã nguồn (tóm tắt)

```
src/app/          # Route mỏng
src/modules/      # DDD: quan-tri-he-thong, giam-sat-*, cssd-erp, quan-ly-cong-viec, dashboard, …
src/lib/          # RBAC, domain thuần, analytics mappers
supabase/         # Migrations (SSOT schema)
```

---

**Staging:** https://ksnk-bv103.vercel.app
