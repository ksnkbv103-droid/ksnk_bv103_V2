import { beforeEach, describe, expect, it, vi } from "vitest";

type Op = "select" | "insert" | "update" | "delete";
type CallState = {
  table: string;
  op: Op;
  filters: Array<[string, unknown[]]>;
  payload?: unknown;
};

const mocks = vi.hoisted(() => ({
  handler: vi.fn(),
  calls: [] as unknown[],
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => undefined),
  verifyAnyPermission: vi.fn(async () => undefined),
}));

vi.mock("@/modules/dao-tao/lib/dao-tao-auth", () => ({
  requireDaoTaoUser: async () => ({ user: { id: "user-a" } }),
  requireDaoTaoAdmin: async () => ({ user: { id: "user-a" } }),
}));

vi.mock("@/lib/dao-tao/exam-engine", () => ({
  selectBalancedExam: () => ({
    questions: [
      {
        cauHoiId: "q1",
        loai: "single",
        bloomLevel: 1,
        chuDeMa: "CD",
        stem: "Câu 1",
        giaiThich: null,
        options: [],
        dapAnDung: { kind: "single", optionId: "a" },
      },
    ],
    report: {},
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      const state: CallState = { table, op: "select", filters: [] };
      mocks.calls.push(state);
      const b: Record<string, unknown> = {};
      const run = async () => mocks.handler(state);
      b.select = () => b;
      b.insert = (p: unknown) => ((state.op = "insert"), (state.payload = p), b);
      b.update = (p: unknown) => ((state.op = "update"), (state.payload = p), b);
      b.delete = () => ((state.op = "delete"), b);
      for (const m of ["eq", "in", "is", "not", "order", "limit", "range"]) {
        b[m] = (...args: unknown[]) => (state.filters.push([m, args]), b);
      }
      b.maybeSingle = run;
      b.single = run;
      b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => run().then(res, rej);
      return b;
    },
  }),
}));

import { startThiThatAttempt, submitLanThi } from "./dao-tao-attempt.actions";

const KY_ID = "3f1c2b4a-9d8e-4f7a-8b6c-1a2b3c4d5e6f";
const LAN_ID = "9a1c2b4a-9d8e-4f7a-8b6c-1a2b3c4d5e6f";
const FORM = { hoTen: "A", khoaDonVi: "Khoa B" };

const KY = {
  id: KY_ID,
  so_cau: 1,
  so_lan_cho_phep: 1,
  thoi_gian_phut: 30,
  chu_de_mas: [],
  bloom_quota: {},
  loai_quota: {},
};

function setupStart(luotAfterInsert: Array<{ id: string; bat_dau_luc: string; trang_thai: string }>) {
  let lanThiSelects = 0;
  mocks.handler.mockImplementation(async (s: CallState) => {
    if (s.table === "dao_tao_cau_hinh") return { data: KY, error: null };
    if (s.table === "dao_tao_cau_hoi") {
      return {
        data: [
          {
            id: "q1", chu_de_ma: "CD", loai: "single", bloom_level: 1, stem: "Câu 1",
            giai_thich: null, dap_an_dung: { kind: "single", optionId: "a" }, phuong_an: null,
          },
        ],
        error: null,
      };
    }
    if (s.table === "dao_tao_lan_thi") {
      if (s.op === "insert") return { data: { id: LAN_ID, han_nop_luc: "2030-01-01T00:00:00Z" }, error: null };
      if (s.op === "delete") return { data: null, error: null };
      lanThiSelects += 1;
      return { data: lanThiSelects === 1 ? [] : luotAfterInsert, error: null };
    }
    throw new Error(`bảng bất ngờ: ${s.table}`);
  });
}

const deletes = () =>
  (mocks.calls as CallState[]).filter((c) => c.table === "dao_tao_lan_thi" && c.op === "delete");

