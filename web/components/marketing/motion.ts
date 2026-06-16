import type { Variants } from 'framer-motion';

/** Shared cubic-bezier easing (typed as a 4-tuple so framer-motion accepts it under strict TS). */
export const EASE_OUT: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

/** Standard staggered container + item variants for entrance animations. */
export const fadeContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const fadeItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};
