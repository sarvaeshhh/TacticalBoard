/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          light: '#4ade80',
          DEFAULT: '#22c55e',
          dark: '#15803d',
          grass: '#1a472a'
        }
      }
    },
  },
  plugins: [],
}