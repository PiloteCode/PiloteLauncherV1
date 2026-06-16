import { ref } from 'vue';
import type { InstanceView } from '@pilote/types';

/** Global open/close state for the access-code modal, shared across views. */
const open = ref(false);
const lastUnlocked = ref<InstanceView | null>(null);

type UnlockHandler = (view: InstanceView) => void;
const handlers = new Set<UnlockHandler>();

export function useCodeModal() {
  function show(): void {
    open.value = true;
  }
  function hide(): void {
    open.value = false;
  }
  function onUnlocked(cb: UnlockHandler): () => void {
    handlers.add(cb);
    return () => handlers.delete(cb);
  }
  function emitUnlocked(view: InstanceView): void {
    lastUnlocked.value = view;
    handlers.forEach((h) => h(view));
  }

  return { open, lastUnlocked, show, hide, onUnlocked, emitUnlocked };
}
