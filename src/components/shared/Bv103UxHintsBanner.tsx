"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { pathnameIsCssdModule } from "@/lib/cssd-routes";

const STORAGE_KEY = "bv103_ux_hints_v1";

type HintDef = {
  key: string;
  title: string;
  bullets: string[];
};

function hintForPath(pathname: string): HintDef | null {
  if (pathname === "/") {
    return {
      key: "home",
      title: "Gợi ý nhanh — Trang chủ",
      bullets: [
        "Dùng menu bên trái để vào từng phân hệ; danh mục hiển thị theo quyền được cấp.",
        "Nếu thiếu quyền, liên hệ chủ nhiệm khoa KSNK để được gán vai trò trong Phân quyền.",
      ],
    };
  }
  if (pathname === "/giam-sat") {
    return {
      key: "giam-sat-hub",
      title: "Gợi ý nhanh — Trung tâm giám sát",
      bullets: [
        "Nhập liệu: chọn VST, GSC hoặc NKBV — mỗi loại một phiên giám sát.",
        "Tra cứu: Lịch sử và Thống kê tách theo VST/GSC; menu trái vẫn giữ shortcut trực tiếp.",
      ],
    };
  }
  if (pathname === "/quan-ly-cong-viec") {
    return {
      key: "qlcv",
      title: "Gợi ý nhanh — Công việc",
      bullets: [
        "Tab «Điều hành»: Kanban hoặc Bảng — tick checklist trên chi tiết phiếu để cập nhật tiến độ.",
        "Tab «Việc định kỳ» (quyền sửa): mẫu + cron sinh phiếu; Command Center liệt kê việc quá hạn.",
      ],
    };
  }
  if (pathnameIsCssdModule(pathname)) {
    return {
      key: "cssd",
      title: "Gợi ý nhanh — CSSD",
      bullets: [
        "Quy trình & Kho: quét trạm (không gồm mẻ hấp) và FEFO trên cùng màn /cssd-quy-trinh.",
        "Mẻ tiệt khuẩn, dụng cụ, thiết bị, hóa chất, sự cố — mỗi mục một route riêng trên menu trái.",
      ],
    };
  }
  return null;
}

export default function Bv103UxHintsBanner() {
  const pathname = usePathname();
  const hint = useMemo(() => hintForPath(pathname), [pathname]);
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { dismissed?: string[] };
        setDismissed(new Set(parsed.dismissed ?? []));
      }
    } catch {
      setDismissed(new Set());
    }
    setHydrated(true);
  }, []);

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: [...next] }));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, []);

  if (!hydrated || !hint || dismissed.has(hint.key)) return null;

  return (
    <div
      role="region"
      aria-label={hint.title}
      className="border-b border-emerald-200/80 bg-emerald-50/95 px-4 py-3 text-slate-800 shadow-sm md:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold text-emerald-950">{hint.title}</p>
          <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-slate-700 sm:text-[13px]">
            {hint.bullets.map((b) => (
              <li key={b} className="pl-0.5">
                {b}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => dismiss(hint.key)}
          className="app-shell-focus inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/80"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Đã hiểu, ẩn gợi ý
        </button>
      </div>
    </div>
  );
}
