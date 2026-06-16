import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ProgressEvent, LogLine, SessionExit, LaunchStage, SerializedError } from '@pilote/types';
import { getBridge } from '@/lib/bridge';

export interface DownloadState {
  instanceId: string;
  instanceName: string;
  stage: LaunchStage;
  label: string;
  current: number;
  total: number;
  speedBps?: number;
  file?: string;
  percent: number;
  done: boolean;
}

/** The ordered checklist shown in the download overlay. */
export const STAGE_STEPS: { stage: LaunchStage; label: string }[] = [
  { stage: 'java', label: 'Java' },
  { stage: 'vanilla', label: 'Vanilla' },
  { stage: 'loader', label: 'Loader' },
  { stage: 'sync', label: 'Mods & fichiers' },
];

const STAGE_ORDER: LaunchStage[] = [
  'resolve',
  'java',
  'vanilla',
  'loader',
  'sync',
  'launch',
  'running',
  'done',
];

/**
 * Live download/launch pipeline + session logs store.
 * Subscribes to the IPC event channels (progress / log / sessionExit / error).
 */
export const useDownloadsStore = defineStore('downloads', () => {
  const active = ref<DownloadState | null>(null);
  /** instanceId -> rolling tail of log lines for the running session. */
  const logs = ref<Record<string, LogLine[]>>({});
  const cancelling = ref(false);

  let unsubscribers: Array<() => void> = [];
  let initialised = false;

  const isDownloading = computed(() => active.value !== null && !active.value.done);

  /** Per-step status for the overlay checklist (pending | active | done). */
  const stepStatus = computed<Record<LaunchStage, 'pending' | 'active' | 'done'>>(() => {
    const map = {} as Record<LaunchStage, 'pending' | 'active' | 'done'>;
    const cur = active.value?.stage ?? 'resolve';
    const curIdx = STAGE_ORDER.indexOf(cur);
    for (const { stage } of STAGE_STEPS) {
      const idx = STAGE_ORDER.indexOf(stage);
      if (active.value?.done || idx < curIdx) map[stage] = 'done';
      else if (idx === curIdx) map[stage] = 'active';
      else map[stage] = 'pending';
    }
    return map;
  });

  function onProgress(e: ProgressEvent): void {
    const name = active.value?.instanceId === e.instanceId ? active.value.instanceName : '';
    active.value = {
      instanceId: e.instanceId,
      instanceName: name,
      stage: e.stage,
      label: e.label,
      current: e.current,
      total: e.total,
      speedBps: e.speedBps,
      file: e.file,
      percent: Math.round(e.percent),
      done: e.stage === 'done',
    };
    if (e.stage === 'done' || e.stage === 'running') {
      // Pipeline finished — let the overlay show 100% briefly, then dismiss.
      window.setTimeout(() => {
        if (active.value && active.value.instanceId === e.instanceId) active.value = null;
      }, 650);
    }
  }

  function onLog(line: LogLine): void {
    const tail = logs.value[line.instanceId] ?? [];
    const next = [...tail, line];
    // keep last 500 lines per instance
    logs.value = { ...logs.value, [line.instanceId]: next.slice(-500) };
  }

  /** Callbacks registered by other stores (e.g. instances) for session lifecycle. */
  const exitHandlers = new Set<(e: SessionExit) => void>();
  const errorHandlers = new Set<(e: SerializedError & { instanceId?: string }) => void>();

  function onSessionExit(e: SessionExit): void {
    if (active.value?.instanceId === e.instanceId) active.value = null;
    exitHandlers.forEach((h) => h(e));
  }

  function onError(e: SerializedError & { instanceId?: string }): void {
    if (active.value && (!e.instanceId || e.instanceId === active.value.instanceId)) {
      active.value = null;
    }
    errorHandlers.forEach((h) => h(e));
  }

  function onExit(cb: (e: SessionExit) => void): () => void {
    exitHandlers.add(cb);
    return () => exitHandlers.delete(cb);
  }
  function onAnyError(cb: (e: SerializedError & { instanceId?: string }) => void): () => void {
    errorHandlers.add(cb);
    return () => errorHandlers.delete(cb);
  }

  /** Begin an install/launch — primes the overlay so it shows immediately. */
  function begin(instanceId: string, instanceName: string): void {
    cancelling.value = false;
    active.value = {
      instanceId,
      instanceName,
      stage: 'resolve',
      label: 'Préparation…',
      current: 0,
      total: 0,
      percent: 0,
      done: false,
    };
  }

  async function cancel(): Promise<void> {
    if (!active.value) return;
    cancelling.value = true;
    try {
      await getBridge().instances.kill(active.value.instanceId);
    } finally {
      active.value = null;
      cancelling.value = false;
    }
  }

  function clear(): void {
    active.value = null;
  }

  /** Wire up the IPC event subscriptions once. */
  function init(): void {
    if (initialised) return;
    const bridge = getBridge();
    unsubscribers = [
      bridge.on.progress(onProgress),
      bridge.on.log(onLog),
      bridge.on.sessionExit(onSessionExit),
      bridge.on.error(onError),
    ];
    initialised = true;
  }

  function dispose(): void {
    unsubscribers.forEach((u) => u());
    unsubscribers = [];
    initialised = false;
  }

  return {
    active,
    logs,
    cancelling,
    isDownloading,
    stepStatus,
    begin,
    cancel,
    clear,
    init,
    dispose,
    onExit,
    onAnyError,
  };
});
