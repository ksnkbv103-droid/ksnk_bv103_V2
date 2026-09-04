"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_BTN, CSSD_UI_TAB_IDLE } from "../../shared/ui/cssd-ui-chrome";

type Props = {
  active: boolean;
  onClick: () => void;
  label: string;
  mobileLabel?: string;
  icon?: LucideIcon;
  /** primary = chu trình chính; secondary = Mẻ/Kho (giữ feature, giảm visual weight). */
  emphasis?: "primary" | "secondary";
};

/** Tab ngang CSSD — cuộn trên mobile, nhãn rút gọn tùy chọn. */
export function CssdHorizTabButton({
  active,
  onClick,
  label,
  mobileLabel,
  icon: Icon,
  emphasis = "primary",
}: Props) {
  const idle =
    emphasis === "secondary"
      ? "bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-700"
      : CSSD_UI_TAB_IDLE;
  const activeCls =
    emphasis === "secondary"
      ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/90"
      : CSSD_UI_TAB_ACTIVE;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CSSD_UI_TAB_BTN} ${active ? activeCls : idle} ${
        emphasis === "primary" && !active ? "font-semibold text-slate-700" : ""
      }`}
    >
      {Icon ? (
        <Icon
          className={`shrink-0 ${emphasis === "secondary" ? "h-3.5 w-3.5 opacity-80" : "h-4 w-4"}`}
          aria-hidden
        />
      ) : null}
      <span className="truncate sm:hidden">{mobileLabel ?? label}</span>
      <span className="hidden truncate sm:inline">{label}</span>
    </button>
  );
}
