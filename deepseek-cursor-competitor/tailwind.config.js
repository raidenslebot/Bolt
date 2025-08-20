/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['"SF Mono"', 'Monaco', '"Inconsolata"', '"Roboto Mono"', '"Source Code Pro"', 'monospace'],
      },
      colors: {
        'gray': {
          850: '#1f2937',
          950: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
