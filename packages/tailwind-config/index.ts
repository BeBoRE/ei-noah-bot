import type { Config } from "tailwindcss";

const baseConfig = {
  content: [""],
  theme: {
    colors: {
      text: '#fbefd5',
      background: '#0e0a01',
      primary: '#ffcc5f',
      secondary: '#382806',
      accent: '#e9a920',
    },
    extend: {},
  },
  plugins: [],
} satisfies Config

export default baseConfig;
