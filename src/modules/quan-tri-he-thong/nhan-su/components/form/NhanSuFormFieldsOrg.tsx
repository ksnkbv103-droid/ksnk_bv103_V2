"use client";

import SearchableSelect from "@/components/shared/SearchableSelect";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import { quanTriFormChrome as F } from "../../../lib/quan-tri-form-chrome";

type Opt = { id: string; ten_danh_muc: string };

type Props = {
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown>) => void;
  loading: boolean;
  tos: Opt[];
  /** Giữ prop để caller cũ không gãy; ADM-07 không còn chọn vai trò trên form. */
  vaiTros?: Opt[];
  chucVus: Opt[];
  /** Chỉ hiện chọn vai trò KSNK (+ active) — form Thêm người ngắn. */
  compactRoleOnly?: boolean;
};

/** Khối Tổ / vai trò KSNK / chức vụ + cờ hoạt động — tách khỏi NhanSuFormFields (AGENTS §8). */
export default function NhanSuFormFieldsOrg({
  formData,
  setFormData,
  loading,
  tos,
  chucVus,
  compactRoleOnly = false,
}: Props) {
  // ADM-07: chỉ xem — nguồn thật = sys_user_roles (màn Tài khoản).
  const roleLabel =
    String(formData.vai_tro_he_thong_ksnk || formData.ten_vai_tro || "").trim() || "— chưa gán —";
  const roleBlock = (
    <div className="space-y-2">
      <label className={F.formLabelInset}>Vai trò trong hệ thống KSNK</label>
      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {roleLabel}
      </p>
      <p className="text-[11px] text-slate-500">
        Chỉ xem. Gán/gỡ vai trò tại màn Tài khoản nhân sự (nguồn thật: phân quyền đăng nhập).
      </p>
    </div>
  );

  if (compactRoleOnly) {
    return (
      <>
        {roleBlock}
        <div className="md:col-span-2">
          <MdmFormActiveToggleRow
            active={formData.is_active !== false}
            onChange={(next) => setFormData({ ...formData, is_active: next })}
            disabled={loading}
            footnote="Tắt để vô hiệu hóa hồ sơ trong lựa chọn mặc định — không xóa dữ liệu."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <label className={F.formLabelInset}>Tổ công tác</label>
        <SearchableSelect
          value={String(formData.to_id ?? "")}
          onChange={(val) => setFormData({ ...formData, to_id: val })}
          options={tos.map((t) => ({ id: t.id, label: t.ten_danh_muc }))}
          placeholder="-- Không thuộc tổ --"
          disabled={loading}
        />
      </div>

      {roleBlock}

      <div className="space-y-2 md:col-span-2">
        <label className={F.formLabelInset}>Chức vụ (danh mục tùy biến)</label>
        <SearchableSelect
          value={String(formData.chuc_vu_id ?? "")}
          onChange={(id) => {
            const row = chucVus.find((c) => c.id === id);
            setFormData({
              ...formData,
              chuc_vu_id: id,
              chuc_vu: row?.ten_danh_muc ?? "",
            });
          }}
          options={chucVus.map((c) => ({ id: c.id, label: c.ten_danh_muc }))}
          placeholder="-- Chọn chức vụ --"
          disabled={loading}
        />
      </div>

      <div className="md:col-span-2">
        <MdmFormActiveToggleRow
          active={formData.is_active !== false}
          onChange={(next) => setFormData({ ...formData, is_active: next })}
          disabled={loading}
          footnote="Tắt để vô hiệu hóa hồ sơ trong lựa chọn mặc định — không xóa dữ liệu."
        />
      </div>
    </>
  );
}
