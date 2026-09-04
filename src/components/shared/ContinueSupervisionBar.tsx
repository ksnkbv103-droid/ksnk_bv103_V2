"use client";

import React, { useState } from "react";
import { MapPin, RotateCcw, CheckCircle2 } from "lucide-react";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

type Props = {
  summaryLine: string;
  onContinueHere: (keepSubjects: boolean) => void;
  onChangeLocation: () => void;
  onDone: () => void;
  /** Hiện checkbox giữ đối tượng NV (VST cột / GSC cá nhân). */
  showKeepSubjectsOption?: boolean;
};

/**
 * Sau khi lưu phiên tạo mới — chọn tiếp tục tại chỗ (giữ hành chính) hoặc đổi vị trí / xong.
 * Không giữ điểm / tiêu chí phiên cũ.
 */
export default function ContinueSupervisionBar({
  summaryLine,
  onContinueHere,
  onChangeLocation,
  onDone,
  showKeepSubjectsOption = true,
}: Props) {
  const [keepSubjects, setKeepSubjects] = useState(false);

  return (
    <div
      className="-mx-1 border border-emerald-200/90 bg-emerald-50/95 p-3 shadow-lg backdrop-blur sm:rounded-xl sm:p-4"
      role="region"
      aria-label="Tiếp tục giám sát"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-md bg-emerald-100 p-1.5 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className={`${T.sectionTitle} text-emerald-950`}>Đã lưu phiên — tiếp tục?</p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-emerald-900/80">
              Chỉ giữ thông tin hành chính (khoa, chức năng phòng, vị trí, cách thức) — không giữ điểm /
              tiêu chí vừa chấm. {summaryLine ? `Vừa lưu: ${summaryLine}` : null}
            </p>
          </div>

          {showKeepSubjectsOption ? (
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-emerald-950">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-700"
                checked={keepSubjects}
                onChange={(e) => setKeepSubjects(e.target.checked)}
              />
              Giữ đối tượng vừa giám sát (không giữ điểm)
            </label>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className={`${C.btnPrimary} min-h-11 flex-1 gap-2 sm:flex-none`}
              onClick={() => onContinueHere(keepSubjects)}
            >
              <MapPin className="h-4 w-4" />
              Tiếp tục giám sát tại đây
            </button>
            <button
              type="button"
              className={`${C.btnSecondary} min-h-11 flex-1 gap-2 sm:flex-none`}
              onClick={onChangeLocation}
            >
              <RotateCcw className="h-4 w-4" />
              Đổi vị trí / khoa
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg px-3 text-[12px] font-semibold text-emerald-900 underline-offset-2 hover:underline sm:ml-auto"
              onClick={onDone}
            >
              Xong — xem lịch sử
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
