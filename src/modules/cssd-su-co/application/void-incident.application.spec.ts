import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as IncidentVoidDomain from "../domain/cssd-incident-void";
import { executeVoidIncidentReport } from "./void-incident.application";

// Giữ nguyên canActorVoidIncident / INCIDENT_VOID_NOT_OWNER; chỉ thay planCssdIncidentVoid bằng plan cố định.
const mocks = vi.hoisted(() => ({
  planCssdIncidentVoid: vi.fn<typeof IncidentVoidDomain.planCssdIncidentVoid>(),
}));
vi.mock("../domain/cssd-incident-void", async (importOriginal) => ({
  ...(await importOriginal<typeof IncidentVoidDomain>()),
  planCssdIncidentVoid: mocks.planCssdIncidentVoid,
}));

type Row = Record<string, unknown>;
type CyclePlan = IncidentVoidDomain.IncidentVoidCyclePlan;
type RpcReply = { data: unknown; error: { message: string } | null };

const INCIDENT_ID = "11111111-2222-3333-4444-555555555555";
const QUY_TRINH_ID = "qt-1";
const RPC_NAME = "rpc_cssd_apply_incident_void";

const TICKET: Row = {
  id: INCIDENT_ID,
  is_active: true,
  attributes: {},
  mo_ta: "Rách gói vải",
  ma_tram_phat_hien: "DONG_GOI",
  quy_trinh_id: QUY_TRINH_ID,
};

const BASE_CYCLE: CyclePlan = {
  // null: không gọi buildQuyTrinhTramPatch (sẽ truy vấn cssd_dm_tram).
  restoreStation: null,
  stamps: {},
  isRedAlert: false,
  isDongBang: null,
  restoreLoId: null,
};

function planOf(cycle: CyclePlan | null): IncidentVoidDomain.IncidentVoidPlan {
  // deactivateLedgerIds rỗng: stripVoidedIssueNotes thoát ngay sau RPC, không truy vấn thêm.
  return { ok: true, already: false, attributes: {}, deactivateLedgerIds: [], khoDelta: [], cycle };
}

/** Client giả theo bảng + cách kết thúc truy vấn (maybeSingle hay await trực tiếp). Bảng lạ thì ném lỗi. */
function createClient(opts: { ticket: Row | null; rpcData?: unknown; rpcError?: string }) {
  const rpc = vi.fn<(name: string, args: Record<string, unknown>) => Promise<RpcReply>>(async () => ({
    data: opts.rpcData ?? null,
    error: opts.rpcError ? { message: opts.rpcError } : null,
  }));
  const from = vi.fn((table: string) => {
    const single = () => {
      switch (table) {
        case "cssd_fact_su_co":
          return { data: opts.ticket, error: null };
        case "v_cssd_quy_trinh_full":
          return {
            data: { lo_tiet_khuan_id: null, ma_trang_thai_hien_tai: "DONG_GOI", tram_hien_tai_id: "tram-1" },
            error: null,
          };
        case "cssd_fact_quy_trinh":
          return { data: { metadata: {} }, error: null };
        default:
          throw new Error(`maybeSingle ngoài kịch bản: ${table}`);
      }
    };
    const list = () => {
      switch (table) {
        case "cssd_fact_kho_hoa_chat_giao_dich":
          return { data: null, count: 0, error: null };
        case "cssd_fact_kho_giao_dich":
        case "cssd_fact_su_co": // phiếu cùng chu trình
        case "cssd_fact_quy_trinh": // tableHasColumn: select("id,<cột>").limit(1) rồi await; luôn "có cột"
          return { data: [], error: null };
        default:
          throw new Error(`truy vấn danh sách ngoài kịch bản: ${table}`);
      }
    };
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.neq = () => b;
    b.limit = () => b;
    b.maybeSingle = async () => single();
    b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve().then(list).then(resolve, reject);
    return b;
  });
  return { rpc, from };
}
type FakeClient = ReturnType<typeof createClient>;

async function runVoid(opts: {
  ticket?: Row | null;
  plan?: IncidentVoidDomain.IncidentVoidPlan;
  incidentId?: string;
  rpcData?: unknown;
  rpcError?: string;
}) {
  if (opts.plan) mocks.planCssdIncidentVoid.mockReturnValue(opts.plan);
  const supabase = createClient({
    ticket: opts.ticket === undefined ? TICKET : opts.ticket,
    rpcData: opts.rpcData,
    rpcError: opts.rpcError,
  });
  const result = await executeVoidIncidentReport(supabase as never, {
    incidentId: opts.incidentId ?? INCIDENT_ID,
    actorNhanSuId: "ns-1",
    actorHoTen: "Nguyen Van A",
    actorAuthUserId: "auth-1",
    actorIsApprover: true,
  });
  return { result, supabase };
}

/** Đúng một lần gọi rpc_cssd_apply_incident_void; trả đối số thứ hai. */
function rpcArgsOf(supabase: FakeClient): Record<string, unknown> {
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  const [name, args] = supabase.rpc.mock.calls[0];
  expect(name).toBe(RPC_NAME);
  return args;
}

