import { beforeEach, describe, expect, it } from "vitest";
import { clearTableHasColumnCache } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { executeIncidentReportAndRollback } from "./su-co-report.application";

type RpcResult = { success: boolean; message?: string; su_co_id?: string; idempotent?: boolean };

const SAFETY_PAIR = [
  {
    id: "a",
    quy_trinh_id: "qt-1",
    is_active: true,
    attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_SET_RECONCILE", SET_RECONCILE_STATUS: "DRAFT" },
  },
  {
    id: "b",
    quy_trinh_id: "qt-1",
    is_active: true,
    attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_SET_RECONCILE", SET_RECONCILE_STATUS: "NONE" },
  },
];

function client(opts: {
  rpcResult: RpcResult;
  quyTrinhUpdateError?: boolean;
  priorRows?: {
    id: string;
    attributes: Record<string, unknown>;
    quy_trinh_id?: string | null;
    is_active?: boolean | null;
  }[];
}) {
  const ops: string[] = [];
  return {
    ops,
    rpc: async (name: string) => {
      ops.push("rpc:" + name);
      return { data: opts.rpcResult, error: null };
    },
    from(table: string) {
      let mode = "row";
      const terminal = () => {
        if (mode === "count") return { data: null, error: null, count: 2 };
        if (mode === "safety") return { data: opts.priorRows ?? SAFETY_PAIR, error: null };
        if (mode === "list") return { data: [], error: null };
        return { data: null, error: null };
      };
      const b: Record<string, unknown> = {};
      const chain = () => b;
      b.select = (cols: string, extra?: { head?: boolean }) => {
        if (extra?.head) mode = "count";
        else if (String(cols).includes("attributes")) mode = "safety";
        return b;
      };
      b.eq = chain;
      b.order = chain;
      b.limit = chain;
      b.maybeSingle = async () => terminal();
      b.single = async () => ({ data: { id: "new-1" }, error: null });
      b.insert = () => ({ select: () => ({ single: async () => ({ data: { id: "new-1" }, error: null }) }) });
      b.update = () => {
        if (table === "cssd_fact_quy_trinh" && opts.quyTrinhUpdateError) {
          return { eq: async () => ({ error: { message: "fail tram" } }) };
        }
        return { eq: async () => ({ error: null }) };
      };
      b.delete = () => {
        ops.push("delete:" + table);
        return { eq: async () => ({ error: null }) };
      };
      b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(terminal()).then(resolve, reject);
      return b;
    },
  };
}

const draftArgs = {
  station: "DONG_GOI" as const,
  incidentGroup: "INSTRUMENT" as const,
  typeTen: "Rà soát bộ",
  typeId: "INSTRUMENT_SET_RECONCILE",
  desc: "đếm lệch",
  setReconcilePayload: {
    boDungCuId: "bo-1",
    draftIncidentId: "draft-1",
    lines: [
      {
        chiTietId: "ct-1",
        loaiDungCuId: "loai-1",
        tenDungCuLe: "Kẹp",
        soLuongChuan: 2,
        soLuongThucTe: 2,
        soLuongDem: 1,
        kind: "HONG" as const,
      },
    ],
  },
};

