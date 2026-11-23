/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          50: '#f2f8f4',
          100: '#e1efe5',
          200: '#c5e0cd',
          300: '#9bc8aa',
          400: '#6ca981',
          500: '#488d61',
          600: '#35714c',
          700: '#2c5b3e',
          800: '#254933',
          900: '#1e3d2b',
          950: '#0f2217',
        },
        earth: {
          50: '#fbf7f4',
          100: '#f5eee6',
          200: '#ebdcce',
          300: '#dcc3ad',
          400: '#ca9e7f',
          500: '#be815d',
          600: '#af6d4e',
          700: '#925640',
          800: '#764637',
          900: '#603a2e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
