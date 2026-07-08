"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { BarChart2, ClipboardList, History, Stethoscope } from "lucide-react";
import {
  KsnkSupervisionTabLinks,
  type SupervisionTabLinkDef,
} from "@/components/shared/ksnk-supervision-chrome";
import {
  resolveGscFormHref,
  SUPERVISION_ANALYTICS_PATHS,
  SUPERVISION_HISTORY_PATHS,
  type SupervisionHistoryModule,
} from "@/lib/supervision-form-nav";

type Props = {
  module: SupervisionHistoryModule;
  /** Ghi đè href form (mặc định: VST `/giam-sat-vst`, GSC theo pathname). */
  formHref?: string;
  ariaLabel?: string;
};

export default function SupervisionModeNav({ module, formHref, ariaLabel }: Props) {
  const pathname = usePathname();

  const tabs = useMemo((): SupervisionTabLinkDef[] => {
    const form =
      formHref ?? (module === "vst" ? "/giam-sat-vst" : resolveGscFormHref(pathname));
    const history = SUPERVISION_HISTORY_PATHS[module];
    const analytics = SUPERVISION_ANALYTICS_PATHS[module];
    const FormIcon = module === "vst" ? Stethoscope : ClipboardList;

    return [
      { id: "form", label: "Nhập phiên", mobileLabel: "Nhập", icon: FormIcon, href: form },
      { id: "history", label: "Lịch sử", mobileLabel: "Lịch sử", icon: History, href: history },
      { id: "analytics", label: "Thống kê", mobileLabel: "TK", icon: BarChart2, href: analytics },
    ];
  }, [module, formHref, pathname]);

  return <KsnkSupervisionTabLinks tabs={tabs} ariaLabel={ariaLabel ?? "Chế độ giám sát"} />;
}
