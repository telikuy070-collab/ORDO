// Ordo design system theme (TailwindCSS).
//
// Colors are flat keys so Tailwind can resolve arbitrary classes such as
// `bg-surface`, `text-text-primary`, `bg-brand-600`, `bg-error`, etc.
// Nested objects below are kept only for programmatic use in components.

export const colors = {
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

export const palette = {
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  surface: {
    background: '#f8fafc',
    card: '#ffffff',
    muted: '#f1f5f9',
    border: '#e2e8f0',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
  },
  border: {
    surface: '#e2e8f0',
  },
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
};

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
};

export const typography = {
  display: {
    '2xl': { fontSize: '1.875rem', lineHeight: '2.25rem', fontWeight: '700' },
    xl: { fontSize: '1.5rem', lineHeight: '2rem', fontWeight: '700' },
  },
  heading: {
    lg: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: '600' },
    md: { fontSize: '1.125rem', lineHeight: '1.5rem', fontWeight: '600' },
    sm: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: '600' },
  },
  body: {
    md: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: '400' },
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: '400' },
  },
  label: {
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const tailwindTheme = {
  colors,
  spacing,
  borderRadius: radius,
  screens: breakpoints,
};

export type Theme = typeof tailwindTheme;