"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import {
  listMdroInpatientsByKhoa,
  listNkbvPatientRcaByKhoa,
  type MdroInpatientRow,
  type NkbvPatientRcaRow,
} from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv.actions";
import { formatDateVi } from "@/lib/format-datetime-vi";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";

type KhoaOpt = { id: string; ma_danh_muc?: string; ten_danh_muc?: string };

export default function NkbvMdroCensusPanel({ khoas }: { khoas: KhoaOpt[] }) {
  const [khoaId, setKhoaId] = useState("");
  const [mdroRows, setMdroRows] = useState<MdroInpatientRow[]>([]);
  const [rcaRows, setRcaRows] = useState<NkbvPatientRcaRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!khoaId) {
      setMdroRows([]);
      setRcaRows([]);
      return;
    }
    setLoading(true);
    try {
      const [mdro, rca] = await Promise.all([
        listMdroInpatientsByKhoa({ khoaId, limit: 200 }),
        listNkbvPatientRcaByKhoa({ khoaId, limit: 100 }),
      ]);
      if (mdro.success) setMdroRows(mdro.data);
      else toast.error(mdro.error || "Không tải được danh sách MDRO");
      if (rca.success) setRcaRows(rca.data.filter((r) => r.is_mdro || r.nkbv_case_count > 0 || r.gsc_session_count > 0));
      else toast.error(rca.error || "Không tải được bảng RCA");
    } finally {
      setLoading(false);
    }
  }, [khoaId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={`${C.sectionGap} space-y-[var(--bv103-space-3)] rounded-[var(--radius-shell)] border border-rose-100 bg-rose-50/40 p-4`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="bv103-type-section text-rose-950">BN đa kháng đang nằm viện · RCA tuân thủ</h3>
          <p className="text-xs text-rose-900/80">
            Nguồn từ vi sinh (is_mdro) + phiên GSC BM.31.03 / BM.14.01 + ca NKBV cùng BA.
          </p>
        </div>
        <div className="min-w-[220px]">
          <SearchableSelect
            value={khoaId}
            onChange={setKhoaId}
            placeholder="Chọn khoa…"
            options={[
              { id: "", label: "Chọn khoa…" },
              ...khoas.map((k) => ({
                id: k.id,
                label: formatKhoaPickerLabel({
                  ma_danh_muc: k.ma_danh_muc,
                  ten_danh_muc: k.ten_danh_muc,
                }),
              })),
            ]}
          />
        </div>
      </div>

      {loading ? <p className="text-xs text-slate-500">Đang tải…</p> : null}

      {!khoaId ? (
        <p className="text-xs text-slate-500">Chọn khoa để xem danh sách MDRO và liên kết giám sát.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white bg-white">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 bv103-type-label text-slate-500">
                <tr>
                  <th className="px-3 py-2">BN</th>
                  <th className="px-3 py-2">Phenotype</th>
                  <th className="px-3 py-2">Mẫu MDRO</th>
                  <th className="px-3 py-2">GS / Cách ly</th>
                  <th className="px-3 py-2">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mdroRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-slate-500">
                      Không có BN đa kháng còn nằm viện tại khoa.
                    </td>
                  </tr>
                ) : (
                  mdroRows.map((r) => (
                    <tr key={r.ma_benh_an}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{r.ho_ten_benh_nhan}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {r.ma_benh_an} · {r.ma_benh_nhan}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-bold text-rose-800">{r.mdro_phenotype_label}</td>
                      <td className="px-3 py-2">{r.ngay_mau_mdro ? formatDateVi(r.ngay_mau_mdro) : "—"}</td>
                      <td className="px-3 py-2">
                        <div className={r.has_mdro_supervision ? "text-emerald-700" : "text-amber-800"}>
                          {r.has_mdro_supervision ? "Đã GS MDRO" : "Chưa GS MDRO"}
                        </div>
                        <div className={r.has_isolation_checklist ? "text-emerald-700" : "text-amber-800"}>
                          {r.has_isolation_checklist ? "Đã cách ly" : "Chưa cách ly"}
                        </div>
                      </td>
                      <td className="px-3 py-2 space-y-1">
                        <Link href={r.link_mdro} className="block font-semibold text-[var(--primary)] underline">
                          BM.31.03
                        </Link>
                        <Link
                          href={r.link_isolation}
                          className="block font-semibold text-[var(--primary)] underline"
                        >
                          BM.14.01
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {rcaRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <p className="border-b border-slate-100 px-3 py-2 bv103-type-label text-slate-500">
                RCA nhanh (BA × MDRO × GSC × ca NKBV)
              </p>
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 bv103-type-label text-slate-500">
                  <tr>
                    <th className="px-3 py-2">BN</th>
                    <th className="px-3 py-2">MDRO</th>
                    <th className="px-3 py-2">Ca NKBV</th>
                    <th className="px-3 py-2">Phiên GSC</th>
                    <th className="px-3 py-2">BK MDRO/CL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rcaRows.slice(0, 40).map((r) => (
                    <tr key={r.ma_benh_an}>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{r.ho_ten_benh_nhan}</div>
                        <div className="font-mono text-[11px] text-slate-500">{r.ma_benh_an}</div>
                      </td>
                      <td className="px-3 py-2">{r.is_mdro ? r.mdro_phenotype || "có" : "—"}</td>
                      <td className="px-3 py-2">
                        {r.nkbv_case_count}
                        {r.latest_nkbv_ngay ? (
                          <span className="block text-[11px] text-slate-400">
                            {formatDateVi(r.latest_nkbv_ngay)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {r.gsc_session_count}
                        {r.latest_gsc_ngay ? (
                          <span className="block text-[11px] text-slate-400">
                            {formatDateVi(r.latest_gsc_ngay)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {r.has_mdro_bk ? "MDRO✓ " : "MDRO✗ "}
                        {r.has_isolation_bk ? "CL✓" : "CL✗"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
