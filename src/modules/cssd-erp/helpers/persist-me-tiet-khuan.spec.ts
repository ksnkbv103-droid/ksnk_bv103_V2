import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const appendQuyTrinhException = vi.fn();
const applyBatchRecallAndHoldMachine = vi.fn();

vi.mock("../actions/cssd-action-common", () => ({
  appendQuyTrinhException: (...a: unknown[]) => appendQuyTrinhException(...a),
}));
vi.mock("@/modules/cssd-su-co/application/batch-recall-hold.application", () => ({
  applyBatchRecallAndHoldMachine: (...a: unknown[]) => applyBatchRecallAndHoldMachine(...a),
}));
vi.mock("../shared/application/cssd-operator-resolve", () => ({
  resolveCssdOperatorNhanSuId: async () => "nhan-su-1",
}));
vi.mock("@/lib/cssd-server-common", () => ({ revalidateCssdIncidentSurfaces: () => undefined }));

import { persistMeBiResultWithClient, persistMeTietKhuanFinishWithClient } from "./persist-me-tiet-khuan";

type Rows = Record<string, unknown>;
type World = {
  batch: Rows | null;
  members: Rows[];
  boDungCu: Rows[];
};

/** Client giả: trả dữ liệu theo bảng, ghi lại rpc và update. */
function fakeClient(world: World) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const ghiTestCalls: Record<string, unknown>[] = [];
  const updates: { table: string; patch: Rows }[] = [];
  const resultFor = (table: string): { data: unknown; error: null } => {
    if (table === "cssd_fact_lo_tiet_khuan") return { data: world.batch, error: null };
    if (table === "v_cssd_quy_trinh_full") return { data: world.members, error: null };
    if (table === "cssd_dm_bo_dung_cu") return { data: world.boDungCu, error: null };
    return { data: null, error: null };
  };
  const from = (table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const m of ["select", "eq", "in"]) chain[m] = self;
    chain.maybeSingle = async () => resultFor(table);
    chain.update = (patch: Rows) => {
      updates.push({ table, patch });
      return chain;
    };
    chain.then = (res: (v: unknown) => unknown) => Promise.resolve(resultFor(table)).then(res);
    return chain;
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    // ghi_test (người + giờ từng test) tách riêng để các kiểm cũ về kết luận mẻ giữ nguyên.
    if (name === "rpc_cssd_me_ghi_test") {
      ghiTestCalls.push(args);
      return { data: { success: true, dat: args.p_ket_qua !== "KHONG_DAT" && args.p_ket_qua !== "DUONG" }, error: null };
    }
    rpcCalls.push({ name, args });
    return { data: { success: true, dat: true, quy_trinh_ids: ["qt-1", "qt-2"] }, error: null };
  };
  return { client: { from, rpc } as unknown as SupabaseClient, rpcCalls, ghiTestCalls, updates };
}

const BATCH_ID = "me-1";
const member = (over: Rows = {}): Rows => ({
  id: "qt-1",
  ma_qr_quy_trinh: "QR-1",
  ma_trang_thai_hien_tai: "TIET_KHUAN",
  is_active: true,
  lo_tiet_khuan_id: BATCH_ID,
  tram_hien_tai_id: "tram-1",
  bo_dung_cu_id: "bo-1",
  ...over,
});
const openBatch = (over: Rows = {}): Rows => ({
  tk_mo_form_qc_at: "2026-10-12T01:00:00Z",
  ket_qua_test: null,
  tk_qc_json: {},
  phuong_phap: "HOI_NUOC",
  trang_thai_me: "DANG_CHAY",
  thiet_bi_id: null,
  chuong_trinh: null,
  thiet_bi: null,
  ...over,
});
const world = (over: Partial<World> = {}): World => ({
  batch: openBatch(),
  members: [member(), member({ id: "qt-2", ma_qr_quy_trinh: "QR-2" })],
  boDungCu: [{ id: "bo-1", is_implant: false }],
  ...over,
});

const finishInput = {
  activeMeId: BATCH_ID,
  maLo: "ME-01",
  isPass: true,
  nguoiUnload: "Điều dưỡng A",
  operatorAuthUserId: "user-1",
  operatorEmail: "a@bv103.vn",
  nhietDo: "134",
  apSuat: "2.1",
  thoiGianChuKy: "20",
  thongSoVatLy: "DAT",
  ciNgoaiGoi: "DAT",
  ciPcd: "DAT",
  trangThaiBi: "CHUA_CO",
};
const bm02 = {
  ongDoiChung: "DUONG",
  ongThu: "AM",
  gioBatDauU: "2026-10-05T01:00:00.000Z",
  gioDoc: "2026-10-05T09:00:00.000Z",
  soLoBi: "BI-LOT-01",
};
const recallResult = {
  incidentId: "sc-1",
  incidentCreated: true,
  recalled: [{ maBo: "B1", tenBo: "Bộ 1", maLo: "ME-00" }],
  machineHeld: true,
  listedUsed: [],
};

