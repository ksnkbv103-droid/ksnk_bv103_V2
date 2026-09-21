"use client";

import SuCoReportForm from "@/modules/cssd-su-co/components/SuCoReportForm";
import { INSTRUMENT_MOVE_TYPE_ID } from "@/lib/domain/cssd-set-reconcile";
import { useModulePermission } from "@/hooks/useModulePermission";

/**
 * Luân chuyển kho↔bộ / bộ↔bộ — thuộc /cssd-dung-cu (không phải sự cố).
 * Nguồn dòng: danh mục đang có (kho dự phòng hoặc bộ khác). Hỏng/Mất → /cssd-su-co.
 */
export function CSSDCatalogLuanChuyenTab() {
  const { allowed } = useModulePermission("BAO_SU_CO");

  if (!allowed.create) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Tài khoản chưa có quyền ghi biến động dụng cụ. Liên hệ khoa KSNK.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2.5 text-[12px] text-slate-700">
        <p className="font-semibold text-emerald-900">Luân chuyển kho · bộ (không phải sự cố)</p>
        <p className="mt-0.5 leading-snug text-slate-600">
          Lấy từ <span className="font-medium">kho dự phòng</span> vào bộ, trả kho, hoặc chuyển{" "}
          <span className="font-medium">bộ ↔ bộ</span> — chỉ chọn loại/thành phần đã có trong danh mục.
          Báo <span className="font-medium">hỏng / mất</span> ở mục Sự cố. Thêm mới loại/bộ qua tab Đề nghị
          danh mục; sửa thuộc tính loại/bộ cũng qua đề nghị — không invent dòng ngoài kho.
        </p>
      </div>
      <SuCoReportForm
        layout="page"
        initialStation="CAP_PHAT"
        initialGroup="INSTRUMENT"
        initialTypeId={INSTRUMENT_MOVE_TYPE_ID}
        hideGroupPicker
        lockInstrumentDoor
        enabled
      />
    </div>
  );
}
