import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Giai đoạn làm sạch codebase: một số rule xuống "warn" để CI/build không chặn,
 * vẫn hiện trong IDE để sửa dần theo module (AGENTS: Detect → Fix → Verify).
 * Khi codebase đã gần sạch, có thể nâng lại "error".
 */
const phasedRelaxRules = {
  /** ~400+ chỗ legacy — xử lý dần thay vì any khắp repo trong một PR */
  "@typescript-eslint/no-explicit-any": "warn",
  /** React 19 / compiler — nhiều pattern fetch/sync form hợp lệ nhưng bị báo error */
  "react-hooks/set-state-in-effect": "warn",
  /** TDZ / thứ tự khai báo — sửa dần từng file (useCallback, đưa load lên trên) */
  "react-hooks/immutability": "warn",
  /** JSX có dấu ngoặc kép tiếng Việt — tránh nhiễu khi ưu tiên logic */
  "react/no-unescaped-entities": "warn",
  /** Ảnh nội dung động — có thể chuyển next/image theo từng màn */
  "@next/next/no-img-element": "warn",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: phasedRelaxRules,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Script thử nghiệm cục bộ — không ép lint chung CI.
    "scratch/**",
    // Agent Skills (bên thứ ba) — không phải mã ứng dụng.
    ".agents/**",
  ]),
]);

export default eslintConfig;
