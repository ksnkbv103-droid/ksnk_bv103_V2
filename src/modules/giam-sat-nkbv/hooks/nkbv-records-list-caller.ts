/**
 * Gọi list server sau debounce; chỉ apply phản hồi của lần mới nhất.
 * Dùng cho tab Hồ sơ bệnh án NKBV (tránh đè kết quả khi gõ nhanh).
 */
export function createDebouncedLatestCaller<TParams, TResult>(
  fetchFn: (params: TParams) => Promise<TResult>,
  opts?: { debounceMs?: number },
) {
  const debounceMs = opts?.debounceMs ?? 300;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;

  const invoke = (
    params: TParams,
    onApply: (result: TResult) => void,
    onError?: (error: unknown) => void,
  ) => {
    const id = ++seq;
    void (async () => {
      try {
        const result = await fetchFn(params);
        if (id !== seq) return;
        onApply(result);
      } catch (error) {
        if (id !== seq) return;
        onError?.(error);
      }
    })();
  };

  return {
    schedule(
      params: TParams,
      onApply: (result: TResult) => void,
      onError?: (error: unknown) => void,
    ) {
      if (timer) clearTimeout(timer);
      // Vô hiệu mọi request đang bay ngay khi có lịch mới (tránh đè trong cửa sổ debounce).
      seq += 1;
      timer = setTimeout(() => {
        timer = null;
        invoke(params, onApply, onError);
      }, debounceMs);
    },
    runImmediate(
      params: TParams,
      onApply: (result: TResult) => void,
      onError?: (error: unknown) => void,
    ) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke(params, onApply, onError);
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      seq += 1;
    },
  };
}
