// src/components/shared/GiamSatHeaderPatientFields.tsx
"use client";

import React, { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import type { GiamSatSession } from "./giam-sat-header.types";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import {
  getPatientMdroSupervisionStatus,
  listInpatientsByKhoa,
  listMdroInpatientsByKhoa,
} from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv.actions";
import { getGscBoSungPatientHints } from "@/modules/giam-sat-chung/actions/giam-sat-chung.actions";
import {
  GSC_BK_ISOLATION,
  GSC_BK_MDRO,
  NKBV_MDRO_PHENOTYPE_LABELS,
  NKBV_MDRO_PHENOTYPES,
  type NkbvMdroPhenotype,
} from "@/modules/giam-sat-nkbv/lib/nkbv-mdro";

type PatientPickRow = {
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  so_giuong?: string | null;
  mdro_label?: string | null;
};

function isMdroPatientChecklist(bangKiemMa: string | null | undefined): boolean {
  const ma = String(bangKiemMa || "")
    .trim()
    .toUpperCase();
  return ma === GSC_BK_MDRO || ma === GSC_BK_ISOLATION;
}

interface GiamSatHeaderPatientFieldsProps {
  session: GiamSatSession;
  setSession: Dispatch<SetStateAction<GiamSatSession>>;
  /** Số thứ tự nhãn cột (5–7 nếu chỉ NB; 8–10 nếu đã có khối nhân viên 5–7). */
  labelStartIndex: number;
  /** Mã bảng kiểm đang mở — kích hoạt lọc MDRO mặc định với BM.31.03 / BM.14.01. */
  bangKiemMa?: string | null;
}

export default function GiamSatHeaderPatientFields({
  session,
  setSession,
  labelStartIndex,
  bangKiemMa = null,
}: GiamSatHeaderPatientFieldsProps) {
  const a = labelStartIndex;
  const b = labelStartIndex + 1;
  const c = labelStartIndex + 2;

  const mdroChecklist = isMdroPatientChecklist(bangKiemMa);
  /** false = chỉ BN đa kháng (mặc định khi BK MDRO/cách ly); true = mọi BN khoa. */
  const [showAllInpatients, setShowAllInpatients] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  const [inpatients, setInpatients] = useState<PatientPickRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [status, setStatus] = useState<{
    is_mdro: boolean;
    mdro_phenotype: NkbvMdroPhenotype | null;
    has_mdro_supervision: boolean;
    has_isolation_checklist: boolean;
    link_mdro: string;
    link_isolation: string;
  } | null>(null);

  /** Đổi khoa hoặc đổi BK → về chế độ lọc MDRO mặc định. */
  useEffect(() => {
    setShowAllInpatients(false);
  }, [session.khoa_id, bangKiemMa]);

  const useMdroFilter = mdroChecklist && !showAllInpatients;

  useEffect(() => {
    const khoaId = String(session.khoa_id || "").trim();
    if (!khoaId) {
      setInpatients([]);
      return;
    }
    let cancelled = false;
    setLoadingList(true);
    void (async () => {
      if (useMdroFilter) {
        const res = await listMdroInpatientsByKhoa({ khoaId, limit: 300 });
        if (cancelled) return;
        setLoadingList(false);
        if (!res.success) {
          setInpatients([]);
          return;
        }
        setInpatients(
          res.data.map((r) => ({
            ma_benh_an: r.ma_benh_an,
            ma_benh_nhan: r.ma_benh_nhan,
            ho_ten_benh_nhan: r.ho_ten_benh_nhan,
            so_giuong: null,
            mdro_label: r.mdro_phenotype_label || null,
          })),
        );
        return;
      }

      const res = await listInpatientsByKhoa({ khoaId, limit: 300 });
      if (cancelled) return;
      setLoadingList(false);
      if (!res.success) {
        setInpatients([]);
        return;
      }
      setInpatients(
        res.data.map((r) => ({
          ma_benh_an: r.ma_benh_an,
          ma_benh_nhan: r.ma_benh_nhan,
          ho_ten_benh_nhan: r.ho_ten_benh_nhan,
          so_giuong: r.so_giuong,
          mdro_label: null,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [session.khoa_id, useMdroFilter]);

  useEffect(() => {
    const ba = String(session.ma_benh_an || "").trim();
    const pid = String(session.ma_nguoi_benh || "").trim();
    if (!ba && !pid) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getPatientMdroSupervisionStatus({
        maBenhAn: ba || null,
        maBenhNhan: pid || null,
        khoaId: session.khoa_id || null,
      });
      if (cancelled) return;
      if (res.success) setStatus(res.data);
      else setStatus(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.ma_benh_an, session.ma_nguoi_benh, session.khoa_id]);

  const onPickBa = (maBa: string) => {
    const row = inpatients.find((r) => r.ma_benh_an === maBa);
    if (!row) {
      setSession({ ...session, ma_benh_an: maBa });
      return;
    }
    setSession({
      ...session,
      ma_benh_an: row.ma_benh_an,
      ma_nguoi_benh: row.ma_benh_nhan,
      ten_nguoi_benh: row.ho_ten_benh_nhan,
      so_giuong_nguoi_benh: row.so_giuong || session.so_giuong_nguoi_benh || "",
    });
    setHintLoading(true);
    void (async () => {
      const hints = await getGscBoSungPatientHints(row.ma_benh_an);
      setHintLoading(false);
      if (!hints.success) return;
      setSession((prev) => ({
        ...prev,
        ma_benh_an: row.ma_benh_an,
        ma_nguoi_benh: row.ma_benh_nhan,
        ten_nguoi_benh: row.ho_ten_benh_nhan,
        so_giuong_nguoi_benh: row.so_giuong || prev.so_giuong_nguoi_benh || "",
        ...hints.data,
      }));
    })();
  };

  const emptyHint = !session.khoa_id
    ? "Chọn khoa ở khung trên trước…"
    : loadingList
      ? "Đang tải danh sách…"
      : inpatients.length
        ? useMdroFilter
          ? "— Chọn BN đa kháng còn nằm viện —"
          : "— Chọn BN còn nằm viện (hoặc nhập tay bên dưới) —"
        : useMdroFilter
          ? "Không có BN đa kháng còn nằm tại khoa"
          : "Không có BN còn nằm viện tại khoa — nhập tay bên dưới";

  const checkCls = "flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700";

  return (
    <div className="min-w-0">
      <div className={`${C.panelInset} p-4`}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={C.sectionTitle}>Thông tin người bệnh (đang nằm viện)</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              Danh sách theo khoa đã chọn ở khung trên — không chọn khoa lần nữa.
            </p>
          </div>
          {mdroChecklist ? (
            <button
              type="button"
              className={`${C.btnSecondary} h-auto min-h-0 px-2.5 py-1 text-[11px]`}
              onClick={() => setShowAllInpatients((v) => !v)}
            >
              {showAllInpatients ? "Chỉ BN đa kháng" : "Xem tất cả BN khoa"}
            </button>
          ) : null}
        </div>
        {mdroChecklist ? (
          <p className="mb-3 text-[11px] font-medium text-slate-500">
            {useMdroFilter
              ? "Đang lọc BN còn nằm viện có nhãn đa kháng (kho vi sinh)."
              : "Đang hiện mọi BN còn nằm viện tại khoa (không lọc đa kháng)."}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-3">
          <div className="min-w-0 space-y-1 sm:col-span-3">
            <label className={`block ${C.labelField}`}>
              {a}. Chọn bệnh nhân theo khoa phiên
            </label>
            <select
              className={C.controlInput}
              value={session.ma_benh_an || ""}
              disabled={!session.khoa_id || loadingList}
              onChange={(e) => onPickBa(e.target.value)}
            >
              <option value="">{emptyHint}</option>
              {inpatients.map((r) => (
                <option key={r.ma_benh_an} value={r.ma_benh_an}>
                  {r.ho_ten_benh_nhan} · BA {r.ma_benh_an} · PID {r.ma_benh_nhan}
                  {r.mdro_label ? ` · ${r.mdro_label}` : ""}
                </option>
              ))}
            </select>
            {useMdroFilter && !loadingList && session.khoa_id && inpatients.length === 0 ? (
              <p className="pt-1 text-[11px] text-amber-800">
                Chưa có BN đa kháng tại khoa — bấm 「Xem tất cả BN khoa」 nếu cần chọn thủ công.
              </p>
            ) : null}
            {hintLoading ? (
              <p className="pt-1 text-[11px] text-slate-500">Đang gợi ý can thiệp / đa kháng từ hồ sơ…</p>
            ) : null}
          </div>
          <div className="min-w-0 space-y-1">
            <label className={`block ${C.labelField}`}>{b}. Mã người bệnh (PID)</label>
            <input
              className={C.controlInput}
              placeholder="PID… (nhập tay nếu không chọn danh sách)"
              autoComplete="off"
              value={session.ma_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ma_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-2">
            <label className={`block ${C.labelField}`}>Tên người bệnh</label>
            <input
              className={C.controlInput}
              placeholder="Họ và tên…"
              autoComplete="off"
              value={session.ten_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ten_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-3">
            <label className={`block ${C.labelField}`}>{c}. Số giường</label>
            <input
              className={`${C.controlInput} max-w-md`}
              placeholder="Ví dụ: 12A, G2…"
              autoComplete="off"
              value={session.so_giuong_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, so_giuong_nguoi_benh: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-200/80 pt-3">
          <p className={`${C.labelField} text-slate-700`}>Can thiệp xâm lấn (ảnh chụp lúc giám sát)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className={checkCls}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={Boolean(session.bn_tho_may)}
                onChange={(e) => setSession({ ...session, bn_tho_may: e.target.checked })}
              />
              Thở máy
            </label>
            <label className={checkCls}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={Boolean(session.bn_phau_thuat)}
                onChange={(e) => setSession({ ...session, bn_phau_thuat: e.target.checked })}
              />
              Phẫu thuật
            </label>
            <label className={checkCls}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={Boolean(session.bn_cvc)}
                onChange={(e) => setSession({ ...session, bn_cvc: e.target.checked })}
              />
              Đặt đường truyền trung tâm (CVC)
            </label>
            <label className={checkCls}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={Boolean(session.bn_foley)}
                onChange={(e) => setSession({ ...session, bn_foley: e.target.checked })}
              />
              Đặt ống thông tiểu
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2 rounded-xl border border-slate-200 bg-white/80 p-3">
              <label className={checkCls}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={Boolean(session.bn_nhiem_mdro)}
                  onChange={(e) =>
                    setSession({
                      ...session,
                      bn_nhiem_mdro: e.target.checked,
                      bn_mdro_phenotype: e.target.checked ? session.bn_mdro_phenotype || "" : "",
                    })
                  }
                />
                Nhiễm vi khuẩn đa kháng (MDRO)
              </label>
              {session.bn_nhiem_mdro ? (
                <div className="space-y-1">
                  <label className={`block ${C.labelField}`}>Phenotype (nếu biết)</label>
                  <select
                    className={C.controlInput}
                    value={session.bn_mdro_phenotype || ""}
                    onChange={(e) =>
                      setSession({ ...session, bn_mdro_phenotype: e.target.value })
                    }
                  >
                    <option value="">— Chọn phenotype —</option>
                    {NKBV_MDRO_PHENOTYPES.map((p) => (
                      <option key={p} value={p}>
                        {NKBV_MDRO_PHENOTYPE_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 space-y-2 rounded-xl border border-slate-200 bg-white/80 p-3">
              <label className={checkCls}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={Boolean(session.bn_nhiem_tac_nhan_nguy_hiem)}
                  onChange={(e) =>
                    setSession({
                      ...session,
                      bn_nhiem_tac_nhan_nguy_hiem: e.target.checked,
                      bn_tac_nhan_nguy_hiem_ten: e.target.checked
                        ? session.bn_tac_nhan_nguy_hiem_ten || ""
                        : "",
                    })
                  }
                />
                Nhiễm tác nhân gây bệnh nguy hiểm
              </label>
              {session.bn_nhiem_tac_nhan_nguy_hiem ? (
                <div className="space-y-1">
                  <label className={`block ${C.labelField}`}>Tên tác nhân</label>
                  <input
                    className={C.controlInput}
                    placeholder="Ví dụ: Mycobacterium tuberculosis…"
                    autoComplete="off"
                    value={session.bn_tac_nhan_nguy_hiem_ten || ""}
                    onChange={(e) =>
                      setSession({ ...session, bn_tac_nhan_nguy_hiem_ten: e.target.value })
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {status ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3 text-xs">
            <p className="mb-2 font-bold text-slate-700">Trạng thái đa kháng / giám sát (từ hệ thống)</p>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  status.is_mdro ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {status.is_mdro
                  ? `Đa kháng: ${
                      status.mdro_phenotype
                        ? NKBV_MDRO_PHENOTYPE_LABELS[status.mdro_phenotype]
                        : "có"
                    }`
                  : "Không ghi nhận MDRO"}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  status.has_mdro_supervision
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {status.has_mdro_supervision ? "Đã GS đa kháng (BM.31.03)" : "Chưa GS đa kháng"}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  status.has_isolation_checklist
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {status.has_isolation_checklist ? "Đã BK cách ly (BM.14.01)" : "Chưa BK cách ly"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {status.link_mdro ? (
                <Link href={status.link_mdro} className="font-semibold text-[var(--primary)] underline">
                  Mở bảng kiểm phòng ngừa MDRO
                </Link>
              ) : null}
              {status.link_isolation ? (
                <Link
                  href={status.link_isolation}
                  className="font-semibold text-[var(--primary)] underline"
                >
                  Mở bảng kiểm cách ly đường lây
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
