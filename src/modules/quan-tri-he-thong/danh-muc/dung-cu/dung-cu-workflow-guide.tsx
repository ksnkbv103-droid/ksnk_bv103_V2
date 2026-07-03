"use client";

import Link from "next/link";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

const STEPS = [
  { n: 1, title: "Loại dụng cụ", desc: "Mẫu kích thước, tiệt khuẩn, Spaulding", tab: "loai" as const },
  { n: 2, title: "Bộ dụng cụ", desc: "Chọn khoa → sinh mã B01.SET.01 → tem QR", tab: "bo" as const },
  { n: 3, title: "Thành phần bộ", desc: "Gắn loại + số lượng vào từng bộ", tab: "chi-tiet" as const },
  { n: 4, title: "In tem / CSSD", desc: "Quét ma_bo tại workflow 6 trạm", href: "/cssd-dung-cu" },
  { n: 5, title: "Vận hành kho", desc: "Hỏng/mất theo chi tiết — không đổi ma_bo", href: "/cssd-erp" },
];

export function DungCuWorkflowGuide() {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 md:p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">Luồng chuẩn MDM → CSSD</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm">
            <span className="text-[11px] font-black text-emerald-600">Bước {s.n}</span>
            <p className="text-xs font-bold text-slate-800">{s.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{s.desc}</p>
            {"tab" in s && s.tab ? (
              <Link href={quanTriDungCuHref(s.tab)} className="mt-1.5 inline-block text-[11px] font-semibold text-[var(--primary)] underline">
                Mở tab
              </Link>
            ) : (
              <Link href={s.href!} className="mt-1.5 inline-block text-[11px] font-semibold text-[var(--primary)] underline">
                Mở module
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
