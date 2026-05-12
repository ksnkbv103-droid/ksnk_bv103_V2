import { createAdminSupabaseClient } from "../src/lib/supabase-server";

type WriteActions = {
  createIncidentReport: (data: {
    maQR: string;
    station: any;
    typeId: string;
    typeTen: string;
    desc: string;
    errorQR?: string;
    machineId?: string;
  }) => Promise<any>;
  importCSSDData: (rows: any[]) => Promise<any>;
};

async function loadActions(): Promise<WriteActions & { scanQR: (maQR: string, station: any) => Promise<any> }> {
  const write: any = await import("../src/modules/cssd-erp/actions/cssd-write.actions");
  const scan: any = await import("../src/modules/cssd-erp/actions/cssd-scan.actions");
  const exW = write["module.exports"] || write?.default?.["module.exports"] || write?.default || write;
  const exS = scan["module.exports"] || scan?.default?.["module.exports"] || scan?.default || scan;
  return {
    scanQR: exS.scanQR,
    createIncidentReport: exW.createIncidentReport,
    importCSSDData: exW.importCSSDData,
  };
}

async function run() {
  const actions = await loadActions();
  const supabase = createAdminSupabaseClient();
  const testQr = `P2TEST_${Date.now()}`;

  // Flow 1: import with invalid lo_tiet_khuan_id must fail clearly.
  const invalidLoId = "00000000-0000-0000-0000-000000000000";
  const importRes = await actions.importCSSDData([
    { ma_vach_qr: `${testQr}_IMPORT`, trang_thai_hien_tai: "TIEP_NHAN", lo_tiet_khuan_id: invalidLoId },
  ]);
  console.log("FLOW1_IMPORT_INVALID_FK", JSON.stringify(importRes));

  // Flow 2: incident flow should write su_co + rollback station.
  await actions.scanQR(testQr, "TIEP_NHAN");
  await actions.scanQR(testQr, "LAM_SACH");
  const incidentRes = await actions.createIncidentReport({
    maQR: testQr,
    station: "LAM_SACH",
    typeId: "P2_TEST",
    typeTen: "LOI_TEST_TU_DONG",
    desc: "Kiem tra nhanh luong incident sau hardening",
    errorQR: "P2_ERR_SAMPLE",
    machineId: "MCH-P2-001",
  });
  console.log("FLOW2_INCIDENT_RESULT", JSON.stringify(incidentRes));

  const { data: q, error: qErr } = await supabase
    .from("quy_trinh")
    .select("id, ma_vach_qr, trang_thai_hien_tai")
    .eq("ma_vach_qr", testQr)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  console.log("FLOW2_QUY_TRINH_QUERY_ERROR", qErr?.message || null);
  console.log("FLOW2_QUY_TRINH_AFTER", JSON.stringify(q));

  const { data: incidents, error: iErr } = await supabase
    .from("su_co")
    .select("id, ma_vach_qr, tram_phat_hien, loai_su_co")
    .eq("ma_vach_qr", testQr)
    .order("created_at", { ascending: false })
    .limit(3);
  console.log("FLOW2_INCIDENT_QUERY_ERROR", iErr?.message || null);
  console.log("FLOW2_INCIDENT_ROWS", JSON.stringify(incidents || []));
}

run().catch((e) => {
  console.error("P2_FLOW_VERIFY_ERROR", e?.message || e);
  process.exit(1);
});

