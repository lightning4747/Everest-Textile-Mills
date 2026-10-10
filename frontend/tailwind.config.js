/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyprus: {
          DEFAULT: '#004643',
          dark: '#003330',
          light: '#E0EFEA',
          muted: '#53706D',
        },
        cloud: {
          DEFAULT: '#FAFAFA',
          panel: '#F0F6F4',
          border: '#DCE7E4',
        },
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        bad: 'var(--bad)',
        idle: 'var(--idle)',
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        text: {
          DEFAULT: 'var(--text)',
          soft: 'var(--text-soft)',
        },
        border: 'var(--border)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
      boxShadow: {
        theme: 'var(--shadow)',
      }
    },
  },
  plugins: [],
}
