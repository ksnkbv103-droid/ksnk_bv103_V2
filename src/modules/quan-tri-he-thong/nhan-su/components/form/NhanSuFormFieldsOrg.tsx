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
  vaiTros: Opt[];
  chucVus: Opt[];
};

/** Khối Tổ / vai trò KSNK / chức vụ + cờ hoạt động — tách khỏi NhanSuFormFields (AGENTS §8). */
export default function NhanSuFormFieldsOrg({
  formData,
  setFormData,
  loading,
  tos,
  vaiTros,
  chucVus,
}: Props) {
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

      <div className="space-y-2">
        <label className={F.formLabelInset}>Vai trò trong hệ thống KSNK</label>
        <SearchableSelect
          value={String(formData.vai_tro_he_thong_id ?? "")}
          onChange={(id) => {
            const row = vaiTros.find((v) => v.id === id);
            setFormData({
              ...formData,
              vai_tro_he_thong_id: id,
              vai_tro_he_thong_ksnk: row?.ten_danh_muc ?? "",
            });
          }}
          options={vaiTros.map((v) => ({ id: v.id, label: v.ten_danh_muc }))}
          placeholder="-- Chọn vai trò --"
          disabled={loading}
        />
      </div>

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
