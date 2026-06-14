"use client";

import React, { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getBangKiemApDungFormOptionsAction,
  saveBangKiemApDungAction,
} from "../actions/bang-kiem.actions";
import type { DanhMucBangKiem } from "../bang-kiem.types";
import { parseApDungJsonb, validateApDungForSave } from "@/lib/domain/bang-kiem-ap-dung";
import BangKiemApDungFields, { type BangKiemApDungFormState } from "./bang-kiem-ap-dung-fields";
import BangKiemApDungPreview from "./bang-kiem-ap-dung-preview";
import { usePermission } from "@/hooks/usePermission";
import { quanTriFormChrome as F } from "../../lib/quan-tri-form-chrome";

type Props = {
  bangKiem: DanhMucBangKiem;
  canEdit: boolean;
  onSaved: (apDung: BangKiemApDungFormState) => void;
};

export default function BangKiemApDungPanel({ bangKiem, canEdit, onSaved }: Props) {
  const { userData } = usePermission();
  const actorKhoaId = userData?.khoa_id ?? null;
  const actorKhoaLabel = userData?.khoa?.ten_khoa
    ? userData.khoa.ma_khoa
      ? `[${userData.khoa.ma_khoa}] ${userData.khoa.ten_khoa}`
      : userData.khoa.ten_khoa
    : null;
  const meta = {
    phan_loai_chuyen_mon: bangKiem.phan_loai_chuyen_mon ?? null,
    loai_giam_sat: bangKiem.loai_giam_sat ?? null,
  };
  const [apDung, setApDung] = useState<BangKiemApDungFormState>(() =>
    parseApDungJsonb(bangKiem.ap_dung_jsonb, meta),
  );
  const [khoiOptions, setKhoiOptions] = useState<{ id: string; label: string }[]>([]);
  const [khoaOptions, setKhoaOptions] = useState<{ id: string; label: string }[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setApDung(parseApDungJsonb(bangKiem.ap_dung_jsonb, meta));
  }, [bangKiem.id, bangKiem.ap_dung_jsonb, bangKiem.phan_loai_chuyen_mon, bangKiem.loai_giam_sat]);

  useEffect(() => {
    let alive = true;
    setLoadingOpts(true);
    void getBangKiemApDungFormOptionsAction().then((res) => {
      if (!alive) return;
      if (res.success) {
        setKhoiOptions(res.khoiOptions);
        setKhoaOptions(res.khoaOptions);
      }
      setLoadingOpts(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async () => {
    if (!canEdit) return;
    const validationErr = validateApDungForSave(apDung);
    if (validationErr) {
      toast.error(validationErr);
      return;
    }
    setSaving(true);
    const res = await saveBangKiemApDungAction(bangKiem.id, apDung);
    setSaving(false);
    if (res.success) {
      toast.success("Đã lưu quy định áp dụng");
      onSaved(res.data);
    } else {
      toast.error(res.error || "Không lưu được quy định áp dụng");
    }
  };

  const disabled = !canEdit || loadingOpts;

  return (
    <div className={`${F.shellPadded} ${F.sectionGap}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={F.panelTitle}>Quy định áp dụng</h3>
          <p className={`mt-1 max-w-md leading-relaxed ${F.panelSubtitle}`}>
            Thiết lập theo thứ tự: nghĩa vụ → khối → khoa → miễn trừ → đối tượng → tần suất phiên. Mẫu{" "}
            <span className={F.innerTableCode}>{bangKiem.ma_bk}</span>.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={disabled || saving}
            className={`${F.ctaPrimary} gap-2 shrink-0`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu áp dụng
          </button>
        ) : null}
      </div>

      {loadingOpts ? (
        <div className={`flex items-center gap-2 py-6 ${F.labelBlockInline} text-slate-400`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh mục khoa/khối…
        </div>
      ) : (
        <>
          <BangKiemApDungFields
            apDung={apDung}
            setApDung={setApDung}
            khoiOptions={khoiOptions}
            khoaOptions={khoaOptions}
            disabled={disabled}
            showSectionTitle={false}
            isSystemBk={Boolean(bangKiem.is_system)}
          />
          <BangKiemApDungPreview
            apDung={apDung}
            khoaOptions={khoaOptions}
            actorKhoaId={actorKhoaId}
            actorKhoaLabel={actorKhoaLabel}
          />
        </>
      )}

      {!canEdit ? (
        <p className={F.noticeWarning}>
          Bạn chỉ được xem — cần quyền chỉnh sửa Danh mục Bảng kiểm để lưu thay đổi.
        </p>
      ) : null}
    </div>
  );
}
