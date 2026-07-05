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
};

/** Tab ngang CSSD — cuộn trên mobile, nhãn rút gọn tùy chọn. */
export function CssdHorizTabButton({ active, onClick, label, mobileLabel, icon: Icon }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CSSD_UI_TAB_BTN} ${active ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
    >
      {Icon ? <Icon size={14} className="shrink-0" aria-hidden /> : null}
      <span className="truncate sm:hidden">{mobileLabel ?? label}</span>
      <span className="hidden truncate sm:inline">{label}</span>
    </button>
  );
}
