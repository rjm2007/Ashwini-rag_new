/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        surface: '#161B22',
        raised:  '#1E2430',
        accent:  '#00D9C0',
        border:  '#30363D',
      }
    }
  },
  plugins: []
};
