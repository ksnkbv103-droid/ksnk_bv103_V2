"use client";

import React, { useEffect, useMemo, useState } from "react";
import { splitMilestonesToGridRows, type BaGridCdhaCell } from "../lib/nkbv-ba-grid-engine";

export type BaWorkspaceSplit = ReturnType<typeof splitMilestonesToGridRows>;

export function useNkbvBaWorkspaceGridData({ split }: { split: BaWorkspaceSplit }) {
  const [localCdha, setLocalCdha] = useState<BaGridCdhaCell[]>([]);
  /** Optimistic tick SSI TC — giảm lag chờ Server Action. */
  const [localSsiTc, setLocalSsiTc] = useState<
    Array<{ id: string; ngay: string; key: string; label: string }>
  >([]);
  /** Khóa đang ghi DB — chặn double-click tạo bản trùng. */
  const inFlightRef = React.useRef<Set<string>>(new Set());

  const cdhaKey = (x: Pick<BaGridCdhaCell, "ngay" | "tieu_chuan_key">) =>
    `${String(x.ngay).slice(0, 10)}|${x.tieu_chuan_key || "imaging_chest"}`;

  // Khi server/timeline đã có CĐHA cùng ngày+loại → bỏ bản local tạm (nguyên nhân XQ lặp)
  useEffect(() => {
    setLocalCdha((prev) => {
      const next = prev.filter((loc) => !split.cdha.some((b) => cdhaKey(b) === cdhaKey(loc)));
      return next.length === prev.length ? prev : next;
    });
  }, [split.cdha]);

  useEffect(() => {
    setLocalSsiTc((prev) => {
      const next = prev.filter((loc) => {
        const day = (split.tieuChuanChuyenBietByDate[loc.ngay] || []).some(
          (x) => x.key === loc.key,
        );
        return !day;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [split.tieuChuanChuyenBietByDate]);

  const cdhaList = useMemo(() => {
    const byKey = new Map<string, BaGridCdhaCell>();
    for (const b of split.cdha) byKey.set(cdhaKey(b), b);
    for (const x of localCdha) {
      const k = cdhaKey(x);
      if (!byKey.has(k)) byKey.set(k, x);
    }
    return [...byKey.values()];
  }, [split.cdha, localCdha]);

  /** TC SSI = DB + optimistic local (dùng cho gợi ý phiên + hàng lưới). */
  const ssiTcByDate = useMemo(() => {
    const m: Record<string, Array<{ key: string; label: string; id?: string }>> = {};
    for (const [d, items] of Object.entries(split.tieuChuanChuyenBietByDate)) {
      m[d] = [...items];
    }
    for (const loc of localSsiTc) {
      const day = m[loc.ngay] || (m[loc.ngay] = []);
      if (!day.some((x) => x.key === loc.key)) {
        day.push({ key: loc.key, label: loc.label, id: loc.id });
      }
    }
    return m;
  }, [split.tieuChuanChuyenBietByDate, localSsiTc]);
  return {
    localCdha,
    setLocalCdha,
    localSsiTc,
    setLocalSsiTc,
    inFlightRef,
    cdhaKey,
    cdhaList,
    ssiTcByDate,
  };
}
