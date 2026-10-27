"use client";

import React from "react";
import type { KhoChip } from "@/lib/domain/cssd-kho-hoa-chat-rows";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_IDLE } from "../../shared/ui/cssd-ui-chrome";

type Props = {
  chip: KhoChip;
  onChip: (c: KhoChip) => void;
  search: string;
  onSearch: (v: string) => void;
  canChuY: number;
  choDuyet: number;
};

export default function KhoHoaChatFilterBar({ chip, onChip, search, onSearch, canChuY, choDuyet }: Props) {
  const chips: ReadonlyArray<readonly [KhoChip, string]> = [
    ["ALL", "Tất cả"],
    ["HOA_CHAT", "Hóa chất"],
    ["VAT_TU", "Vật tư"],
    ["CAN_CHU_Y", `Cần chú ý (${canChuY})`],
    ["CHO_DUYET", `Chờ duyệt (${choDuyet})`],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Tìm mặt hàng..."
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm sm:w-64"
      />
      {chips.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChip(key)}
          className={`bv103-type-label rounded-lg px-3 py-1 font-semibold ${chip === key ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
