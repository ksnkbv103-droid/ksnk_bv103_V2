/**
 * a11y: root viewport cho phép phóng to (không khóa maximumScale / userScalable).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LAYOUT = join(process.cwd(), "src/app/layout.tsx");

describe("root layout viewport a11y", () => {
  it("không khóa phóng to (maximumScale / userScalable=false)", () => {
    const text = readFileSync(LAYOUT, "utf8");
    expect(text).not.toMatch(/maximumScale\s*:/);
    expect(text).not.toMatch(/userScalable\s*:\s*false/);
    expect(text).not.toMatch(/maximum-scale/i);
    expect(text).not.toMatch(/user-scalable\s*=\s*no/i);
  });
});
