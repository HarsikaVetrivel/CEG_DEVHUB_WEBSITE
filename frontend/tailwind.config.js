/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#071426',
        panel: '#0B1B30',
        card: '#10243D',
        border: '#243B55',
        primary: '#3B82F6',
        highlight: '#60A5FA',
        text: '#F1F5F9',
        muted: '#9FB1C8',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96,165,250,0.2), 0 20px 45px rgba(10,17,30,0.5)',
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(circle at 1px 1px, rgba(159,177,200,0.14) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
