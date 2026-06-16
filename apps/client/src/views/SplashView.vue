<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { motion } from 'motion-v';
import { Check, Loader2 } from 'lucide-vue-next';
import Logo from '@/components/Logo.vue';
import { Progress } from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { useProfilesStore } from '@/stores/profiles';
import { useInstancesStore } from '@/stores/instances';
import { hasBridge } from '@/lib/bridge';

interface Step {
  label: string;
  status: 'pending' | 'active' | 'done';
}

const router = useRouter();
const settings = useSettingsStore();
const profiles = useProfilesStore();
const instances = useInstancesStore();

const steps = ref<Step[]>([
  { label: 'Vérification des mises à jour', status: 'pending' },
  { label: 'Initialisation du moteur', status: 'pending' },
  { label: 'Chargement des instances', status: 'pending' },
]);
const progress = ref(0);

function setStep(i: number, status: Step['status']): void {
  const s = steps.value[i];
  if (s) s.status = status;
}

async function run(): Promise<void> {
  // Step 1 — settings (theme/locale/apiBaseUrl).
  setStep(0, 'active');
  progress.value = 10;
  await settings.load();
  await delay(360);
  progress.value = 35;
  setStep(0, 'done');

  // Step 2 — profiles.
  setStep(1, 'active');
  await profiles.load();
  await delay(320);
  progress.value = 64;
  setStep(1, 'done');

  // Step 3 — instances library.
  setStep(2, 'active');
  await instances.load();
  await delay(320);
  progress.value = 100;
  setStep(2, 'done');

  await delay(380);

  // Route: onboarding when no profile exists yet, otherwise the library.
  const destination = hasBridge() && !profiles.hasProfile ? '/onboarding' : '/home';
  void router.replace(destination);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

onMounted(() => {
  void run();
});
</script>

<template>
  <div class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
    <!-- ambient radial glow -->
    <div class="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />

    <motion.div
      class="relative flex flex-col items-center"
      :initial="{ opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, ease: 'easeOut' }"
    >
      <Logo :size="42" animated class="mb-7" />

      <h1 class="text-[22px] font-semibold tracking-tight text-fg-1">Pilote Project</h1>
      <p class="mt-1.5 text-[13px] text-muted-2">Préparation du lanceur…</p>

      <div class="mt-9 w-[320px]">
        <Progress :value="progress" shimmer />

        <ul class="mt-6 space-y-3">
          <li
            v-for="(step, i) in steps"
            :key="i"
            class="flex items-center gap-3 text-[13px] transition-colors"
            :class="{
              'text-fg-1': step.status === 'active',
              'text-muted': step.status === 'done',
              'text-muted-3': step.status === 'pending',
            }"
          >
            <span class="flex h-5 w-5 items-center justify-center">
              <Loader2 v-if="step.status === 'active'" class="h-4 w-4 animate-spin text-accent" />
              <Check v-else-if="step.status === 'done'" class="h-4 w-4 text-success" />
              <span v-else class="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            </span>
            {{ step.label }}
          </li>
        </ul>
      </div>
    </motion.div>
  </div>
</template>
