import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  requireAdmin: vi.fn(async () => ({ user: { id: "user-a" } })),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => undefined),
  verifyAnyPermission: vi.fn(async () => undefined),
}));

vi.mock("@/modules/dao-tao/lib/dao-tao-auth", () => ({
  requireDaoTaoUser: async () => ({ user: { id: "user-a" } }),
  requireDaoTaoAdmin: () => mocks.requireAdmin(),
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

import { getLanThiForTake, saveTraLoiCau, startThiThuAttempt, startThiThatAttempt, submitLanThi } from "./dao-tao-attempt.actions";

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

const HAN = "2030-01-01T00:00:00Z";
const HAN_MS = new Date(HAN).getTime();
const CAU_ID = "7b1c2b4a-9d8e-4f7a-8b6c-1a2b3c4d5e6f";

function lanRow(over: Record<string, unknown> = {}) {
  return {
    id: LAN_ID,
    auth_user_id: "user-a",
    che_do: "thi_thu",
    cau_hinh_id: null,
    trang_thai: "dang_lam",
    han_nop_luc: HAN,
    updated_at: "2029-01-01T00:00:00Z",
    de_snapshot: [
      { id: CAU_ID, thu_tu: 1, options: [{ id: "a", noiDung: "A", displayIndex: 0 }], dap_an_dung: { kind: "single", optionId: "a" }, tra_loi: null },
    ],
    ...over,
  };
}

describe("saveTraLoiCau: hạn nộp và quyền sở hữu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const input = { lanThiId: LAN_ID, cauId: CAU_ID, traLoi: { kind: "single" as const, optionId: "a" } };
  const updates = () => (mocks.calls as CallState[]).filter((c) => c.op === "update");

  it("trong hạn: lưu được, update khóa theo trang_thai và updated_at", async () => {
    vi.setSystemTime(HAN_MS - 60_000);
    mocks.handler.mockImplementation(async (s: CallState) =>
      s.op === "select" ? { data: lanRow(), error: null } : { data: [{ id: LAN_ID }], error: null },
    );
    expect(await saveTraLoiCau(input)).toEqual({ ok: true });
    expect(updates()[0].filters).toContainEqual(["eq", ["trang_thai", "dang_lam"]]);
    expect(updates()[0].filters).toContainEqual(["eq", ["updated_at", "2029-01-01T00:00:00Z"]]);
  });

  it("quá hạn nhưng trong ân hạn 30 giây (đúng mốc +30s): vẫn lưu", async () => {
    vi.setSystemTime(HAN_MS + 30_000);
    mocks.handler.mockImplementation(async (s: CallState) =>
      s.op === "select" ? { data: lanRow(), error: null } : { data: [{ id: LAN_ID }], error: null },
    );
    expect(await saveTraLoiCau(input)).toEqual({ ok: true });
  });

  it("hết ân hạn (+30s +1ms): từ chối, không update", async () => {
    vi.setSystemTime(HAN_MS + 30_001);
    mocks.handler.mockResolvedValue({ data: lanRow(), error: null });
    await expect(saveTraLoiCau(input)).rejects.toThrow("Đã hết giờ làm bài");
    expect(updates()).toHaveLength(0);
  });

  it("bài của người khác: không tìm thấy, không update", async () => {
    vi.setSystemTime(HAN_MS - 60_000);
    mocks.handler.mockResolvedValue({ data: lanRow({ auth_user_id: "user-b" }), error: null });
    await expect(saveTraLoiCau(input)).rejects.toThrow("Không tìm thấy lần thi.");
    expect(updates()).toHaveLength(0);
  });

  it("bài đã nộp: từ chối", async () => {
    vi.setSystemTime(HAN_MS - 60_000);
    mocks.handler.mockResolvedValue({ data: lanRow({ trang_thai: "da_nop" }), error: null });
    await expect(saveTraLoiCau(input)).rejects.toThrow("Bài đã nộp.");
  });

  it("phương án không thuộc câu hỏi: ok=false, không update", async () => {
    vi.setSystemTime(HAN_MS - 60_000);
    mocks.handler.mockResolvedValue({ data: lanRow(), error: null });
    const r = await saveTraLoiCau({ ...input, traLoi: { kind: "single", optionId: "zzz" } });
    expect(r).toEqual({ ok: false, error: "Phương án không thuộc câu hỏi này." });
    expect(updates()).toHaveLength(0);
  });
});

describe("submitLanThi: hetGio / late / dat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  // n câu, `dung` câu đầu trả lời đúng.
  const snap = (dung: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `i${i}`,
      dap_an_dung: { kind: "single", optionId: "a" },
      tra_loi: { kind: "single", optionId: i < dung ? "a" : "b" },
    }));

  function setup(row: Record<string, unknown>, diemDat: number | null) {
    mocks.handler.mockImplementation(async (s: CallState) => {
      if (s.table === "dao_tao_cau_hinh") return { data: diemDat === null ? null : { diem_dat_pct: diemDat }, error: null };
      if (s.op === "select") return { data: row, error: null };
      return { data: [{ id: LAN_ID }], error: null };
    });
  }
  const thiThat = (dung: number, n: number) => ({
    ...lanRow({ che_do: "thi_that", cau_hinh_id: KY_ID }),
    de_snapshot: snap(dung, n),
  });

  it("đúng hạn: da_nop, đạt khi pct == diem_dat_pct (biên 70)", async () => {
    vi.setSystemTime(HAN_MS - 1000);
    setup(thiThat(7, 10), 70);
    expect(await submitLanThi(LAN_ID)).toMatchObject({ diemPct: 70, dat: true, trangThai: "da_nop" });
  });

  it("pct thấp hơn ngưỡng 0.1: không đạt (66.7 < 66.8)", async () => {
    vi.setSystemTime(HAN_MS - 1000);
    setup(thiThat(2, 3), 66.8);
    expect(await submitLanThi(LAN_ID)).toMatchObject({ diemPct: 66.7, dat: false });
  });

  it("làm tròn: 2/3 = 66.7 đạt ngưỡng 66.7", async () => {
    vi.setSystemTime(HAN_MS - 1000);
    setup(thiThat(2, 3), 66.7);
    expect(await submitLanThi(LAN_ID)).toMatchObject({ dat: true });
  });

  it("hết giờ trong ân hạn (hetGio, chưa late): trạng thái het_gio nhưng vẫn xét đạt", async () => {
    vi.setSystemTime(HAN_MS + 30_000);
    setup(thiThat(10, 10), 70);
    expect(await submitLanThi(LAN_ID)).toMatchObject({ trangThai: "het_gio", dat: true });
  });

  it("trễ quá ân hạn (+30s +1ms): het_gio và không đạt dù đủ điểm (DT-2)", async () => {
    vi.setSystemTime(HAN_MS + 30_001);
    setup(thiThat(10, 10), 70);
    expect(await submitLanThi(LAN_ID)).toMatchObject({ diemPct: 100, trangThai: "het_gio", dat: false });
  });

  it("thi thử: dat = null, không đọc cấu hình ngưỡng", async () => {
    vi.setSystemTime(HAN_MS - 1000);
    setup({ ...lanRow(), de_snapshot: snap(10, 10) }, 70);
    const r = await submitLanThi(LAN_ID);
    expect(r).toMatchObject({ dat: null, trangThai: "da_nop" });
    expect((mocks.calls as CallState[]).some((c) => c.table === "dao_tao_cau_hinh")).toBe(false);
  });

  it("thi thật nhưng kỳ không có diem_dat_pct: dat = null", async () => {
    vi.setSystemTime(HAN_MS - 1000);
    setup(thiThat(10, 10), null);
    expect(await submitLanThi(LAN_ID)).toMatchObject({ dat: null });
  });
});