describe("executeVoidIncidentReport", () => {
  beforeEach(() => {
    mocks.planCssdIncidentVoid.mockReset();
    mocks.planCssdIncidentVoid.mockReturnValue(planOf(BASE_CYCLE));
  });

  describe("cổng đầu vào", () => {
    it.each(["", "   "])("thiếu mã phiếu (%j) → báo lỗi, không truy vấn DB", async (incidentId) => {
      const { result, supabase } = await runVoid({ incidentId });
      expect(result).toStrictEqual({ ok: false, error: "Thiếu mã phiếu sự cố." });
      expect(supabase.from).not.toHaveBeenCalled();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("không tìm thấy phiếu → báo lỗi, không gọi rpc", async () => {
      const { result, supabase } = await runVoid({ ticket: null });
      expect(result).toStrictEqual({ ok: false, error: "Không tìm thấy phiếu sự cố." });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("phiếu is_active=false → already, không gọi rpc, không lập plan", async () => {
      const { result, supabase } = await runVoid({ ticket: { ...TICKET, is_active: false } });
      expect(result).toStrictEqual({ ok: true, already: true });
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(mocks.planCssdIncidentVoid).not.toHaveBeenCalled();
    });
  });

  describe("patch chu trình khi plan có cycle", () => {
    it.each([
      { isRedAlert: true, isDongBang: true, patch: { is_red_alert: true, is_dong_bang: true } },
      { isRedAlert: true, isDongBang: false, patch: { is_red_alert: true, is_dong_bang: false } },
      { isRedAlert: false, isDongBang: true, patch: { is_red_alert: false, is_dong_bang: true } },
      { isRedAlert: false, isDongBang: false, patch: { is_red_alert: false, is_dong_bang: false } },
    ])(
      "isRedAlert=$isRedAlert, isDongBang=$isDongBang → patch mang is_red_alert và is_dong_bang đúng giá trị",
      async ({ isRedAlert, isDongBang, patch }) => {
        const { supabase } = await runVoid({ plan: planOf({ ...BASE_CYCLE, isRedAlert, isDongBang }) });
        const args = rpcArgsOf(supabase);
        expect(args.p_su_co_id).toBe(INCIDENT_ID);
        expect(args.p_quy_trinh_id).toBe(QUY_TRINH_ID);
        expect(args.p_quy_trinh_patch).toStrictEqual(patch);
        expect(args.p_event).toMatchObject({
          su_kien: "VO_HIEU_SU_CO",
          nguoi_thao_tac: "Nguyen Van A",
          chi_tiet: { su_co_id: INCIDENT_ID, is_red_alert: isRedAlert },
        });
      },
    );

    it.each([
      { isRedAlert: true, patch: { is_red_alert: true } },
      { isRedAlert: false, patch: { is_red_alert: false } },
    ])(
      "isRedAlert=$isRedAlert, isDongBang=null → patch chỉ có is_red_alert, không có khóa is_dong_bang",
      async ({ isRedAlert, patch }) => {
        const { supabase } = await runVoid({ plan: planOf({ ...BASE_CYCLE, isRedAlert, isDongBang: null }) });
        const args = rpcArgsOf(supabase);
        expect(args.p_quy_trinh_id).toBe(QUY_TRINH_ID);
        expect(args.p_quy_trinh_patch).toStrictEqual(patch);
        expect(args.p_quy_trinh_patch).not.toHaveProperty("is_dong_bang");
        expect(args.p_event).toMatchObject({
          su_kien: "VO_HIEU_SU_CO",
          chi_tiet: { su_co_id: INCIDENT_ID, is_red_alert: isRedAlert },
        });
      },
    );

    // Ngoài 4 hành vi bắt buộc: khóa hai dòng kề vùng gỡ probe (Object.assign stamps, lo_tiet_khuan_id).
    // Tổ hợp stamps + restoreLoId với restoreStation=null không do domain sinh ra; chỉ khóa việc ghép patch.
    it("[phụ] stamps và restoreLoId của plan vẫn nằm trong patch cùng is_red_alert, is_dong_bang", async () => {
      const stamps = { thoi_gian_dong_goi: "2026-11-16T01:00:00.000Z", nguoi_dong_goi_id: "ns-9" };
      const { supabase } = await runVoid({
        plan: planOf({ ...BASE_CYCLE, stamps, isRedAlert: true, isDongBang: false, restoreLoId: "lo-7" }),
      });
      expect(rpcArgsOf(supabase).p_quy_trinh_patch).toStrictEqual({
        ...stamps,
        is_red_alert: true,
        is_dong_bang: false,
        lo_tiet_khuan_id: "lo-7",
      });
    });
  });

  describe("không có chu trình để cập nhật", () => {
    it.each([
      {
        ten: "phiếu không có quy_trinh_id (dù plan có cycle)",
        ticket: { ...TICKET, quy_trinh_id: null },
        plan: planOf({ ...BASE_CYCLE, isRedAlert: true, isDongBang: true }),
      },
      { ten: "plan không có cycle (phiếu có quy_trinh_id)", ticket: TICKET, plan: planOf(null) },
    ])("$ten → p_quy_trinh_id, p_quy_trinh_patch, p_event đều null", async ({ ticket, plan }) => {
      const { supabase } = await runVoid({ ticket, plan });
      const args = rpcArgsOf(supabase);
      expect(args.p_su_co_id).toBe(INCIDENT_ID);
      expect(args.p_quy_trinh_id).toBeNull();
      expect(args.p_quy_trinh_patch).toBeNull();
      expect(args.p_event).toBeNull();
    });
  });

  describe("kết quả theo rpc_cssd_apply_incident_void", () => {
    it("rpc trả error → { ok:false, error: message }", async () => {
      const { result } = await runVoid({ rpcError: "Lỗi RPC giả lập" });
      expect(result).toStrictEqual({ ok: false, error: "Lỗi RPC giả lập" });
    });

    it("rpc trả data.already=true → { ok:true, already:true }", async () => {
      const { result } = await runVoid({ rpcData: { already: true } });
      expect(result).toStrictEqual({ ok: true, already: true });
    });

    it("rpc thành công (data.already=false) → đúng { ok:true }, không có khóa already", async () => {
      const { result, supabase } = await runVoid({ rpcData: { already: false } });
      expect(result).toStrictEqual({ ok: true });
      rpcArgsOf(supabase);
    });
  });
});
