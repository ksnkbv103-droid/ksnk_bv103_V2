"# RÀ SOÁT TỔNG THỂ HỆ THỐNG KSNK BV103

> **Ngày rà soát:** 2026-05-30 | **Phạm vi:** Toàn bộ app, DB, domain, migration  
> **Phương pháp:** Phân tích tĩnh code + schema migration baseline (444KB, 11.747 dòng SQL)

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Bản đồ Domain nghiệp vụ](#2-bản-đồ-domain-nghiệp-vụ)
3. [Cấu trúc Database chi tiết](#3-cấu-trúc-database-chi-tiết)
4. [Cấu trúc App & Code](#4-cấu-trúc-app--code)
5. [Cách thức vận hành & tương tác cấu phần](#5-cách-thức-vận-hành--tương-tác-cấu-phần)
6. [Phân tích Migration gần đây](#6-phân-tích-migration-gần-đây)
7. [Kiểm toán nợ kỹ thuật](#7-kiểm-toán-nợ-kỹ-thuật)
8. [Đề xuất cải tiến toàn diện](#8-đề-xuất-cải-tiến-toàn-diện)
9. [Kết luận & lộ trình ưu tiên](#9-kết-luận--lộ-trình-ưu-tiên)

---

## 1. Tổng quan hệ thống

### 1.1 Mục đích
**KSNK BV103** (Kiểm soát Nhiễm khuẩn — Bệnh viện Quân y 103) là hệ thống quản lý chất lượng kiểm soát nhiễm khuẩn bệnh viện, bao gồm:
- Giám sát tuân thủ vệ sinh tay (WHO 5 thời điểm)
- Giám sát tuân thủ bảng kiểm KSNK tổng quát
- Giám sát nhiễm khuẩn bệnh viện (HAI/NKBV) theo chuẩn CDC/NHSN
- Quản lý quy trình CSSD (Central Sterile Supply Department)
- Quản lý công việc KSNK
- Dashboard phân tích chiến lược

### 1.2 Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|:--|:--|:--|
| Framework | Next.js (App Router) | 16.2.6 |
| UI | React + TailwindCSS 4 | React 19.2.6 |
| Database | Supabase (PostgreSQL) | supabase-js 2.106 |
| Auth | Supabase Auth + SSR | @supabase/ssr 0.10 |
| State | TanStack React Query | 5.100 |
| Forms | React Hook Form + Zod | RHF 7.66 + Zod 4.4 |
| Charts | Recharts | 3.8 |
| Testing | Vitest + Playwright | Vitest 4.1, Playwright 1.57 |
| Deploy | V
<truncated 42570 bytes>