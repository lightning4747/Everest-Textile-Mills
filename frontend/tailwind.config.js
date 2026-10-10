/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system colors
        bg: {
          base: '#0F1117',
          surface: '#1A1F2E',
          elevated: '#222840',
          border: '#2A3142',
        },
        amber: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          dim: '#92400E',
        },
        emerald: {
          DEFAULT: '#10B981',
          dim: '#064E3B',
        },
        rose: {
          DEFAULT: '#EF4444',
          dim: '#7F1D1D',
        },
        sky: {
          DEFAULT: '#38BDF8',
          dim: '#0C4A6E',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#475569',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
