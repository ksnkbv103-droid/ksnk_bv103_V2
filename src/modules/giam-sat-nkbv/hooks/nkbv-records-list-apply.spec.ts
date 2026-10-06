import { describe, expect, it, vi } from "vitest";
import { applyNkbvRecordsListOutcome } from "./nkbv-records-list-apply";

describe("applyNkbvRecordsListOutcome (tab HSBA NKBV)", () => {
  it("skipped do tab ẩn → không setData/setTotalCount, chỉ tắt loading", () => {
    const setLoading = vi.fn();
    const setData = vi.fn();
    const setTotalCount = vi.fn();
    const onErrorMessage = vi.fn();

    applyNkbvRecordsListOutcome(
      { skipped: true },
      { setLoading, setData, setTotalCount, onErrorMessage },
    );

    expect(setLoading).toHaveBeenCalledWith(false);
    expect(setData).not.toHaveBeenCalled();
    expect(setTotalCount).not.toHaveBeenCalled();
    expect(onErrorMessage).not.toHaveBeenCalled();
  });

  it("thành công → set data và totalCount", () => {
    const setLoading = vi.fn();
    const setData = vi.fn();
    const setTotalCount = vi.fn();
    const onErrorMessage = vi.fn();
    const rows = [{ id: "1" }];

    applyNkbvRecordsListOutcome(
      { success: true, data: rows, totalCount: 1 },
      { setLoading, setData, setTotalCount, onErrorMessage },
    );

    expect(setLoading).toHaveBeenCalledWith(false);
    expect(setData).toHaveBeenCalledWith(rows);
    expect(setTotalCount).toHaveBeenCalledWith(1);
    expect(onErrorMessage).not.toHaveBeenCalled();
  });

  it("lỗi → toast (onErrorMessage), không set data", () => {
    const setLoading = vi.fn();
    const setData = vi.fn();
    const setTotalCount = vi.fn();
    const onErrorMessage = vi.fn();

    applyNkbvRecordsListOutcome(
      { success: false, error: "RPC lỗi" },
      { setLoading, setData, setTotalCount, onErrorMessage },
    );

    expect(setLoading).toHaveBeenCalledWith(false);
    expect(setData).not.toHaveBeenCalled();
    expect(setTotalCount).not.toHaveBeenCalled();
    expect(onErrorMessage).toHaveBeenCalledWith("RPC lỗi");
  });
});
