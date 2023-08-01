import type { Config } from "tailwindcss";

import baseConfig from "@ei/tailwind-config";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [baseConfig],
} satisfies Config;

export { baseConfig };
