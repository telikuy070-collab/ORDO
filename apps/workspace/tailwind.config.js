const { createJiti } = require('jiti');
const jiti = createJiti(__filename);
const { tailwindTheme } = jiti.import('@ordo/ui/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: tailwindTheme.colors,
      spacing: tailwindTheme.spacing,
      borderRadius: tailwindTheme.borderRadius,
      screens: tailwindTheme.screens,
    },
  },
  plugins: [],
};