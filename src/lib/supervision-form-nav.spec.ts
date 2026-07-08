import { describe, expect, it } from "vitest";
import { resolveGscFormHref, SUPERVISION_HISTORY_PATHS } from "./supervision-form-nav";

describe("supervision-form-nav", () => {
  it("resolveGscFormHref maps sub-routes", () => {
    expect(resolveGscFormHref("/giam-sat-chung/tuan-thu")).toBe("/giam-sat-chung/tuan-thu");
    expect(resolveGscFormHref("/giam-sat-chung/nhat-ky/thong-ke")).toBe("/giam-sat-chung/nhat-ky");
    expect(resolveGscFormHref("/giam-sat-chung")).toBe("/giam-sat-chung");
  });

  it("canonical history paths", () => {
    expect(SUPERVISION_HISTORY_PATHS.vst).toBe("/lich-su/vst");
    expect(SUPERVISION_HISTORY_PATHS.gsc).toBe("/lich-su/gsc");
  });
});
