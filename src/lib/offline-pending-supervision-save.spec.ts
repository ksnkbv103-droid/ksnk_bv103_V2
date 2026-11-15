import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFlushOpts,
  enqueueOfflineGscSave,
  enqueueOfflineVstSave,
  flushPendingSupervisionSaves,
  getPendingSupervisionCount,
  isPermanentSupervisionFlushError,
} from "./offline-pending-supervision-save";
import { SUPERVISION_SESSION_MUTATION_EXPIRED_VI } from "./supervision-mutation-window";

const mocks = vi.hoisted(() => ({
  saveVSTSession: vi.fn(),
  saveGiamSatChung: vi.fn(),
}));

vi.mock("@/modules/giam-sat-vst/actions/vst-write-save-session.actions", () => ({
  saveVSTSession: mocks.saveVSTSession,
}));

vi.mock("@/modules/giam-sat-chung/actions/giam-sat-chung-write.actions", () => ({
  saveGiamSatChung: mocks.saveGiamSatChung,
}));

describe("isPermanentSupervisionFlushError", () => {
  it("true khi quá cửa sổ sửa 30 phút", () => {
    expect(isPermanentSupervisionFlushError(SUPERVISION_SESSION_MUTATION_EXPIRED_VI)).toBe(true);
  });
  it("false với lỗi tạm thời hoặc rỗng", () => {
    expect(isPermanentSupervisionFlushError("Failed to fetch")).toBe(false);
    expect(isPermanentSupervisionFlushError(undefined)).toBe(false);
  });
});

describe("buildFlushOpts (key idempotency qua retry)", () => {
  const base = { clientId: "c", enqueuedAt: 1 };
  const KEY = "11111111-2222-4333-8444-555555555555";
  it("phiên mới: dùng lại đúng key đã lưu, mọi lần gọi như nhau", () => {
    const item = { ...base, kind: "gsc", session: {}, results: [], clientRequestId: KEY } as never;
    expect(buildFlushOpts(item)).toEqual({ clientRequestId: KEY });
    expect(buildFlushOpts(item)).toEqual({ clientRequestId: KEY });
  });
  it("item cũ không có key vẫn chạy (undefined)", () => {
    const item = { ...base, kind: "vst", session: {}, observations: [] } as never;
    expect(buildFlushOpts(item)).toBeUndefined();
  });
  it("sửa phiên: không gửi key", () => {
    const item = { ...base, kind: "vst", session: {}, observations: [], existingSessionId: "s1", clientRequestId: KEY } as never;
    expect(buildFlushOpts(item)).toEqual({ existingSessionId: "s1" });
  });
});

describe("flushPendingSupervisionSaves và bảo toàn hàng đợi khi enqueue giữa chừng", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map<string, string>();
    const fakeLocalStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
    };
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", fakeLocalStorage);
    vi.stubGlobal("navigator", { onLine: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("không làm mất item mới được enqueue trong lúc loop flush đang await", async () => {
    // 1. Enqueue item 1 (vst)
    enqueueOfflineVstSave({
      session: { khoa_id: "k1" } as never,
      observations: [],
      clientRequestId: "req-1",
    });
    expect(getPendingSupervisionCount()).toBe(1);

    // 2. Mock saveVSTSession: trong lúc đang await xử lý item 1, người dùng lưu tiếp phiên 2 (gsc)
    mocks.saveVSTSession.mockImplementationOnce(async () => {
      enqueueOfflineGscSave({
        session: { khoa_id: "k2" } as never,
        results: [],
        clientRequestId: "req-2",
      });
      return { success: true };
    });

    // 3. Thực hiện flush
    const result = await flushPendingSupervisionSaves();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);

    // 4. Item 2 mới enqueue KHÔNG bị ghi đè/mất
    expect(getPendingSupervisionCount()).toBe(1);
    const raw = store.get("bv103_supervision_offline_queue_v1");
    expect(raw).toBeTruthy();
    const q = JSON.parse(raw!);
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe("gsc");
    expect(q[0].clientRequestId).toBe("req-2");
  });

  it("khi item 1 thất bại tạm thời và có item 2 mới được enqueue, cả hai đều được giữ lại trong hàng đợi", async () => {
    enqueueOfflineVstSave({
      session: { khoa_id: "k1" } as never,
      observations: [],
      clientRequestId: "req-1",
    });

    mocks.saveVSTSession.mockImplementationOnce(async () => {
      enqueueOfflineGscSave({
        session: { khoa_id: "k2" } as never,
        results: [],
        clientRequestId: "req-2",
      });
      return { success: false, error: "Network timeout" };
    });

    const result = await flushPendingSupervisionSaves();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);

    // Cả item 1 (chờ retry) và item 2 (mới thêm) đều còn trong hàng đợi
    expect(getPendingSupervisionCount()).toBe(2);
    const raw = store.get("bv103_supervision_offline_queue_v1");
    const q = JSON.parse(raw!);
    expect(q[0].clientRequestId).toBe("req-1");
    expect(q[1].clientRequestId).toBe("req-2");
  });

  it("writeQueue nuốt lỗi nhẹ nhàng khi localStorage.setItem ném QuotaExceededError", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });

    expect(() => {
      enqueueOfflineVstSave({
        session: { khoa_id: "k1" } as never,
        observations: [],
      });
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
