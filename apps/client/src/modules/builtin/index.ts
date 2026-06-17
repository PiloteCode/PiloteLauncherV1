import type { PiloteModule } from '../sdk';
import { discordRpc } from './discord-rpc';
import { playtimeTracker } from './playtime-tracker';
import { serverStatus } from './server-status';
import { ramAutoTuner } from './ram-auto-tuner';

/** Built-in module implementations, keyed by id (matches @pilote/types BUILTIN_MODULES). */
export const BUILTIN_MODULE_IMPLS: Record<string, PiloteModule> = {
  [discordRpc.id]: discordRpc,
  [playtimeTracker.id]: playtimeTracker,
  [serverStatus.id]: serverStatus,
  [ramAutoTuner.id]: ramAutoTuner,
};
