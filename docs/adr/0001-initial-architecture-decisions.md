# ADR 0001: Initial Architecture Decisions

**Status**: Accepted  
**Date**: 2026-05-18  
**Deciders**: ksnkbv103-droid team

## Context and Problem Statement

Xây dựng hệ thống KSNK (Giám sát Kiểm soát Nhiễm khuẩn) cho Bệnh viện 103 với yêu cầu:
- Modular architecture rõ ràng
- Strong governance & permission control
- Sử dụng Supabase làm backend
- Next.js App Router frontend
- High maintainability cho pilot 4 modules và mở rộng sau này

## Decision Drivers

- Cần tốc độ phát triển nhanh nhưng vẫn giữ chất lượng cao
- Phải có RBAC mạnh và audit-friendly
- Dễ onboarding developer mới
- Tuân thủ các best practices enterprise

## Decision Outcome

**Chosen options**:
1. **Modular Monolith** với folder `src/modules/` theo bounded context
2. **Supabase** làm primary backend (Postgres + RLS + RPC + Auth)
3. **Permission Registry** làm Single Source of Truth cho quyền
4. **Lean Execution + Governance Pipeline** mạnh
5. Sử dụng TypeScript nghiêm ngặt + comprehensive documentation (AGENTS.md V8)

**Positive Consequences**:
- Kiến trúc rõ ràng, dễ scale module
- Permission management tập trung
- Documentation & automation rất mạnh

**Negative Consequences**:
- Chưa có ADR system → khó trace decision history
- Observability và security scanning chưa đầy đủ (đang khắc phục)

## Links
- AGENTS.md V8
- docs/specs/