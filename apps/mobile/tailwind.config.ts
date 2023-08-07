import type { Config } from "tailwindcss";

import baseConfig from "@ei/tailwind-config";

export default {
  content: ["/*.{ts,tsx}"],
  presets: [baseConfig],
} satisfies Config;

export { baseConfig };
