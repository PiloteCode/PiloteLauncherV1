<script setup lang="ts">
import { ref, computed } from 'vue';
import { Check, ChevronsUpDown, Plus, UserRound } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import { useProfilesStore } from '@/stores/profiles';
import { avatarColor, initials } from '@/lib/cover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui';
import { useRouter } from 'vue-router';

const profiles = useProfilesStore();
const { profiles: list, active, activeId } = storeToRefs(profiles);
const router = useRouter();
const open = ref(false);

const activeName = computed(() => active.value?.name ?? 'Aucun profil');
const activeUuid = computed(() => active.value?.uuid ?? '');

async function select(id: string): Promise<void> {
  try {
    await profiles.setActive(id);
    open.value = false;
  } catch (e) {
    toast.error('Impossible de changer de profil', {
      description: e instanceof Error ? e.message : undefined,
    });
  }
}

function addProfile(): void {
  open.value = false;
  void router.push('/onboarding');
}
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-[11px] border border-border-2 bg-surface-2 px-2.5 py-2 text-left transition-colors hover:border-border-hover hover:bg-surface-3 focus-ring"
      >
        <span
          v-if="active"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[12px] font-semibold text-white"
          :style="{ background: avatarColor(active.name) }"
        >
          {{ initials(active.name) }}
        </span>
        <span
          v-else
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-3 text-muted-2"
        >
          <UserRound class="h-4 w-4" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[13px] font-medium text-fg-1">{{ activeName }}</span>
          <span class="block truncate font-mono text-[10px] text-muted-3">{{ activeUuid.slice(0, 13) || 'hors-ligne' }}</span>
        </span>
        <ChevronsUpDown class="h-4 w-4 shrink-0 text-muted-2" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent side="top" align="start" :side-offset="10" class="w-[var(--reka-dropdown-menu-trigger-width)] min-w-[236px]">
      <p class="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-3">Profils</p>
      <DropdownMenuItem
        v-for="p in list"
        :key="p.id"
        @select="select(p.id)"
      >
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-semibold text-white"
          :style="{ background: avatarColor(p.name) }"
        >
          {{ initials(p.name) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[13px] text-fg-1">{{ p.name }}</span>
          <span class="block truncate font-mono text-[10px] text-muted-3">
            {{ p.uuidSource === 'mojang' ? 'Premium' : 'Hors-ligne' }}
          </span>
        </span>
        <Check v-if="p.id === activeId" class="h-4 w-4 shrink-0 text-accent" />
      </DropdownMenuItem>

      <p v-if="!list.length" class="px-2.5 py-2 text-[12px] text-muted-2">Aucun profil enregistré.</p>

      <DropdownMenuSeparator class="my-1.5 h-px bg-border-2" />
      <DropdownMenuItem @select="addProfile">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-dashed border-border-input text-muted-2">
          <Plus class="h-4 w-4" />
        </span>
        <span class="text-[13px] text-fg-2">Ajouter un profil</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
