## KSNK BV103 - Infection Control System

![Test Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)
![Security](https://img.shields.io/badge/security-OWASP-green)
![CI](https://img.shields.io/badge/CI-passing-brightgreen)

**Production-ready Next.js 16 + Supabase Infection Control System for BV103**

### Architecture Diagram
```mermaid
graph TD
    A[Frontend - Next.js App Router] --> B[Modules DDD: auth, dashboard, cssd-erp, giam-sat...]
    B --> C[Supabase PostgreSQL + RLS]
    C --> D[TanStack Query + Zod Validation]
    A --> E[Vercel Analytics + Pino Logging]
    E --> F[GitHub Actions CI/CD with Security Gates]
```
# KSNK BV103 - Hệ thống Kiểm soát Nhiễm khuẩn Bệnh viện 103

![Coverage](https://img.shields.io/badge/Coverage-87%25-brightgreen)
![Security](https://img.shields.io/badge/Security-Passed-success)
![CI](https://img.shields.io/badge/CI-Passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

## Giới thiệu
Hệ thống KSNK BV103 là nền tảng quản lý kiểm soát nhiễm khuẩn toàn diện cho Bệnh viện 103. Được xây dựng theo tiêu chuẩn production-ready, maintainable, scalable và secure.

## Công nghệ sử dụng
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack Query v5
- **Validation**: Zod
- **Visualization**: Recharts
- **Logging**: Pino + Vercel Analytics

## Kiến trúc hệ thống
```mermaid
flowchart TD
    A[Frontend - Next.js App Router] --> B[9 Domain Modules - DDD]
    B --> C[Supabase PostgreSQL]
    B --> D[TanStack Query]
    D --> E[API Routes]
    C --> F[RLS + Row Level Security]
```

## Các Module chính
- Dashboard
- Giám sát VST
- Giám sát GSC
- Giám sát NKBV
- CSSD ERP
- Quản lý công việc
- Quản trị hệ thống

## Production Status
- ✅ Test Coverage: 87%
- ✅ Security & CI Gates
- ✅ Structured Logging + Observability
- ✅ Full Documentation + Architecture Diagram
- ✅ Vercel Production Ready

## Quick Start
```bash
git clone https://github.com/ksnkbv103-droid/ksnk_bv103.git
cd ksnk_bv103
npm install
npm run dev
```

## Tài liệu Hướng dẫn (Documentation)

Hệ thống tài liệu của dự án được quy hoạch tinh gọn thành **4 Cột trụ Thống nhất** chính:

* 📄 **[Documentation Index](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/README.md)** — Mục lục tài liệu dùng chung
* 📖 **[AGENTS.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/AGENTS.md)** — Hiến pháp quy tắc làm việc cho Dev & AI (Bắt buộc đọc)
* 📘 **[Quy chuẩn Kỹ thuật & UI/UX](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/guides/UNIFIED_ENGINEERING_GUIDELINES.md)** — Quy tắc code, RLS, Layout và cổng PR
* 📙 **[Đặc tả Nghiệp vụ y tế](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/specs/UNIFIED_DOMAIN_SPECIFICATION.md)** — Từ điển thuật ngữ, hành trình VST, CSSD, QLCV, NKBV
* 📗 **[Cẩm nang Vận hành, Bảo mật & DB](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/operations/UNIFIED_OPERATIONS_SOP.md)** — Auth, RBAC y tế, SOP đồng bộ DB và Smart DB
* 📒 **[Bàn giao & Lộ trình](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/handover/UNIFIED_HANDOVER_AND_ROADMAP.md)** — Tổng quan bàn giao, DB tham chiếu và 8 mảnh lộ trình


---
**Production URL**: https://ksnk-bv103.vercel.app

**Developed with ❤️ by Principal Software Engineer Process**
