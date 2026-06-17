import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getBridge, hasBridge } from '@/lib/bridge';

/** Hidden developer mode. Type "jeveuxdev" within 10 seconds to unlock a dev panel. */
const SECRET = 'jeveuxdev';
const WINDOW_MS = 10_000;

export interface DebugEvent {
  ts: number;
  channel: string;
  text: string;
}

export const useDebugStore = defineStore('debug', () => {
  const unlocked = ref(false);
  const open = ref(false);
  const events = ref<DebugEvent[]>([]);

  let buffer: { c: string; t: number }[] = [];
  let armed = false;
  const unsubs: Array<() => void> = [];

  function log(channel: string, text: string): void {
    events.value = [{ ts: Date.now(), channel, text }, ...events.value].slice(0, 80);
  }

  function wireEventLog(): void {
    if (!hasBridge() || unsubs.length > 0) return;
    const b = getBridge();
    unsubs.push(
      b.on.progress((e) => log('progress', `${e.instanceId} · ${e.stage} · ${Math.round(e.percent)}%`)),
    );
    unsubs.push(b.on.log((e) => log('log', `${e.instanceId} · ${e.line}`.slice(0, 200))));
    unsubs.push(
      b.on.sessionExit((e) => log('exit', `${e.instanceId} · code=${e.code} · crashed=${e.crashed}`)),
    );
    unsubs.push(b.on.error((e) => log('error', `${e.kind}: ${e.message}`)));
    unsubs.push(b.on.deepLink((e) => log('deepLink', e.url)));
  }

  function onKeydown(e: KeyboardEvent): void {
    if (unlocked.value || e.key.length !== 1) return;
    const now = Date.now();
    buffer.push({ c: e.key.toLowerCase(), t: now });
    buffer = buffer.filter((b) => now - b.t <= WINDOW_MS);
    if (buffer.map((b) => b.c).join('').includes(SECRET)) {
      unlocked.value = true;
      open.value = true;
      buffer = [];
      wireEventLog();
    }
  }

  function arm(): void {
    if (armed) return;
    armed = true;
    window.addEventListener('keydown', onKeydown);
  }

  function disarm(): void {
    window.removeEventListener('keydown', onKeydown);
    for (const u of unsubs) u();
    unsubs.length = 0;
    armed = false;
  }

  return {
    unlocked,
    open,
    events,
    arm,
    disarm,
    toggle: () => (open.value = !open.value),
    close: () => (open.value = false),
    clearLog: () => (events.value = []),
  };
});
