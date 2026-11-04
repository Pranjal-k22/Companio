/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="night"]'],
  theme: {
    extend: {
      colors: {
        // Companio "Bloom" Semantic Token System
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          warm: 'rgb(var(--color-surface-warm) / <alpha-value>)',
          sunken: 'rgb(var(--color-surface-sunken) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
        text: {
          strong: 'rgb(var(--color-text-strong) / <alpha-value>)',
          body: 'rgb(var(--color-text-body) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          pressed: 'rgb(var(--color-primary-pressed) / <alpha-value>)',
          tint: 'rgb(var(--color-primary-tint) / <alpha-value>)',
        },
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          tint: 'rgb(var(--color-accent-tint) / <alpha-value>)',
        },
        'on-accent': 'rgb(var(--color-on-accent) / <alpha-value>)',
        'focus-ring': 'rgb(var(--color-focus-ring) / <alpha-value>)',
        critical: {
          text: 'rgb(var(--color-critical-text) / <alpha-value>)',
          bg: 'rgb(var(--color-critical-bg) / <alpha-value>)',
          border: 'rgb(var(--color-critical-border) / <alpha-value>)',
        },
        caution: {
          text: 'rgb(var(--color-caution-text) / <alpha-value>)',
          bg: 'rgb(var(--color-caution-bg) / <alpha-value>)',
          border: 'rgb(var(--color-caution-border) / <alpha-value>)',
        },

        // Legacy compatibility mappings pointing directly to Bloom tokens
        brand: {
          50: '#F6F3EC',
          100: '#DCE8F1',
          200: '#B5D3EA',
          300: '#9CC3E3',
          400: '#7FB0D8',
          500: '#226192',
          600: '#1A4D75',
          700: '#143D5C',
          800: '#0F2A40',
          900: '#0B1D2E',
          950: '#07131F',
        },
        patientBg: {
          dark: '#0B1D2E',
          light: '#F6F3EC',
        },
        cardBg: {
          dark: '#12293D',
          light: '#FFFFFF',
        }
      },
      borderRadius: {
        'card': '20px',
        'input': '12px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'glow-coral': '0 0 30px -5px rgba(239, 133, 87, 0.35)',
        'glow-blue': '0 0 30px -5px rgba(34, 97, 146, 0.35)',
        'soft-lift': '0 10px 25px -5px rgba(15, 42, 64, 0.08), 0 8px 10px -6px rgba(15, 42, 64, 0.04)',
      },
      transitionDuration: {
        '250': '250ms',
      }
    },
  },
  plugins: [],
}
