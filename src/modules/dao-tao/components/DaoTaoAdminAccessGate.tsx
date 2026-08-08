"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { DaoTaoPage, DaoTaoPanel } from "@/modules/dao-tao/components/DaoTaoChrome";

/** Cổng quyền FE cho `/dao-tao/admin/*` — khớp hub (edit/create/import hoặc admin). */
export function DaoTaoAdminAccessGate({ children }: { children: React.ReactNode }) {
  const { allowed, isAdmin, loading } = useModulePermission("DAO_TAO");
  const canAdmin = isAdmin || allowed.edit || allowed.import || allowed.create;

  if (loading) {
    return (
      <DaoTaoPage>
        <div className={`${T.skeletonBlock} h-40`} />
      </DaoTaoPage>
    );
  }

  if (!allowed.view && !isAdmin) {
    return (
      <DaoTaoPage>
        <DaoTaoPanel>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-400" aria-hidden />
            <div>
              <p className={T.sectionTitle}>Chưa có quyền Đào tạo</p>
              <p className="mt-1 text-sm text-slate-600">
                Liên hệ quản trị viên để được cấp quyền module{" "}
                <span className="font-mono text-xs">DAO_TAO</span>.
              </p>
            </div>
          </div>
        </DaoTaoPanel>
      </DaoTaoPage>
    );
  }

  if (!canAdmin) {
    return (
      <DaoTaoPage>
        <DaoTaoPanel>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-500" aria-hidden />
            <div>
              <p className={T.sectionTitle}>Không có quyền quản trị Đào tạo</p>
              <p className="mt-1 text-sm text-slate-600">
                Cần quyền tạo/sửa/import module <span className="font-mono text-xs">DAO_TAO</span> để
                vào ngân hàng câu hỏi và kỳ thi.
              </p>
            </div>
          </div>
        </DaoTaoPanel>
      </DaoTaoPage>
    );
  }

  return <>{children}</>;
}
