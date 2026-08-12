"use client";

/**
 * Form ca Chương 17 độc lập (không SSI).
 */
import { useEffect } from "react";
import {
  ageYearsFromNgaySinh,
  resolveIsInfantLe1Flag,
  showInfantCriteriaUi,
} from "../../lib/nkbv-age-ui";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import { ch17OperationalTypeCodes, ch17TypeDef } from "../../lib/nkbv-ch17-definitions";
import type { Ch17VerificationData } from "../../types/nkbv-verification";
import NkbvCh17CriteriaChecklist from "../NkbvCh17CriteriaChecklist";
import NkbvDomainFormShell from "../NkbvDomainFormShell";
import NkbvFormSection from "../NkbvFormSection";

type Props = {
  form: Ch17VerificationData;
  onChange: (updated: Ch17VerificationData) => void;
  allowedEdit: boolean;
  ngaySinh?: string | null;
  ngayPhatHien?: string | null;
};

export default function Ch17ClinicalSubForm({
  form,
  onChange,
  allowedEdit,
  ngaySinh,
  ngayPhatHien,
}: Props) {
  const codes = ch17OperationalTypeCodes();
  const ageYears = ageYearsFromNgaySinh(ngaySinh, ngayPhatHien || undefined);
  const showInfantUi = showInfantCriteriaUi(ageYears);
  const infantFlag = resolveIsInfantLe1Flag(ageYears);

  useEffect(() => {
    if (form.is_infant_le1 === infantFlag) return;
    onChange({ ...form, is_infant_le1: infantFlag });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional sync on age gate
  }, [infantFlag]);

  return (
    <NkbvDomainFormShell
      title="Phiếu Chương 17 — nhiễm khuẩn chuyên biệt"
      subtypeLabel="Specific Type"
      indexFactorHint="Chọn mã loại CDC Chương 17; đánh dấu tiêu chuẩn theo định nghĩa từng loại. RIT/SBAP theo loại (ENDO có cửa sổ riêng)."
      embedded
    >
      <NkbvFormSection title="Nhiễm khuẩn chuyên biệt — Chương 17">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Mã loại (Specific Type)</span>
            <select
              className={C.controlInput}
              value={form.ch17_type_code || ""}
              disabled={!allowedEdit}
              onChange={(e) =>
                onChange({
                  ...form,
                  ch17_type_code: e.target.value,
                  chapter17_flags: {},
                })
              }
            >
              <option value="">— Chọn loại —</option>
              {codes.map((code) => {
                const d = ch17TypeDef(code);
                return (
                  <option key={code} value={code}>
                    {d ? `${code} — ${d.name_vi}` : code}
                  </option>
                );
              })}
            </select>
          </label>
          {showInfantUi ? (
            <p className="text-[11px] font-semibold text-violet-800">
              Bệnh nhi ≤ 1 tuổi (theo ngày sinh) — dùng nhánh infant Chương 17
            </p>
          ) : null}
          <NkbvCh17CriteriaChecklist
            typeCode={form.ch17_type_code}
            flags={form.chapter17_flags || {}}
            procedureCode={form.procedure_code}
            isInfantLe1={infantFlag}
            allowedEdit={allowedEdit}
            onFlagsChange={(chapter17_flags) => onChange({ ...form, chapter17_flags })}
          />
        </div>
      </NkbvFormSection>
    </NkbvDomainFormShell>
  );
}
