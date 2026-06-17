import type { PiloteModule } from '../sdk';

function parseServers(raw: unknown): { host: string; port: number }[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [host, portStr] = entry.split(':');
      return { host: host ?? '', port: portStr ? Number(portStr) || 25565 : 25565 };
    })
    .filter((s) => s.host.length > 0);
}

/** Pings the servers you configure and shows how many are up and how many players are on. */
export const serverStatus: PiloteModule = {
  id: 'server-status',
  setup(ctx) {
    let cancelled = false;

    ctx.ui.setSettingsFields([
      {
        key: 'servers',
        label: 'Serveurs à surveiller',
        type: 'text',
        placeholder: 'play.exemple.net, mc.autre.fr:25565',
        help: 'Sépare plusieurs serveurs par une virgule. Port 25565 par défaut.',
      },
    ]);

    const refresh = async () => {
      const servers = parseServers(ctx.storage.get<string>('servers', ''));
      if (servers.length === 0) {
        ctx.ui.setSummary('Aucun serveur configuré');
        return;
      }
      ctx.ui.setSummary('Vérification…');
      let online = 0;
      let players = 0;
      for (const s of servers) {
        try {
          const r = await ctx.capabilities.pingServer(s.host, s.port);
          if (r.online) {
            online += 1;
            players += r.players?.online ?? 0;
          }
        } catch {
          /* a down server just counts as offline */
        }
      }
      if (cancelled) return;
      ctx.ui.setSummary(
        `${online}/${servers.length} en ligne · ${players} joueur${players > 1 ? 's' : ''}`,
      );
    };

    ctx.ui.setActions([{ label: 'Rafraîchir', variant: 'secondary', onClick: refresh }]);
    void refresh();

    const off = ctx.on((e) => {
      if (e.type === 'tick') void refresh();
    });

    return () => {
      cancelled = true;
      off();
    };
  },
};
