"use client";

import React from "react";
import type {
  BaGridCdhaCell,
  BaGridColumn,
  BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import type { ViSinhAnalysisStatus } from "../lib/nkbv-vi-sinh-analysis-status";
import type { BaDayGridColumnDef } from "./NkbvBaDayGrid";
import NkbvBaCommonDayGrid from "./NkbvBaCommonDayGrid";

type TcItem = { key: string; label: string; id?: string };
type CdhaCatalogItem = { criteriaKey: string; title: string; milestoneKind: string };
type KhoaOpt = { id: string; ma_danh_muc?: string; ten_danh_muc?: string };

/** Props dùng chung cho mọi lần bind lưới BA trong workspace (tránh copy 4 lần). */
export type NkbvBaWorkspaceDayGridBind = {
  days: BaGridColumn[];
  xnByDate: Record<string, BaGridXnCell[]>;
  cdhaByDate: Record<string, BaGridCdhaCell[]>;
  ssiTcByDate: Record<string, TcItem[]>;
  surgeryByDate: Record<string, TcItem[]>;
  lamSangByDate?: Record<string, TcItem[]>;
  foleyOnDate?: Record<string, boolean>;
  ventOnDate?: Record<string, boolean>;
  cvcOnDate?: Record<string, boolean>;
  statusById: Record<string, ViSinhAnalysisStatus>;
  cdhaCatalog: CdhaCatalogItem[];
  ssiTcCatalog: Array<{ criteriaKey: string; title: string }>;
  allowedEdit: boolean;
  khoaByDate?: Record<string, string>;
  khoas?: KhoaOpt[];
  onChangeKhoa?: (date: string, khoaId: string) => void;
  defaultKhoa: string;
  ngayVaoVien?: string;
  ngayRaVien?: string | null;
  onPickXn: (x: BaGridXnCell) => void;
  onAddXn?: (date: string) => void;
  onOpenCdha: (x: BaGridCdhaCell) => void;
  onRemoveMilestone: (id: string | undefined) => Promise<void>;
  onEditCdhaDate: (id: string, nextDate: string) => Promise<void>;
  onToggleCdha: (
    date: string,
    criteriaKey: string,
    title: string,
    kind: string,
  ) => Promise<void>;
  onOpenSurgeryOrSsi: (
    id: string,
    date: string,
    label: string,
    criteriaKey: string,
  ) => void;
  onAddSurgery: (date: string) => Promise<void>;
  onToggleSsiTc: (date: string, criteriaKey: string, title: string) => Promise<void>;
  onToggleDevice?: (
    date: string,
    key: "device_foley" | "device_ventilator" | "device_central_line",
  ) => void;
};

type Props = NkbvBaWorkspaceDayGridBind & {
  activeXnId: string | null;
  windowColumns?: BaDayGridColumnDef[];
  tailColumns?: BaDayGridColumnDef[];
};

/** Thin bind — cùng props lưới, khác cửa sổ/đuôi theo phiên. */
export default function NkbvBaWorkspaceBoundDayGrid({
  activeXnId,
  windowColumns = [],
  tailColumns = [],
  ...bind
}: Props) {
  return (
    <NkbvBaCommonDayGrid
      {...bind}
      activeXnId={activeXnId}
      windowColumns={windowColumns}
      tailColumns={tailColumns}
    />
  );
}
