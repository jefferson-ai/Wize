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
        brand: {
          DEFAULT: '#212529',
          50:  '#f5f6f7',
          100: '#e8eaec',
          200: '#c8cdd3',
          300: '#9aa2ad',
          400: '#687280',
          500: '#212529',
          600: '#1a1e22',
          700: '#13171a',
          800: '#0d1012',
          900: '#07090a',
        },
      },
      fontFamily: {
        sans: ['InstrumentSans_400Regular', 'InstrumentSans_600SemiBold', 'InstrumentSans_700Bold'],
      },
    },
  },
  plugins: [],
}
