"use client";

import type { ExamFormThongTin } from "@/lib/dao-tao/types";
import { DaoTaoField } from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

type Props = {
  value: ExamFormThongTin;
  onChange: (v: ExamFormThongTin) => void;
  disabled?: boolean;
  /** Chỉ hiện ô còn thiếu (họ tên / khoa). */
  requiredOnly?: boolean;
};

export function DaoTaoExamInfoForm({ value, onChange, disabled, requiredOnly }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DaoTaoField label="Họ và tên *">
        <input
          className={C.controlInput}
          value={value.hoTen}
          disabled={disabled}
          autoComplete="name"
          onChange={(e) => onChange({ ...value, hoTen: e.target.value })}
        />
      </DaoTaoField>
      <DaoTaoField label="Khoa / đơn vị *">
        <input
          className={C.controlInput}
          value={value.khoaDonVi}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, khoaDonVi: e.target.value })}
        />
      </DaoTaoField>
      {requiredOnly ? null : (
        <>
          <DaoTaoField label="Số điện thoại">
            <input
              className={C.controlInput}
              value={value.soDienThoai ?? ""}
              disabled={disabled}
              inputMode="tel"
              onChange={(e) => onChange({ ...value, soDienThoai: e.target.value })}
            />
          </DaoTaoField>
          <DaoTaoField label="Email nội bộ">
            <input
              className={C.controlInput}
              value={value.email ?? ""}
              disabled={disabled}
              type="email"
              autoComplete="email"
              onChange={(e) => onChange({ ...value, email: e.target.value })}
            />
          </DaoTaoField>
        </>
      )}
    </div>
  );
}
