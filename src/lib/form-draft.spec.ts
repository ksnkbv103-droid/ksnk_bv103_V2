import { beforeEach, describe, expect, it, vi } from "vitest";
import { DRAFT_MAX_AGE_MS, clearDraft, readDraft, writeDraft } from "./form-draft";

describe("form-draft", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  it("ghi rồi đọc lại đúng dữ liệu", () => {
    writeDraft("vst:u1", { a: 1 }, 1000);
    expect(readDraft<{ a: number }>("vst:u1", 2000)).toEqual({ a: 1 });
  });

  it("nháp quá hạn bị bỏ và xóa", () => {
    writeDraft("vst:u1", { a: 1 }, 0);
    expect(readDraft("vst:u1", DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(readDraft("vst:u1", 1)).toBeNull();
  });

  it("JSON hỏng trả null, clear xóa nháp", () => {
    localStorage.setItem("bv103_form_draft_v1:x", "{not json");
    expect(readDraft("x")).toBeNull();
    writeDraft("y", 1);
    clearDraft("y");
    expect(readDraft("y")).toBeNull();
  });
});
