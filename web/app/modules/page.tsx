import type { Metadata } from 'next';
import { BUILTIN_MODULES } from '@pilote/types';
import { Nav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';
import { ModuleGrid } from '@/components/marketing/module-grid';

export const metadata: Metadata = {
  title: 'Modules',
  description:
    'Des petits modules à activer dans le launcher : présence Discord, temps de jeu, statut serveur et réglage automatique de la mémoire.',
};

export default function ModulesPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">Modules</p>
          <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-fg sm:text-[40px]">
            Des petits plus pour ton launcher
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Des petits modules à activer dans le launcher. Un clic pour les ajouter, et
            tu choisis ce que chacun a le droit de voir.
          </p>
        </div>

        <div className="mt-14">
          <ModuleGrid modules={BUILTIN_MODULES} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
