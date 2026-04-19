/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#1F7BFF',
        navy: '#1E3A5F',
        sky: '#38BDF8',
        inputBg: '#F0F4FF',
      },
    },
  },
  plugins: [],
};
