// eslint.config.mjs
import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/out/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",

      // ✅ stop nagging about <img>
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;