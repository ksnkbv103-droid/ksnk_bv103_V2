/** Đếm request chồng nhau — chỉ phản hồi mới nhất được apply. */
export function createLoadRequestGuard() {
  let latest = 0;
  return {
    begin() {
      latest += 1;
      return latest;
    },
    isCurrent(id: number) {
      return id === latest;
    },
  };
}
