/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        brand: {
          50: '#FDF8F3',
          100: '#F5EBDF',
          200: '#E8D4BC',
          300: '#D4B18A',
          400: '#BE8A5C',
          500: '#A66A38',
          600: '#8B4513',
          700: '#6F3710',
          800: '#5A2D0E',
          900: '#4A240B',
        },
        leaf: {
          50: '#F2FAF4',
          100: '#E2F3E6',
          200: '#C6E6CF',
          300: '#9ED2AD',
          400: '#6CB783',
          500: '#4A9A66',
          600: '#2E8B57',
          700: '#257048',
          800: '#205A3C',
          900: '#1B4A32',
        },
        paper: {
          DEFAULT: '#FDF8F3',
          dark: '#F5EBDF',
        },
        ink: {
          DEFAULT: '#2D1F14',
          light: '#5C4A3A',
          muted: '#8B7A6A',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        book: '0 4px 20px rgba(139, 69, 19, 0.12)',
        'book-hover': '0 8px 30px rgba(139, 69, 19, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
