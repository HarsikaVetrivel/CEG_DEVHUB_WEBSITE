/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // All colors reference CSS variables so they switch with the theme.
        // The `<alpha-value>` placeholder lets Tailwind opacity modifiers work
        // e.g.  bg-primary/20  →  background: rgb(var(--color-primary) / 0.2)
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        panel:      'rgb(var(--color-panel) / <alpha-value>)',
        card:       'rgb(var(--color-card) / <alpha-value>)',
        border:     'rgb(var(--color-border) / <alpha-value>)',
        primary:    'rgb(var(--color-primary) / <alpha-value>)',
        highlight:  'rgb(var(--color-highlight) / <alpha-value>)',
        text:       'rgb(var(--color-text) / <alpha-value>)',
        muted:      'rgb(var(--color-muted) / <alpha-value>)',
      },
      boxShadow: {
        // glow shadow is defined as a CSS variable so it changes with theme
        glow: 'var(--shadow-glow)',
      },
      backgroundImage: {
        'grid-pattern':
          'radial-gradient(circle at 1px 1px, rgba(var(--color-muted), 0.12) 1px, transparent 0)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
