"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { recordPackCondition } from "../../actions/cssd-write.actions";
import {
  PACK_DEFAULT_ISSUABLE_TINH_TRANG,
  normalizePackTinhTrang,
} from "@/lib/domain/cssd-pack-issuance";

const OPTIONS: { value: string; label: string }[] = [
  { value: PACK_DEFAULT_ISSUABLE_TINH_TRANG, label: "Bình thường" },
  { value: "UOT", label: "Ướt" },
  { value: "RACH", label: "Rách" },
  { value: "BAN", label: "Bẩn" },
  { value: "HONG", label: "Hỏng" },
  { value: "MAT", label: "Mất" },
];

type Props = {
  quyTrinhId: string;
  tinhTrang?: string | null;
  disabled?: boolean;
  onSaved?: () => void;
};

/** Select tối thiểu — ghi tinh_trang trước CAP_PHAT (QT.22). */
export default function PackConditionSelect({
  quyTrinhId,
  tinhTrang,
  disabled,
  onSaved,
}: Props) {
  const current = normalizePackTinhTrang(tinhTrang);
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(normalizePackTinhTrang(tinhTrang));
  }, [tinhTrang]);

  const save = (next: string) => {
    const prev = value;
    setValue(next);
    if (!quyTrinhId || !next || next === current) return;
    startTransition(async () => {
      try {
        await recordPackCondition({ quy_trinh_id: quyTrinhId, tinh_trang: next });
        toast.success(`Đã ghi tình trạng: ${next}`);
        onSaved?.();
      } catch (e) {
        setValue(prev);
        toast.error(e instanceof Error ? e.message : "Không ghi được tình trạng gói");
      }
    });
  };

  return (
    <select
      aria-label="Tình trạng gói"
      title="Tình trạng gói (bắt buộc trước cấp phát)"
      disabled={disabled || pending || !quyTrinhId}
      value={value || ""}
      onChange={(e) => save(e.target.value)}
      className="h-8 max-w-[7.5rem] rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-700 outline-none focus:border-emerald-300 disabled:opacity-50"
    >
      {!current ? (
        <option value="" disabled>
          — Chưa ghi —
        </option>
      ) : null}
      {current && !OPTIONS.some((o) => o.value === current) ? (
        <option value={current}>{current}</option>
      ) : null}
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
