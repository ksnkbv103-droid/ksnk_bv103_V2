import React from "react";
import { Database, ShieldAlert, ShieldCheck } from "lucide-react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export type QuanTriHubUiTab = "DANH_MUC" | "PHAN_QUYEN" | "IT";

type Props = {
  active: QuanTriHubUiTab;
  onChange: (t: QuanTriHubUiTab) => void;
  canAccessJobs: boolean;
  canViewRbac: boolean;
  canAccessIt: boolean;
};

const tabBase = C.navTabBtn;

function tabClass(selected: boolean) {
  return `${tabBase} ${
    selected
      ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80"
      : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
  }`;
}

/** Tab không đủ quyền thì ẩn hẳn (không hiện nút mờ gây thắc mắc). */
export default function QuanTriDanhMucTabStrip({
  active,
  onChange,
  canAccessJobs,
  canViewRbac,
  canAccessIt,
}: Props) {
  return (
    <div role="tablist" aria-label="Khu vực quản trị" className={C.navTabStrip}>
      {canAccessJobs ? (
        <button
          type="button"
          role="tab"
          aria-selected={active === "DANH_MUC"}
          aria-controls="dm-unified-catalog"
          id="tab-danhmuc-hub"
          className={tabClass(active === "DANH_MUC")}
          onClick={() => onChange("DANH_MUC")}
        >
          <Database className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span className="truncate">Việc hàng ngày</span>
        </button>
      ) : null}
      {canViewRbac ? (
        <button
          type="button"
          role="tab"
          aria-selected={active === "PHAN_QUYEN"}
          aria-controls="panel-phan-quyen"
          id="tab-phan-quyen"
          className={tabClass(active === "PHAN_QUYEN")}
          onClick={() => onChange("PHAN_QUYEN")}
        >
          <ShieldCheck className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span className="truncate">Phân quyền</span>
        </button>
      ) : null}
      {canAccessIt ? (
        <button
          type="button"
          role="tab"
          aria-selected={active === "IT"}
          aria-controls="panel-danh-cho-it"
          id="tab-danh-cho-it"
          title="Dành cho IT — bảo vệ liên kết dữ liệu"
          className={tabClass(active === "IT")}
          onClick={() => onChange("IT")}
        >
          <ShieldAlert className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span className="truncate sm:hidden">IT</span>
          <span className="hidden truncate sm:inline">Dành cho IT</span>
        </button>
      ) : null}
    </div>
  );
}
