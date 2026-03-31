/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        violet: {
          50: '#f0e6ff',
          100: '#d9c2ff',
          200: '#b388ff',
          300: '#9559ff',
          400: '#7a33ff',
          500: '#600aff',
          600: '#5200e6',
          700: '#4300bf',
          800: '#340099',
          900: '#250073',
        },
      },
    },
  },
  plugins: [],
}
