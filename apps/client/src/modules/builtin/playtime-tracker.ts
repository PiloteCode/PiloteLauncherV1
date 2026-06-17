import type { PiloteModule } from '../sdk';

type Totals = Record<string, number>; // instanceId -> seconds played

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Records how long each instance has been played and shows running totals. */
export const playtimeTracker: PiloteModule = {
  id: 'playtime-tracker',
  setup(ctx) {
    const starts = new Map<string, number>(); // instanceId -> epoch ms
    const totals = (): Totals => ctx.storage.get<Totals>('totals', {});

    const renderSummary = () => {
      const grand = Object.values(totals()).reduce((a, b) => a + b, 0);
      ctx.ui.setSummary(grand > 0 ? `Total joué : ${fmt(grand)}` : 'Aucune session enregistrée');
    };

    renderSummary();
    ctx.ui.setActions([
      {
        label: 'Réinitialiser',
        variant: 'secondary',
        onClick: async () => {
          await ctx.storage.set('totals', {});
          renderSummary();
          ctx.toast('Statistiques remises à zéro', 'info');
        },
      },
    ]);

    const off = ctx.on(async (e) => {
      if (e.type === 'session:start') {
        starts.set(e.instanceId, Date.now());
      } else if (e.type === 'session:stop') {
        const started = starts.get(e.instanceId);
        if (started === undefined) return;
        starts.delete(e.instanceId);
        const secs = Math.round((Date.now() - started) / 1000);
        if (secs < 1) return;
        const next = { ...totals() };
        next[e.instanceId] = (next[e.instanceId] ?? 0) + secs;
        await ctx.storage.set('totals', next);
        renderSummary();
        ctx.toast(`${e.instanceName} : +${fmt(secs)}`, 'success');
      }
    });

    return off;
  },
};