describe("startThiThatAttempt: chống race vượt lượt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
  });

  it("lần vượt lượt bị thu hồi (delete) và báo hết lượt", async () => {
    // Đọc lại: một lần khác bắt đầu sớm hơn chiếm hết 1 lượt → lần của mình (muộn hơn) vượt trần.
    setupStart([
      { id: "other", bat_dau_luc: "2020-01-01T00:00:00Z", trang_thai: "dang_lam" },
      { id: LAN_ID, bat_dau_luc: "2099-01-01T00:00:00Z", trang_thai: "dang_lam" },
    ]);
    await expect(startThiThatAttempt({ kyThiId: KY_ID, form: FORM })).rejects.toThrow(
      "Bạn đã hết lượt thi cho kỳ này.",
    );
    const del = deletes();
    expect(del).toHaveLength(1);
    expect(del[0].filters).toContainEqual(["eq", ["id", LAN_ID]]);
    expect(del[0].filters).toContainEqual(["eq", ["trang_thai", "dang_lam"]]);
  });

  it("lần trong hạn mức: không thu hồi, trả lanThiId", async () => {
    setupStart([{ id: LAN_ID, bat_dau_luc: "2099-01-01T00:00:00Z", trang_thai: "dang_lam" }]);
    const r = await startThiThatAttempt({ kyThiId: KY_ID, form: FORM });
    expect(r.lanThiId).toBe(LAN_ID);
    expect(deletes()).toHaveLength(0);
  });

  it("đã hết lượt từ trước insert: báo lỗi, không insert", async () => {
    mocks.handler.mockImplementation(async (s: CallState) => {
      if (s.table === "dao_tao_cau_hinh") return { data: KY, error: null };
      if (s.table === "dao_tao_lan_thi") {
        return { data: [{ id: "x", bat_dau_luc: "2020-01-01T00:00:00Z", trang_thai: "da_nop" }], error: null };
      }
      throw new Error("không được chạm bảng khác");
    });
    await expect(startThiThatAttempt({ kyThiId: KY_ID, form: FORM })).rejects.toThrow("hết lượt");
    expect((mocks.calls as CallState[]).some((c) => c.op === "insert")).toBe(false);
  });

  it("họ tên rỗng bị từ chối trước khi chạm DB", async () => {
    await expect(
      startThiThatAttempt({ kyThiId: KY_ID, form: { hoTen: "", khoaDonVi: "K" } }),
    ).rejects.toThrow("Vui lòng nhập họ tên.");
    expect(mocks.calls).toHaveLength(0);
  });
});

describe("submitLanThi: khóa lạc quan khi nộp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
  });

  const ROW = {
    id: LAN_ID,
    auth_user_id: "user-a",
    che_do: "thi_thu",
    cau_hinh_id: null,
    trang_thai: "dang_lam",
    han_nop_luc: "2099-01-01T00:00:00Z",
    de_snapshot: [
      {
        id: "i1", dap_an_dung: { kind: "single", optionId: "a" },
        tra_loi: { kind: "single", optionId: "a" },
      },
    ],
  };

  it("hai lần nộp song song: lần đầu chấm điểm, lần sau alreadySubmitted và không trả điểm", async () => {
    let updates = 0;
    mocks.handler.mockImplementation(async (s: CallState) => {
      if (s.op === "select") return { data: ROW, error: null }; // cả hai cùng thấy dang_lam
      updates += 1;
      return { data: updates === 1 ? [{ id: LAN_ID }] : [], error: null };
    });
    const [first, second] = [await submitLanThi(LAN_ID), await submitLanThi(LAN_ID)];
    expect(first).toMatchObject({ lanThiId: LAN_ID, diemPct: 100, trangThai: "da_nop" });
    expect(second).toEqual({ lanThiId: LAN_ID, alreadySubmitted: true });
    expect(second).not.toHaveProperty("diemPct");
    // update luôn bị chặn theo trang_thai = dang_lam
    const ups = (mocks.calls as CallState[]).filter((c) => c.op === "update");
    expect(ups).toHaveLength(2);
    for (const u of ups) expect(u.filters).toContainEqual(["eq", ["trang_thai", "dang_lam"]]);
  });

  it("bài đã nộp từ trước: alreadySubmitted, không update", async () => {
    mocks.handler.mockResolvedValue({ data: { ...ROW, trang_thai: "da_nop" }, error: null });
    expect(await submitLanThi(LAN_ID)).toEqual({ lanThiId: LAN_ID, alreadySubmitted: true });
    expect((mocks.calls as CallState[]).some((c) => c.op === "update")).toBe(false);
  });

  it("bài của người khác: không tìm thấy", async () => {
    mocks.handler.mockResolvedValue({ data: { ...ROW, auth_user_id: "user-b" }, error: null });
    await expect(submitLanThi(LAN_ID)).rejects.toThrow("Không tìm thấy lần thi.");
  });
});
