import type { Config } from "tailwindcss";

const baseConfig = {
  content: [""],
  theme: {
    colors: {
      text: '#fbefd5',
      background: '#0e0a01',
      primary: {
        DEFAULT: '#ffcc5f',
        50: '#fff7e5',
        100: '#ffe7b3',
        200: '#ffd680',
        300: '#ffc64d',
        400: '#ffb61a',
        500: '#e69c00',
        600: '#b37a00',
        700: '#805700',
        800: '#4d3400',
        900: '#1a1100'
    },
      secondary: '#382806',
      accent: '#e9a920',
    },
    extend: {},
  },
  plugins: [],
} satisfies Config

export default baseConfig;
