import type { Metadata } from 'next';
import Link from 'next/link';
import { Apple, ArrowLeft, Github, Monitor, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';
import { Logo } from '@/components/marketing/logo';

export const metadata: Metadata = {
  title: 'Télécharger',
  description:
    'Téléchargez le launcher Pilote Project pour Windows, macOS et Linux. Mises à jour automatiques intégrées.',
};

const RELEASES_URL = 'https://github.com/PiloteCode/PiloteLauncherV1/releases/latest';

type Platform = {
  id: string;
  name: string;
  icon: typeof Monitor;
  artifact: string;
  note: string;
  channel: string;
};

const PLATFORMS: Platform[] = [
  {
    id: 'win',
    name: 'Windows',
    icon: Monitor,
    artifact: 'Pilote-Project-Setup.exe',
    note: 'Windows 10/11 · installeur NSIS · 64-bit',
    channel: '/api/updates/win/latest.yml',
  },
  {
    id: 'mac',
    name: 'macOS',
    icon: Apple,
    artifact: 'Pilote-Project.dmg',
    note: 'macOS 11+ · Universal (Intel + Apple Silicon)',
    channel: '/api/updates/mac/latest-mac.yml',
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: Terminal,
    artifact: 'Pilote-Project.AppImage',
    note: 'AppImage · x86_64 · rendez-le exécutable puis lancez',
    channel: '/api/updates/linux/latest-linux.yml',
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Nav />
      <main className="mx-auto max-w-4xl px-5 pb-24 pt-32">
        <div className="flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-7 text-[34px] font-semibold tracking-tight sm:text-[42px]">
            Télécharger Pilote Project
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
            Choisissez votre plateforme. Le launcher se met à jour tout seul ensuite — vous
            ne re-téléchargez plus jamais à la main.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-card border border-border bg-surface p-6"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-border-2 bg-surface-2 text-fg-2">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-[16px] font-semibold text-fg-1">{p.name}</h2>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-muted">{p.note}</p>
                <Button asChild className="mt-5 w-full">
                  <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                    Télécharger
                  </a>
                </Button>
                <code className="mt-3 truncate text-center font-mono text-[11px] text-muted-3">
                  {p.artifact}
                </code>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-surface p-6">
            <div className="flex items-center gap-2.5">
              <Github className="h-[18px] w-[18px] text-muted-2" />
              <h3 className="text-[15px] font-semibold text-fg-1">GitHub Releases</h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Toutes les versions, notes de version et sommes de contrôle sont publiées sur
              GitHub. Les binaires y sont signés et vérifiables.
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                Voir toutes les versions
              </a>
            </Button>
          </div>

          <div className="rounded-card border border-border bg-surface p-6">
            <h3 className="text-[15px] font-semibold text-fg-1">Mises à jour</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Le launcher vérifie tout seul s’il y a une nouvelle version. Rien à faire —
              ça s’installe au démarrage.
            </p>
            <ul className="mt-4 space-y-1.5">
              {PLATFORMS.map((p) => (
                <li key={p.id} className="font-mono text-[11.5px] text-muted-2">
                  <span className="text-muted-3">{p.id}</span> · {p.channel}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-card border border-border-2 bg-surface/50 p-5 text-center">
          <p className="text-[12.5px] leading-relaxed text-muted-2">
            Pilote Project utilise des profils hors-ligne. L’authentification hors-ligne ne
            fonctionne que sur les serveurs en{' '}
            <code className="font-mono text-muted">online-mode=false</code>.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="ghost" className="gap-2 text-muted hover:text-fg">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Retour à l’accueil
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
