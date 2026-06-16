import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/** Pilote Project web tokens — mirrors apps/client (see DESIGN.md). Dark by default. */
export default {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)',
        titlebar: 'var(--bg-titlebar)',
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
          input: 'var(--surface-input)',
          hover: 'var(--surface-hover)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          2: 'var(--border-2)',
          input: 'var(--border-input)',
          hover: 'var(--border-hover)',
        },
        fg: {
          DEFAULT: 'var(--fg)',
          1: 'var(--fg-1)',
          2: 'var(--fg-2)',
          3: 'var(--fg-3)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          2: 'var(--muted-2)',
          3: 'var(--muted-3)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          fg: '#ffffff',
        },
        success: 'var(--success)',
        destructive: 'var(--destructive)',
      },
      borderRadius: {
        card: '16px',
        panel: '18px',
      },
      boxShadow: {
        card: '0 18px 42px -20px rgba(0,0,0,.75)',
        dialog: '0 40px 90px -30px rgba(0,0,0,.85)',
      },
      keyframes: {
        fade: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        glow: { '0%,100%': { opacity: '.4', transform: 'translate(-50%,-50%) scale(1)' }, '50%': { opacity: '.78', transform: 'translate(-50%,-50%) scale(1.16)' } },
        shimmer: { from: { transform: 'translateX(-130%)' }, to: { transform: 'translateX(360%)' } },
      },
      animation: {
        fade: 'fade .4s ease',
        glow: 'glow 3s ease-in-out infinite',
        shimmer: 'shimmer 1.2s linear infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
