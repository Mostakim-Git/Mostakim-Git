/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50:'#eef4ff',100:'#dbe6fe',200:'#bfd2fe',300:'#93b4fd',400:'#608bfa',500:'#3b63f6',600:'#2545eb',700:'#1d33d8',800:'#1e2caf',900:'#1e2b8a',950:'#161c54' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px -4px rgba(16,24,40,.08)' },
    },
  },
  plugins: [],
}
