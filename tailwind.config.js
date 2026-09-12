/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#1670F8',
        ink: '#10182F',
        muted: '#64718B',
        surface: '#F5F6F8',
        line: '#E7EAF0',
      },
    },
  },
  plugins: [],
}
