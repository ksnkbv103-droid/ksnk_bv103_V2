/**
 * Hàng đợi lưu phiên giám sát khi mất mạng (localStorage). Đồng bộ khi có mạng lại.
 * Chỉ dùng từ client; không thay thế xác thực phía server.
 */

import type { SessionInput } from "@/modules/giam-sat-vst/actions/vst-write.helpers";
import type { VSTObservation } from "@/modules/giam-sat-vst/data";
import type { GscSessionInput } from "@/modules/giam-sat-chung/actions/giam-sat-chung-write-helpers";
import type { ChecklistResult } from "@/types/giam-sat-chung";

const STORAGE_KEY = "bv103_supervision_offline_queue_v1";
const MAX_ITEMS = 20;

export type PendingVstItem = {
  kind: "vst";
  clientId: string;
  session: SessionInput;
  observations: VSTObservation[];
  existingSessionId?: string | null;
  enqueuedAt: number;
};

export type PendingGscItem = {
  kind: "gsc";
  clientId: string;
  session: GscSessionInput;
  results: ChecklistResult[];
  existingSessionId?: string | null;
  enqueuedAt: number;
};

export type PendingSupervisionItem = PendingVstItem | PendingGscItem;

function readQueue(): PendingSupervisionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as PendingSupervisionItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingSupervisionItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
}

export function enqueueOfflineVstSave(params: {
  session: SessionInput;
  observations: VSTObservation[];
  existingSessionId?: string | null;
}) {
  const item: PendingVstItem = {
    kind: "vst",
    clientId: crypto.randomUUID(),
    enqueuedAt: Date.now(),
    session: params.session,
    observations: params.observations,
    existingSessionId: params.existingSessionId ?? null,
  };
  const q = readQueue();
  q.push(item);
  writeQueue(q);
}

export function enqueueOfflineGscSave(params: {
  session: GscSessionInput;
  results: ChecklistResult[];
  existingSessionId?: string | null;
}) {
  const item: PendingGscItem = {
    kind: "gsc",
    clientId: crypto.randomUUID(),
    enqueuedAt: Date.now(),
    session: params.session,
    results: params.results,
    existingSessionId: params.existingSessionId ?? null,
  };
  const q = readQueue();
  q.push(item);
  writeQueue(q);
}

export function getPendingSupervisionCount(): number {
  return readQueue().length;
}

export function isLikelyOfflineOrNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("fetch failed")
  );
}

/** Gửi lại toàn bộ hàng đợi; mục lỗi được giữ lại. */
export async function flushPendingSupervisionSaves(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) return { synced: 0, failed: 0 };

  const [{ saveVSTSession }, { saveGiamSatChung }] = await Promise.all([
    import("@/modules/giam-sat-vst/actions/vst-write-save-session.actions"),
    import("@/modules/giam-sat-chung/actions/giam-sat-chung-write.actions"),
  ]);

  const q = readQueue();
  if (!q.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: PendingSupervisionItem[] = [];

  for (const item of q) {
    try {
      if (item.kind === "vst") {
        const sid = String(item.existingSessionId ?? "").trim();
        const res = await saveVSTSession(
          item.session,
          item.observations,
          sid ? { existingSessionId: sid } : undefined,
        );
        if (res.success) synced++;
        else {
          failed++;
          remaining.push(item);
        }
      } else {
        const sid = String(item.existingSessionId ?? "").trim();
        const res = await saveGiamSatChung(
          item.session,
          item.results,
          sid ? { existingSessionId: sid } : undefined,
        );
        if (res.success) synced++;
        else {
          failed++;
          remaining.push(item);
        }
      }
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { synced, failed };
}
