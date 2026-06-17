import type { PiloteModule } from '../sdk';

/**
 * Shows the instance you're playing on your Discord profile while a session is running.
 * Needs a Discord Application id (set PILOTE_DISCORD_CLIENT_ID in the launcher env);
 * with the placeholder id it connects but Discord ignores the presence — no harm done.
 */
export const discordRpc: PiloteModule = {
  id: 'discord-rpc',
  setup(ctx) {
    ctx.ui.setSummary('En veille');
    const clear = () => void ctx.capabilities.discordActivity(null);

    const off = ctx.on((e) => {
      if (e.type === 'session:start') {
        const inst = ctx.launcher.instanceById(e.instanceId);
        void ctx.capabilities.discordActivity({
          details: `Joue à ${e.instanceName}`,
          state: inst ? `${inst.loader} · ${inst.mcVersion}` : 'Minecraft',
          largeImageKey: 'logo',
          largeImageText: 'Pilote Project',
          startTimestamp: Math.floor(Date.now() / 1000),
        });
        ctx.ui.setSummary(`Présence active — ${e.instanceName}`);
      } else if (e.type === 'session:stop') {
        clear();
        ctx.ui.setSummary('En veille');
      }
    });

    return () => {
      off();
      clear();
    };
  },
};
