<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { motion } from 'motion-v';
import { Lock, LockOpen, Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { InstanceView } from '@pilote/types';
import { useInstancesStore } from '@/stores/instances';
import { useCodeModal } from '@/composables/useCodeModal';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/components/ui';

const { open, emitUnlocked } = useCodeModal();
const instances = useInstancesStore();

const code = ref('');
const submitting = ref(false);
const errored = ref(false);
const unlocked = ref<InstanceView | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

watch(open, (v) => {
  if (v) {
    code.value = '';
    errored.value = false;
    unlocked.value = null;
    submitting.value = false;
    void nextTick(() => inputRef.value?.focus());
  }
});

async function submit(): Promise<void> {
  const value = code.value.trim();
  if (!value || submitting.value) return;
  submitting.value = true;
  errored.value = false;
  try {
    const view = await instances.unlock(value);
    unlocked.value = view;
    emitUnlocked(view);
    toast.success('Instance débloquée', { description: view.name });
    // Let the unlock animation play, then close.
    window.setTimeout(() => {
      open.value = false;
    }, 1300);
  } catch (e) {
    errored.value = true;
    code.value = '';
    void nextTick(() => inputRef.value?.focus());
    toast.error("Code invalide", {
      description: e instanceof Error ? e.message : 'Vérifiez le code et réessayez.',
    });
    window.setTimeout(() => {
      errored.value = false;
    }, 600);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-[400px]" :show-close="!unlocked">
      <!-- Unlock success animation -->
      <div v-if="unlocked" class="flex flex-col items-center py-4 text-center">
        <div class="relative mb-5 flex h-16 w-16 items-center justify-center">
          <span
            v-for="r in 3"
            :key="r"
            class="absolute inset-0 rounded-full border border-accent/60 animate-ring"
            :style="{ animationDelay: `${r * 0.18}s` }"
          />
          <motion.span
            class="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent"
            :initial="{ scale: 0.6, opacity: 0 }"
            :animate="{ scale: 1, opacity: 1 }"
            :transition="{ duration: 0.5, ease: 'easeOut' }"
          >
            <LockOpen class="h-7 w-7" />
          </motion.span>
        </div>
        <DialogTitle class="text-[16px] font-semibold text-fg-1">Débloquée</DialogTitle>
        <DialogDescription class="mt-1 text-[13px] text-muted">
          {{ unlocked.name }} a été ajoutée à vos instances privées.
        </DialogDescription>
      </div>

      <!-- Code entry -->
      <div v-else>
        <div class="mb-5 flex flex-col items-center text-center">
          <span class="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent/12 text-accent">
            <Lock class="h-5 w-5" />
          </span>
          <DialogTitle class="text-[16px] font-semibold text-fg-1">Instance privée</DialogTitle>
          <DialogDescription class="mt-1 text-[13px] text-muted">
            Saisissez le code d'accès fourni pour débloquer l'instance.
          </DialogDescription>
        </div>

        <form @submit.prevent="submit">
          <input
            ref="inputRef"
            v-model="code"
            type="text"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="XXXX-XXXX-XXXX"
            :class="[
              'selectable h-12 w-full rounded-[12px] border bg-surface-input px-4 text-center font-mono text-[16px] uppercase tracking-[0.25em] text-fg-1 placeholder:tracking-[0.2em] placeholder:text-muted-3 transition-colors focus-ring',
              errored ? 'border-destructive animate-shake' : 'border-border-input',
            ]"
            :disabled="submitting"
          />
          <p v-if="errored" class="mt-2 text-center text-[12px] text-[var(--destructive-2)]">
            Code invalide ou déjà utilisé.
          </p>

          <div class="mt-6 flex gap-2.5">
            <Button type="button" variant="ghost" class="flex-1" :disabled="submitting" @click="open = false">
              Annuler
            </Button>
            <Button type="submit" variant="default" class="flex-1" :disabled="submitting || !code.trim()">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              <LockOpen v-else class="h-4 w-4" />
              Débloquer
            </Button>
          </div>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>
