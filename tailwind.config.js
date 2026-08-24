/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Barlow', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
          'system-ui', 'sans-serif',
        ],
        mono: [
          'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco',
          'Consolas', 'Liberation Mono', 'Courier New', 'monospace',
        ],
      },
      colors: {
        brand: {
          DEFAULT:  'var(--brand)',
          dark:     'var(--brand-dark)',
          light:    'var(--brand-light)',
        },
      },
    },
  },
  plugins: [],
};
