import { describe, expect, it } from "vitest";
import { gradeAnswer, scoreAttempt } from "@/lib/dao-tao/grade";
import { buildShuffledSnapshot } from "@/lib/dao-tao/shuffle";
import { createSeededRng } from "@/lib/dao-tao/rng";
import { selectBalancedExam } from "@/lib/dao-tao/exam-engine";
import type { BankQuestion } from "@/lib/dao-tao/types";

function q(partial: Partial<BankQuestion> & Pick<BankQuestion, "id" | "loai" | "bloomLevel">): BankQuestion {
  const opts = partial.options ?? [
    { id: `${partial.id}-a`, nhanGoc: "A", noiDung: "A text", thuTuGoc: 0 },
    { id: `${partial.id}-b`, nhanGoc: "B", noiDung: "B text", thuTuGoc: 1 },
    { id: `${partial.id}-c`, nhanGoc: "C", noiDung: "C text", thuTuGoc: 2 },
    { id: `${partial.id}-d`, nhanGoc: "D", noiDung: "D text", thuTuGoc: 3 },
  ];
  return {
    chuDeMa: partial.chuDeMa ?? "cd1",
    stem: partial.stem ?? `Stem ${partial.id}`,
    giaiThich: partial.giaiThich ?? null,
    dapAnDung:
      partial.dapAnDung ??
      (partial.loai === "order"
        ? {
            kind: "order",
            orderedOptionIds: [opts[2].id, opts[1].id, opts[3].id, opts[0].id],
          }
        : partial.loai === "multi"
          ? { kind: "multi", optionIds: [opts[0].id, opts[1].id] }
          : partial.loai === "true_false_cluster"
            ? {
                kind: "true_false_cluster",
                byOptionId: {
                  [opts[0].id]: true,
                  [opts[1].id]: false,
                  [opts[2].id]: true,
                  [opts[3].id]: true,
                },
              }
            : { kind: "single", optionId: opts[2].id }),
    options: opts,
    id: partial.id,
    loai: partial.loai,
    bloomLevel: partial.bloomLevel,
  };
}

describe("dao-tao shuffle + grade safety", () => {
  it("single: after shuffle, same content still grades correct by id", () => {
    const bank = q({ id: "s1", loai: "single", bloomLevel: 1 });
    const snap = buildShuffledSnapshot(bank, createSeededRng("seed-a"), true);
    expect(snap.dapAnDung).toEqual(bank.dapAnDung);
    const correctId = bank.dapAnDung.kind === "single" ? bank.dapAnDung.optionId : "";
    expect(gradeAnswer(snap.dapAnDung, { kind: "single", optionId: correctId })).toBe(true);
    expect(gradeAnswer(snap.dapAnDung, { kind: "single", optionId: "wrong" })).toBe(false);
  });

  it("order: display shuffle must not change orderedOptionIds; correct sequence still passes", () => {
    const bank = q({ id: "o1", loai: "order", bloomLevel: 3 });
    const correct =
      bank.dapAnDung.kind === "order" ? bank.dapAnDung.orderedOptionIds : [];
    const snap = buildShuffledSnapshot(bank, createSeededRng("seed-order"), true);
    expect(snap.dapAnDung).toEqual(bank.dapAnDung);
    expect(snap.options.map((o) => o.id).sort()).toEqual(bank.options.map((o) => o.id).sort());
    // User xếp đúng trình tự nghiệp vụ (chuỗi id gốc), dù UI đã xáo
    expect(gradeAnswer(snap.dapAnDung, { kind: "order", orderedOptionIds: correct })).toBe(true);
    // Sai thứ tự
    expect(
      gradeAnswer(snap.dapAnDung, {
        kind: "order",
        orderedOptionIds: [...correct].reverse(),
      }),
    ).toBe(false);
  });

  it("does not remap order answer by display labels after shuffle", () => {
    const bank = q({ id: "o2", loai: "order", bloomLevel: 3 });
    const before = structuredClone(bank.dapAnDung);
    const snap1 = buildShuffledSnapshot(bank, createSeededRng("x1"), true);
    const snap2 = buildShuffledSnapshot(bank, createSeededRng("x2"), true);
    expect(snap1.dapAnDung).toEqual(before);
    expect(snap2.dapAnDung).toEqual(before);
  });
});

describe("selectBalancedExam", () => {
  it("selects requested count and diversifies loai when bank allows", () => {
    const bank: BankQuestion[] = [];
    let n = 0;
    for (const loai of ["single", "multi", "true_false_cluster", "order"] as const) {
      for (const bloom of [1, 2, 3, 4] as const) {
        for (let i = 0; i < 5; i++) {
          n += 1;
          bank.push(
            q({
              id: `q${n}`,
              loai,
              bloomLevel: bloom,
              chuDeMa: i % 2 === 0 ? "cd1" : "cd2",
            }),
          );
        }
      }
    }
    const { questions, report } = selectBalancedExam({
      bank,
      soCau: 20,
      bloomQuota: { "1": 0.25, "2": 0.3, "3": 0.3, "4": 0.15, "5": 0 },
      loaiQuota: {
        single: 0.5,
        multi: 0.2,
        true_false_cluster: 0.15,
        order: 0.15,
      },
      seed: "exam-20",
    });
    expect(questions).toHaveLength(20);
    expect(report.selected).toBe(20);
    expect(Object.keys(report.byLoai).length).toBeGreaterThan(1);
  });
});

describe("scoreAttempt", () => {
  it("computes percent", () => {
    const r = scoreAttempt([
      {
        dapAnDung: { kind: "single", optionId: "a" },
        traLoi: { kind: "single", optionId: "a" },
      },
      {
        dapAnDung: { kind: "single", optionId: "b" },
        traLoi: { kind: "single", optionId: "x" },
      },
    ]);
    expect(r.dung).toBe(1);
    expect(r.tong).toBe(2);
    expect(r.pct).toBe(50);
  });
});
