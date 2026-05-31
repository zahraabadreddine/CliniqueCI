/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Vert africain clair — palette primaire ── */
        primary: {
          50:  '#edfbf2',   /* très pâle */
          100: '#d0f4e1',
          200: '#a3e8c3',
          300: '#6ed8a1',
          400: '#3ec47e',
          500: '#22a05e',   /* ← couleur principale */
          600: '#1a8a4e',
          700: '#156b3d',
          800: '#0f4e2c',
          900: '#0a3520',
        },
        cream:   '#faf8f3',
        cream2:  '#f0ebe0',
        gold:    '#d4a017',
        ink:     '#0f172a',
      },
      fontFamily: {
        sans:  ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
