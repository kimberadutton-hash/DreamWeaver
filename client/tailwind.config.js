/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        parchment: '#faf7f2',
        plum: {
          DEFAULT: '#3d2b4a',
          dark: '#2d1f38',
          light: '#5a3f6b',
        },
        gold: {
          DEFAULT: '#b8924a',
          light: '#d4aa6a',
          dark: '#8a6a30',
        },
        ink: '#1a1714',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        dream: ['17px', { lineHeight: '1.9' }],
      },
    },
  },
  plugins: [],
};
