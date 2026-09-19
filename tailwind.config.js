/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        paper: '#F3F5F7',
        ink: '#14213D',
        graphite: '#4C5567',
        accent: '#5B5FEF',
        accentDark: '#4245C4',
        amber: '#FFB703',
        line: '#CBD2E3',
        good: '#1E8E5A',
        bad: '#D6483C'
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '3px',
        lg: '10px'
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(20,33,61,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,33,61,0.06) 1px, transparent 1px)"
      },
      backgroundSize: {
        grid: '28px 28px'
      }
    }
  },
  plugins: []
};
