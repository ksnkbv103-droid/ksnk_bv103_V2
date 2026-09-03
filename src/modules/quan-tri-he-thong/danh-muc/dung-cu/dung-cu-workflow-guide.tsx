"use client";

import Link from "next/link";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import { CssdQrLabelKindsNotice } from "@/modules/cssd-erp/components/catalog/CssdQrLabelKindsNotice";

const STEPS = [
  { title: "Loại", tab: "loai" as const },
  { title: "Bộ", tab: "bo" as const },
  { title: "Thành phần", tab: "chi-tiet" as const },
  { title: "Đề xuất", tab: "de-xuat" as const },
  { title: "CSSD", href: "/cssd-dung-cu" },
  { title: "Kho", href: "/cssd-erp" },
] as const;

/** Điều hướng ngắn — không banner hướng dẫn nhiều bước. */
export function DungCuWorkflowGuide() {
  return (
    <section className="space-y-2">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Luồng danh mục dụng cụ">
        {STEPS.map((s, i) => (
          <span key={s.title} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-slate-300" aria-hidden>
              →
            </span> : null}
            {"tab" in s ? (
              <Link
                href={quanTriDungCuHref(s.tab)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-[var(--primary)]/40"
              >
                {s.title}
              </Link>
            ) : (
              <Link
                href={s.href}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-[var(--primary)]/40"
              >
                {s.title}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <CssdQrLabelKindsNotice />
    </section>
  );
}
