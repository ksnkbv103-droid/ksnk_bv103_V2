# Architecture Overview - KSNK BV103

> Phiên bản sau khi dọn dẹp - 19/05/2026

## Công nghệ chính

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI
- **Backend & Database**: Supabase (PostgreSQL + RLS + RPC)
- **State Management**: TanStack Query v5
- **Validation**: Zod
- **Charts**: Recharts
- **Deploy**: Vercel

## Kiến trúc tổng thể

### DDD (Domain-Driven Design)
Dự án được tổ chức theo bounded context trong `src/modules/`:

- `auth`
- `dashboard`
- `giam-sat-vst`
- `giam-sat-chung`
- `giam-sat-nkbv`
- `cssd-erp`
- `quan-ly-cong-viec`
- `quan-tri-he-thong`

Mỗi module có cấu trúc:
- `actions/`
- `components/`
- `hooks/`
- `lib/`
- `types/`

## Nguyên tắc thiết kế

- **Server Actions** là lớp chính giao tiếp với DB
- **verifyPermission** là gate bắt buộc cho mọi hành động ghi
- **RLS (Row Level Security)** trên Supabase để kiểm soát quyền
- **Migration** bắt buộc khi thay đổi schema
- **Soft delete** ưu tiên thay vì xóa cứng (trừ trường hợp đặc biệt)

## Luồng dữ liệu

UI → Server Action → verifyPermission → Supabase (RPC / Table)

## Observability

- Structured logging (Pino)
- Vercel Analytics
- Engineering Contract Gate trong CI