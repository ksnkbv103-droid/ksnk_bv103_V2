"use client";

import Link from "next/link";
import { PheDuyetDungCuPanel } from "./PheDuyetDungCuPanel";

/** Màn Phê duyệt của chủ nhiệm khoa (AR-4): gom hàng chờ duyệt đã có, không bảng mới. */
export function PheDuyetPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Phê duyệt</h1>
        <p className="text-sm text-slate-600">
          Đề nghị đổi danh mục dụng cụ và rà soát thành phần bộ do tổ CSSD gửi lên.
        </p>
      </div>
      <PheDuyetDungCuPanel />
      <p className="text-xs text-slate-500">
        Phiếu kho hóa chất chờ duyệt được duyệt ngay trên màn{" "}
        <Link href="/cssd-hoa-chat" className="underline">
          Kho hóa chất và vật tư
        </Link>
        .
      </p>
    </div>
  );
}
