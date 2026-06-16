<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { motion } from 'motion-v';
import { ArrowRight, Loader2, ShieldCheck, WifiOff, UserRound, AlertCircle } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { MojangLookup } from '@pilote/types';
import { MINECRAFT_NAME_REGEX } from '@pilote/types';
import Logo from '@/components/Logo.vue';
import { Button, Input } from '@/components/ui';
import { useProfilesStore } from '@/stores/profiles';
import { avatarColor, initials } from '@/lib/cover';

const router = useRouter();
const profiles = useProfilesStore();

const name = ref('');
const looking = ref(false);
const creating = ref(false);
const preview = ref<MojangLookup | null>(null);
const lookupError = ref<string | null>(null);

const validName = computed(() => MINECRAFT_NAME_REGEX.test(name.value));
const canContinue = computed(() => validName.value && !creating.value);

let timer: number | undefined;
let reqId = 0;

watch(name, (value) => {
  preview.value = null;
  lookupError.value = null;
  if (timer) window.clearTimeout(timer);
  if (!MINECRAFT_NAME_REGEX.test(value)) {
    looking.value = false;
    return;
  }
  looking.value = true;
  const current = ++reqId;
  timer = window.setTimeout(async () => {
    try {
      const result = await profiles.lookup(value);
      if (current === reqId) preview.value = result;
    } catch (e) {
      if (current === reqId) lookupError.value = e instanceof Error ? e.message : 'Recherche impossible';
    } finally {
      if (current === reqId) looking.value = false;
    }
  }, 450);
});

async function submit(): Promise<void> {
  if (!canContinue.value) return;
  creating.value = true;
  try {
    await profiles.create(name.value.trim());
    toast.success('Profil créé', { description: name.value });
    void router.replace('/home');
  } catch (e) {
    toast.error('Création impossible', { description: e instanceof Error ? e.message : undefined });
  } finally {
    creating.value = false;
  }
}

onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer);
});
</script>

<template>
  <div class="relative flex h-full w-full items-center justify-center overflow-y-auto p-8">
    <div class="pointer-events-none absolute left-1/2 top-1/4 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-accent/8 blur-[120px]" />

    <motion.div
      class="relative w-full max-w-[420px]"
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.36, ease: 'easeOut' }"
    >
      <div class="mb-8 flex flex-col items-center text-center">
        <Logo :size="34" class="mb-5" />
        <h1 class="text-[22px] font-semibold tracking-tight text-fg-1">Bienvenue sur Pilote Project</h1>
        <p class="mt-2 max-w-[340px] text-[13px] text-muted">
          Choisissez votre pseudo Minecraft. Nous résolvons votre UUID et votre skin automatiquement.
        </p>
      </div>

      <div class="rounded-[18px] border border-border-2 bg-surface p-6 shadow-card">
        <label class="mb-2 block text-[12.5px] font-medium text-fg-3">Pseudo</label>
        <Input
          v-model="name"
          mono
          placeholder="Steve"
          maxlength="16"
          autofocus
          class="h-11 text-[14px]"
          @keydown.enter="submit"
        />
        <p
          v-if="name.length > 0 && !validName"
          class="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--destructive-2)]"
        >
          <AlertCircle class="h-3.5 w-3.5" />
          3 à 16 caractères : lettres, chiffres ou « _ ».
        </p>

        <!-- live preview card -->
        <div class="mt-5 flex items-center gap-3.5 rounded-[14px] border border-border bg-surface-elevated p-3.5">
          <div class="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px]">
            <img
              v-if="preview?.skinUrl"
              :src="preview.skinUrl"
              alt=""
              class="h-full w-full object-cover [image-rendering:pixelated]"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-[18px] font-semibold text-white"
              :style="{ background: validName ? avatarColor(name) : 'var(--surface-3)' }"
            >
              <UserRound v-if="!validName" class="h-6 w-6 text-muted-2" />
              <span v-else>{{ initials(name) }}</span>
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-[14px] font-semibold text-fg-1">
              {{ validName ? name : 'Aperçu du profil' }}
            </p>
            <p class="mt-0.5 flex items-center gap-1.5 text-[11.5px]">
              <template v-if="looking">
                <Loader2 class="h-3 w-3 animate-spin text-muted-2" />
                <span class="text-muted-2">Résolution…</span>
              </template>
              <template v-else-if="preview">
                <ShieldCheck v-if="preview.uuidSource === 'mojang'" class="h-3.5 w-3.5 text-success" />
                <WifiOff v-else class="h-3.5 w-3.5 text-muted-2" />
                <span :class="preview.uuidSource === 'mojang' ? 'text-[var(--success-2)]' : 'text-muted'">
                  {{ preview.uuidSource === 'mojang' ? 'Compte premium' : 'Profil hors-ligne' }}
                </span>
              </template>
              <template v-else-if="lookupError">
                <WifiOff class="h-3.5 w-3.5 text-muted-2" />
                <span class="text-muted-2">Hors-ligne — UUID calculé localement</span>
              </template>
              <span v-else class="text-muted-3">En attente d'un pseudo valide</span>
            </p>
            <p v-if="preview" class="mt-1 truncate font-mono text-[10.5px] text-muted-3">{{ preview.uuid }}</p>
          </div>
        </div>

        <Button
          variant="default"
          size="lg"
          class="mt-6 w-full"
          :disabled="!canContinue"
          @click="submit"
        >
          <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
          <template v-else>
            Continuer
            <ArrowRight class="h-4 w-4" />
          </template>
        </Button>
      </div>

      <p class="mt-5 text-center text-[11.5px] text-muted-3">
        Aucune connexion Microsoft requise. L'authentification hors-ligne fonctionne sur les serveurs en
        <span class="font-mono">online-mode=false</span>.
      </p>
    </motion.div>
  </div>
</template>
