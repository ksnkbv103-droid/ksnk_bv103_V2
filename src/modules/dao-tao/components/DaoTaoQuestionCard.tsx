"use client";

import type { DapAnDung, TraLoi } from "@/lib/dao-tao/types";
import { TARGET_ROLE_LABELS } from "@/lib/dao-tao/types";
import { cn } from "@/lib/utils";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

type Option = {
  id: string;
  noiDung: string;
  displayIndex?: number;
  tfDung?: boolean | null;
};

type Props = {
  loai: string;
  stem: string;
  clinicalVignette?: string | null;
  bloomCode?: string | null;
  targetRoles?: string[];
  sopRefs?: string[];
  options: Option[];
  value: TraLoi | null;
  onChange: (v: TraLoi) => void;
  disabled?: boolean;
  showResult?: boolean;
  dung?: boolean | null;
  giaiThich?: string | null;
  distractorRationales?: Record<string, string>;
  evidenceLock?: any;
  /** Chỉ truyền khi đã nộp bài — hiển thị đáp án đúng ở phần kết quả. */
  dapAnDung?: DapAnDung | null;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const optionBtn = (active: boolean, disabled?: boolean) =>
  cn(
    "flex w-full items-start gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition",
    active
      ? "border-[var(--primary)]/45 bg-[var(--primary)]/[0.04] ring-1 ring-[var(--primary)]/15"
      : "border-slate-200 bg-white hover:border-slate-300",
    disabled && "cursor-default opacity-90",
  );

export function DaoTaoQuestionCard({
  loai,
  stem,
  clinicalVignette,
  bloomCode,
  targetRoles,
  sopRefs,
  options,
  value,
  onChange,
  disabled,
  showResult,
  dung,
  giaiThich,
  distractorRationales: _distractorRationales,
  evidenceLock,
  dapAnDung,
}: Props) {
  const ordered = [...(options ?? [])].sort(
    (a, b) => (a.displayIndex ?? 0) - (b.displayIndex ?? 0),
  );

  return (
    <div className="rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-5">
      {/* Huy hiệu thông số SOP & Thang nhận thức Bloom */}
      {(sopRefs?.length || bloomCode || targetRoles?.length) ? (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          {bloomCode && (
            <span className="rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 border border-indigo-200/60">
              Bloom: {bloomCode}
            </span>
          )}
          {sopRefs?.map((s) => (
            <span key={s} className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800 border border-amber-200/60">
              SOP: {s}
            </span>
          ))}
          {targetRoles?.slice(0, 2).map((r) => (
            <span key={r} className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-200/60" title={TARGET_ROLE_LABELS[r] || r}>
              {TARGET_ROLE_LABELS[r] ? TARGET_ROLE_LABELS[r].split("(")[0].trim() : r.replace("ROLE_", "")}
            </span>
          ))}
        </div>
      ) : null}

      {/* Bối cảnh tình huống lâm sàng chuẩn NBME */}
      {clinicalVignette ? (
        <div className="mb-3.5 rounded-[var(--radius-control)] border border-blue-200/80 bg-blue-50/50 p-3 text-slate-800">
          <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Tình huống lâm sàng / Bối cảnh thực tế
          </div>
          <p className="text-sm leading-relaxed text-slate-700 font-normal">
            &ldquo;{clinicalVignette}&rdquo;
          </p>
        </div>
      ) : null}

      {/* Câu hỏi chính (Stem) */}
      <p className="mb-4 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-900">
        {stem}
      </p>

      {loai === "single" && (
        <div className="grid gap-2">
          {ordered.map((o, i) => {
            const checked = value?.kind === "single" && value.optionId === o.id;
            return (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                className={optionBtn(!!checked, disabled)}
                onClick={() => onChange({ kind: "single", optionId: o.id })}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                  {LETTERS[i] ?? i + 1}
                </span>
                <span className="text-sm text-slate-700">{o.noiDung}</span>
              </button>
            );
          })}
        </div>
      )}

      {loai === "multi" && (
        <div className="grid gap-2">
          <p className={T.labelBlock}>Chọn tất cả đáp án đúng</p>
          {ordered.map((o, i) => {
            const selected =
              value?.kind === "multi" ? value.optionIds.includes(o.id) : false;
            return (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                className={optionBtn(selected, disabled)}
                onClick={() => {
                  const prev = value?.kind === "multi" ? value.optionIds : [];
                  const next = selected
                    ? prev.filter((id) => id !== o.id)
                    : [...prev, o.id];
                  onChange({ kind: "multi", optionIds: next });
                }}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px]",
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-slate-300 bg-white text-slate-500",
                  )}
                >
                  {selected ? "✓" : LETTERS[i]}
                </span>
                <span className="text-sm text-slate-700">{o.noiDung}</span>
              </button>
            );
          })}
        </div>
      )}

      {loai === "true_false_cluster" && (
        <div className="grid gap-3">
          {ordered.map((o, i) => {
            const cur =
              value?.kind === "true_false_cluster" ? value.byOptionId[o.id] : null;
            return (
              <div
                key={o.id}
                className="rounded-[var(--radius-control)] border border-slate-200 bg-slate-50/50 p-3"
              >
                <p className="mb-2 text-sm text-slate-700">
                  <span className="mr-1.5 font-semibold text-slate-500">{LETTERS[i]}.</span>
                  {o.noiDung}
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      [true, "Đúng"],
                      [false, "Sai"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      className={cn(
                        "min-h-9 flex-1 rounded-[var(--radius-control)] border text-sm font-semibold transition",
                        cur === val
                          ? val
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-rose-300 bg-rose-50 text-rose-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        const base =
                          value?.kind === "true_false_cluster"
                            ? { ...value.byOptionId }
                            : {};
                        onChange({
                          kind: "true_false_cluster",
                          byOptionId: { ...base, [o.id]: val },
                        });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loai === "order" && (
        <OrderEditor
          options={ordered}
          value={
            value?.kind === "order" ? value.orderedOptionIds : ordered.map((o) => o.id)
          }
          disabled={disabled}
          answered={value?.kind === "order"}
          onChange={(ids) => onChange({ kind: "order", orderedOptionIds: ids })}
        />
      )}

      {showResult && (
        <div
          className={cn(
            "mt-4 rounded-[var(--radius-control)] border p-3.5 text-sm",
            dung
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
              : "border-rose-200 bg-rose-50/80 text-rose-950",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="font-bold flex items-center gap-1.5 text-sm">
              {dung ? "✓ Trả lời Đúng" : "✗ Chưa chính xác"}
            </p>
            {evidenceLock?.sources?.[0]?.source_id ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/90 border border-slate-200 text-slate-800 shadow-xs">
                Căn cứ: {evidenceLock.sources[0].source_id}
              </span>
            ) : null}
          </div>

          {!dung && dapAnDung ? (
            <div className="mt-2.5 text-xs leading-relaxed text-slate-800">
              <span className="font-bold text-slate-900">Đáp án đúng: </span>
              {formatDapAnDung(dapAnDung, ordered)}
            </div>
          ) : null}

          {giaiThich ? (
            <div className="mt-2.5 text-xs leading-relaxed text-slate-800">
              <span className="font-bold text-slate-900">Giải thích chuyên môn: </span>
              {giaiThich}
            </div>
          ) : null}

          {evidenceLock?.sources?.[0]?.verbatim_quote ? (
            <div className="mt-2 text-xs rounded bg-white/80 p-2.5 border border-slate-200/70 text-slate-700">
              <span className="font-semibold not-italic text-slate-900">Trích dẫn quy chuẩn: </span>
              &ldquo;{evidenceLock.sources[0].verbatim_quote}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function formatDapAnDung(d: DapAnDung, ordered: Option[]): string {
  const text = (id: string) => {
    const i = ordered.findIndex((o) => o.id === id);
    return i < 0 ? "?" : `${LETTERS[i] ?? i + 1}. ${ordered[i].noiDung}`;
  };
  switch (d.kind) {
    case "single":
      return text(d.optionId);
    case "multi":
      return d.optionIds.map(text).join("; ");
    case "true_false_cluster":
      return Object.entries(d.byOptionId)
        .map(([id, v]) => `${text(id)} → ${v ? "Đúng" : "Sai"}`)
        .join("; ");
    case "order":
      return d.orderedOptionIds.map((id, i) => `${i + 1}) ${text(id)}`).join("  ");
  }
}

function OrderEditor({
  options,
  value,
  onChange,
  disabled,
  answered,
}: {
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  answered: boolean;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  return (
    <div className="grid gap-2">
      <p className={T.labelBlock}>
        Sắp xếp thứ tự đúng bằng nút ↑ ↓. Hệ thống chấm theo nội dung bước, không theo nhãn A/B/C/D.
      </p>
      {value.map((id, idx) => {
        const o = byId.get(id);
        if (!o) return null;
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2.5 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm text-slate-700">{o.noiDung}</span>
            <button
              type="button"
              className={cn(T.btnSecondary, "h-8 px-2")}
              disabled={disabled || idx === 0}
              onClick={() => move(idx, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={cn(T.btnSecondary, "h-8 px-2")}
              disabled={disabled || idx === value.length - 1}
              onClick={() => move(idx, 1)}
            >
              ↓
            </button>
          </div>
        );
      })}
      {!answered && !disabled ? (
        <button
          type="button"
          className={cn(T.btnSecondary, "h-9 justify-self-start px-3 text-xs")}
          onClick={() => onChange(value)}
        >
          Giữ thứ tự hiện tại làm đáp án
        </button>
      ) : null}
    </div>
  );
}
