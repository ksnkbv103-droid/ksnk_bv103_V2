/** Phương pháp tiệt khuẩn chung của một bộ = giao các phương pháp được phép của từng loại trong BOM. */
export function intersectPhuongPhapBo(lists: string[][]): string[] {
  if (!lists.length) return [];
  const [first, ...rest] = lists;
  return first.filter((m) => rest.every((l) => l.includes(m)));
}
