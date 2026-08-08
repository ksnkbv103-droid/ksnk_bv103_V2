import { describe, expect, it } from "vitest";
import {
  parseMoTaToQlcvChecklist,
  percentFromQlcvChecklist,
  serializeQlcvChecklistToMoTa,
  taskUsesQlcvChecklistForProgress,
} from "./qlcv-checklist";

describe("parseMoTaToQlcvChecklist", () => {
  it("returns empty for blank mo_ta", () => {
    expect(parseMoTaToQlcvChecklist("")).toEqual([]);
    expect(parseMoTaToQlcvChecklist(null)).toEqual([]);
  });

  it("maps each non-empty line to a checklist item", () => {
    const items = parseMoTaToQlcvChecklist("Kiểm tủ\n- Rửa tay\n2. Ghi sổ");
    expect(items).toHaveLength(3);
    expect(items[0].label).toBe("Kiểm tủ");
    expect(items[1].label).toBe("Rửa tay");
    expect(items[2].label).toBe("Ghi sổ");
    expect(items.every((i) => i.done === false && i.id.length > 0)).toBe(true);
  });

  it("percent follows checklist length", () => {
    const items = parseMoTaToQlcvChecklist("A\nB");
    items[0].done = true;
    expect(percentFromQlcvChecklist(items)).toBe(50);
  });

  it("serialize round-trip keeps labels", () => {
    const items = parseMoTaToQlcvChecklist("A\nB");
    expect(serializeQlcvChecklistToMoTa(items)).toBe("A\nB");
  });
});

describe("taskUsesQlcvChecklistForProgress", () => {
  it("empty checklist → manual progress", () => {
    expect(taskUsesQlcvChecklistForProgress([])).toBe(false);
    expect(taskUsesQlcvChecklistForProgress(null)).toBe(false);
  });

  it("has items → checklist drives %", () => {
    expect(taskUsesQlcvChecklistForProgress([{ id: "1", label: "A", done: false }])).toBe(true);
  });
});
