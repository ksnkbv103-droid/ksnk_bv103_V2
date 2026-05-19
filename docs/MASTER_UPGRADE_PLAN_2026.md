# MASTER UPGRADE PLAN 2026 - KSNK BV103

**Mục tiêu**: Nâng cấp toàn diện repository thành Production-grade, Maintainable, Scalable, Secure với tốc độ cao.

## 1. Domain Layer (Business Logic)
- Triển khai Domain-Driven Design chặt chẽ hơn (Entities, Value Objects, Domain Events)
- Tách Business Rules ra khỏi application layer
- Thêm Domain Services cho các luồng phức tạp (VST, CSSD, QLCV...)

## 2. Application Layer
- Sử dụng Server Actions + React Server Components mạnh mẽ hơn
- Áp dụng Partial Prerendering (PPR) cho performance
- Tối ưu TanStack Query + caching strategy
- Thêm proper error boundaries và logging

## 3. Database & Data Layer (Supabase)
- Review và tối ưu RLS (Row Level Security)
- Thêm database indexes cho query thường dùng
- Tách read/write models nếu cần
- Thêm audit logging cho các bảng quan trọng
- Migration strategy rõ ràng

## 4. UI / Presentation Layer
- Tăng traceability (comment mapping nghiệp vụ → component → action)
- Component library nhất quán + Storybook (nếu có thể)
- Accessibility (a11y) cải thiện
- Performance optimization (React.memo, useCallback, virtualization)

**Kế hoạch thực hiện**: Thực hiện theo module, bắt đầu từ Database + Core Domain.

PR sẽ được tạo theo từng phần rõ ràng.