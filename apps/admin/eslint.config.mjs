import base from "@zerocraft/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...base,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
