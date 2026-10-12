import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  verifyAnyPermission: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  verifyAnyPermission: mocks.verifyAnyPermission,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: async () => ({ auth: { getUser: mocks.getUser } }),
  createAdminSupabaseClient: () => ({ from: mocks.from }),
}));

import {
  getBankStats,
  getCauHoiDetail,
  getDaoTaoBankForExport,
  listCauHoiDaoTao,
} from "./dao-tao-bank.actions";
import {
  listChuaNopKyThi,
  listKetQuaKyThi,
  listKyThiThatAdmin,
  listNhanSuOptions,
} from "./dao-tao-admin.actions";
import { getLanThiForTake, saveTraLoiCau } from "./dao-tao-attempt.actions";

const LAN_THI_ID = "3f1c2b4a-9d8e-4f7a-8b6c-1a2b3c4d5e6f";

/** Builder supabase tối giản: mọi phương thức chain trả chính nó, kết thúc bằng `result`. */
function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit", "range", "update", "is"]) {
    b[m] = vi.fn(() => b);
  }
  b.maybeSingle = vi.fn(async () => result);
  b.single = vi.fn(async () => result);
  b.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return b;
}

/** Người chỉ có DAO_TAO view: view qua, edit/import/create bị từ chối. */
function onlyView() {
  mocks.verifyPermission.mockImplementation(async (_m: string, action: string) => {
    if (action !== "view") throw new Error(`Bạn không có quyền [${action}] trên module [DAO_TAO].`);
  });
  mocks.verifyAnyPermission.mockRejectedValue(new Error("Cần ít nhất một quyền phù hợp."));
}

describe("DT-1: action quản trị Thi KSNK từ chối người chỉ có quyền view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
    onlyView();
  });

  const cases: Array<[string, () => Promise<unknown>]> = [
    ["listCauHoiDaoTao", () => listCauHoiDaoTao()],
    ["getBankStats", () => getBankStats()],
    ["getDaoTaoBankForExport", () => getDaoTaoBankForExport(true)],
    ["getCauHoiDetail", () => getCauHoiDetail(LAN_THI_ID)],
    ["listKyThiThatAdmin", () => listKyThiThatAdmin()],
    ["listKetQuaKyThi", () => listKetQuaKyThi()],
    ["listChuaNopKyThi", () => listChuaNopKyThi(LAN_THI_ID)],
    ["listNhanSuOptions", () => listNhanSuOptions()],
  ];

  it.each(cases)("%s ném lỗi và không đọc DB", async (_name, call) => {
    await expect(call()).rejects.toThrow("Bạn không có quyền quản trị Thi KSNK.");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("người có quyền edit thì qua cổng", async () => {
    mocks.verifyAnyPermission.mockResolvedValue(undefined);
    mocks.from.mockReturnValue(chain({ data: [], error: null }));
    await expect(listKyThiThatAdmin()).resolves.toEqual([]);
  });
});

describe("DT-1: getLanThiForTake", () => {
  const submittedOfB = {
    id: LAN_THI_ID,
    auth_user_id: "user-b",
    trang_thai: "da_nop",
    de_snapshot: [
      {
        id: "c1",
        thu_tu: 1,
        loai: "single",
        stem: "?",
        options: [],
        tra_loi: null,
        dung: false,
        giai_thich: null,
        dap_an_dung: { kind: "single", optionId: "a" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
  });

  it("thí sinh A chỉ có view không xem được bài đã nộp của B", async () => {
    onlyView();
    mocks.from.mockReturnValue(chain({ data: submittedOfB, error: null }));
    await expect(getLanThiForTake(LAN_THI_ID)).rejects.toThrow("Không tìm thấy lần thi.");
  });

  it("quản trị viên xem được bài đã nộp của B kèm đáp án", async () => {
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.verifyAnyPermission.mockResolvedValue(undefined);
    mocks.from.mockReturnValue(chain({ data: submittedOfB, error: null }));
    const r = await getLanThiForTake(LAN_THI_ID);
    expect(r.questions[0]).toMatchObject({ dapAnDung: { kind: "single", optionId: "a" } });
  });

  it("chủ bài đang làm: không lộ dap_an_dung", async () => {
    onlyView();
    mocks.from.mockReturnValue(
      chain({ data: { ...submittedOfB, auth_user_id: "user-a", trang_thai: "dang_lam" }, error: null }),
    );
    const r = await getLanThiForTake(LAN_THI_ID);
    expect(r.questions[0]).not.toHaveProperty("dapAnDung");
  });
});

describe("DT-1: saveTraLoiCau kiểm input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
    onlyView();
  });

  it("từ chối traLoi thiếu byOptionId trước khi đụng DB", async () => {
    await expect(
      saveTraLoiCau({
        lanThiId: LAN_THI_ID,
        cauId: LAN_THI_ID,
        traLoi: { kind: "true_false_cluster" } as never,
      }),
    ).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
