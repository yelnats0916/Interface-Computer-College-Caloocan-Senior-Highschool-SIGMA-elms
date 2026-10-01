/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './php/**/*.php',
    './js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        icc: '#15803d',
        'icc-light': '#dcfce7',
        'icc-dark': '#14532d',
        'icc-yellow': '#FFD000',
        'admin-bg': '#f8fafc',
        'admin-card': '#FFFFFF',
        'admin-border': '#e2e8f0',
        'admin-accent': '#22c55e',
        'admin-primary': '#15803d',
      },
    },
  },
  plugins: [],
}
