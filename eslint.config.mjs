import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";

const eslintConfig = defineConfig([
  // Base Next.js configs
  ...nextVitals,
  ...nextTs,

  // Security plugin - recommended rules
  {
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
    },
  },

  // No-unsanitized plugin - prevent DOM XSS
  {
    plugins: {
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores:
    "node_modules/**",
  ]),
]);

export default eslintConfig;
