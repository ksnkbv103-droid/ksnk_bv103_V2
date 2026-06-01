import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveTieuChi,
  deleteTieuChi,
  importTieuChis,
  deleteMultipleTieuChis,
  toggleIsActive,
  reorderTieuChis,
} from "./bang-kiem-write.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  contains: vi.fn(),
  single: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: vi.fn().mockReturnValue({
      select: mocks.select,
      update: mocks.update,
      contains: mocks.contains,
    }),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("bang-kiem-write JSONB Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
  });

  describe("saveTieuChi", () => {
    it("adds a new criterion when id is not provided", async () => {
      const mockBk = {
        id: "bk-1",
        tieu_chi_jsonb: [
          { id: "tc-1", stt: 1, noi_dung: "Criterion 1" }
        ]
      };
      
      mocks.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mocks.single.mockResolvedValue({ data: mockBk, error: null })
        })
      });

      mocks.update.mockReturnValue({
        eq: mocks.eq.mockResolvedValue({ data: null, error: null })
      });

      const result = await saveTieuChi({
        bangKiemId: "bk-1",
        stt: 2,
        ma_tc: "TC02",
        noi_dung: "New Criterion",
        ghi_chu: "Note",
        diem_toi_da: 2,
        is_active: true
      });

      expect(result.success).toBe(true);
      expect(mocks.update).toHaveBeenCalled();
      
      // Inspect the updated array
      const updateCall = mocks.update.mock.calls[0][0];
      expect(updateCall.tieu_chi_jsonb).toHaveLength(2);
      expect(updateCall.tieu_chi_jsonb[0].id).toBe("tc-1");
      expect(updateCall.tieu_chi_jsonb[1].noi_dung).toBe("New Criterion");
      expect(updateCall.tieu_chi_jsonb[1].stt).toBe(2);
    });

    it("updates existing criterion when id matches", async () => {
      const mockBk = {
        id: "bk-1",
        tieu_chi_jsonb: [
          { id: "tc-1", stt: 1, noi_dung: "Old Name" }
        ]
      };
      
      mocks.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mocks.single.mockResolvedValue({ data: mockBk, error: null })
        })
      });

      mocks.update.mockReturnValue({
        eq: mocks.eq.mockResolvedValue({ data: null, error: null })
      });

      const result = await saveTieuChi({
        id: "tc-1",
        bangKiemId: "bk-1",
        stt: 1,
        noi_dung: "Updated Name",
        is_active: false
      });

      expect(result.success).toBe(true);
      const updateCall = mocks.update.mock.calls[0][0];
      expect(updateCall.tieu_chi_jsonb).toHaveLength(1);
      expect(updateCall.tieu_chi_jsonb[0].id).toBe("tc-1");
      expect(updateCall.tieu_chi_jsonb[0].noi_dung).toBe("Updated Name");
      expect(updateCall.tieu_chi_jsonb[0].is_active).toBe(false);
    });
  });

  describe("deleteTieuChi", () => {
    it("deletes a criterion from the parent array", async () => {
      const mockBk = {
        id: "bk-1",
        tieu_chi_jsonb: [
          { id: "tc-1", stt: 1 },
          { id: "tc-2", stt: 2 }
        ]
      };

      mocks.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mocks.single.mockResolvedValue({ data: mockBk, error: null })
        })
      });

      mocks.update.mockReturnValue({
        eq: mocks.eq.mockResolvedValue({ data: null, error: null })
      });

      const result = await deleteTieuChi("bk-1", "tc-1");
      
      expect(result.success).toBe(true);
      const updateCall = mocks.update.mock.calls[0][0];
      expect(updateCall.tieu_chi_jsonb).toHaveLength(2);
      expect(updateCall.tieu_chi_jsonb[0].id).toBe("tc-1");
      expect(updateCall.tieu_chi_jsonb[0].is_active).toBe(false);
      expect(updateCall.tieu_chi_jsonb[1].id).toBe("tc-2");
    });
  });
});