beforeEach(() => {
  appendQuyTrinhException.mockReset();
  applyBatchRecallAndHoldMachine.mockReset().mockResolvedValue(recallResult);
});

describe("cổng QC mẻ — persistMeTietKhuanFinishWithClient", () => {
  it("chưa mở bước đánh giá QC → chặn, không gọi RPC", async () => {
    const w = fakeClient(world({ batch: openBatch({ tk_mo_form_qc_at: null }) }));
    const r = await persistMeTietKhuanFinishWithClient(w.client, finishInput);
    expect(r.ok).toBe(false);
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("mẻ đã có kết quả (đạt, không đạt, chờ BI, hoàn thành) → không ghi đè", async () => {
    for (const batch of [
      openBatch({ ket_qua_test: true }),
      openBatch({ ket_qua_test: false }),
      openBatch({ trang_thai_me: "CHO_BI" }),
      openBatch({ trang_thai_me: "HOAN_THANH" }),
    ]) {
      const w = fakeClient(world({ batch }));
      const r = await persistMeTietKhuanFinishWithClient(w.client, finishInput);
      expect(r).toMatchObject({ ok: false });
      expect(w.rpcCalls).toHaveLength(0);
    }
  });

  it("mẻ thường đạt hết → HOAN_THANH, ghi nhật ký từng bộ, bộ chờ cấp phát", async () => {
    const w = fakeClient(world());
    const r = await persistMeTietKhuanFinishWithClient(w.client, finishInput);
    expect(r).toEqual({ ok: true, outcome: "HOAN_THANH" });
    expect(w.rpcCalls.map((c) => c.name)).toEqual(["rpc_cssd_me_ket_luan_dat"]);
    expect(w.ghiTestCalls.map((c) => c.p_loai)).toEqual(["THONG_SO_VAT_LY", "CI_NGOAI_GOI", "CI_PCD"]);
    expect(appendQuyTrinhException).toHaveBeenCalledTimes(2);
    expect(appendQuyTrinhException.mock.calls[0][2]).toMatchObject({ su_kien: "HOAN_ME_TIET_KHUAN_DAT", den_tram: "CAP_PHAT" });
    expect(applyBatchRecallAndHoldMachine).not.toHaveBeenCalled();
  });

  it("đạt nhưng không bộ nào đang ở trạm tiệt khuẩn → không kết luận ĐẠT", async () => {
    const w = fakeClient(world({ members: [member({ ma_trang_thai_hien_tai: "DONG_GOI" })] }));
    const r = await persistMeTietKhuanFinishWithClient(w.client, finishInput);
    expect(r.ok).toBe(false);
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("implant, BI chưa có → CHỜ BI, không nhả (AB-2)", async () => {
    const w = fakeClient(world({ boDungCu: [{ id: "bo-1", is_implant: true }] }));
    const r = await persistMeTietKhuanFinishWithClient(w.client, finishInput);
    expect(r).toEqual({ ok: true, outcome: "CHO_BI" });
    expect(w.rpcCalls.map((c) => c.name)).toEqual(["rpc_cssd_me_ghi_cho_bi"]);
  });

  it("implant, BI âm nhưng thiếu sổ BM.02 → chặn nhả", async () => {
    const w = fakeClient(world({ boDungCu: [{ id: "bo-1", is_implant: true }] }));
    const r = await persistMeTietKhuanFinishWithClient(w.client, { ...finishInput, trangThaiBi: "AM" });
    expect(r.ok).toBe(false);
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("implant, BI âm đủ sổ BM.02 → nhả HOAN_THANH, ghi sổ vào qc_json", async () => {
    const w = fakeClient(world({ boDungCu: [{ id: "bo-1", is_implant: true }] }));
    const r = await persistMeTietKhuanFinishWithClient(w.client, { ...finishInput, trangThaiBi: "AM", ...bm02 });
    expect(r).toEqual({ ok: true, outcome: "HOAN_THANH" });
    const qc = w.rpcCalls[0].args.p_qc_json as Record<string, unknown>;
    expect(qc.co_implant).toBe("true");
    expect(qc.trang_thai_bi).toBe("AM");
  });

  it("QC đạt mà người dùng báo không đạt → chặn", async () => {
    const w = fakeClient(world());
    const r = await persistMeTietKhuanFinishWithClient(w.client, { ...finishInput, isPass: false });
    expect(r.ok).toBe(false);
    expect(w.rpcCalls).toHaveLength(0);
    expect(applyBatchRecallAndHoldMachine).not.toHaveBeenCalled();
  });

  it("mục QC không đạt → thu hồi + giữ máy (QC_FAIL), không nhả", async () => {
    const w = fakeClient(world());
    const r = await persistMeTietKhuanFinishWithClient(w.client, { ...finishInput, isPass: false, ciNgoaiGoi: "KHONG_DAT" });
    expect(r).toMatchObject({ ok: true, outcome: "QC_KHONG_DAT", recalledCount: 1, machineHeld: true, incidentIds: ["sc-1"] });
    expect(applyBatchRecallAndHoldMachine.mock.calls[0][1]).toMatchObject({ mode: "QC_FAIL", loTietKhuanId: BATCH_ID });
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("BI dương tại QC → thu hồi kiểu BI_DUONG", async () => {
    const w = fakeClient(world());
    const r = await persistMeTietKhuanFinishWithClient(w.client, {
      ...finishInput,
      isPass: false,
      trangThaiBi: "DUONG",
      ...bm02,
      ongDoiChung: "DUONG",
      ongThu: "DUONG",
    });
    expect(r).toMatchObject({ ok: true, outcome: "QC_KHONG_DAT" });
    expect(applyBatchRecallAndHoldMachine.mock.calls[0][1]).toMatchObject({ mode: "BI_DUONG", typeId: "PROCESS_BI_POSITIVE" });
  });
});

describe("thu hồi và nhả sau BI — persistMeBiResultWithClient", () => {
  const biArgs = { batchId: BATCH_ID, operatorAuthUserId: "user-1", operatorEmail: "a@bv103.vn", nguoiLabel: "NV", ...bm02 };
  const waiting = { trang_thai_me: "CHO_BI", ket_qua_test: null, ma_lo_tiet_khuan: "ME-01", tk_qc_json: {} };
  const released = { trang_thai_me: "HOAN_THANH", ket_qua_test: true, ma_lo_tiet_khuan: "ME-01", tk_qc_json: {} };

  it("sổ BM.02 sai (đối chứng âm) → chặn trước khi chạm DB", async () => {
    const w = fakeClient(world({ batch: waiting }));
    const r = await persistMeBiResultWithClient(w.client, { ...biArgs, ketQua: "AM", ongDoiChung: "AM" });
    expect(r.ok).toBe(false);
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("BI âm cho mẻ chờ BI → nhả HOAN_THANH qua RPC", async () => {
    const w = fakeClient(world({ batch: waiting }));
    const r = await persistMeBiResultWithClient(w.client, { ...biArgs, ketQua: "AM" });
    expect(r).toEqual({ ok: true, outcome: "HOAN_THANH" });
    expect(w.rpcCalls.map((c) => c.name)).toEqual(["rpc_cssd_me_nhap_bi_am"]);
  });

  it("BI âm cho mẻ chưa chờ BI cũng chưa nhả → chặn", async () => {
    const w = fakeClient(world({ batch: { ...waiting, trang_thai_me: "DANG_CHAY" } }));
    const r = await persistMeBiResultWithClient(w.client, { ...biArgs, ketQua: "AM" });
    expect(r.ok).toBe(false);
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("BI tuần âm trên mẻ đã nhả → chỉ ghi sổ, không đổi trạng thái", async () => {
    const w = fakeClient(world({ batch: released }));
    const r = await persistMeBiResultWithClient(w.client, { ...biArgs, ketQua: "AM" });
    expect(r).toEqual({ ok: true, outcome: "BI_GHI_SO" });
    expect(w.rpcCalls).toHaveLength(0);
    expect(w.updates[0].patch).toMatchObject({ trang_thai_bi: "AM", ket_qua_bi: true });
    expect((w.updates[0].patch.tk_qc_json as Rows).bi_tuan_sau_nha).toBe(true);
    expect(applyBatchRecallAndHoldMachine).not.toHaveBeenCalled();
  });

  it("BI âm trên mẻ THU_HOI (ket_qua_test vẫn true) → từ chối, không ghi sổ", async () => {
    const w = fakeClient(world({ batch: { ...released, trang_thai_me: "THU_HOI" } }));
    const r = await persistMeBiResultWithClient(w.client, { ...biArgs, ketQua: "AM" });
    expect(r.ok).toBe(false);
    expect(w.updates).toHaveLength(0);
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("BI dương trên mẻ đã nhả → thu hồi cửa sổ cùng máy + giữ máy", async () => {
    const w = fakeClient(world({ batch: released }));
    const r = await persistMeBiResultWithClient(w.client, { ...biArgs, ketQua: "DUONG", ongThu: "DUONG" });
    expect(r).toMatchObject({ ok: true, outcome: "QC_KHONG_DAT", recalledCount: 1, machineHeld: true });
    expect(applyBatchRecallAndHoldMachine.mock.calls[0][1]).toMatchObject({ mode: "BI_DUONG", trangThaiBi: "DUONG" });
  });

  it("BI dương trên mẻ chờ BI → thu hồi; lỗi thu hồi trả message, không ném", async () => {
    applyBatchRecallAndHoldMachine.mockRejectedValueOnce(new Error("Không thu hồi được"));
    const w = fakeClient(world({ batch: waiting }));
    const r = await persistMeBiResultWithClient(w.client, { ...biArgs, ketQua: "DUONG", ongThu: "DUONG" });
    expect(r).toEqual({ ok: false, message: "Không thu hồi được" });
  });
});
