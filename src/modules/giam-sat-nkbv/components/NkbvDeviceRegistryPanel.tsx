"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listNkbvDeviceRegistry,
  softDeleteNkbvDeviceRegistry,
  upsertNkbvDeviceRegistry,
  type DeviceRegistryRecord,
} from "../actions/giam-sat-nkbv-device-registry.actions";
import type { DeviceRegistryType } from "../lib/nkbv-shared-device-days";
import { emptyClipAdherence, scoreClipAdherence, type ClipAdherence } from "../lib/nkbv-clip";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";

const TYPE_LABEL: Record<DeviceRegistryType, string> = {
  CENTRAL_LINE: "Catheter TMTT (CVC)",
  FOLEY: "Ống thông tiểu (Foley)",
  VENTILATOR: "Máy thở xâm lấn",
};

type Props = {
  maBenhAn: string;
  maBenhNhan?: string | null;
  khoaId?: string | null;
  allowedEdit: boolean;
  onChanged?: (rows: DeviceRegistryRecord[]) => void;
};

export default function NkbvDeviceRegistryPanel({
  maBenhAn,
  maBenhNhan,
  khoaId,
  allowedEdit,
  onChanged,
}: Props) {
  const [rows, setRows] = useState<DeviceRegistryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceRegistryType>("CENTRAL_LINE");
  const [insertionDate, setInsertionDate] = useState("");
  const [removalDate, setRemovalDate] = useState("");
  const [firstAccess, setFirstAccess] = useState("");
  const [clip, setClip] = useState<ClipAdherence>(emptyClipAdherence());

  // onChanged qua ref: đọc danh sách KHÔNG báo cha (trước đây báo mỗi lần đọc
  // → cha reload → re-render → đọc lại... vòng lặp fetch vô hạn, nguồn lag chính)
  const onChangedRef = React.useRef(onChanged);
  React.useInsertionEffect(() => {
    onChangedRef.current = onChanged;
  });

  const reload = useCallback(async () => {
    if (!maBenhAn) return null;
    setLoading(true);
    const res = await listNkbvDeviceRegistry(maBenhAn);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Không tải được sổ đăng ký dụng cụ");
      return null;
    }
    setRows(res.data);
    return res.data;
  }, [maBenhAn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAdd = async () => {
    if (!insertionDate) {
      toast.error("Chọn ngày đặt / Day 1");
      return;
    }
    const res = await upsertNkbvDeviceRegistry({
      ma_benh_an: maBenhAn,
      ma_benh_nhan: maBenhNhan,
      device_type: deviceType,
      insertion_date: insertionDate,
      removal_date: removalDate || null,
      first_access_date: deviceType === "CENTRAL_LINE" ? firstAccess || insertionDate : null,
      khoa_id: khoaId || null,
      clip_adherence: deviceType === "CENTRAL_LINE" ? clip : null,
    });
    if (!res.success) {
      toast.error(res.error || "Lưu thất bại");
      return;
    }
    toast.success("Đã ghi sổ đăng ký dụng cụ");
    setInsertionDate("");
    setRemovalDate("");
    setFirstAccess("");
    setClip(emptyClipAdherence());
    const rows = await reload();
    if (rows) onChangedRef.current?.(rows);
  };

  const handleRemove = async (id: string) => {
    const res = await softDeleteNkbvDeviceRegistry(id);
    if (!res.success) {
      toast.error(res.error || "Xóa thất bại");
      return;
    }
    const rows = await reload();
    if (rows) onChangedRef.current?.(rows);
  };

  if (!maBenhAn) {
    return (
      <p className="text-xs text-slate-500">
        Cần mã bệnh án để đăng ký dụng cụ.
      </p>
    );
  }

  return (
    <div className="rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50/75 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className={C.blockSection}>Sổ đăng ký dụng cụ</span>
        {loading ? <span className="text-[11px] text-slate-400">Đang tải…</span> : null}
      </div>
      <p className="text-[11px] text-slate-500">
        Đăng ký CVC / Foley / máy thở theo đợt nằm viện — mẫu số có thể xem trước từ đây (song song nhập tay).
      </p>

      {rows.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white text-xs">
          {rows.map((r) => {
            const clipScore =
              r.device_type === "CENTRAL_LINE" && r.clip_adherence
                ? scoreClipAdherence(r.clip_adherence)
                : null;
            return (
            <li key={r.id} className="flex items-start justify-between gap-2 px-3 py-2">
              <div>
                <p className="font-semibold text-slate-800">{TYPE_LABEL[r.device_type]}</p>
                <p className="font-mono text-slate-600">
                  {r.insertion_date}
                  {r.first_access_date && r.device_type === "CENTRAL_LINE"
                    ? ` · access ${r.first_access_date}`
                    : ""}
                  {" → "}
                  {r.removal_date || "đang lưu"}
                </p>
                {clipScore ? (
                  <p
                    className={`mt-0.5 text-[10px] font-semibold ${
                      clipScore.adherent ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    CLIP: {clipScore.adherent ? "Tuân thủ đủ" : clipScore.reason}
                  </p>
                ) : null}
              </div>
              {allowedEdit ? (
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => void handleRemove(r.id)}
                >
                  Xóa
                </button>
              ) : null}
            </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-amber-700">Chưa có dụng cụ đăng ký trên bệnh án này.</p>
      )}

      {allowedEdit ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[11px] font-medium text-slate-600">
            Loại
            <select
              className={C.controlInput}
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value as DeviceRegistryType)}
            >
              {(Object.keys(TYPE_LABEL) as DeviceRegistryType[]).map((k) => (
                <option key={k} value={k}>
                  {TYPE_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-medium text-slate-600">
            Ngày đặt (Day 1)
            <input
              type="date"
              className={C.controlInput}
              value={insertionDate}
              onChange={(e) => setInsertionDate(e.target.value)}
            />
          </label>
          {deviceType === "CENTRAL_LINE" ? (
            <label className="text-[11px] font-medium text-slate-600">
              Ngày tiếp cận CVC lần đầu
              <input
                type="date"
                className={C.controlInput}
                value={firstAccess}
                onChange={(e) => setFirstAccess(e.target.value)}
              />
            </label>
          ) : (
            <span />
          )}
          <label className="text-[11px] font-medium text-slate-600">
            Ngày rút
            <input
              type="date"
              className={C.controlInput}
              value={removalDate}
              onChange={(e) => setRemovalDate(e.target.value)}
            />
          </label>
          {deviceType === "CENTRAL_LINE" ? (
            <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-sky-100 bg-sky-50/60 p-3 space-y-2">
              <p className="text-[11px] font-bold text-sky-900">
                CLIP — Tuân thủ đặt CVC (4 điều kiện NHSN)
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clip.hand_hygiene}
                    onChange={(e) => setClip((c) => ({ ...c, hand_hygiene: e.target.checked }))}
                  />
                  Vệ sinh tay
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clip.maximal_barrier}
                    onChange={(e) => setClip((c) => ({ ...c, maximal_barrier: e.target.checked }))}
                  />
                  Barrier tối đa (5 món)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clip.dry_before_incision}
                    onChange={(e) =>
                      setClip((c) => ({ ...c, dry_before_incision: e.target.checked }))
                    }
                  />
                  Để khô trước khi chọc
                </label>
                <label className="flex items-center gap-1.5">
                  Sát khuẩn da
                  <select
                    className={`${C.controlInput} !w-auto`}
                    value={clip.skin_prep || ""}
                    onChange={(e) =>
                      setClip((c) => ({
                        ...c,
                        skin_prep: (e.target.value || null) as ClipAdherence["skin_prep"],
                      }))
                    }
                  >
                    <option value="">—</option>
                    <option value="CHG">CHG</option>
                    <option value="POVIDONE">Povidone</option>
                    <option value="ALCOHOL">Alcohol</option>
                  </select>
                </label>
              </div>
            </div>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="button" className={C.ctaPrimary} onClick={() => void handleAdd()}>
              Thêm vào Registry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
