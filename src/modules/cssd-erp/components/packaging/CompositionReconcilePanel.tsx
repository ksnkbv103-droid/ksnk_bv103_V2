"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  loadBoCompositionReconcile,
  type CompositionReconcilePayload,
} from "../../actions/cssd-composition-reconcile.actions";
import { CSSD_UI_PANEL, CSSD_UI_SECTION_TITLE } from "../../shared/ui/cssd-ui-chrome";
import { registerSplitSubQrFromMainMaAction } from "../../actions/cssd-register-label.actions";
import {
  assertPlasmaPackMaterialAllowed,
  type PackMaterial,
} from "@/lib/domain/cssd-packaging-rules";

export type DongGoiPackAdvancePayload = {
  packMaterial?: PackMaterial | string;
  method?: string;
};

type Props = {
  boDungCuId: string | null | undefined;
  enabled?: boolean;
  /** Trạm đóng gói: cổng quy trình (tách nhiệt / vật liệu) trước khi chuyển bước. */
  gateMode?: boolean;
  onConfirmAdvance?: (payload?: DongGoiPackAdvancePayload) => void;
  onCancelGate?: () => void;
  advancing?: boolean;
};

/**
 * Trạm Đóng gói — chỉ quy trình: tách gói nhạy nhiệt (Lock A) và vật liệu Plasma.
 * Không checklist BOM, không đề nghị sửa danh mục, không lối sự cố.
 */
export default function CompositionReconcilePanel({
  boDungCuId,
  enabled = true,
  gateMode = false,
  onConfirmAdvance,
  onCancelGate,
  advancing = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompositionReconcilePayload | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [packMaterial, setPackMaterial] = useState<PackMaterial>("UNKNOWN");

  const fetchData = useCallback(async () => {
    const id = String(boDungCuId || "").trim();
    if (!id || !enabled) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await loadBoCompositionReconcile(id);
      setData(res.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải được thông tin đóng gói.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [boDungCuId, enabled]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!enabled || !boDungCuId) return null;

  const plasma = gateMode && data?.heat.recommendedMethod === "PLASMA";
  const plasmaCheck = assertPlasmaPackMaterialAllowed({
    method: data?.heat.recommendedMethod,
    packMaterial,
  });

  return (
    <section className={`bv103-stack-in bv103-pad-panel ${CSSD_UI_PANEL}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className={CSSD_UI_SECTION_TITLE}>Đóng gói</h4>
          <p className="text-[11px] font-medium text-slate-500">
            {data?.maBo ? `${data.maBo} — ` : ""}
            {data?.tenBo || "Đang tải…"}
          </p>
        </div>
        {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
      </div>

      {data?.heat.requireSplit ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
          <ShieldAlert className="mt-0.5 shrink-0" size={18} />
          <div className="space-y-2">
            <p className="text-[11px] font-semibold">Cần tách gói nhạy nhiệt</p>
            <p className="text-[11px] font-medium leading-relaxed">{data.heat.reason}</p>
            {data.heat.methodLabelVi ? (
              <p className="bv103-type-label font-semibold text-rose-800">Gợi ý: {data.heat.methodLabelVi}</p>
            ) : null}
            <button
              type="button"
              disabled={splitting || !data.maBo}
              onClick={() => {
                setSplitting(true);
                void registerSplitSubQrFromMainMaAction(data.maBo)
                  .then((res) => {
                    if (!res.success) throw new Error(res.error);
                    toast.success(`Đã tách gói phụ: ${res.ma_vach_qr_phu}`);
                  })
                  .catch((e: unknown) => {
                    toast.error(e instanceof Error ? e.message : "Không tách được gói phụ.");
                  })
                  .finally(() => setSplitting(false));
              }}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-800 disabled:opacity-50"
            >
              {splitting ? "Đang tách…" : "Tách gói nhạy nhiệt"}
            </button>
          </div>
        </div>
      ) : null}

      {plasma ? (
        <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-violet-950">
          <p className="text-[11px] font-semibold">Plasma — chọn vật liệu đóng gói</p>
          <p className="text-[11px] font-medium leading-relaxed text-violet-900">
            Plasma cấm cellulose (giấy/vải). Dùng Tyvek / túi không cellulose.
          </p>
          <label className="block text-[11px] font-semibold">
            Vật liệu đóng gói
            <select
              className="mt-1 h-10 w-full rounded-lg border border-violet-200 bg-white px-2 text-xs font-medium text-slate-800"
              value={packMaterial}
              onChange={(e) => setPackMaterial(e.target.value as PackMaterial)}
            >
              <option value="UNKNOWN">— Chọn —</option>
              <option value="NON_CELLULOSE">Tyvek / không cellulose</option>
              <option value="CELLULOSE">Cellulose / giấy / vải</option>
            </select>
          </label>
          {!plasmaCheck.ok ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-800">
              {plasmaCheck.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {gateMode ? (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancelGate}
            disabled={advancing}
            className="h-11 touch-manipulation rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Đóng (chưa chuyển)
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirmAdvance?.({
                packMaterial,
                method: data?.heat.recommendedMethod,
              })
            }
            disabled={advancing || loading || (plasma && !plasmaCheck.ok)}
            className="h-11 touch-manipulation rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {advancing ? "Đang chuyển…" : "Xác nhận chuyển chờ tiệt khuẩn"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
