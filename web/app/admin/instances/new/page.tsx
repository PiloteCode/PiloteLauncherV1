'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { InstanceEditorForm } from '@/components/admin/instance-editor-form';

export default function NewInstancePage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-9">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Toutes les instances
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Nouvelle instance</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Créez l’instance, puis ajoutez les mods et fichiers depuis l’éditeur.
        </p>
      </div>

      <InstanceEditorForm />
    </div>
  );
}
