/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // page + light surfaces (was near-black). Now mint → white range.
        ink: {
          950: '#e8f3e9', // page background (lightest)
          900: '#ffffff', // raised card surface
          850: '#f1f7f1', // inset / input surface
          800: '#e2ede3', // hover
          700: '#caddce', // borders
        },
        // forest-green panels for hero/feature cards + dark text
        forest: {
          DEFAULT: '#0E3B2A',
          900: '#0a2d20',
          800: '#0E3B2A',
          700: '#155138',
          ink: '#0c2a1e', // darkest — body text on light bg
        },
        // primary accent — vivid green
        accent: {
          DEFAULT: '#37B96A',
          soft: '#2f9e5a', // readable green text on light bg
          deep: '#2a8f51', // hover
        },
        // secondary accent — coral
        coral: {
          DEFAULT: '#E85B4F',
          soft: '#f2796f',
          deep: '#d4493e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%,100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
