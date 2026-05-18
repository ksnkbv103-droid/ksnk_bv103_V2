import { describe, expect, it } from "vitest";
import { getVstPrintGloveDisplay } from "./vst-print-glove-display";

describe("getVstPrintGloveDisplay", () => {
  it("returns dash for non-missed opportunities", () => {
    expect(getVstPrintGloveDisplay(false, true)).toBe("—");
    expect(getVstPrintGloveDisplay(false, false)).toBe("—");
    expect(getVstPrintGloveDisplay(false, null)).toBe("—");
  });

  it("shows glove usage only for missed opportunities", () => {
    expect(getVstPrintGloveDisplay(true, true)).toBe("Có");
    expect(getVstPrintGloveDisplay(true, false)).toBe("Không");
    expect(getVstPrintGloveDisplay(true, null)).toBe("—");
  });
});
