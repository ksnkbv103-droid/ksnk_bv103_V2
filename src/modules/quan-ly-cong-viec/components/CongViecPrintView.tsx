"use client";

import React from "react";

/** Khung in nhanh khi bấm In — chỉ hiện lúc window.print(). */
export default function CongViecPrintView({ task }: { task: Record<string, unknown> }) {
  const ten = String(task.ten_cong_viec ?? task.tieu_de ?? "—");
  const ma = String(task.ma_cong_viec ?? task.id ?? "—");
  return (
    <div className="hidden print:block print:p-8">
      <h1 className="text-xl font-black uppercase">Phiếu công việc</h1>
      <p className="mt-4 text-sm">
        <span className="font-bold">Mã:</span> {ma}
      </p>
      <p className="mt-2 text-sm">
        <span className="font-bold">Nội dung:</span> {ten}
      </p>
    </div>
  );
}
