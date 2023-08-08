import type { Config } from "tailwindcss";

import baseConfig from "@ei/tailwind-config";

export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [baseConfig],
} satisfies Config;

export { baseConfig };
