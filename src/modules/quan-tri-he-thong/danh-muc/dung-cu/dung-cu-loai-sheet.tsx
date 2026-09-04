"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LoaiDungCuPageContent } from "./LoaiDungCuPage";

type Props = {
  onClose: () => void;
};

/** Sheet phụ ADMIN — một Dialog max-h+scroll; chi tiết loại = step inline trong content (không Dialog lồng). */
export function DungCuLoaiSheet({ onClose }: Props) {
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-4xl sm:max-w-5xl max-h-[min(90dvh,880px)] overflow-y-auto">
        <DialogTitle className="text-left text-sm font-semibold text-slate-800">
          Loại dụng cụ
        </DialogTitle>
        <LoaiDungCuPageContent compact />
      </DialogContent>
    </Dialog>
  );
}
