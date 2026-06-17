'use client';

import { motion, type Variants } from 'framer-motion';
import type { ModuleListing } from '@pilote/types';
import { ModuleCard } from './module-card';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

/** Staggered, responsive grid of module cards. */
export function ModuleGrid({ modules }: { modules: ModuleListing[] }): React.JSX.Element {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {modules.map((m) => (
        <ModuleCard key={m.id} module={m} />
      ))}
    </motion.div>
  );
}
