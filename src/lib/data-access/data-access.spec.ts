import { describe, expect, it, vi, beforeEach } from "vitest";
import { getActor, getDb, callRpc, resolveCurrentActor } from "./index";

const mocks = vi.hoisted(() => ({
  userClient: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
  adminClient: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(async () => mocks.userClient),
  createAdminSupabaseClient: vi.fn(() => mocks.adminClient),
}));

describe("data-access layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActor / resolveCurrentActor", () => {
    it("trả về user khi phiên đăng nhập hợp lệ", async () => {
      const mockUser = { id: "user-123", email: "bs.a@bv103.vn" };
      mocks.userClient.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const actor = await getActor();
      expect(actor).toEqual(mockUser);

      const resolved = await resolveCurrentActor();
      expect(mocks.userClient.auth.getUser).toHaveBeenCalled();
    });

    it("trả về null khi chưa đăng nhập hoặc lỗi auth", async () => {
      mocks.userClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      });

      const actor = await getActor();
      expect(actor).toBeNull();
    });

    it("trả về null khi có exception", async () => {
      mocks.userClient.auth.getUser.mockRejectedValueOnce(new Error("Network fail"));

      const actor = await getActor();
      expect(actor).toBeNull();
    });
  });

  describe("getDb", () => {
    it("trả về user client khi role là 'user' hoặc không truyền", async () => {
      const dbDefault = await getDb();
      expect(dbDefault).toBe(mocks.userClient);

      const dbUser = await getDb("user");
      expect(dbUser).toBe(mocks.userClient);
    });

    it("trả về admin client khi role là 'admin'", async () => {
      const dbAdmin = await getDb("admin");
      expect(dbAdmin).toBe(mocks.adminClient);
    });
  });

  describe("callRpc", () => {
    it("gọi RPC thành công và trả về data", async () => {
      const payload = { result: "ok", count: 42 };
      mocks.userClient.rpc.mockResolvedValueOnce({ data: payload, error: null });

      const res = await callRpc<{ result: string; count: number }>("test_rpc", { p_param: 1 });
      expect(mocks.userClient.rpc).toHaveBeenCalledWith("test_rpc", { p_param: 1 });
      expect(res.data).toEqual(payload);
      expect(res.error).toBeNull();
    });

    it("gọi RPC qua admin db khi chỉ định role 'admin'", async () => {
      mocks.adminClient.rpc.mockResolvedValueOnce({ data: "admin_result", error: null });

      const res = await callRpc<string>("admin_rpc", {}, "admin");
      expect(mocks.adminClient.rpc).toHaveBeenCalledWith("admin_rpc", {});
      expect(res.data).toBe("admin_result");
      expect(res.error).toBeNull();
    });

    it("trả về error chuẩn Error instance khi RPC trả lỗi Supabase", async () => {
      mocks.userClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Permission denied", code: "42501" },
      });

      const res = await callRpc("restricted_rpc");
      expect(res.data).toBeNull();
      expect(res.error).toBeInstanceOf(Error);
      expect(res.error?.message).toBe("Permission denied");
    });

    it("xử lý an toàn khi throw exception", async () => {
      mocks.userClient.rpc.mockRejectedValueOnce(new Error("Connection reset"));

      const res = await callRpc("failing_rpc");
      expect(res.data).toBeNull();
      expect(res.error).toBeInstanceOf(Error);
      expect(res.error?.message).toBe("Connection reset");
    });
  });
});
