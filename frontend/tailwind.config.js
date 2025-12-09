/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#E8E9F3',
        'secondary': '#2B2D42',
        'accent-purple': '#A855F7',
        'accent-pink': '#D946EF',
        'accent-light': '#F3E8FF',
        'dark-navy': '#1E1B2E',
        'card-bg': '#FFFFFF',
        'glass-bg': 'rgba(255, 255, 255, 0.1)',
      },
      backgroundColor: {
        'primary': '#E8E9F3',
        'card': '#FFFFFF',
      },
      boxShadow: {
        'neumorphic': '8px 8px 16px #d1d2db, -8px -8px 16px #ffffff',
        'neumorphic-inset': 'inset 5px 5px 10px #d1d2db, inset -5px -5px 10px #ffffff',
        'neumorphic-sm': '4px 4px 8px #d1d2db, -4px -4px 8px #ffffff',
        'neumorphic-lg': '12px 12px 24px #d1d2db, -12px -12px 24px #ffffff',
        'glass': '0 8px 32px 0 rgba(168, 85, 247, 0.1)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
      },
      backdropBlur: {
        'glass': '10px',
      },
    },
  },
  plugins: [],
}

