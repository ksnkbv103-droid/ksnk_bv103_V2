"use client";

/**
 * Form ca Chương 17 độc lập (không SSI). BV103 người lớn.
 */
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

export default function Ch17ClinicalSubForm({ form, onChange, allowedEdit }: Props) {
  const codes = ch17OperationalTypeCodes();

  return (
    <NkbvDomainFormShell
      title="Phiếu Chương 17 — nhiễm khuẩn chuyên biệt"
      subtypeLabel="Specific Type"
      indexFactorHint="Chọn mã loại CDC Chương 17; tiêu chuẩn nhánh người lớn."
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
          <NkbvCh17CriteriaChecklist
            typeCode={form.ch17_type_code}
            flags={form.chapter17_flags || {}}
            procedureCode={form.procedure_code}
            isInfantLe1={false}
            allowedEdit={allowedEdit}
            onFlagsChange={(chapter17_flags) => onChange({ ...form, chapter17_flags })}
          />
        </div>
      </NkbvFormSection>
    </NkbvDomainFormShell>
  );
}
