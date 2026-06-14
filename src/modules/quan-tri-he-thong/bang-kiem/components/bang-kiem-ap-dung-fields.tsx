"use client";

import React from "react";
import SearchableMultiSelect, { type MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import type { BangKiemApDungJsonb, BkMucDo } from "@/lib/domain/bang-kiem-ap-dung";
import {
  derivePhamVi,
  MUC_DO_DESCRIPTIONS,
  MUC_DO_LABELS,
  needsApDungKhoaConfiguration,
  PHAM_VI_LABELS,
  TAN_SUAT_DON_VI_LABELS,
  type BkTanSuatDonVi,
} from "@/lib/domain/bang-kiem-ap-dung";
import { quanTriFormChrome as F } from "../../lib/quan-tri-form-chrome";

export type BangKiemApDungFormState = BangKiemApDungJsonb;

export type BangKiemApDungKhoaOption = MultiSelectOption;

interface Props {
  apDung: BangKiemApDungFormState;
  setApDung: React.Dispatch<React.SetStateAction<BangKiemApDungFormState>>;
  khoiOptions: MultiSelectOption[];
  khoaOptions: BangKiemApDungKhoaOption[];
  disabled?: boolean;
  showSectionTitle?: boolean;
  isSystemBk?: boolean;
}

function SectionHeader({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <h4 className={F.sectionTitle}>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mr-2 text-[11px] font-semibold">
          {step}
        </span>
        {title}
      </h4>
      {hint ? <p className={`${F.panelSubtitle} pl-7`}>{hint}</p> : null}
    </div>
  );
}

export default function BangKiemApDungFields({
  apDung,
  setApDung,
  khoiOptions,
  khoaOptions,
  disabled,
  showSectionTitle = true,
  isSystemBk,
}: Props) {
  const chiKsnkNoiBo = apDung.muc_do === "CHI_KSNK";
  const derivedPhamVi = derivePhamVi(apDung);
  const showTanSuat = apDung.muc_do === "BAT_BUOC" && apDung.bat_buoc.tu_giam_sat;
  const tanSuatDonVi = apDung.tan_suat_toi_thieu?.don_vi ?? "";
  const tanSuatSoLan = apDung.tan_suat_toi_thieu?.so_lan ?? "";
  const needsKhoaConfig = needsApDungKhoaConfiguration(apDung);

  const khoaClinical = khoaOptions.filter((k) => {
    const ma = k.label.toUpperCase();
    return !ma.includes("KSNK") && !ma.includes("C18");
  });

  const khoaTheoKhoi =
    apDung.khoi_ids.length > 0
      ? khoaClinical.filter((k) => k.khoi_id && apDung.khoi_ids.includes(k.khoi_id))
      : khoaClinical;

  return (
    <div className={`space-y-6 ${showSectionTitle ? "border-t border-slate-100 pt-4" : ""}`}>
      {showSectionTitle ? (
        <h3 className={F.panelTitle}>Quy định áp dụng bảng kiểm</h3>
      ) : null}

      {isSystemBk ? (
        <p className="text-[11px] font-medium text-sky-800 bg-sky-50 rounded-[var(--radius-shell)] px-4 py-2">
          Mẫu hệ thống: chỉnh được quy định áp dụng; mã, tên và tiêu chí giữ nguyên.
        </p>
      ) : null}

      {needsKhoaConfig ? (
        <div className="rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <p className="text-[11px] font-bold text-amber-900">
            Mẫu «{PHAM_VI_LABELS[apDung.pham_vi]}» — chưa chọn{" "}
            {apDung.pham_vi === "THEO_KHOI" ? "khối" : "khoa"} áp dụng. Không khoa nào thuộc phạm vi cho đến khi
            hoàn thiện.
          </p>
          {!disabled ? (
            <button
              type="button"
              className="text-[11px] font-bold text-[var(--primary)] hover:underline"
              onClick={() =>
                setApDung((p) => ({
                  ...p,
                  pham_vi: "CA_VIEN",
                  khoi_ids: [],
                  khoa_ids: [],
                }))
              }
            >
              Chuyển sang «Cả viện» (nếu áp dụng toàn viện)
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ① Tính chất bắt buộc */}
      <section className="space-y-3 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50/50 p-4">
        <SectionHeader
          step={1}
          title="Tính chất nghĩa vụ"
          hint="Quyết định có tính vào KPI thiếu hay chỉ khuyến nghị."
        />
        <div className="space-y-2 pl-7">
          {(Object.keys(MUC_DO_LABELS) as BkMucDo[]).map((k) => (
            <label
              key={k}
              className={`flex items-start gap-3 rounded-[var(--radius-shell)] border px-4 py-3 cursor-pointer transition-colors ${
                apDung.muc_do === k
                  ? "border-[var(--primary)]/30 bg-white shadow-sm"
                  : "border-transparent bg-white/60 hover:bg-white"
              }`}
            >
              <input
                type="radio"
                name="muc_do"
                checked={apDung.muc_do === k}
                disabled={disabled}
                onChange={() => {
                  setApDung((p) => ({
                    ...p,
                    muc_do: k,
                    bat_buoc:
                      k === "CHI_KSNK"
                        ? { ...p.bat_buoc, tu_giam_sat: false, ksnk_giam_sat: true }
                        : p.bat_buoc,
                    khoi_ids: k === "CHI_KSNK" ? [] : p.khoi_ids,
                    khoa_ids: k === "CHI_KSNK" ? [] : p.khoa_ids,
                    khoa_loai_tru: k === "CHI_KSNK" ? [] : p.khoa_loai_tru,
                    tan_suat_toi_thieu: k === "BAT_BUOC" ? p.tan_suat_toi_thieu : undefined,
                  }));
                }}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">{MUC_DO_LABELS[k]}</span>
                <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
                  {MUC_DO_DESCRIPTIONS[k]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {!chiKsnkNoiBo ? (
        <>
          {/* ② Phạm vi theo khối */}
          <section className="space-y-3">
            <SectionHeader
              step={2}
              title="Phạm vi áp dụng theo khối"
              hint="Để trống = tất cả khối. Chọn khối để giới hạn trước khi chọn khoa."
            />
            <div className="pl-7">
              <SearchableMultiSelect
                label="Khối áp dụng"
                options={khoiOptions}
                selected={apDung.khoi_ids}
                onChange={(next) =>
                  setApDung((p) => ({
                    ...p,
                    khoi_ids: next,
                    khoa_ids: p.khoa_ids.filter((id) => {
                      const k = khoaOptions.find((o) => o.id === id);
                      return !k?.khoi_id || next.length === 0 || next.includes(k.khoi_id);
                    }),
                  }))
                }
                disabled={disabled}
                minWidthClassName="w-full"
              />
            </div>
          </section>

          {/* ③ Phạm vi theo khoa */}
          <section className="space-y-3">
            <SectionHeader
              step={3}
              title="Phạm vi áp dụng theo khoa"
              hint="Để trống = mọi khoa lâm sàng trong khối đã chọn (hoặc cả viện nếu chưa chọn khối)."
            />
            <div className="pl-7">
              <SearchableMultiSelect
                label="Khoa áp dụng"
                options={khoaTheoKhoi}
                selected={apDung.khoa_ids}
                onChange={(next) => setApDung((p) => ({ ...p, khoa_ids: next }))}
                disabled={disabled}
                minWidthClassName="w-full"
              />
            </div>
          </section>

          {/* ④ Khoa miễn trừ */}
          <section className="space-y-3">
            <SectionHeader
              step={4}
              title="Các khoa được miễn trừ"
              hint="Trừ khỏi phạm vi dù thuộc khối/khoa đã chọn — dùng khi «cả viện trừ KSNK» hoặc ngoại lệ."
            />
            <div className="pl-7">
              <SearchableMultiSelect
                label="Khoa miễn trừ"
                options={khoaClinical}
                selected={apDung.khoa_loai_tru}
                onChange={(next) => setApDung((p) => ({ ...p, khoa_loai_tru: next }))}
                disabled={disabled}
                minWidthClassName="w-full"
              />
            </div>
          </section>
        </>
      ) : (
        <p className="text-[11px] font-medium text-slate-500 bg-slate-50 rounded-[var(--radius-shell)] px-4 py-3">
          Chế độ «Chỉ Khoa KSNK» — bỏ qua phạm vi khối/khoa lâm sàng; chỉ Khoa Kiểm soát nhiễm khuẩn thực hiện.
        </p>
      )}

      {/* ⑤ Đối tượng phải thực hiện */}
      <section className="space-y-3 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50/50 p-4">
        <SectionHeader
          step={5}
          title="Đối tượng phải thực hiện"
          hint="Ai chịu trách nhiệm: mạng lưới KSNK tại khoa (TGS) và/hoặc Khoa KSNK đối soát."
        />
        <div className="space-y-3 pl-7">
          <label
            className={`flex items-start gap-3 rounded-[var(--radius-shell)] border px-4 py-3 ${
              apDung.bat_buoc.tu_giam_sat ? "border-emerald-200 bg-emerald-50/50" : "border-transparent bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={apDung.bat_buoc.tu_giam_sat}
              disabled={disabled || chiKsnkNoiBo}
              onChange={(e) =>
                setApDung((p) => ({
                  ...p,
                  bat_buoc: { ...p.bat_buoc, tu_giam_sat: e.target.checked },
                  tan_suat_toi_thieu: e.target.checked ? p.tan_suat_toi_thieu : undefined,
                }))
              }
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">
                Mạng lưới KSNK tại khoa (Tự giám sát — TGS)
              </span>
              <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
                Điều dưỡng/trưởng nhóm KSNK khoa tạo phiên TU_GIAM_SAT theo bảng kiểm này.
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-3 rounded-[var(--radius-shell)] border px-4 py-3 ${
              apDung.bat_buoc.ksnk_giam_sat ? "border-sky-200 bg-sky-50/50" : "border-transparent bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={apDung.bat_buoc.ksnk_giam_sat}
              disabled={disabled}
              onChange={(e) =>
                setApDung((p) => ({
                  ...p,
                  bat_buoc: { ...p.bat_buoc, ksnk_giam_sat: e.target.checked },
                }))
              }
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">Khoa KSNK (Giám sát chéo / đối soát)</span>
              <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
                Khoa Kiểm soát nhiễm khuẩn thực hiện hoặc đối soát phiên giám sát của các khoa.
              </span>
            </span>
          </label>
        </div>
      </section>

      {/* ⑥ Số phiên TGS tối thiểu — KSNK quy định sau; để trống = chưa áp dụng KPI tần suất */}
      {showTanSuat ? (
        <section className="space-y-3 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50/50 p-4">
          <SectionHeader
            step={6}
            title="Số phiên TGS tối thiểu"
            hint="KSNK quy định tần suất trên danh mục — để trống nếu chưa có quy định chính thức."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
            <div className="space-y-2">
              <label className={F.formLabel}>Đơn vị kỳ</label>
              <select
                value={tanSuatDonVi}
                disabled={disabled}
                onChange={(e) => {
                  const don_vi = e.target.value as BkTanSuatDonVi | "";
                  setApDung((p) => {
                    if (!don_vi) {
                      const { tan_suat_toi_thieu: _drop, ...rest } = p;
                      return rest;
                    }
                    return {
                      ...p,
                      tan_suat_toi_thieu: {
                        don_vi,
                        so_lan: p.tan_suat_toi_thieu?.so_lan ?? 1,
                      },
                    };
                  });
                }}
                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-[var(--radius-shell)] text-sm font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none disabled:opacity-60"
              >
                <option value="">— Chưa quy định —</option>
                {(Object.keys(TAN_SUAT_DON_VI_LABELS) as BkTanSuatDonVi[]).map((k) => (
                  <option key={k} value={k}>
                    Theo {TAN_SUAT_DON_VI_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={F.formLabel}>Số phiên tối thiểu</label>
              <input
                type="number"
                min={1}
                step={1}
                value={tanSuatSoLan}
                disabled={disabled || !tanSuatDonVi}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!tanSuatDonVi) return;
                  const so_lan = raw === "" ? 1 : Math.max(1, parseInt(raw, 10) || 1);
                  setApDung((p) => ({
                    ...p,
                    tan_suat_toi_thieu: { don_vi: tanSuatDonVi as BkTanSuatDonVi, so_lan },
                  }));
                }}
                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-[var(--radius-shell)] text-sm font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none disabled:opacity-60"
                placeholder="VD: 1"
              />
            </div>
          </div>
        </section>
      ) : null}

      <div className="space-y-2">
        <label className={F.formLabel}>Ghi chú phạm vi</label>
        <textarea
          value={apDung.ghi_chu ?? ""}
          disabled={disabled}
          onChange={(e) => setApDung((p) => ({ ...p, ghi_chu: e.target.value }))}
          rows={2}
          className="w-full px-6 py-4 bg-slate-50 border-none rounded-[var(--radius-shell)] text-sm font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none resize-none disabled:opacity-60"
          placeholder="Ghi chú cho admin KSNK…"
        />
      </div>

      <p className={`${F.panelSubtitle} font-semibold text-slate-400`}>
        Phạm vi suy ra: {PHAM_VI_LABELS[derivedPhamVi]} — lưu tự động khi bấm «Lưu áp dụng».
      </p>
    </div>
  );
}
