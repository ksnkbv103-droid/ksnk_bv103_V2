import React from "react";
import { Activity, Database, ShieldCheck, ShieldAlert } from "lucide-react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

type TabId = "DANH_MUC" | "PHAN_QUYEN" | "MDM_GOVERNANCE" | "SUC_KHOE";

type Props = {
  active: TabId;
  onChange: (t: TabId) => void;
  canAccessDmTabs: boolean;
  canConfigureRbac: boolean;
};

const tabBase = C.navTabBtn;

export default function QuanTriDanhMucTabStrip({
  active,
  onChange,
  canAccessDmTabs,
  canConfigureRbac,
}: Props) {
  return (
    <div
      role="tablist"
      aria-label="Khu vực quản trị danh mục"
      className={C.navTabStrip}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "DANH_MUC"}
        id="tab-danhmuc-hub"
        disabled={!canAccessDmTabs}
        title={canAccessDmTabs ? undefined : "Cần quyền Xem module Danh mục"}
        className={`${tabBase} ${active === "DANH_MUC" ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"} disabled:cursor-not-allowed disabled:opacity-45`}
        onClick={() => onChange("DANH_MUC")}
      >
        <Database className="h-4 w-4 shrink-0 opacity-90 max-sm:h-3.5 max-sm:w-3.5" aria-hidden />
        <span className="truncate sm:hidden">Danh mục</span>
        <span className="hidden truncate sm:inline">Trung tâm danh mục</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "PHAN_QUYEN"}
        id="tab-phan-quyen"
        disabled={!canConfigureRbac}
        title={canConfigureRbac ? undefined : "Cần quyền Sửa PHAN_QUYEN hoặc vai trò quản trị để chỉnh ma trận"}
        className={`${tabBase} ${active === "PHAN_QUYEN" ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"} disabled:cursor-not-allowed disabled:opacity-45`}
        onClick={() => onChange("PHAN_QUYEN")}
      >
        <ShieldCheck className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="truncate">Phân quyền</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "MDM_GOVERNANCE"}
        id="tab-mdm-governance"
        disabled={!canAccessDmTabs}
        title={canAccessDmTabs ? undefined : "Cần quyền Xem module Danh mục"}
        className={`${tabBase} ${active === "MDM_GOVERNANCE" ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"} disabled:cursor-not-allowed disabled:opacity-45`}
        onClick={() => onChange("MDM_GOVERNANCE")}
      >
        <ShieldAlert className="h-4 w-4 shrink-0 opacity-90 max-sm:h-3.5 max-sm:w-3.5" aria-hidden />
        <span className="truncate sm:hidden">Bảo vệ LK</span>
        <span className="hidden truncate sm:inline">Bảo vệ liên kết dữ liệu</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "SUC_KHOE"}
        id="tab-suc-khoe"
        disabled={!canAccessDmTabs && !canConfigureRbac}
        title={
          canAccessDmTabs || canConfigureRbac
            ? undefined
            : "Cần quyền Xem Danh mục hoặc Phân quyền"
        }
        className={`${tabBase} ${active === "SUC_KHOE" ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"} disabled:cursor-not-allowed disabled:opacity-45`}
        onClick={() => onChange("SUC_KHOE")}
      >
        <Activity className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="truncate sm:hidden">Sức khỏe</span>
        <span className="hidden truncate sm:inline">Sức khỏe hệ thống</span>
      </button>
    </div>
  );
}
