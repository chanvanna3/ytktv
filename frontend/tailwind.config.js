/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Kantumruy Pro"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        karaoke: {
          dark: '#0b0f19',
          card: '#121826',
          border: '#1f293d',
          accent: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
          amber: '#f59e0b',
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(236, 72, 153, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.7)' },
        }
      }
    },
  },
  plugins: [],
}
