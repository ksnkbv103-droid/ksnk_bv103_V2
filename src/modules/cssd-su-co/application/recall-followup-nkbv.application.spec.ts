import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quotePostgrestValue, tagNkbvEpidemiologicalAlertForRecalledBatches } from "./recall-followup-nkbv.application";

describe("tagNkbvEpidemiologicalAlertForRecalledBatches", () => {
  it("returns 0 flagged count if listedUsed is empty", async () => {
    const fakeClient = {} as SupabaseClient;
    const res = await tagNkbvEpidemiologicalAlertForRecalledBatches(fakeClient, {
      incidentId: "inc-1",
      loTietKhuanId: "lo-1",
      listedUsed: [],
    });
    expect(res.flaggedCount).toBe(0);
  });

  it("updates clinical_notes with cssd_recall_alert for matching NKBV cases", async () => {
    const updateCalls: Array<{ id: string; payload: Record<string, unknown> }> = [];

    const mockClient = {
      from: (table: string) => {
        expect(table).toBe("nkbv_fact_su_kien");
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({
                data: [
                  {
                    id: "nkbv-1",
                    clinical_notes: { ghi_chu_tuy_bien: "Vết mổ sưng" },
                    quy_trinh_id: "qt-100",
                    lo_tiet_khuan_id: null,
                    ma_ca: "CA-100",
                    updated_at: "2026-01-01T00:00:00Z",
                  },
                  {
                    id: "nkbv-2",
                    clinical_notes: {
                      cssd_recall_alert: { incident_id: "prior-inc" },
                    },
                    quy_trinh_id: "qt-101",
                    lo_tiet_khuan_id: "lo-1",
                    ma_ca: "CA-101",
                  },
                ],
                error: null,
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: (field: string, val: string) => {
              expect(field).toBe("id");
              return {
                eq: (f2: string, v2: string) => {
                  expect(f2).toBe("updated_at");
                  expect(v2).toBe("2026-01-01T00:00:00Z");
                  return {
                    select: async () => {
                      updateCalls.push({ id: val, payload });
                      return { data: [{ id: val }], error: null };
                    },
                  };
                },
              };
            },
          }),
        };
      },
    } as unknown as SupabaseClient;

    const res = await tagNkbvEpidemiologicalAlertForRecalledBatches(mockClient, {
      incidentId: "inc-123",
      loTietKhuanId: "lo-1",
      maLo: "BATCH-2026-001",
      listedUsed: [
        {
          quyTrinhId: "qt-100",
          maBo: "BO-01",
          tenBo: "Bộ đại phẫu",
          maLo: "BATCH-2026-001",
          loId: "lo-1",
          maCaMoId: "CA-100",
          usedClinically: true,
        },
      ],
    });

    // Only nkbv-1 should be flagged because nkbv-2 already had an alert
    expect(res.flaggedCount).toBe(1);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe("nkbv-1");
    const updatedNotes = updateCalls[0].payload.clinical_notes as Record<string, any>;
    expect(updatedNotes.ghi_chu_tuy_bien).toBe("Vết mổ sưng");
    expect(updatedNotes.cssd_recall_alert).toBeDefined();
    expect(updatedNotes.cssd_recall_alert.incident_id).toBe("inc-123");
    expect(updatedNotes.cssd_recall_alert.lo_tiet_khuan_id).toBe("lo-1");
    expect(updatedNotes.cssd_recall_alert.ma_lo).toBe("BATCH-2026-001");
  });

  it("quotePostgrestValue escape dấu , ( ) \" và \\", () => {
    expect(quotePostgrestValue("CA,1)")).toBe('"CA,1)"');
    expect(quotePostgrestValue('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});
