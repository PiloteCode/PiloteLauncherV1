<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import TitleBar from '@/components/TitleBar.vue';
import DownloadOverlay from '@/components/DownloadOverlay.vue';
import CodeModal from '@/components/CodeModal.vue';
import Toaster from '@/components/Toaster.vue';
import { useDownloadsStore } from '@/stores/downloads';
import { useInstancesStore } from '@/stores/instances';
import { useSettingsStore } from '@/stores/settings';
import { getBridge, hasBridge } from '@/lib/bridge';

const route = useRoute();
const downloads = useDownloadsStore();
const instances = useInstancesStore();
const settings = useSettingsStore();

let unErr: (() => void) | null = null;
let unExit: (() => void) | null = null;
let unUpdater: (() => void) | null = null;

const ERROR_LABEL: Record<string, string> = {
  network: 'Problème de connexion',
  integrity: 'Fichier corrompu',
  java: 'Erreur Java',
  launch: 'Échec du lancement',
  auth: "Erreur d'authentification",
  validation: 'Données invalides',
  'not-found': 'Introuvable',
  unknown: 'Erreur',
};

onMounted(() => {
  // Apply persisted theme as early as possible (defaults to dark).
  void settings.load();

  if (!hasBridge()) return;
  const bridge = getBridge();

  // Wire global IPC event subscriptions once.
  downloads.init();
  instances.init();

  unErr = downloads.onAnyError((e) => {
    toast.error(ERROR_LABEL[e.kind] ?? 'Erreur', { description: e.message });
  });

  unExit = downloads.onExit((e) => {
    if (e.crashed) {
      toast.error('La session a planté', {
        description: e.logPath ? 'Le journal a été enregistré.' : undefined,
      });
    }
  });

  unUpdater = bridge.on.updaterStatus((e) => {
    switch (e.status) {
      case 'available':
        toast.info('Mise à jour disponible', { description: e.version ? `Version ${e.version}` : undefined });
        break;
      case 'ready':
        toast.success('Mise à jour prête', { description: 'Elle sera installée au redémarrage.' });
        break;
      case 'error':
        toast.error('Échec de la mise à jour');
        break;
      default:
        break;
    }
  });
});

onBeforeUnmount(() => {
  unErr?.();
  unExit?.();
  unUpdater?.();
  downloads.dispose();
  instances.dispose();
});
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden rounded-window bg-bg text-fg shadow-window">
    <TitleBar />

    <main class="relative flex-1 overflow-hidden">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

    <DownloadOverlay />
    <CodeModal />
    <Toaster />
  </div>
</template>

<style>
.page-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.page-leave-active {
  transition: opacity 0.16s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
}
</style>
