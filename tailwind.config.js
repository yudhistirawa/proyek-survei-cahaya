/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Menggunakan variabel font yang telah kita tetapkan di layout.js
        sans: ['var(--font-roboto-flex)'],
      },
      // Mobile-specific breakpoints
      screens: {
        'xs': '475px',
        'mobile': {'max': '768px'},
        'tablet': {'min': '769px', 'max': '1024px'},
        'desktop': {'min': '1025px'},
      },
      // Mobile-friendly spacing
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Touch-friendly minimum sizes
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      // Mobile-optimized shadows
      boxShadow: {
        'mobile': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'mobile-lg': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'mobile-xl': '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
      // Mobile animations
      animation: {
        'slide-in-left': 'slideInFromLeft 0.3s ease-out forwards',
        'slide-out-left': 'slideOutToLeft 0.3s ease-in forwards',
        'slide-up-bottom': 'slideUpFromBottom 0.3s ease-out forwards',
        'cell-pulse': 'cellPulse 0.3s ease-in-out',
        'mobile-spinner': 'mobileSpinner 1s linear infinite',
      },
      // Mobile-friendly border radius
      borderRadius: {
        'mobile': '12px',
        'mobile-lg': '16px',
        'mobile-xl': '20px',
      },
      // Mobile typography
      fontSize: {
        'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
        'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
      },
    },
  },
  plugins: [
    // Plugin untuk mobile utilities
    function({ addUtilities }) {
      const mobileUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.touch-pan-x': {
          'touch-action': 'pan-x',
        },
        '.touch-pan-y': {
          'touch-action': 'pan-y',
        },
        '.touch-none': {
          'touch-action': 'none',
        },
        '.scroll-smooth-mobile': {
          '-webkit-overflow-scrolling': 'touch',
          'scroll-behavior': 'smooth',
        },
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.user-select-none-mobile': {
          '-webkit-user-select': 'none',
          '-moz-user-select': 'none',
          '-ms-user-select': 'none',
          'user-select': 'none',
        },
        '.font-smooth-mobile': {
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
      }
      addUtilities(mobileUtilities)
    }
  ],
}
