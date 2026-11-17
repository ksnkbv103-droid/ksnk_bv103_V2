import React from "react";
import { KeyRound, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export type QuanTriHubUiTab = "TAI_KHOAN" | "PHAN_QUYEN" | "IT";

type Props = {
  active: QuanTriHubUiTab;
  onChange: (t: QuanTriHubUiTab) => void;
  /** Chỉ các tab đủ quyền — tab thiếu quyền ẩn hẳn. */
  visibleTabs: QuanTriHubUiTab[];
};

const TAB_META: Record<QuanTriHubUiTab, { id: string; panel: string; label: string; icon: LucideIcon }> = {
  TAI_KHOAN: { id: "tab-tai-khoan", panel: "panel-tai-khoan", label: "Tài khoản", icon: KeyRound },
  PHAN_QUYEN: { id: "tab-phan-quyen", panel: "panel-phan-quyen", label: "Phân quyền", icon: ShieldCheck },
  IT: { id: "tab-danh-cho-it", panel: "panel-danh-cho-it", label: "Hệ thống", icon: ShieldAlert },
};

function tabClass(selected: boolean) {
  return `${C.navTabBtn} ${
    selected
      ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80"
      : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
  }`;
}

export default function QuanTriDanhMucTabStrip({ active, onChange, visibleTabs }: Props) {
  return (
    <div role="tablist" aria-label="Khu vực quản trị" className={C.navTabStrip}>
      {visibleTabs.map((t) => {
        const m = TAB_META[t];
        const Icon = m.icon;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active === t}
            aria-controls={m.panel}
            id={m.id}
            className={tabClass(active === t)}
            onClick={() => onChange(t)}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
