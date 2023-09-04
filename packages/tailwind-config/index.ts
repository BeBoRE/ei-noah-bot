import type { Config } from 'tailwindcss';

const primary = {
  DEFAULT: '#D68B4D',
  50: '#F8F3E2',
  100: '#F5ECD1',
  200: '#EDD9B0',
  300: '#E5C38F',
  400: '#DEA96E',
  500: '#D68B4D',
  600: '#BB622B',
  700: '#89401F',
  800: '#572414',
  900: '#250D09',
  950: '#0C0403',
} as const;

const baseConfig = {
  content: [''],
  theme: {
    colors: {
      text: primary[100],
      background: primary[950],
      primary,
      accent: '#e9a920' as const,
      reject: '#BF3535' as const,
      accept: '#207934' as const,
      discord: '#5865F2' as const,
    },
    extend: {},
  },
  plugins: [],
} satisfies Config;

export default baseConfig;
