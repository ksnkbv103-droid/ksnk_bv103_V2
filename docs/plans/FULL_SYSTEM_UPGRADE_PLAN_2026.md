# FULL SYSTEM UPGRADE PLAN - KSNK BV103 (2026)

## 1. Mục tiêu
- Production-ready, Scalable, Secure, Maintainable cao nhất.
- Siết chặt Alignment: Nghiệp vụ ↔ Domain ↔ Data ↔ UI.

## 2. Phân tích hiện tại (Tóm tắt)
- Domain: Đã có module DDD tốt nhưng cần rõ Bounded Context hơn.
- App: Next.js 16 App Router ổn, nhưng chưa tối ưu Server Components & Caching.
- Database: Supabase với fact_* tables, cần RLS mạnh, indexing, materialized views.
- UI: Recharts + custom components, cần design system nhất quán.

## 3. Giải pháp Nâng cấp Toàn diện

### Domain & Business Logic
- Áp dụng DDD mạnh: Bounded Contexts rõ ràng (VST, CSSD, QLCV, NKBV...).
- Event-Driven Architecture cho real-time events.
- Domain Events + Outbox Pattern.

### Application Architecture
- Tối ưu Server Components + Server Actions.
- Partial Prerendering & Streaming.
- TanStack Query + React Cache tối ưu.
- Zod + tRPC hoặc Server Actions thuần.

### Database & Data Layer
- Siết RLS theo nghiệp vụ.
- Materialized Views cho báo cáo performance.
- Comprehensive indexing strategy.
- Audit trail + Temporal tables.
- Supabase Edge Functions cho complex logic.

### UI / Frontend
- Triển khai Design System (Shadcn + Tailwind + Radix).
- Accessibility AA+.
- Real-time UI với Supabase Realtime.
- Performance optimization (lazy loading, virtualization).

### Security & Observability
- OWASP Top 10 full coverage.
- Structured Logging + Monitoring.
- Rate limiting, WAF.

### Testing & CI/CD
- Tăng test coverage >90%.
- E2E tests với Playwright.

## 4. Roadmap ưu tiên
1. Security & RLS hardening
2. Alignment & Traceability
3. Performance & Scalability
4. UI/UX Professionalization
5. Observability

**Thực hiện theo Mode A: Batch PR lớn nhưng rõ ràng.**