describe("getLanThiForTake: ẩn đáp án và quyền admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
    mocks.requireAdmin.mockImplementation(async () => ({ user: { id: "user-a" } }));
  });

  const item = {
    id: "i1", thu_tu: 1, loai: "single", stem: "S", chu_de_ma: "CD",
    options: [{ id: "a", noiDung: "A", displayIndex: 0, laDung: true }],
    dap_an_dung: { kind: "single", optionId: "a" }, giai_thich: "GT", dung: true, tra_loi: null,
  };
  const row = (over: Record<string, unknown> = {}) => ({ ...lanRow(), de_snapshot: [item], ...over });

  it("đang làm: không lộ dapAnDung, giaiThich, dung; option chỉ còn id/noiDung/displayIndex", async () => {
    mocks.handler.mockResolvedValue({ data: row(), error: null });
    const r = await getLanThiForTake(LAN_ID);
    const q = r.questions[0] as Record<string, unknown>;
    expect(q).not.toHaveProperty("dapAnDung");
    expect(q).not.toHaveProperty("giaiThich");
    expect(q).not.toHaveProperty("dung");
    expect(q.options).toEqual([{ id: "a", noiDung: "A", displayIndex: 0 }]);
  });

  it("đã nộp: trả đáp án và giải thích", async () => {
    mocks.handler.mockResolvedValue({ data: row({ trang_thai: "da_nop" }), error: null });
    const q = (await getLanThiForTake(LAN_ID)).questions[0] as Record<string, unknown>;
    expect(q.dapAnDung).toEqual({ kind: "single", optionId: "a" });
    expect(q.giaiThich).toBe("GT");
    expect(q.dung).toBe(true);
  });

  it("người khác không phải admin: không tìm thấy", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("403"));
    mocks.handler.mockResolvedValue({ data: row({ auth_user_id: "user-b", trang_thai: "da_nop" }), error: null });
    await expect(getLanThiForTake(LAN_ID)).rejects.toThrow("Không tìm thấy lần thi.");
  });

  it("admin xem bài đang làm của người khác: bị chặn", async () => {
    mocks.handler.mockResolvedValue({ data: row({ auth_user_id: "user-b" }), error: null });
    await expect(getLanThiForTake(LAN_ID)).rejects.toThrow("Chỉ xem được bài đã nộp.");
  });

  it("admin xem bài đã nộp của người khác: được", async () => {
    mocks.handler.mockResolvedValue({ data: row({ auth_user_id: "user-b", trang_thai: "het_gio" }), error: null });
    const r = await getLanThiForTake(LAN_ID);
    expect(r.lanThi.trangThai).toBe("het_gio");
    expect(r.questions[0]).toHaveProperty("dapAnDung");
  });
});

describe("startThiThuAttempt: validate đầu vào", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
  });

  it("mucDoId không phải GUID: từ chối trước khi chạm DB", async () => {
    await expect(startThiThuAttempt({ mucDoId: "abc", form: FORM })).rejects.toThrow("Mã định danh không hợp lệ.");
    expect(mocks.calls).toHaveLength(0);
  });

  it("họ tên rỗng: từ chối trước khi chạm DB", async () => {
    await expect(
      startThiThuAttempt({ mucDoId: KY_ID, form: { hoTen: "", khoaDonVi: "K" } }),
    ).rejects.toThrow("Vui lòng nhập họ tên.");
    expect(mocks.calls).toHaveLength(0);
  });

  it("mức độ không tồn tại: báo lỗi, không insert", async () => {
    mocks.handler.mockResolvedValue({ data: null, error: null });
    await expect(startThiThuAttempt({ mucDoId: KY_ID, form: FORM })).rejects.toThrow("Mức độ thi thử không tồn tại.");
    expect((mocks.calls as CallState[]).some((c) => c.op === "insert")).toBe(false);
  });
});
