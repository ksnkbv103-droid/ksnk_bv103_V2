import { describe, expect, it } from "vitest";
import {
  DAO_TAO_BANK_HEADERS,
  dapAnByNhanToDapAnDung,
  dapAnDungToByNhan,
  formatDapAnByNhan,
  generateMaCau,
  mapLoaiCauHoi,
  parseBloomLevel,
  parseDapAn,
  parseMcqRowsFromMatrix,
  serializeMcqRowsToMatrix,
  validateDapAnAgainstOptions,
  type ExportBankRow,
} from "@/lib/dao-tao/parse-mcq-excel";
import { gradeAnswer } from "@/lib/dao-tao/grade";

describe("parse-mcq-excel", () => {
  it("maps loại aliases", () => {
    expect(mapLoaiCauHoi("Chọn một đáp án đúng nhất")).toBe("single");
    expect(mapLoaiCauHoi("Chọn một đáp án")).toBe("single");
    expect(mapLoaiCauHoi("Chọn nhiều đáp án đúng")).toBe("multi");
    expect(mapLoaiCauHoi("Chùm câu hỏi Đúng/Sai")).toBe("true_false_cluster");
    expect(mapLoaiCauHoi("Sắp xếp thứ tự")).toBe("order");
    expect(mapLoaiCauHoi("Loại câu hỏi")).toBeNull();
  });

  it("parses bloom", () => {
    expect(parseBloomLevel("Mức 1 - Nhớ")).toBe(1);
    expect(parseBloomLevel("Mức 3 - Vận dụng")).toBe(3);
    expect(parseBloomLevel("3")).toBe(3);
    expect(parseBloomLevel("Thang Bloom")).toBeNull();
  });

  it("parses answer formats", () => {
    expect(parseDapAn("single", "C")).toEqual({ kind: "single", nhan: "C" });
    expect(parseDapAn("multi", "A, B")).toEqual({ kind: "multi", nhans: ["A", "B"] });
    expect(parseDapAn("order", "C -> B -> D -> A")).toEqual({
      kind: "order",
      orderedNhans: ["C", "B", "D", "A"],
    });
    const tf = parseDapAn("true_false_cluster", "A-Đúng, B-Đúng, C-Sai, D-Đúng");
    expect(tf?.kind).toBe("true_false_cluster");
    if (tf?.kind === "true_false_cluster") {
      expect(tf.byNhan.A).toBe(true);
      expect(tf.byNhan.C).toBe(false);
    }
  });

  it("skips header repeats and parses legacy sample rows", () => {
    const matrix = [
      ["", "Loại câu hỏi", "Nội dung câu hỏi (Mồi câu)", "A", "B", "C", "D", "Đáp án đúng", "Thang Bloom", "Giải thích"],
      [
        1,
        "Chọn một đáp án đúng nhất",
        "Câu hỏi mẫu single?",
        "PA",
        "PB",
        "PC",
        "PD",
        "C",
        "Mức 1 - Nhớ",
        "Giải thích",
      ],
      ["", "Loại câu hỏi", "Nội dung câu hỏi (Mồi câu)", "A", "B", "C", "D", "Đáp án đúng", "Thang Bloom", ""],
      [
        2,
        "Sắp xếp thứ tự",
        "Sắp xếp bước?",
        "Bước A",
        "Bước B",
        "Bước C",
        "Bước D",
        "C -> B -> D -> A",
        "Mức 3 - Vận dụng",
        "Trình tự",
      ],
    ];
    const { questions, errors, layout } = parseMcqRowsFromMatrix(matrix);
    expect(layout).toBe("legacy");
    expect(errors).toEqual([]);
    expect(questions).toHaveLength(2);
    expect(questions[0].loai).toBe("single");
    expect(questions[1].loai).toBe("order");
  });

  it("maps nhãn to stable option ids", () => {
    const dapAn = dapAnByNhanToDapAnDung(
      { kind: "order", orderedNhans: ["C", "B", "D", "A"] },
      { A: "idA", B: "idB", C: "idC", D: "idD" },
    );
    expect(dapAn).toEqual({
      kind: "order",
      orderedOptionIds: ["idC", "idB", "idD", "idA"],
    });
  });

  it("round-trips all 4 question types via bank layout", () => {
    const samples: ExportBankRow[] = [
      {
        maCau: "SSI_TRUOC_MO-0001",
        chuDeMa: "SSI_TRUOC_MO",
        chuDeTen: "SSI",
        stt: 1,
        loai: "single",
        stem: "Single stem?",
        options: [
          { nhanGoc: "A", noiDung: "PA", thuTuGoc: 0 },
          { nhanGoc: "B", noiDung: "PB", thuTuGoc: 1 },
          { nhanGoc: "C", noiDung: "PC", thuTuGoc: 2 },
          { nhanGoc: "D", noiDung: "PD", thuTuGoc: 3 },
        ],
        dapAnByNhan: { kind: "single", nhan: "C" },
        bloomLevel: 1,
        giaiThich: "g1",
        isActive: true,
      },
      {
        maCau: "SSI_TRUOC_MO-0002",
        chuDeMa: "SSI_TRUOC_MO",
        chuDeTen: "SSI",
        stt: 2,
        loai: "multi",
        stem: "Multi stem?",
        options: [
          { nhanGoc: "A", noiDung: "PA", thuTuGoc: 0 },
          { nhanGoc: "B", noiDung: "PB", thuTuGoc: 1 },
          { nhanGoc: "C", noiDung: "PC", thuTuGoc: 2 },
        ],
        dapAnByNhan: { kind: "multi", nhans: ["A", "C"] },
        bloomLevel: 2,
        giaiThich: "g2",
        isActive: true,
      },
      {
        maCau: "SSI_TRUOC_MO-0003",
        chuDeMa: "SSI_TRUOC_MO",
        chuDeTen: "SSI",
        stt: 3,
        loai: "true_false_cluster",
        stem: "TF stem?",
        options: [
          { nhanGoc: "A", noiDung: "PA", thuTuGoc: 0 },
          { nhanGoc: "B", noiDung: "PB", thuTuGoc: 1 },
          { nhanGoc: "C", noiDung: "PC", thuTuGoc: 2 },
          { nhanGoc: "D", noiDung: "PD", thuTuGoc: 3 },
        ],
        dapAnByNhan: {
          kind: "true_false_cluster",
          byNhan: { A: true, B: false, C: true, D: false },
        },
        bloomLevel: 3,
        giaiThich: "g3",
        isActive: false,
      },
      {
        maCau: "SSI_TRUOC_MO-0004",
        chuDeMa: "SSI_TRUOC_MO",
        chuDeTen: "SSI",
        stt: 4,
        loai: "order",
        stem: "Order stem?",
        options: [
          { nhanGoc: "A", noiDung: "PA", thuTuGoc: 0 },
          { nhanGoc: "B", noiDung: "PB", thuTuGoc: 1 },
          { nhanGoc: "C", noiDung: "PC", thuTuGoc: 2 },
          { nhanGoc: "D", noiDung: "PD", thuTuGoc: 3 },
        ],
        dapAnByNhan: { kind: "order", orderedNhans: ["C", "B", "D", "A"] },
        bloomLevel: 4,
        giaiThich: "g4",
        isActive: true,
      },
    ];

    const matrix = serializeMcqRowsToMatrix(samples);
    const { questions, errors, layout } = parseMcqRowsFromMatrix(matrix);
    expect(layout).toBe("bank");
    expect(errors).toEqual([]);
    expect(questions).toHaveLength(4);
    expect(questions.map((q) => q.loai)).toEqual([
      "single",
      "multi",
      "true_false_cluster",
      "order",
    ]);
    expect(questions[0].maCau).toBe("SSI_TRUOC_MO-0001");
    expect(questions[2].isActive).toBe(false);
    expect(formatDapAnByNhan(questions[3].dapAnByNhan)).toBe("C -> B -> D -> A");
  });

  it("generates ma_cau and converts dap_an_dung ↔ byNhan", () => {
    expect(generateMaCau("SSI_TRUOC_MO", 7)).toBe("SSI_TRUOC_MO-0007");
    const byNhan = dapAnDungToByNhan(
      { kind: "multi", optionIds: ["idA", "idC"] },
      [
        { id: "idA", nhanGoc: "A" },
        { id: "idB", nhanGoc: "B" },
        { id: "idC", nhanGoc: "C" },
      ],
    );
    expect(byNhan).toEqual({ kind: "multi", nhans: ["A", "C"] });
  });

  it("rejects answer pointing at empty option column", () => {
    const matrix = [
      [...DAO_TAO_BANK_HEADERS],
      [
        "SSI_TRUOC_MO-0099",
        "SSI_TRUOC_MO",
        "SSI",
        99,
        "Chọn một đáp án đúng nhất",
        "Stem?",
        "PA",
        "PB",
        "",
        "PD",
        "C",
        "Mức 1 - Nhớ",
        "",
        "true",
      ],
    ];
    const { questions, errors } = parseMcqRowsFromMatrix(matrix);
    expect(questions).toHaveLength(0);
    expect(errors.some((e) => e.includes("không có nội dung"))).toBe(true);
  });

  it("rejects incomplete multi / order answers", () => {
    expect(
      validateDapAnAgainstOptions("multi", { kind: "multi", nhans: ["A"] }, ["A", "B"]),
    ).toMatch(/ít nhất 2/);
    expect(
      validateDapAnAgainstOptions(
        "order",
        { kind: "order", orderedNhans: ["A", "B"] },
        ["A", "B", "C", "D"],
      ),
    ).toMatch(/đủ 4/);
  });

  it("grades empty multi/order bank answer as incorrect", () => {
    expect(
      gradeAnswer({ kind: "multi", optionIds: [] }, { kind: "multi", optionIds: [] }),
    ).toBe(false);
    expect(
      gradeAnswer(
        { kind: "order", orderedOptionIds: [] },
        { kind: "order", orderedOptionIds: [] },
      ),
    ).toBe(false);
  });
});
