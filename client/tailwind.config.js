/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0faf7',
          100: '#d9f2eb',
          200: '#b3e5d7',
          300: '#7dd1bb',
          400: '#44b89b',
          500: '#0d7a5f',
          600: '#0a6350',
          700: '#084e3f',
          800: '#063a2f',
          900: '#042820',
        },
        cream: '#faf9f5',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
