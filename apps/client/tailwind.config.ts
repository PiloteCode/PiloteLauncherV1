import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Pilote Project design tokens (see DESIGN.md). Colors reference CSS variables defined in
 * src/assets/main.css so the exact mockup hex values are preserved and theme-swappable.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
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
        window: '14px',
        card: '16px',
        panel: '18px',
      },
      boxShadow: {
        card: '0 18px 42px -20px rgba(0,0,0,.75)',
        dialog: '0 40px 90px -30px rgba(0,0,0,.85)',
        window: '0 50px 130px -34px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.02) inset',
        dropdown: '0 22px 50px -18px rgba(0,0,0,.8)',
      },
      keyframes: {
        fade: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        glow: { '0%,100%': { opacity: '.4', transform: 'translate(-50%,-50%) scale(1)' }, '50%': { opacity: '.78', transform: 'translate(-50%,-50%) scale(1.16)' } },
        float: { '0%,100%': { transform: 'rotate(45deg) translateY(0)' }, '50%': { transform: 'rotate(45deg) translateY(-5px)' } },
        spin: { to: { transform: 'rotate(360deg)' } },
        shimmer: { from: { transform: 'translateX(-130%)' }, to: { transform: 'translateX(360%)' } },
        toast: { from: { opacity: '0', transform: 'translateX(26px)' }, to: { opacity: '1', transform: 'none' } },
        dialog: { from: { opacity: '0', transform: 'translateY(14px) scale(.97)' }, to: { opacity: '1', transform: 'none' } },
        shake: { '10%,90%': { transform: 'translateX(-2px)' }, '20%,80%': { transform: 'translateX(4px)' }, '30%,50%,70%': { transform: 'translateX(-8px)' }, '40%,60%': { transform: 'translateX(8px)' } },
        unlock: { '0%': { transform: 'scale(.6)', opacity: '0' }, '60%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        pulse: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
        ring: { '0%': { transform: 'scale(.7)', opacity: '.65' }, '100%': { transform: 'scale(2)', opacity: '0' } },
      },
      animation: {
        fade: 'fade .32s ease',
        glow: 'glow 3s ease-in-out infinite',
        float: 'float 3.4s ease-in-out infinite',
        spin: 'spin .8s linear infinite',
        shimmer: 'shimmer 1.2s linear infinite',
        toast: 'toast .28s cubic-bezier(.2,.8,.2,1)',
        dialog: 'dialog .22s ease',
        shake: 'shake .5s ease',
        unlock: 'unlock .5s ease',
        'pulse-dot': 'pulse 1.4s ease-in-out infinite',
        ring: 'ring 1.1s ease-out infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
