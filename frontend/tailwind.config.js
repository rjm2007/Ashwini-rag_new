/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "sans-serif"],
        mono: ['"DM Mono"', "monospace"]
      },
      colors: {
        brand: {
          orange: "#FF6200",
          "orange-light": "#FFF0E6",
          "orange-hover": "#E05500",
          "orange-text": "#C24A00",
          navy: "#06101E",
          "navy-mid": "#0D1B2E",
          "navy-light": "#1A2B42"
        }
      }
    }
  },
  plugins: []
};
