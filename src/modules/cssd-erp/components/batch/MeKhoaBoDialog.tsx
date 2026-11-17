"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMeKhoaBoAction } from "../../actions/cssd-me-khoa-bo.actions";
import { formatMeKhoaText, type MeKhoaGroup } from "../../lib/cssd-me-khoa-bo";

type Props = { me: { id: string; maLo: string } | null; onClose: () => void };

/** Chỉ đọc: mẻ → khoa/phòng mổ + bộ, để gọi điện khi BI dương. */
export default function MeKhoaBoDialog({ me, onClose }: Props) {
  const [groups, setGroups] = useState<MeKhoaGroup[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setGroups(null);
    setError("");
    if (!me) return;
    let alive = true;
    void getMeKhoaBoAction(me.id).then((r) => {
      if (!alive) return;
      if (r.success) setGroups(r.groups);
      else setError(r.error);
    });
    return () => {
      alive = false;
    };
  }, [me]);

  const copy = async () => {
    if (!me || !groups) return;
    try {
      await navigator.clipboard.writeText(formatMeKhoaText(me.maLo, groups));
      toast.success("Đã sao chép danh sách.");
    } catch {
      toast.error("Không sao chép được.");
    }
  };

  return (
    <Dialog open={Boolean(me)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mẻ {me?.maLo} — khoa/phòng nhận</DialogTitle>
        </DialogHeader>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!groups && !error ? <p className="text-sm text-slate-500">Đang tải…</p> : null}
        {groups ? (
          <div className="space-y-3 text-sm">
            {groups.length === 0 ? <p className="text-slate-500">Mẻ chưa có bộ nào.</p> : null}
            {groups.map((g) => (
              <div key={g.khoaNhanId || "none"} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold">
                  {g.khoaTen} <span className="font-normal text-slate-500">({g.bo.length} bộ)</span>
                </p>
                <p className="font-mono text-xs text-slate-700">{g.bo.map((b) => b.maBo).join(", ")}</p>
              </div>
            ))}
            <button type="button" onClick={() => void copy()} className="text-xs font-semibold text-[var(--primary)] underline">
              Sao chép để gọi điện
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
