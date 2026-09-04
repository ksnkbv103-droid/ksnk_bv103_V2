"use client";

import React, { useState, useEffect } from "react";
import { getNhanSuFormOptionsAction, suggestNextMaNhanSuMaAction } from "../actions/nhan-su-read.actions";
import { NHAN_SU_DEFAULT_MA_NV_PREFIX } from "../lib/nhan-su-ma-prefix";
import { saveNhanSuAction } from "../actions/nhan-su-write.actions";
import type { NhanSu } from "../types";
import { toast } from "sonner";
import NhanSuFormFields from "./form/NhanSuFormFields";
import NhanSuLoginFields from "./form/NhanSuLoginFields";
import { afterSaveNhanSuLogin } from "../lib/nhan-su-after-save-login";
import { useGenerateMa } from "@/hooks/useGenerateMa";
import { usePermission } from "@/hooks/usePermission";
import { quanTriFormChrome as F } from "../../lib/quan-tri-form-chrome";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  initialData?: Partial<NhanSu> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function NhanSuForm({ initialData, onSuccess, onCancel }: Props) {
  const { maTuDong } = useGenerateMa(NHAN_SU_DEFAULT_MA_NV_PREFIX, undefined, () =>
    suggestNextMaNhanSuMaAction(NHAN_SU_DEFAULT_MA_NV_PREFIX),
  );
  const [loading, setLoading] = useState(false);
  const [khoas, setKhoas] = useState<{ id: string; ten_danh_muc: string; ma_danh_muc?: string }[]>([]);
  const [chucDanhs, setChucDanhs] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [tos, setTos] = useState<{ id: string; ten_danh_muc: string; extra_data?: Record<string, unknown> | null }[]>([]);
  const [vaiTros, setVaiTros] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [chucVus, setChucVus] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [ngheNghieps, setNgheNghieps] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [loginPassword, setLoginPassword] = useState("");
  const [createLogin, setCreateLogin] = useState(() => !initialData?.id);
  const { isAdmin, canEdit } = usePermission();
  const canProvision = isAdmin || canEdit("PHAN_QUYEN");
  const hasAuth = Boolean(initialData?.auth_user_id);
  
  const defaults: Partial<NhanSu> = {
    ma_nv: "",
    ho_ten: "",
    khoa_id: "",
    to_id: "",
    chuc_vu: "",
    chuc_vu_id: "",
    chuc_danh_id: "",
    chuc_danh: "",
    vai_tro_he_thong_id: "",
    vai_tro_he_thong_ksnk: "",
    nghe_nghiep_id: "",
    ngay_sinh: null,
    gioi_tinh: null,
    so_dien_thoai: "",
    email: "",
    is_active: true,
    extra_data: {},
  };

  const [formData, setFormData] = useState<Partial<NhanSu>>(() =>
    initialData ? { ...defaults, ...initialData, is_active: initialData.is_active ?? true } : defaults
  );

  useEffect(() => {
    async function loadCategories() {
      const res = await getNhanSuFormOptionsAction();
      if (!res.success) {
        toast.error(res.error || "Không tải được danh mục nhân sự.");
        return;
      }
      const norm = <T extends { id?: string; ten_danh_muc?: string }>(rows: T[]) =>
        rows
          .filter((r): r is T & { id: string } => Boolean(r.id))
          .map((r) => ({ id: r.id, ten_danh_muc: String(r.ten_danh_muc ?? "") }));
      setKhoas(
        (res.data.khoas || [])
          .filter((r): r is { id: string; ten_danh_muc: string | null; ma_danh_muc: string | null } => Boolean(r.id))
          .map((r) => ({
            id: r.id,
            ten_danh_muc: String(r.ten_danh_muc ?? ""),
            ma_danh_muc: r.ma_danh_muc ? String(r.ma_danh_muc) : undefined,
          })),
      );
      setChucDanhs(norm(res.data.chucDanhs || []));
      setTos(
        (res.data.tos || [])
          .filter((r: { id?: string; ten_danh_muc?: string; extra_data?: any }): r is { id: string; ten_danh_muc?: string; extra_data?: any } => Boolean(r.id))
          .map((r: { id: string; ten_danh_muc?: string; extra_data?: any }) => {
            const ex = r as { extra_data?: Record<string, unknown> | null };
            return {
              id: r.id,
              ten_danh_muc: String(r.ten_danh_muc ?? ""),
              extra_data: ex.extra_data ?? null,
            };
          }),
      );
      setChucVus(norm(res.data.chucVus || []));
      setVaiTros(norm(res.data.vaiTros || []));
      setNgheNghieps(norm(res.data.ngheNghieps || []));
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!initialData?.id && maTuDong && !formData.ma_nv) {
      setFormData(prev => ({ ...prev, ma_nv: maTuDong }));
    }
  }, [maTuDong, initialData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ma_nv || !formData.ho_ten) {
      toast.error("Vui lòng nhập đầy đủ Mã NV và Họ tên");
      return;
    }

    setLoading(true);

    // Clean data: Chuyển "" thành null để tránh lỗi UUID invalid input syntax
    const cleaned: Record<string, unknown> = { ...formData };
    // Không gửi các field join/hiển thị về DB để tránh lỗi schema cache.
    delete cleaned.khoa;
    delete cleaned.to;
    delete cleaned.nghe_nghiep;
    delete cleaned.ten_khoa;
    delete cleaned.ten_to;
    delete cleaned.ten_chuc_danh;
    delete cleaned.ten_chuc_vu;
    delete cleaned.ten_vai_tro;
    delete cleaned.ten_nghe_nghiep;
    delete cleaned.ten_nghe_nghiep_dm;
    
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === "") cleaned[key] = null;
    }
    const res = await saveNhanSuAction(cleaned as Partial<NhanSu>);
    if (!res.success) {
      setLoading(false);
      toast.error(res.error || "Có lỗi xảy ra khi lưu dữ liệu");
      return;
    }

    const staffId = res.id || initialData?.id || "";
    const roleName = String(
      vaiTros.find((v) => v.id === String(formData.vai_tro_he_thong_id || ""))?.ten_danh_muc || "",
    ).trim();
    await afterSaveNhanSuLogin({
      staffId,
      savedMessage: res.message || "Đã lưu hồ sơ.",
      canProvision,
      hasAuth,
      createLogin,
      email: formData.email,
      password: loginPassword,
      roleName,
    });
    setLoading(false);
    onSuccess();
  };

  const title = initialData?.id ? "Cập nhật hồ sơ nhân sự" : "Thêm người";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="flex max-h-[min(90dvh,880px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="shrink-0 bg-[var(--primary)] px-6 py-5 pr-14 text-white sm:px-8 sm:py-6">
          <h3 className={F.modalTitle}>{title}</h3>
          <p className={F.modalSubtitle}>
            {initialData?.id
              ? "Mã nhân viên là định danh duy nhất."
              : "Họ tên, khoa, email, vai trò — tạo TK nếu có quyền."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-[var(--bv103-space-3)] overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
            <NhanSuFormFields
              formData={formData}
              setFormData={setFormData}
              loading={loading}
              khoas={khoas}
              chucDanhs={chucDanhs}
              chucVus={chucVus}
              tos={tos}
              vaiTros={vaiTros}
              ngheNghieps={ngheNghieps}
              maTuDong={maTuDong}
              isNew={!initialData?.id}
              compactCreate={!initialData?.id}
            />

            {canProvision ? (
              <NhanSuLoginFields
                hasAuth={hasAuth}
                email={String(formData.email || "")}
                password={loginPassword}
                onPassword={setLoginPassword}
                createLogin={createLogin}
                onCreateLogin={setCreateLogin}
                disabled={loading}
              />
            ) : null}
          </div>

          <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
            <button type="button" onClick={onCancel} className={`${F.ctaSecondary} flex-1 ${F.modalFooterBtn}`} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className={`${F.ctaPrimary} flex-[2] ${F.modalFooterBtn}`} disabled={loading}>
              {loading ? "Đang lưu…" : "Lưu hồ sơ"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