describe("executeIncidentReportAndRollback nháp", () => {
  beforeEach(() => {
    clearTableHasColumnCache();
  });

  it("không xóa nháp khi RPC sổ trả lỗi", async () => {
    const supabase = client({
      rpcResult: { success: false, message: "Số lượng vượt quá số thực tế (0)." },
    });
    await expect(
      executeIncidentReportAndRollback(supabase as never, draftArgs, null),
    ).rejects.toThrow(/thực tế/);
    expect(supabase.ops.filter((op) => op.startsWith("delete:"))).toEqual([]);
    expect(supabase.ops).toContain("rpc:rpc_cssd_commit_instrument_report");
  });

  it("không xóa nháp khi lỗi sau khi RPC đã ghi phiếu", async () => {
    const supabase = client({
      rpcResult: { success: true, su_co_id: "draft-1", idempotent: false },
      quyTrinhUpdateError: true,
      // SC-04: cờ đỏ chỉ PROCESS — đủ prior để cập nhật quy_trinh (và lỗi mock).
      priorRows: [
        {
          id: "p1",
          quy_trinh_id: "qt-1",
          is_active: true,
          attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
        },
        {
          id: "p2",
          quy_trinh_id: "qt-1",
          is_active: true,
          attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_QC_FAIL" },
        },
      ],
    });
    await expect(
      executeIncidentReportAndRollback(
        supabase as never,
        { ...draftArgs, maQR: "QR-BO-1" },
        { id: "qt-1", tram_hien_tai_id: "tram-1" },
      ),
    ).rejects.toThrow(/fail tram|Loi xu ly su co/);
    expect(supabase.ops.filter((op) => op.startsWith("delete:"))).toEqual([]);
  });

  it("phiếu luân chuyển không bật cảnh báo đỏ trên chu trình", async () => {
    const supabase = client({
      rpcResult: { success: true, su_co_id: "mv-1" },
      quyTrinhUpdateError: true,
      priorRows: [
        { id: "m1", attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_TRANSFER", SET_RECONCILE_STATUS: "NONE" } },
        { id: "m2", attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_REPLENISH", SET_RECONCILE_STATUS: "NONE" } },
      ],
    });
    const res = await executeIncidentReportAndRollback(
      supabase as never,
      {
        station: "DONG_GOI",
        incidentGroup: "INSTRUMENT",
        typeTen: "Luân chuyển",
        typeId: "INSTRUMENT_TRANSFER",
        desc: "chuyển kho",
        maQR: "B01.SET.01",
      },
      { id: "qt-1", tram_hien_tai_id: "tram-1" },
    );
    expect(res.isRedAlert).toBe(false);
    expect(res.incident_id).toBe("new-1");
  });

  it("SC-04: cờ đỏ khi ≥2 phiếu PROCESS còn hiệu lực trên đúng chu kỳ", async () => {
    const supabase = client({
      rpcResult: { success: true, su_co_id: "proc-1" },
      priorRows: [
        {
          id: "other-cycle",
          quy_trinh_id: "qt-khac",
          is_active: true,
          attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
        },
        {
          id: "inactive",
          quy_trinh_id: "qt-1",
          is_active: false,
          attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
        },
        {
          id: "hong",
          quy_trinh_id: "qt-1",
          is_active: true,
          attributes: { INCIDENT_GROUP: "INSTRUMENT", INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" },
        },
        {
          id: "a",
          quy_trinh_id: "qt-1",
          is_active: true,
          attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
        },
        {
          id: "b",
          quy_trinh_id: "qt-1",
          is_active: true,
          attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_QC_FAIL" },
        },
      ],
    });
    // Báo Hỏng/Mất (không rollback) nhưng prior PROCESS đủ ngưỡng → vẫn bật cờ đỏ.
    const res = await executeIncidentReportAndRollback(
      supabase as never,
      {
        station: "DONG_GOI",
        incidentGroup: "INSTRUMENT",
        typeTen: "Hỏng",
        typeId: "INSTRUMENT_BROKEN",
        desc: "hỏng kẹp",
        maQR: "B01.SET.01",
      },
      { id: "qt-1", tram_hien_tai_id: "tram-1" },
    );
    expect(res.isRedAlert).toBe(true);
  });

  it("chu kỳ mới không đỏ chỉ vì phiếu cũ cùng mã bộ", async () => {
    const supabase = client({
      rpcResult: { success: true, su_co_id: "hong-2" },
      priorRows: [
        {
          id: "old-1",
          quy_trinh_id: "qt-cu",
          is_active: true,
          attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" },
        },
        {
          id: "old-2",
          quy_trinh_id: "qt-cu",
          is_active: true,
          attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" },
        },
      ],
    });
    const res = await executeIncidentReportAndRollback(
      supabase as never,
      {
        station: "DONG_GOI",
        incidentGroup: "INSTRUMENT",
        typeTen: "Hỏng",
        typeId: "INSTRUMENT_BROKEN",
        desc: "hỏng kẹp",
        maQR: "B01.SET.01",
      },
      { id: "qt-moi", tram_hien_tai_id: "tram-1" },
    );
    expect(res.isRedAlert).toBe(false);
  });
});
