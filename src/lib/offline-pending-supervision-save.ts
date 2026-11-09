/**
 * Hàng đợi lưu phiên giám sát khi mất mạng (localStorage). Đồng bộ khi có mạng lại.
 * Chỉ dùng từ client; không thay thế xác thực phía server.
 */

import type { SessionInput } from "@/modules/giam-sat-vst/actions/vst-write.helpers";
import type { VSTObservation } from "@/modules/giam-sat-vst/lib/vst-constants";
import type { GscSessionInput } from "@/modules/giam-sat-chung/actions/giam-sat-chung-write-helpers";
import { SUPERVISION_SESSION_MUTATION_EXPIRED_VI } from "@/lib/supervision-mutation-window";
import type { ChecklistResult } from "@/types/giam-sat-chung";

const STORAGE_KEY = "bv103_supervision_offline_queue_v1";
const MAX_ITEMS = 20;

export type PendingVstItem = {
  kind: "vst";
  clientId: string;
  session: SessionInput;
  observations: VSTObservation[];
  existingSessionId?: string | null;
  /** Admin sửa phiên quá 30 phút — đồng bộ kèm lý do. */
  lyDoSua?: string | null;
  /** Idempotency key sinh một lần khi tạo phiên; item cũ không có → bỏ qua. */
  clientRequestId?: string | null;
  enqueuedAt: number;
};

export type PendingGscItem = {
  kind: "gsc";
  clientId: string;
  session: GscSessionInput;
  results: ChecklistResult[];
  existingSessionId?: string | null;
  clientRequestId?: string | null;
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
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch (err) {
    console.warn(
      "[offline-pending-supervision-save] writeQueue failed (quota exceeded or storage restricted):",
      err,
    );
  }
}

/** Chỉ phiên mới mới có key; giữ nguyên key đã sinh (không sinh lại). */
function sid0(p: { existingSessionId?: string | null; clientRequestId?: string | null }): string | null {
  return p.existingSessionId ? null : (p.clientRequestId ?? null);
}

/** Tùy chọn gửi lại: key cố định từ item hàng đợi (item cũ không có key vẫn chạy). */
export function buildFlushOpts(item: PendingSupervisionItem): {
  existingSessionId?: string;
  lyDoSua?: string;
  clientRequestId?: string;
} | undefined {
  const sid = String(item.existingSessionId ?? "").trim();
  const lyDo = item.kind === "vst" ? String(item.lyDoSua ?? "").trim() : "";
  const crid = String(item.clientRequestId ?? "").trim();
  if (sid) return { existingSessionId: sid, ...(lyDo ? { lyDoSua: lyDo } : {}) };
  return crid ? { clientRequestId: crid } : undefined;
}

export function enqueueOfflineVstSave(params: {
  session: SessionInput;
  observations: VSTObservation[];
  existingSessionId?: string | null;
  lyDoSua?: string | null;
  clientRequestId?: string | null;
}) {
  const item: PendingVstItem = {
    kind: "vst",
    clientId: crypto.randomUUID(),
    enqueuedAt: Date.now(),
    session: params.session,
    observations: params.observations,
    existingSessionId: params.existingSessionId ?? null,
    lyDoSua: params.lyDoSua ?? null,
    clientRequestId: sid0(params),
  };
  const q = readQueue();
  q.push(item);
  writeQueue(q);
}

export function enqueueOfflineGscSave(params: {
  session: GscSessionInput;
  results: ChecklistResult[];
  existingSessionId?: string | null;
  clientRequestId?: string | null;
}) {
  const item: PendingGscItem = {
    kind: "gsc",
    clientId: crypto.randomUUID(),
    enqueuedAt: Date.now(),
    session: params.session,
    results: params.results,
    existingSessionId: params.existingSessionId ?? null,
    clientRequestId: sid0(params),
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

/** Lỗi không thể khỏi khi retry (quá cửa sổ sửa 30 phút) → bỏ khỏi hàng đợi, tránh kẹt vĩnh viễn. */
export function isPermanentSupervisionFlushError(message: string | null | undefined): boolean {
  return !!message && message.includes(SUPERVISION_SESSION_MUTATION_EXPIRED_VI);
}

/** Gửi lại toàn bộ hàng đợi; mục lỗi được giữ lại. */
export async function flushPendingSupervisionSaves(): Promise<{
  synced: number;
  failed: number;
  lastError?: string;
}> {
  if (typeof window === "undefined" || !navigator.onLine) return { synced: 0, failed: 0 };

  const [{ saveVSTSession }, { saveGiamSatChung }] = await Promise.all([
    import("@/modules/giam-sat-vst/actions/vst-write-save-session.actions"),
    import("@/modules/giam-sat-chung/actions/giam-sat-chung-write.actions"),
  ]);

  const q = readQueue();
  if (!q.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  let lastError: string | undefined;
  const remaining: PendingSupervisionItem[] = [];

  for (const item of q) {
    try {
      if (item.kind === "vst") {
        const res = await saveVSTSession(item.session, item.observations, buildFlushOpts(item));
        if (res.success) synced++;
        else {
          failed++;
          lastError = res.error || lastError;
          if (!isPermanentSupervisionFlushError(res.error)) remaining.push(item);
        }
      } else {
        const res = await saveGiamSatChung(item.session, item.results, buildFlushOpts(item));
        if (res.success) synced++;
        else {
          failed++;
          lastError = res.error || lastError;
          if (!isPermanentSupervisionFlushError(res.error)) remaining.push(item);
        }
      }
    } catch (err) {
      failed++;
      lastError = err instanceof Error ? err.message : String(err);
      if (!isPermanentSupervisionFlushError(lastError)) remaining.push(item);
    }
  }

  const latestQueue = readQueue();
  const newlyAddedItems = latestQueue.filter(
    (item) => !q.some((old) => old.clientId === item.clientId),
  );
  writeQueue([...remaining, ...newlyAddedItems]);
  return { synced, failed, lastError };
}
