/**
 * Chạy một tác vụ bất đồng bộ tại một thời điểm — lần gọi chồng bị bỏ qua (CSSD-029).
 * Dùng cho nút ghi nhận: cờ nằm ngoài vòng render nên hai cú bấm liên tiếp
 * trước khi React kịp cập nhật state vẫn bị chặn.
 */
export type ExclusiveResult<T> = { ran: true; value: T } | { ran: false };

export function createExclusiveRunner() {
  let running = false;
  return {
    isRunning: () => running,
    async run<T>(fn: () => Promise<T>): Promise<ExclusiveResult<T>> {
      if (running) return { ran: false };
      running = true;
      try {
        return { ran: true, value: await fn() };
      } finally {
        running = false;
      }
    },
  };
}
