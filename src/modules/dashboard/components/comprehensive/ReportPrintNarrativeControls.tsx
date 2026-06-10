"use client";

import React, { useEffect, useState } from "react";
import { Lightbulb, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type NarrativeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  saved: string;
  onSave: (value: string) => void;
};

function NarrativeDialog({ open, onOpenChange, title, saved, onSave }: NarrativeDialogProps) {
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    if (open) setDraft(saved);
  }, [open, saved]);

  const handleSave = () => {
    onSave(draft.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <textarea
          className={bv103LayoutChrome.textarea}
          rows={8}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nhập nội dung in vào mục III của báo cáo…"
          aria-label={title}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
          >
            Lưu nội dung
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  nhanXetDanhGia: string;
  onNhanXetChange: (value: string) => void;
  kienNghiDeXuat: string;
  onKienNghiChange: (value: string) => void;
};

function narrativeBtnClass(filled: boolean) {
  return `flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${
    filled
      ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  }`;
}

export function ReportPrintNarrativeControls({
  nhanXetDanhGia,
  onNhanXetChange,
  kienNghiDeXuat,
  onKienNghiChange,
}: Props) {
  const [openNhanXet, setOpenNhanXet] = useState(false);
  const [openKienNghi, setOpenKienNghi] = useState(false);
  const hasNhanXet = nhanXetDanhGia.trim().length > 0;
  const hasKienNghi = kienNghiDeXuat.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenNhanXet(true)}
        className={narrativeBtnClass(hasNhanXet)}
        title="Mục 1 — Nhận xét, đánh giá chung (Phần III báo cáo in)"
      >
        <MessageSquare size={14} aria-hidden />
        Nhận xét đánh giá
        {hasNhanXet ? (
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Đã nhập
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => setOpenKienNghi(true)}
        className={narrativeBtnClass(hasKienNghi)}
        title="Mục 2 — Kiến nghị, đề xuất với Ban Giám đốc (Phần III báo cáo in)"
      >
        <Lightbulb size={14} aria-hidden />
        Kiến nghị đề xuất
        {hasKienNghi ? (
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Đã nhập
          </span>
        ) : null}
      </button>

      <NarrativeDialog
        open={openNhanXet}
        onOpenChange={setOpenNhanXet}
        title="Nhận xét, đánh giá chung"
        saved={nhanXetDanhGia}
        onSave={onNhanXetChange}
      />
      <NarrativeDialog
        open={openKienNghi}
        onOpenChange={setOpenKienNghi}
        title="Kiến nghị, đề xuất giải pháp"
        saved={kienNghiDeXuat}
        onSave={onKienNghiChange}
      />
    </>
  );
}
