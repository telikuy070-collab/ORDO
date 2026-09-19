// Tailwind configuration for the student PWA.
// Source of truth for colors: packages/ui/src/theme/index.ts (exported as @ordo/ui/theme).
// The flat object below mirrors that file so PostCSS can resolve classes such as
// `bg-surface`, `text-text-primary`, `bg-brand-600`, `bg-error`.

const colors = {
  'brand-50': '#eff6ff',
  'brand-100': '#dbeafe',
  'brand-200': '#bfdbfe',
  'brand-300': '#93c5fd',
  'brand-400': '#60a5fa',
  'brand-500': '#3b82f6',
  'brand-600': '#2563eb',
  'brand-700': '#1d4ed8',
  'brand-800': '#1e40af',
  'brand-900': '#1e3a8a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  surface: '#f8fafc',
  'surface-background': '#f8fafc',
  'surface-card': '#ffffff',
  'surface-muted': '#f1f5f9',
  'surface-border': '#e2e8f0',
  'text-primary': '#0f172a',
  'text-secondary': '#475569',
  'text-muted': '#94a3b8',
  'border-surface': '#e2e8f0',
};

export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors,
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};