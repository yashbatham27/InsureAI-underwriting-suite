/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(225, 29, 72, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(225, 29, 72, 0.6)' },
        }
      },
      animation: {
        'soft-glow': 'pulseGlow 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}