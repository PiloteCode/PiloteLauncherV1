import type { Metadata } from 'next';
import { Nav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { PrivateFlow } from '@/components/marketing/private-flow';
import { ModulesTeaser } from '@/components/marketing/modules-teaser';
import { Screenshots } from '@/components/marketing/screenshots';
import { DownloadCTA } from '@/components/marketing/download-cta';
import { Footer } from '@/components/marketing/footer';

export const metadata: Metadata = {
  // Absolute title: the root layout template appends "— Pilote Project" to leaf titles,
  // but the landing page already carries the brand, so we opt out of the template here.
  title: { absolute: 'Pilote Project — Launcher Minecraft Java' },
  description:
    'Distribuez et synchronisez vos modpacks Minecraft. Instances publiques et privées, sync par hash, auto-update, profils hors-ligne. Fabric, Forge, NeoForge, Quilt.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Nav />
      <main>
        <Hero />
        <FeatureGrid />
        <PrivateFlow />
        <ModulesTeaser />
        <Screenshots />
        <DownloadCTA />
      </main>
      <Footer />
    </div>
  );
}
