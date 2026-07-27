/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      // Colour lives in globals.css as CSS custom properties so that one token
      // set drives both Tailwind utilities and the many inline styles in this
      // codebase. A previous theme block here declared a teal palette that no
      // component ever referenced; it was removed rather than maintained.
    }
  },
  plugins: []
};
