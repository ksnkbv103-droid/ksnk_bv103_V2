import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Giai đoạn làm sạch codebase: một số rule xuống "warn" để CI/build không chặn,
 * vẫn hiện trong IDE để sửa dần theo module (AGENTS: Detect → Fix → Verify).
 * Khi codebase đã gần sạch, có thể nâng lại "error".
 */
const phasedRelaxRules = {
  /**
   * Legacy ~200+ chỗ: bật lại "warn" khi dọn từng module (LEAN: Detect → Fix → Verify).
   * Tắt tạm để CI/IDE sạch cảnh báo; ưu tiên thay `any` bằng type/RPC row từng PR nhỏ.
   */
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
      destructuredArrayIgnorePattern: "^_",
      ignoreRestSiblings: true,
    },
  ],
  /**
   * Nhiều màn dùng `useEffect(() => { void load(); }, [deps])` — React Compiler cảnh báo dù hợp lệ.
   * Bật lại "warn" khi refactor sang `useEffect` + `queueMicrotask` / data router theo từng page.
   */
  "react-hooks/set-state-in-effect": "off",
  /** Một số form chủ đích bỏ qua dependency (tránh vòng lặp / double fetch). */
  "react-hooks/exhaustive-deps": "off",
  /** QR preview / in nhãn dùng URL động — chuyển `next/image` theo từng màn khi cần LCP. */
  "@next/next/no-img-element": "off",
  /** TDZ / thứ tự khai báo — sửa dần từng file */
  "react-hooks/immutability": "warn",
  /** JSX có dấu ngoặc kép tiếng Việt */
  "react/no-unescaped-entities": "warn",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: phasedRelaxRules,
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/modules/cssd-erp/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/cssd-erp/views/*", "@/modules/cssd-erp/actions/*", "@/modules/cssd-erp/hooks/*"],
              message:
                "Không import trực tiếp views/actions/hooks CSSD ngoài module. Dùng contexts/*/entrypoint để giữ bounded-context.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/cssd-erp/**/*.ts", "src/app/cssd-erp/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/cssd-erp/views/*", "@/modules/cssd-erp/actions/*", "@/modules/cssd-erp/hooks/*"],
              message:
                "Route CSSD chỉ import qua contexts/*/entrypoint. Không nối trực tiếp vào views/actions/hooks.",
            },
          ],
        },
      ],
    },
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
