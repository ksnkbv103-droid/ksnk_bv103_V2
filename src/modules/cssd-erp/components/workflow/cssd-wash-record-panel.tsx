"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listWashStationOptionsAction,
  persistLamSachWashAction,
  type WashLotOption,
  type WashMachineOption,
} from "../../actions/cssd-wash.actions";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_ACTION_SECONDARY, CSSD_UI_SECTION_TITLE } from "../../shared/ui/cssd-ui-chrome";
import type { CssdWashKetQua } from "@/lib/domain/cssd-wash-gate";
import { lotRowToKey } from "@/lib/domain/cssd-kho-hoa-chat-fefo";

type Props = {
  quyTrinhId: string;
  tenBo: string;
  advancing?: boolean;
  onCancel: () => void;
  onConfirmPass: () => void;
};

function washLotValue(l: WashLotOption) {
  return `${l.dm_hoa_chat_id}|${lotRowToKey(l)}`;
}

export default function CssdWashRecordPanel({ quyTrinhId, tenBo, advancing, onCancel, onConfirmPass }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [machines, setMachines] = useState<WashMachineOption[]>([]);
  const [lots, setLots] = useState<WashLotOption[]>([]);
  const [thietBiId, setThietBiId] = useState("");
  const [lotKey, setLotKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await listWashStationOptionsAction();
      if (cancelled) return;
      if (!res.success) {
        toast.error(res.error);
        setMachines([]);
        setLots([]);
      } else {
        setMachines(res.machines);
        setLots(res.lots);
        const fefo = res.lots.find((l) => l.is_fefo);
        if (fefo) setLotKey(washLotValue(fefo));
        if (res.machines.length === 1) setThietBiId(res.machines[0].id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLot = useMemo(() => lots.find((l) => washLotValue(l) === lotKey), [lots, lotKey]);

  const submit = async (ket: CssdWashKetQua) => {
    const lot = lots.find((l) => washLotValue(l) === lotKey);
    setSaving(true);
    try {
      const res = await persistLamSachWashAction({
        quyTrinhId,
        thiet_bi_id: thietBiId,
        dm_hoa_chat_id: lot?.dm_hoa_chat_id || "",
        ma_lo: lot?.ma_lo || "",
        han_su_dung: lot?.han_su_dung,
        ket_qua: ket,
        issueStock: ket === "DAT",
      });
      if (!res.success) throw new Error(res.error);
      if (ket === "DAT") {
        toast.success(res.issued ? "Đã ghi lần rửa ĐẠT và xuất 1 đơn vị hóa chất." : "Đã ghi lần rửa ĐẠT.");
        onConfirmPass();
      } else {
        toast.error("Đã ghi lần rửa KHÔNG ĐẠT — bộ chưa chuyển QC.");
        onCancel();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không ghi được lần rửa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-[var(--radius-shell)] border border-sky-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className={`${CSSD_UI_SECTION_TITLE} flex items-center gap-2`}>
            <Droplets size={16} className="text-sky-600" /> Ghi nhận làm sạch
          </h4>
          <p className="text-[11px] font-medium text-slate-500">{tenBo}</p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-sky-900">
            Chọn máy rửa (READY), lô hóa chất FEFO chưa hết hạn, rồi Đạt / Không đạt. Không đạt thì không chuyển QC.
          </p>
        </div>
        {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Máy rửa / siêu âm</span>
        <select
          value={thietBiId}
          onChange={(e) => setThietBiId(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
          disabled={loading || saving}
        >
          <option value="">{machines.length ? "— Chọn máy —" : "— Không có máy rửa READY —"}</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ten} · {m.ten_loai_may}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Lô hóa chất (FEFO)</span>
        <select
          value={lotKey}
          onChange={(e) => setLotKey(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
          disabled={loading || saving}
        >
          <option value="">{lots.length ? "— Chọn lô —" : "— Không có tồn hóa chất —"}</option>
          {lots.map((l) => (
            <option key={washLotValue(l)} value={washLotValue(l)}>
              {l.is_fefo ? "★ FEFO · " : ""}
              {l.ten_hoa_chat} · {l.ma_lo} · HSD {l.han_su_dung || "—"} · tồn {l.ton_so_luong}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving || advancing} className={CSSD_UI_ACTION_SECONDARY}>
          Đóng (chưa chuyển)
        </button>
        <button
          type="button"
          disabled={saving || advancing || loading}
          onClick={() => void submit("KHONG_DAT")}
          className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-semibold uppercase tracking-wide text-red-700"
        >
          Không đạt
        </button>
        <button
          type="button"
          disabled={saving || advancing || loading || !thietBiId || !lotKey}
          onClick={() => void submit("DAT")}
          className={CSSD_UI_ACTION_PRIMARY}
        >
          {saving ? "Đang ghi…" : "Đạt — chuyển QC"}
        </button>
      </div>
      {selectedLot && !selectedLot.is_fefo ? (
        <p className="text-[11px] font-medium text-amber-800">Lô đang chọn không phải FEFO đầu tiên — chỉ dùng khi lô FEFO không phù hợp.</p>
      ) : null}
    </section>
  );
}
