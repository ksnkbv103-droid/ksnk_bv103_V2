"use client";

import React from "react";
import { isSteamMethod, type CssdSterileMethod } from "@/lib/master-data/cssd-loai-dung-cu-map";

const OPTIONS: Array<{ v: CssdSterileMethod; l: string }> = [
  { v: "STEAM_134", l: "Hơi 134°C" },
  { v: "STEAM_121", l: "Hơi 121°C" },
  { v: "PLASMA", l: "Plasma" },
  { v: "EO", l: "EO" },
];

/** Chọn nhiều phương pháp tiệt khuẩn được phép (theo hướng dẫn nhà sản xuất); phần tử đầu = ưu tiên. */
export function PhuongPhapChoPhepPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="sm:col-span-2 space-y-1">
      <legend className="text-[11px] font-medium text-slate-400">
        Phương pháp tiệt khuẩn được phép (chọn nhiều; ô chọn đầu tiên là ưu tiên)
      </legend>
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((o) => {
          const on = value.includes(o.v);
          return (
            <label key={o.v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? value.filter((x) => x !== o.v) : [...value, o.v])}
              />
              {o.l}
              <span className="text-[11px] text-slate-500">{isSteamMethod(o.v) ? "(nhiệt cao)" : "(nhiệt thấp)"}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
