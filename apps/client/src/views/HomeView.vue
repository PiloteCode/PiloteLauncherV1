<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { motion } from 'motion-v';
import { KeyRound, RefreshCw, AlertTriangle, PackageOpen } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import type { InstanceView } from '@pilote/types';
import Sidebar from '@/components/Sidebar.vue';
import InstanceCard from '@/components/InstanceCard.vue';
import AddViaCodeCard from '@/components/AddViaCodeCard.vue';
import RunningBanner from '@/components/RunningBanner.vue';
import { Button, ScrollArea, Skeleton } from '@/components/ui';
import { useInstancesStore } from '@/stores/instances';
import { useProfilesStore } from '@/stores/profiles';
import { useDownloadsStore } from '@/stores/downloads';
import { useCodeModal } from '@/composables/useCodeModal';

const router = useRouter();
const instances = useInstancesStore();
const profiles = useProfilesStore();
const downloads = useDownloadsStore();
const { show: openCodeModal } = useCodeModal();

const { publicInstances, unlockedInstances, runningIds, loading, loaded, offline } = storeToRefs(instances);
const { active: activeDownload } = storeToRefs(downloads);

/** Ids currently launching/installing (overlay busy spinner on the matching card). */
const busyId = computed(() => activeDownload.value?.instanceId ?? null);

const runningInstances = computed<InstanceView[]>(() =>
  runningIds.value
    .map((id) => instances.byId(id))
    .filter((v): v is InstanceView => Boolean(v)),
);

const skeletonCount = 6;

onMounted(() => {
  if (!loaded.value) void instances.load();
  if (!profiles.loaded) void profiles.load();
});

async function refresh(): Promise<void> {
  await instances.load();
}

function open(id: string): void {
  void router.push(`/instance/${id}`);
}

async function play(id: string): Promise<void> {
  if (!profiles.hasProfile) {
    toast.error('Aucun profil', { description: "Créez d'abord un profil de jeu." });
    void router.push('/onboarding');
    return;
  }
  try {
    await instances.launch(id);
  } catch (e) {
    toast.error('Lancement impossible', { description: e instanceof Error ? e.message : undefined });
  }
}

async function install(id: string): Promise<void> {
  try {
    await instances.install(id);
    toast.success('Installation terminée');
  } catch (e) {
    toast.error('Installation impossible', { description: e instanceof Error ? e.message : undefined });
  }
}

async function update(id: string): Promise<void> {
  await install(id);
}

async function kill(id: string): Promise<void> {
  try {
    await instances.kill(id);
  } catch (e) {
    toast.error("Impossible d'arrêter la session", { description: e instanceof Error ? e.message : undefined });
  }
}

const showSkeletons = computed(() => loading.value && !loaded.value);
</script>

<template>
  <div class="flex h-full w-full">
    <Sidebar />

    <ScrollArea class="flex-1" viewport-class="px-7 py-6">
      <div class="mx-auto max-w-[1180px] animate-fade">
        <!-- Header -->
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-[22px] font-semibold tracking-tight text-fg-1">Bibliothèque</h1>
            <p class="mt-0.5 text-[13px] text-muted-2">Vos instances Minecraft, prêtes à jouer.</p>
          </div>
          <Button variant="outline" size="sm" :disabled="loading" @click="refresh">
            <RefreshCw class="h-3.5 w-3.5" :class="loading && 'animate-spin'" />
            Actualiser
          </Button>
        </div>

        <!-- Running sessions -->
        <RunningBanner
          v-if="runningInstances.length"
          :instances="runningInstances"
          class="mb-6"
          @kill="kill"
          @open="open"
        />

        <!-- Offline / error -->
        <div
          v-if="offline && loaded"
          class="mb-6 flex items-center gap-3 rounded-[14px] border border-[#e8a33d]/25 bg-[#e8a33d]/[0.07] p-4"
        >
          <AlertTriangle class="h-5 w-5 shrink-0 text-[#e8a33d]" />
          <div class="flex-1">
            <p class="text-[13px] font-medium text-fg-1">Backend injoignable</p>
            <p class="text-[12px] text-muted">Les instances publiques ne peuvent pas être chargées. Vos instances installées restent jouables.</p>
          </div>
          <Button variant="secondary" size="sm" @click="refresh">Réessayer</Button>
        </div>

        <!-- Publiques -->
        <section class="mb-9">
          <div class="mb-4 flex items-center gap-2.5">
            <h2 class="text-[15px] font-semibold text-fg-2">Publiques</h2>
            <span
              v-if="!showSkeletons"
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[11px] font-medium text-muted"
            >
              {{ publicInstances.length }}
            </span>
          </div>

          <div
            v-if="showSkeletons"
            class="grid gap-4"
            style="grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr))"
          >
            <div v-for="i in skeletonCount" :key="i" class="overflow-hidden rounded-card border border-border bg-surface">
              <Skeleton class="h-[118px] w-full rounded-none" />
              <div class="space-y-3 p-3.5">
                <Skeleton class="h-4 w-2/3" />
                <Skeleton class="h-8 w-full" />
              </div>
            </div>
          </div>

          <div
            v-else-if="publicInstances.length"
            class="grid gap-4"
            style="grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr))"
          >
            <motion.div
              v-for="inst in publicInstances"
              :key="inst.id"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.26, ease: 'easeOut' }"
            >
              <InstanceCard
                :instance="inst"
                :state="instances.stateOf(inst)"
                :busy="busyId === inst.id"
                @play="play"
                @install="install"
                @update="update"
                @open="open"
              />
            </motion.div>
          </div>

          <div
            v-else
            class="flex flex-col items-center justify-center rounded-card border border-dashed border-border-input bg-surface/40 py-14 text-center"
          >
            <PackageOpen class="mb-3 h-8 w-8 text-muted-3" />
            <p class="text-[13.5px] font-medium text-fg-3">Aucune instance publique</p>
            <p class="mt-1 text-[12px] text-muted-2">Elles apparaîtront ici une fois publiées sur le backend.</p>
          </div>
        </section>

        <!-- Privées -->
        <section>
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <h2 class="text-[15px] font-semibold text-fg-2">Privées</h2>
              <span
                v-if="!showSkeletons"
                class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[11px] font-medium text-muted"
              >
                {{ unlockedInstances.length }}
              </span>
            </div>
            <Button variant="outline" size="sm" @click="openCodeModal">
              <KeyRound class="h-3.5 w-3.5" />
              Ajouter via un code
            </Button>
          </div>

          <div
            class="grid gap-4"
            style="grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr))"
          >
            <motion.div
              v-for="inst in unlockedInstances"
              :key="inst.id"
              :initial="{ opacity: 0, scale: 0.96 }"
              :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.3, ease: 'easeOut' }"
            >
              <InstanceCard
                :instance="inst"
                :state="instances.stateOf(inst)"
                :busy="busyId === inst.id"
                @play="play"
                @install="install"
                @update="update"
                @open="open"
              />
            </motion.div>

            <AddViaCodeCard @click="openCodeModal" />
          </div>
        </section>
      </div>
    </ScrollArea>
  </div>
</template>
