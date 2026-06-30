/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19',
          card: '#151D30',
          border: '#1E293B',
          text: '#F8FAFC'
        }
      }
    },
  },
  plugins: [],
}
