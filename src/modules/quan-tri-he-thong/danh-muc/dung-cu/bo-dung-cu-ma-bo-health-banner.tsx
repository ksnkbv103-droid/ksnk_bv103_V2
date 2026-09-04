"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getBoDungCuMaBoHealthAction } from "../actions/bo-dung-cu.actions";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

export function BoDungCuMaBoHealthBanner() {
  const [state, setState] = useState<
    | { loading: true }
    | { loading: false; invalidCount: number; samples: { ma_bo: string; ten_bo: string }[] }
  >({ loading: true });

  useEffect(() => {
    let alive = true;
    void getBoDungCuMaBoHealthAction().then((res) => {
      if (!alive) return;
      if (!res.success) {
        setState({ loading: false, invalidCount: 0, samples: [] });
        return;
      }
      setState({ loading: false, invalidCount: res.invalidCount, samples: res.samples });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading || state.invalidCount === 0) return null;

  const sampleLine =
    state.samples.length > 0
      ? `Ví dụ: ${state.samples.map((s) => `${s.ten_bo || "Bộ"} (${s.ma_bo || "trống"})`).join(" · ")}`
      : null;

  return (
    <KsnkContextBanner
      tone="amber"
      dismissible={false}
      icon={<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />}
      summary={
        <span className="font-semibold">
          {state.invalidCount} bộ chưa có mã chuẩn <span className="font-mono">KHOA.SET.NN</span> — không vào workflow
          CSSD.
        </span>
      }
      detail={
        <>
          {sampleLine ? <span className="block">{sampleLine}</span> : null}
          <span className="block">
            Sửa tại đây (chọn khoa → lưu để tự sinh mã) hoặc{" "}
            <Link href={quanTriDungCuHref("bo")} className="font-semibold underline">
              mở danh sách bộ
            </Link>
            .
          </span>
        </>
      }
    />
  );
}
