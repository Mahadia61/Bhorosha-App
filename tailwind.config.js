/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: { colors: { brand: '#4F7EF7', ink: '#172033', muted: '#64748B', surface: '#F8FAFC' } } },
  plugins: []
}
