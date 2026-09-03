"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listNkbvDeviceRegistry,
  type DeviceRegistryRecord,
} from "../actions/giam-sat-nkbv-device-registry.actions";
import type { DeviceRegistryType } from "../lib/nkbv-shared-device-days";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { formatDateVi } from "@/lib/format-datetime-vi";

const TYPE_LABEL: Record<DeviceRegistryType, string> = {
  CENTRAL_LINE: "Catheter TMTT (CVC)",
  FOLEY: "Ống thông tiểu (Foley)",
  VENTILATOR: "Máy thở xâm lấn",
};

type Props = {
  maBenhAn: string;
};

/** Chỉ đọc — chuỗi đặt–rút suy từ ô đã tích trên lưới. */
export default function NkbvDeviceRegistryPanel({ maBenhAn }: Props) {
  const [rows, setRows] = useState<DeviceRegistryRecord[]>([]);

  const reload = useCallback(async () => {
    if (!maBenhAn) return;
    const res = await listNkbvDeviceRegistry(maBenhAn);
    if (!res.success) {
      toast.error(res.error || "Không tải được ngày dụng cụ");
      return;
    }
    setRows(res.data);
  }, [maBenhAn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!rows.length) {
    return <p className={C.hint}>Chưa tích Foley / máy / CVC trên lưới.</p>;
  }
  return (
    <ul className="space-y-1 text-xs text-slate-700">
      {rows.map((r) => (
        <li key={r.id}>
          {TYPE_LABEL[r.device_type]} · {formatDateVi(r.insertion_date)}
          {r.removal_date ? ` → ${formatDateVi(r.removal_date)}` : ""}
        </li>
      ))}
    </ul>
  );
}
