"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getCdcLocationCoverageAction } from "../actions/giam-sat-nkbv-cdc-location.actions";

export default function NkbvCdcLocationBanner() {
  const [cov, setCov] = useState<{ totalActive: number; mapped: number } | null>(null);

  useEffect(() => {
    void getCdcLocationCoverageAction()
      .then((r) => {
        if (r.success) setCov({ totalActive: r.totalActive, mapped: r.mapped });
      })
      .catch(() => setCov(null));
  }, []);

  const mapped = cov?.mapped ?? 0;
  const total = cov?.totalActive ?? 0;
  const allMapped = total > 0 && mapped === total;

  return (
    <div
      className={`mb-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-sm ${
        allMapped
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <p className="inline-flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <span>
          <strong>SIR trên màn này là số thô</strong> (mẫu số nhập tay) — chưa phải SIR chuẩn CDC.
          {cov
            ? ` Đã gắn mã CDC Location: ${mapped}/${total} khoa đang dùng.`
            : " Đang tải mức map khoa…"}{" "}
          Ghi mã tại{" "}
          <Link href="/quan-tri-he-thong/danh-muc/khoa-phong" className="font-semibold underline">
            Quản trị → Khoa phòng
          </Link>
          . Chưa có PedVAE, nội soi, kháng sinh (AU).
        </span>
      </p>
    </div>
  );
}
