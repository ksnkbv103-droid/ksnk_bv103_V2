// src/app/quan-tri-he-thong/page.tsx
import React, { Suspense } from "react";
import QuanTriDanhMucPage from "@/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import { canAccessQuanTriHub } from "@/lib/auth/quan-tri-access";

export const metadata = { title: "Quản trị hệ thống" };

/**
 * AR-8g: cổng chỉ đặt ở hub (không ở layout) — các đường dẫn cũ dưới `/quan-tri-he-thong/*`
 * là redirect sang module sở hữu, trang đích tự kiểm quyền; tai-khoan / phan-quyen tự gác.
 */
export default async function QuanTriHeThongPage() {
  const allowed = await canAccessQuanTriHub();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần vai trò quản trị, quyền PHAN_QUYEN (tài khoản, phân quyền) hoặc DANH_MUC (hệ thống). Khoa phòng, nhân sự, bảng kiểm, danh mục CSSD sửa trong module tương ứng." />
    );
  }
  return (
    <div className="bv103-stack-page pb-12 animate-in fade-in duration-500">
      <Suspense
        fallback={
          <div className="flex min-h-[160px] items-center justify-center" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
          </div>
        }
      >
        <QuanTriDanhMucPage />
      </Suspense>
    </div>
  );
}
