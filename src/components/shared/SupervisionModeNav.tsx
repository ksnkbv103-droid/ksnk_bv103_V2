"use client";

import React, { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart2, ClipboardList, History, ListTree, Stethoscope } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import { GSC_DANH_MUC_PATH } from "@/lib/master-data/quan-tri-paths";
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
import {
  gscLichSuHref,
  gscThongKeHref,
  parseGscLoaiParam,
  resolveGscNavLoai,
} from "@/modules/giam-sat-chung/lib/gsc-app-paths";

type Props = {
  module: SupervisionHistoryModule;
  /** Ghi đè href form (mặc định: VST `/giam-sat-vst`, GSC theo pathname). */
  formHref?: string;
  ariaLabel?: string;
};

export default function SupervisionModeNav({ module, formHref, ariaLabel }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /* AR-8f: danh mục giám sát sửa trong module GSC — tab chỉ hiện khi có quyền xem. */
  const lookupPerm = useModulePermission("DANH_MUC_GSTT");
  const showLookupTab = module === "gsc" && !lookupPerm.loading && lookupPerm.allowed.view;

  const tabs = useMemo((): SupervisionTabLinkDef[] => {
    const loaiFromQuery = parseGscLoaiParam(searchParams.get("loai"));
    const form =
      formHref ??
      (module === "vst" ? "/giam-sat-vst" : resolveGscFormHref(pathname, loaiFromQuery));
    const gscLoai = module === "gsc" ? resolveGscNavLoai(pathname, loaiFromQuery) : undefined;
    const history = module === "gsc" ? gscLichSuHref(gscLoai) : SUPERVISION_HISTORY_PATHS[module];
    const analytics = module === "gsc" ? gscThongKeHref(gscLoai) : SUPERVISION_ANALYTICS_PATHS[module];
    const FormIcon = module === "vst" ? Stethoscope : ClipboardList;

    const base: SupervisionTabLinkDef[] = [
      { id: "form", label: "Nhập", mobileLabel: "Nhập", icon: FormIcon, href: form },
      { id: "history", label: "Lịch sử", mobileLabel: "Lịch sử", icon: History, href: history },
      { id: "analytics", label: "Thống kê", mobileLabel: "Thống kê", icon: BarChart2, href: analytics },
    ];
    if (showLookupTab) {
      base.push({ id: "lookup", label: "Danh mục", mobileLabel: "Danh mục", icon: ListTree, href: GSC_DANH_MUC_PATH });
    }
    return base;
  }, [module, formHref, pathname, searchParams, showLookupTab]);

  return <KsnkSupervisionTabLinks tabs={tabs} ariaLabel={ariaLabel ?? "Chế độ giám sát"} />;
}
