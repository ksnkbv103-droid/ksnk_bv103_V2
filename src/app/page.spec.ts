import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const verifyBaoCaoTongHopShell = vi.fn();
const resolvePilotSafeEntryPath = vi.fn(() => "/bao-cao-tong-hop");

vi.mock("next/navigation", () => ({ redirect: (p: string) => redirect(p) }));
vi.mock("@/lib/ksnk-pilot-route-scope", () => ({
  resolvePilotSafeEntryPath: () => resolvePilotSafeEntryPath(),
}));
vi.mock("@/modules/dashboard/lib/dashboard-command-center-access", () => ({
  verifyBaoCaoTongHopShell: () => verifyBaoCaoTongHopShell(),
}));

import HomePage from "./page";

describe("QT-013: / chọn đích theo quyền", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePilotSafeEntryPath.mockReturnValue("/bao-cao-tong-hop");
  });

  it("có quyền BCTH → /bao-cao-tong-hop", async () => {
    verifyBaoCaoTongHopShell.mockResolvedValue(undefined);
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/bao-cao-tong-hop");
  });

  it("thiếu quyền BCTH (vai Mạng lưới/NV) → /giam-sat", async () => {
    verifyBaoCaoTongHopShell.mockRejectedValue(new Error("Bạn không có quyền"));
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/giam-sat");
  });

  it("pilot chặn BCTH → giữ đích pilot, không kiểm quyền BCTH", async () => {
    resolvePilotSafeEntryPath.mockReturnValue("/giam-sat");
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/giam-sat");
    expect(verifyBaoCaoTongHopShell).not.toHaveBeenCalled();
  });
});
