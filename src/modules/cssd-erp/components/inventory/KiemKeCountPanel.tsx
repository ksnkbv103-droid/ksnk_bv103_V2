"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { KIEM_KE_IA_NOTE, deriveKiemKeLine } from "@/lib/domain/cssd-kiem-ke";
import { loadKiemKeBoAction, postKiemKeCountsAction, type KiemKeBoLine } from "../../actions/cssd-kiem-ke.actions";
import SetReconcileCampaignPanel from "./SetReconcileCampaignPanel";
import { KiemKeCountTable, type KiemKeDraft } from "./KiemKeCountTable";

type BoOption = { id: string; ma_bo: string; ten_bo: string };

function draftFromLine(line: KiemKeBoLine): KiemKeDraft {
  return { dem: String(line.soLuongThucTe), kho: "" };
}

export default function KiemKeCountPanel({
  boRows,
  loadingCatalog,
}: {
  boRows: BoOption[];
  loadingCatalog: boolean;
}) {
  const searchParams = useSearchParams();
  const [boId, setBoId] = useState(() => String(searchParams.get("bo") || ""));
  const [lines, setLines] = useState<KiemKeBoLine[]>([]);
  const [drafts, setDrafts] = useState<Record<string, KiemKeDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maBo, setMaBo] = useState("");

  useEffect(() => {
    const fromUrl = String(searchParams.get("bo") || "");
    if (fromUrl) setBoId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!boId) {
      setLines([]);
      setDrafts({});
      return;
    }
    let active = true;
    setLoading(true);
    void loadKiemKeBoAction(boId).then((res) => {
      if (!active) return;
      if (!res.success) {
        toast.error(res.error);
        setLines([]);
        setDrafts({});
      } else {
        setMaBo(res.data.maBo);
        setLines(res.data.lines);
        setDrafts(Object.fromEntries(res.data.lines.map((line) => [line.loaiDungCuId, draftFromLine(line)])));
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [boId]);

  const preview = useMemo(() => {
    return lines.map((line) => {
      const draft = drafts[line.loaiDungCuId] || draftFromLine(line);
      const dem = Number(draft.dem);
      const khoRaw = draft.kho.trim();
      const khoDem = khoRaw === "" ? null : Number(khoRaw);
      const derived = deriveKiemKeLine({
        loaiDungCuId: line.loaiDungCuId,
        soLuongThucTe: line.soLuongThucTe,
        soLuongKho: line.soLuongKho,
        soLuongTrongBo: line.soLuongTrongBo,
        soLuongDem: dem,
        khoDem,
      });
      return { line, derived };
    });
  }, [lines, drafts]);

  const submit = async () => {
    const bad = preview.find((row) => !row.derived.ok);
    if (bad && !bad.derived.ok) {
      toast.error(bad.derived.error);
      return;
    }
    setSaving(true);
    const res = await postKiemKeCountsAction({
      boDungCuId: boId,
      lines: preview.map((row) => {
        const draft = drafts[row.line.loaiDungCuId];
        const khoRaw = draft?.kho.trim() || "";
        return {
          loaiDungCuId: row.line.loaiDungCuId,
          soLuongDem: Number(draft?.dem),
          khoDem: khoRaw === "" ? null : Number(khoRaw),
        };
      }),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(
      res.posted > 0
        ? `Đã ghi ${res.posted} dòng sổ KIEM_KE. Tồn bộ, kho lẻ và tổng loại đã tính lại.`
        : "Số đếm khớp hệ thống. Đã ghi ngày kiểm kê, không phát sinh delta.",
    );
    const reload = await loadKiemKeBoAction(boId);
    if (reload.success) {
      setLines(reload.data.lines);
      setDrafts(Object.fromEntries(reload.data.lines.map((line) => [line.loaiDungCuId, draftFromLine(line)])));
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-600">
        {KIEM_KE_IA_NOTE}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] font-medium text-slate-500" htmlFor="kiem-ke-bo">
          Bộ đếm
        </label>
        <select
          id="kiem-ke-bo"
          className="bv103-control-h min-w-[16rem] rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 text-sm"
          value={boId}
          disabled={loadingCatalog}
          onChange={(e) => setBoId(e.target.value)}
        >
          <option value="">{loadingCatalog ? "Đang tải danh mục…" : "Chọn bộ"}</option>
          {boRows.map((bo) => (
            <option key={bo.id} value={bo.id}>
              {bo.ma_bo} — {bo.ten_bo}
            </option>
          ))}
        </select>
        <SetReconcileCampaignPanel />
      </div>
      {!boId ? (
        <p className="px-1 text-[11px] text-slate-500">Chọn bộ, nhập số đếm, rồi ghi sổ. Chuẩn danh mục giữ nguyên.</p>
      ) : loading ? (
        <p className="px-1 text-[11px] text-slate-500">Đang tải thành phần {maBo}…</p>
      ) : (
        <>
          <KiemKeCountTable
            drafts={drafts}
            rows={preview.map(({ line, derived }) => ({
              line,
              tonLoai: derived.ok ? derived.derived.tonLoai : "—",
            }))}
            onPatch={(loaiId, patch, line) =>
              setDrafts((cur) => ({
                ...cur,
                [loaiId]: { ...(cur[loaiId] || draftFromLine(line)), ...patch },
              }))
            }
          />
          <button
            type="button"
            disabled={saving || preview.length === 0}
            onClick={() => void submit()}
            className="bv103-control-h rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Đang ghi sổ…" : "Ghi số đếm"}
          </button>
        </>
      )}
    </div>
  );
}
