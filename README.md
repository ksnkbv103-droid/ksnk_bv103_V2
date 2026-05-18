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